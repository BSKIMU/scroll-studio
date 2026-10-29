"""Local SOMA ONNX adapter. Pose-conditioned transitions, never a network service.

Tensor conventions follow NVlabs/MotionBricks docs/onnx_inference.md and
model/soma/kernels.py (Apache-2.0), revision 54fc563aeaaf819a753d72cc9fdc6713989cdd43.
Model weights retain NVIDIA's Open Model Agreement. No sample motions are used.
"""
from pathlib import Path
import json, math, sys, time
import numpy as np
from scipy.spatial.transform import Rotation as R

SKELETON = json.loads(Path(__file__).with_name('motionbricks-soma30.json').read_text('utf-8'))
NAMES, PARENTS = SKELETON['names'], SKELETON['parents']
OFFSETS = np.array(SKELETON['offsets'])
LEG = float(np.linalg.norm(OFFSETS[23]) + np.linalg.norm(OFFSETS[24]))
MAPPING = dict(Hips='Hips', Spine1='Spine', Spine2='Spine1', Chest='Spine2', Neck1='Neck', Head='Head',
    LeftLeg='LeftUpLeg', LeftShin='LeftLeg', RightLeg='RightUpLeg', RightShin='RightLeg')
for name in NAMES:
    if name not in MAPPING and any(name.endswith(part) for part in ['Shoulder','Arm','Hand','Foot','ToeBase']): MAPPING[name] = name

def slerp(a, b, u):
    a, b = np.asarray(a), np.asarray(b)
    dot = np.sum(a*b, axis=-1, keepdims=True)
    b = np.where(dot < 0, -b, b)
    theta = np.arccos(np.clip(abs(dot), 0, 1)); sine = np.sin(theta)
    u = np.asarray(u)
    while u.ndim < a.ndim: u = u[..., None]
    aa = np.divide(np.sin((1-u)*theta), sine, out=np.broadcast_to(1-u, theta.shape).copy(), where=sine>1e-6)
    bb = np.divide(np.sin(u*theta), sine, out=np.broadcast_to(u, theta.shape).copy(), where=sine>1e-6)
    q = aa*a+bb*b
    return q/np.linalg.norm(q, axis=-1, keepdims=True)

def multiply(a, b):
    shape = np.broadcast_shapes(np.shape(a)[:-1], np.shape(b)[:-1])
    return (R.from_quat(np.broadcast_to(a,shape+(4,)).reshape(-1,4))*R.from_quat(np.broadcast_to(b,shape+(4,)).reshape(-1,4))).as_quat().reshape(shape+(4,))

def inverse(q):
    result = np.array(q, copy=True);result[..., :3] *= -1;return result

def yaw(q):
    v = R.from_quat(q).apply([0,0,1]);return math.atan2(v[0],v[2])

def sample(clip, times, bones):
    rawq = np.asarray([f['q'] for f in clip['frames']]).reshape(len(clip['frames']),len(clip['bones']),4)
    hips = np.asarray([f['hip'] for f in clip['frames']])*LEG/clip['legLength']
    if not np.isfinite(rawq).all() or not np.isfinite(hips).all() or np.max(abs(np.linalg.norm(rawq,axis=-1)-1))>.03: raise ValueError('유효하지 않은 회전 데이터입니다.')
    f = np.clip(np.array(times)/clip['duration'],0,1)*(len(rawq)-1);i=f.astype(int);j=np.minimum(i+1,len(rawq)-1);u=f-i
    qs = slerp(rawq[i],rawq[j],u)
    out=np.zeros((len(times),len(bones),4));out[...,3]=1
    for k,name in enumerate(bones):
        if name in clip['bones']: out[:,k]=qs[:,clip['bones'].index(name)]
    return hips[i]*(1-u[:,None])+hips[j]*u[:,None],out

def soma_poses(hips, quats, bones):
    q=np.zeros((len(hips),30,4));q[...,3]=1;p=np.zeros((len(hips),30,3));p[:,0]=hips
    for j,name in enumerate(NAMES):
        parent=PARENTS[j];mapped=MAPPING.get(name)
        q[:,j]=quats[:,bones.index(mapped)] if mapped in bones else q[:,max(0,parent)]
        if parent>=0:p[:,j]=p[:,parent]+R.from_quat(q[:,parent]).apply(OFFSETS[j])
    return p,q

def heading(p):
    across=p[:,26]-p[:,22];across[:,1]=0
    forward=np.cross([0,1,0],across)
    return np.arctan2(forward[:,0],forward[:,2])

def encode(hips, quats, bones):
    p,q=soma_poses(hips,quats,bones)
    origin=hips[3].copy();origin[1]=0
    alignment=R.from_euler('y',heading(p)[3]-math.pi/2)
    p=alignment.inv().apply((p-origin).reshape(-1,3)).reshape(8,30,3)
    q=multiply(alignment.inv().as_quat(),q)
    angles=heading(p);root=p[:,0];nexts=np.array([1,2,3,3,5,6,7,7])
    delta=angles[nexts]-angles
    global_root=np.column_stack((root,np.cos(angles),np.sin(angles)))
    local_root=np.column_stack((np.arctan2(np.sin(delta),np.cos(delta))*30,(root[nexts]-root)[:,[0,2]]*30,root[:,1]))
    ground=root.copy();ground[:,1]=0
    six=R.from_quat(q.reshape(-1,4)).as_matrix()[:,:,:2].transpose(0,2,1).reshape(8,180)
    local_poses=np.concatenate(((p[:,1:]-ground[:,None,:]).reshape(8,87),six),axis=1)
    inputs={name:array[None].astype(np.float32) for name,array in [('global_root_values',global_root),('local_root_values',local_root),('local_poses',local_poses)]}
    inputs.update(has_global_root_values=np.ones((1,8),np.int32),has_local_poses=np.ones((1,8),np.int32),has_local_root_values=np.array([[1,1,1,0,1,1,1,0]],np.int32),allowed_pred_num_tokens=np.ones((1,11),np.int32))
    return inputs,origin,alignment

def decode(raw, count, origin, alignment, endpoints, bones):
    if not 6<=count<=16 or not np.isfinite(raw).all():raise ValueError('MotionBricks 출력이 유효하지 않습니다.')
    raw=raw[3:4*count-3];n=len(raw)
    hips=alignment.apply(raw[:,:3])+origin
    axes=raw[:,92:272].reshape(n,30,2,3)
    x=axes[:,:,0];x=x/np.maximum(np.linalg.norm(x,axis=-1,keepdims=True),1e-8)
    z=np.cross(x,axes[:,:,1]);z=z/np.maximum(np.linalg.norm(z,axis=-1,keepdims=True),1e-8);y=np.cross(z,x)
    matrix=np.stack((x,y,z),axis=-1)
    q=multiply(alignment.as_quat(),R.from_matrix(matrix.reshape(-1,3,3)).as_quat().reshape(n,30,4))
    start_h,start_q,end_h,end_q=endpoints
    u=np.linspace(0,1,n);smooth=u*u*(3-2*u)
    # Correct boundary deltas in local joint space, so parent changes cannot
    # introduce a snap. Fingers remain interpolated from the authored clips.
    _,given=soma_poses(np.array([start_h,end_h]),np.array([start_q,end_q]),bones)
    local=q.copy();target=given.copy()
    for j,parent in enumerate(PARENTS):
        if parent>=0:local[:,j]=multiply(inverse(q[:,parent]),q[:,j]);target[:,j]=multiply(inverse(given[:,parent]),given[:,j])
    delta0=multiply(target[0],inverse(local[0]));delta1=multiply(target[1],inverse(local[-1]))
    local=multiply(slerp(np.broadcast_to(delta0,local.shape),np.broadcast_to(delta1,local.shape),smooth),local)
    for j,parent in enumerate(PARENTS):q[:,j]=multiply(q[:,parent],local[:,j]) if parent>=0 else local[:,j]
    hips+=(start_h-hips[0])*(1-smooth[:,None])+(end_h-hips[-1])*smooth[:,None]
    result=slerp(np.broadcast_to(start_q,(n,)+start_q.shape),np.broadcast_to(end_q,(n,)+end_q.shape),smooth)
    for j,name in enumerate(NAMES):
        if MAPPING.get(name) in bones:result[:,bones.index(MAPPING[name])]=q[:,j]
    result[0],result[-1]=start_q,end_q;hips[0],hips[-1]=start_h,end_h
    if np.max(np.linalg.norm(np.diff(hips,axis=0),axis=-1))>1:raise ValueError('생성된 연결의 이동 폭이 너무 큽니다. 더 가까운 포즈를 사용하세요.')
    return hips,result,np.clip(raw[:,-4:],0,1)

def connect(session, context, target, bones):
    h=np.concatenate((context[0][-4:],target[0][:4]));q=np.concatenate((context[1][-4:],target[1][:4]))
    inputs,origin,alignment=encode(h,q,bones)
    started=time.perf_counter();out=dict(zip([o.name for o in session.get_outputs()],session.run(None,inputs)));elapsed=time.perf_counter()-started
    hips,quats,contacts=decode(out['pred_global_motions'][0],int(out['pred_num_tokens'][0]),origin,alignment,(h[3],q[3],h[4],q[4]),bones)
    return hips,quats,contacts,elapsed

def run(folder, model):
    import onnxruntime as ort
    request=json.loads((folder/'request.json').read_text('utf-8'));rows=request['steps']
    root=Path(__file__).resolve().parent.parent;library=root/'local/pose-library';bank=json.loads((root/'local/interaction-clips.json').read_text('utf-8')).get('clips',{})
    clips=[bank[row['id'][8:]] if row['id'].startswith('builtin-') else json.loads((library/row['id']/'clip.json').read_text('utf-8')) for row in rows]
    bones=list(dict.fromkeys(name for clip in clips for name in clip['bones']))
    if not all('Hips' in c['bones'] and .05<c['legLength']<10 for c in clips):raise ValueError('휴머노이드 동작이 필요합니다.')
    options=ort.SessionOptions();options.intra_op_num_threads=4;options.inter_op_num_threads=1
    started=time.perf_counter();session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider']);load_seconds=time.perf_counter()-started
    output_h=[];output_q=[];bridges=[];tail=None
    for idx,(row,clip) in enumerate(zip(rows,clips)):
        start=max(0,row['start']);end=min(clip['duration'],row['end']);duration=(end-start)/row['speed']
        if duration<.1 or duration>60:raise ValueError('각 동작은 0.1~60초 범위로 선택하세요.')
        h,q=sample(clip,np.linspace(start,end,max(4,round(duration*30)+1)),bones)
        angle=(yaw(tail[1][-1,bones.index('Hips')]) if tail else 0)-yaw(q[0,bones.index('Hips')]);turn=R.from_euler('y',angle)
        h=turn.apply(h);q=multiply(turn.as_quat(),q)
        offset=(tail[0][-1] if tail else np.zeros(3))-h[0];offset[1]=0;h+=offset
        if tail:
            bridge_h,bridge_q,contacts,elapsed=connect(session,tail,(h,q),bones)
            bridges.append(dict(fromStep=idx,toStep=idx+1,startFrame=len(output_h)-1,endFrame=len(output_h)+len(bridge_h)-2,inferenceSeconds=elapsed,footContacts=contacts.tolist()))
            output_h.extend(bridge_h[1:-1]);output_q.extend(bridge_q[1:-1])
        output_h.extend(h);output_q.extend(q);tail=(h,q)
    if len(output_h)>5401:raise ValueError('연결 결과는 180초 이하로 만들어주세요.')
    frames=[dict(hip=h.tolist(),q=q.flatten().tolist()) for h,q in zip(output_h,output_q)]
    provenance=dict(engine='MotionBricks-SOMA-RP-v1',revision='54fc563aeaaf819a753d72cc9fdc6713989cdd43',backend='ONNX Runtime CPU',loadSeconds=load_seconds,steps=rows,bridges=bridges)
    clip=dict(label=request['name'],duration=(len(frames)-1)/30,legLength=LEG,bones=bones,frames=frames,source='MotionBricks · 로컬 연결 생성',provenance=provenance)
    (folder/'clip.json').write_text(json.dumps(clip,separators=(',',':'),ensure_ascii=False),'utf-8')
    entry=dict(id=folder.name,name=request['name'],duration=clip['duration'],category='액션',kind='motion',source=clip['source'],local=True)
    if request.get('weaponType') in ['gun','sword','axe','unarmed']:entry['weaponType']=request['weaponType']
    (folder/'entry.json').write_text(json.dumps(entry,ensure_ascii=False),'utf-8')
    metrics=dict(loadSeconds=load_seconds,inferenceSeconds=[b['inferenceSeconds'] for b in bridges],frames=len(frames),duration=clip['duration'])
    (folder/'metrics.json').write_text(json.dumps(metrics),'utf-8');print(json.dumps(metrics),flush=True)

if __name__=='__main__':run(Path(sys.argv[1]),Path(sys.argv[2]))
