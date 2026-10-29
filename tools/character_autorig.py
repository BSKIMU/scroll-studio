"""Marker guided humanoid armature + Blender heat weights, run on a private copy."""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector, Matrix

folder=Path(sys.argv[sys.argv.index('--')+1]);stage=sys.argv[-1]
def read(name): return json.loads((folder/name).read_text('utf-8'))
def write(name,value):
    p=folder/name;t=p.with_suffix('.tmp');t.write_text(json.dumps(value,ensure_ascii=False),'utf-8');t.replace(p)
def status(progress,message,state='running'): write('job.json',dict(state=state,stage=stage,progress=progress,message=message))
def meshes(): return [o for o in bpy.context.scene.objects if o.type=='MESH' and len(o.data.vertices)]
def points(): return [o.matrix_world@v.co for o in meshes() for v in o.data.vertices]
def gltf(path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in ['MESH','ARMATURE']: o.hide_set(False);o.hide_render=False;o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
def three(v): return [v.x,v.z,-v.y]
CORE=['Hips','Spine','Spine1','Spine2','Neck','Head']+[s+n for s in ['Left','Right'] for n in ['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase']]
REQUIRED=[n for n in CORE if not n.endswith(('Shoulder','ToeBase'))]
def canonical(name):
    short=name.split(':')[-1].removeprefix('mixamorig')
    wanted=CORE+[s+'Hand'+f+str(i) for s in ['Left','Right'] for f in ['Thumb','Index','Middle','Ring','Pinky'] for i in range(1,5)]
    norm=lambda s:''.join(c for c in s.lower() if c.isalnum())
    return next((n for n in wanted if norm(short)==norm(n)),None)
def rig_info():
    arms=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
    rig=arms[0] if len(arms)==1 else None
    mapping={b.name:canonical(b.name) for b in rig.data.bones} if rig else {}
    found=set(mapping.values());missing=[n for n in REQUIRED if n not in found]
    weighted=rig and any(any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers) and len(o.vertex_groups) for o in meshes())
    return rig,mapping,bool(weighted and not missing),missing

def prepare():
    status(10,'캐릭터 형상을 읽습니다.')
    for obj in list(bpy.data.objects): bpy.data.objects.remove(obj,do_unlink=True)
    source=read('source.json');path=str(folder/('source'+source['ext']))
    if source['ext']=='.glb': bpy.ops.import_scene.gltf(filepath=path,disable_bone_shape=True)
    elif source['ext']=='.fbx': bpy.ops.import_scene.fbx(filepath=path,use_anim=False)
    else: bpy.ops.wm.obj_import(filepath=path)
    objects=meshes()
    if not objects: raise ValueError('파일에 캐릭터 메시가 없습니다.')
    if sum(len(o.data.vertices) for o in objects)>600000: raise ValueError('안정적인 리깅을 위해 60만 정점 이하 모델을 사용하세요.')
    for o in bpy.context.scene.objects:
        o.animation_data_clear()
        if o.type=='ARMATURE': o.data.pose_position='REST'
    pts=points();lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
    if hi.z-lo.z<1e-5: raise ValueError('모델의 세로 높이를 확인할 수 없습니다.')
    scale=1.75/(hi.z-lo.z);offset=Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z))
    transform=Matrix.Scale(scale,4)@Matrix.Translation(offset)
    for o in bpy.context.scene.objects:
        if o.parent is None: o.matrix_world=transform@o.matrix_world
    bpy.context.view_layer.update();pts=points();rig,mapping,compatible,missing=rig_info()
    # Defaults are suggestions only: the user places the eight colored landmarks.
    ymax=max(v.z for v in pts)
    def extent(z,side):
        samples=[v for v in pts if abs(v.z-z)<.1 and v.x*side>0]
        return max((v.x*side for v in samples),default=.7)
    span=max(extent(1.35,1),extent(1.35,-1))
    markers={'chin':[0,1.5,0],'groin':[0,.83,0]}
    for side,sign in [('left',1),('right',-1)]:
        markers[side+'Wrist']=[sign*span*.82,1.34,0];markers[side+'Elbow']=[sign*span*.58,1.37,0];markers[side+'Knee']=[sign*.105,.47,0]
    if rig:
        bones={v:rig.data.bones[k] for k,v in mapping.items() if v}
        for key,bn in [('chin','Head'),('groin','Hips')]+[(s+n,s.title()+b) for s in ['left','right'] for n,b in [('Wrist','Hand'),('Elbow','ForeArm'),('Knee','Leg')]]:
            if bn in bones: markers[key]=three(rig.matrix_world@bones[bn].head_local)
    status(65,'미리보기와 원본 복사본을 저장합니다.')
    gltf(folder/'preview.glb');bpy.ops.wm.save_as_mainfile(filepath=str(folder/'prepared.blend'))
    write('info.json',dict(name=source['name'],markers=markers,hasRig=bool(rig),compatible=compatible,missing=missing,bones=len(rig.data.bones) if rig else 0,vertices=sum(len(o.data.vertices) for o in objects)))
    status(100,'마커를 배치하거나 기존 리깅을 사용하세요.','done')

def generate(request):
    objects=meshes()
    if any(o.type=='ARMATURE' for o in bpy.context.scene.objects):
        raise ValueError('기존 뼈가 있지만 호환되지 않습니다. Blender에서 Mixamo 이름으로 매핑하거나 뼈 없는 메시를 내보내세요.')
    for o in objects:
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        o.vertex_groups.clear()
    pts=points();m={k:Vector((v[0],-v[2],v[1])) for k,v in request['markers'].items()}
    # Estimate mesh depth beneath each screen-space landmark; retain user-picked depth.
    def depth(p,r=.06):
        near=[v.y for v in pts if abs(v.x-p.x)<r and abs(v.z-p.z)<r]
        return (min(near)+max(near))/2 if near else p.y
    for p in m.values(): p.y=depth(p)
    groin=m['groin'];chin=m['chin'];neck=chin-Vector((0,0,.055));hips=groin+Vector((0,0,.09));chest=hips.lerp(neck,.78)
    specs={}
    def bone(name,a,b,parent=None,deform=True): specs[name]=(a.copy(),b.copy(),parent,deform)
    spine=hips.lerp(neck,.23);spine1=hips.lerp(neck,.46)
    bone('Hips',hips,spine);bone('Spine',spine,spine1,'Hips');bone('Spine1',spine1,chest,'Spine');bone('Spine2',chest,neck,'Spine1');bone('Neck',neck,chin,'Spine2');bone('Head',chin,Vector((chin.x,chin.y,1.72)),'Neck')
    for side,sign in [('left',1),('right',-1)]:
        S=side.title();w,e,k=[m[side+n] for n in ['Wrist','Elbow','Knee']]
        shoulder=Vector((sign*min(.22,max(.12,abs(e.x)*.52)),chest.y,neck.z-.04));shoulder.y=depth(shoulder)
        root=Vector((sign*.055,chest.y,chest.z));hip=Vector((k.x,hips.y,hips.z-.025));ankle=Vector((k.x,depth(Vector((k.x,0,.09))),.09));toe=ankle+Vector((0,-.11,-.045))
        direction=(w-e).normalized();hand_end=w+direction*.085
        bone(S+'Shoulder',root,shoulder,'Spine2');bone(S+'Arm',shoulder,e,S+'Shoulder');bone(S+'ForeArm',e,w,S+'Arm');bone(S+'Hand',w,hand_end,S+'ForeArm')
        bone(S+'UpLeg',hip,k,'Hips');bone(S+'Leg',k,ankle,S+'UpLeg');bone(S+'Foot',ankle,toe,S+'Leg');bone(S+'ToeBase',toe,toe+Vector((0,-.055,0)),S+'Foot')
        if request['lod']=='hands':
            # A/T pose, palms down. Separate finger meshes are required for useful fine control.
            forward=Vector((0,-1,0))
            for finger,spread,length in [('Thumb',.047,.055),('Index',.028,.067),('Middle',.006,.078),('Ring',-.017,.071),('Pinky',-.038,.055)]:
                start=w+direction*(.045 if finger=='Thumb' else .08)+forward*spread
                d=(direction+forward*(.65 if finger=='Thumb' else 0)).normalized();parent=S+'Hand'
                for i in range(1,5):
                    end=start+d*(length/3 if i<4 else .009);name=S+'Hand'+finger+str(i)
                    bone(name,start,end,parent,i<4);parent=name;start=end
    arm=bpy.data.armatures.new('CharacterRig');rig=bpy.data.objects.new('CharacterRig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name,(a,b,parent,deform) in specs.items():
        if (b-a).length<.005: raise ValueError('마커 간격이 너무 가깝습니다. 관절 위치를 확인하세요.')
        eb=arm.edit_bones.new('mixamorig'+name);eb.head=a;eb.tail=b;eb.use_deform=deform
        if parent: eb.parent=arm.edit_bones['mixamorig'+parent]
    bpy.ops.object.mode_set(mode='OBJECT');status(35,'자동 가중치를 계산합니다. 메시가 복잡하면 시간이 걸릴 수 있습니다.')
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=rig;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    try: validate_weights(rig)
    except ValueError:
        # Disconnected joints / overlapping shells often defeat heat weights.
        # Solve on a watertight temporary volume, then transfer weights only.
        proxy_weights(rig,objects,request['lod'])
        validate_weights(rig)
    return rig,'generated'

def proxy_weights(rig,objects,lod):
    status(50,'분리된 표면을 임시 볼륨으로 연결해 가중치를 계산합니다.')
    bpy.ops.object.select_all(action='DESELECT');copies=[]
    for obj in objects:
        duplicate=bpy.data.objects.new('WeightProxy',obj.data.copy());bpy.context.collection.objects.link(duplicate)
        duplicate.matrix_world=obj.matrix_world.copy();duplicate.select_set(True);copies.append(duplicate)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();proxy=copies[0]
    remesh=proxy.modifiers.new('WeightVolume','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.009 if lod=='hands' else .015;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    groups={g.index for g in proxy.vertex_groups}
    missed=sum(not any(g.group in groups and g.weight>.0001 for g in v.groups) for v in proxy.data.vertices)
    print('Weight proxy:',len(proxy.data.vertices),'vertices,',missed,'unweighted',flush=True)
    if missed:
        from mathutils.kdtree import KDTree
        weighted=[v for v in proxy.data.vertices if any(g.weight>.0001 for g in v.groups)]
        tree=KDTree(len(weighted))
        for v in weighted:tree.insert(v.co,v.index)
        tree.balance()
        if missed>len(proxy.data.vertices)*.01: raise ValueError('자동 가중치를 계산하지 못했습니다. A/T 포즈와 마커 위치를 확인하세요.')
        for v in proxy.data.vertices:
            if any(g.weight>.0001 for g in v.groups):continue
            co,index,distance=tree.find(v.co)
            if distance>.04:raise ValueError('몸에서 분리된 작은 메시가 있습니다. 캐릭터에 연결한 뒤 다시 시도하세요.')
            for group in proxy.data.vertices[index].groups:proxy.vertex_groups[group.group].add([v.index],group.weight,'REPLACE')
    status(70,'원본 표면에 가중치를 옮깁니다. 형상과 재질은 유지합니다.')
    for obj in objects:
        obj.vertex_groups.clear();bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);proxy.select_set(True);bpy.context.view_layer.objects.active=proxy
        bpy.ops.object.data_transfer(data_type='VGROUP_WEIGHTS',use_create=True,vert_mapping='POLYINTERP_NEAREST',layers_select_src='ALL',layers_select_dst='NAME',mix_mode='REPLACE')
    bpy.data.objects.remove(proxy,do_unlink=True)

def validate_weights(rig):
    deform={b.name for b in rig.data.bones if b.use_deform};total=0;unweighted=0
    for o in meshes():
        if not any(mod.type=='ARMATURE' and mod.object==rig for mod in o.modifiers):
            raise ValueError('리그에 연결되지 않은 메시가 있습니다. 캐릭터 메시만 담긴 파일을 사용하세요.')
        groups={g.index for g in o.vertex_groups if g.name in deform}
        for v in o.data.vertices:
            total+=1
            if sum(g.weight for g in v.groups if g.group in groups)<.0001:unweighted+=1
    if unweighted: raise ValueError(f'자동 가중치가 없는 정점 {unweighted}/{total}개가 있습니다. 겹침·분리 메시를 정리하거나 마커를 조정한 뒤 다시 시도하세요.')

def finish():
    bpy.ops.wm.open_mainfile(filepath=str(folder/'prepared.blend'));request=read('request.json');status(10,'스켈레톤을 확인합니다.')
    if request['mode']=='existing':
        rig,mapping,compatible,missing=rig_info()
        if not compatible: raise ValueError('호환 뼈가 부족합니다: '+', '.join(missing))
        # Only rename the copy; local transforms, topology and skin weights are retained.
        for old,new in mapping.items():
            if not new: continue
            target='mixamorig'+new
            for o in meshes():
                group=o.vertex_groups.get(old)
                if group:group.name=target
            rig.data.bones[old].name=target
        validate_weights(rig);kind='existing'
    else: rig,kind=generate(request)
    status(85,'리깅된 캐릭터를 저장합니다.');rig.data.pose_position='POSE';gltf(folder/'model.glb')
    info=read('info.json');key=folder.name
    entry=dict(id='custom-'+key,name=info['name'],height=175,url='/api/character-library/'+key+'/model.glb',kind=kind,bones=len(rig.data.bones),fingerControl=all(rig.data.bones.get('mixamorig'+s+'HandIndex1') for s in ['Left','Right']))
    write('entry.json',entry);status(100,'리깅 완료 · 움직임을 확인한 뒤 장면에 추가하세요.','done')
try:
    prepare() if stage=='prepare' else finish()
except Exception as e:
    status(0,str(e),'failed');raise
