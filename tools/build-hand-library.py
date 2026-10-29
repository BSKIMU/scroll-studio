"""One-time CLUTCH inference, articulation limits and diverse static selection.

No model is loaded by the web app. Local source frames stay available for audit.
"""
from pathlib import Path
import json, time
import numpy as np
from scipy.spatial.transform import Rotation
from clutch_bridge import load_models, generate_many, INSTALL

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'local/hand-library'
PROMPTS={
 '기본 손 모양':[
  ('편안하게 펴기','relaxes the hands with the fingers slightly curved'),
  ('손바닥 펼치기','opens the palms and spreads all the fingers'),
  ('손가락 모으기','holds the hands open with all fingers together'),
  ('느슨한 주먹','slowly curls the fingers into a loose fist'),
  ('단단한 주먹','clenches the fists firmly'),
  ('손가락 풀기','opens and closes the fingers to relax the hands'),
  ('손끝 오므리기','brings all fingertips together into a small pinch'),
  ('손바닥 오목하게','cups the palms to hold a little water')],
 '가리키기·표현':[
  ('검지로 가리키기','points with the index finger while curling the other fingers'),
  ('엄지 세우기','makes a thumbs up gesture'),
  ('브이 표시','makes a peace sign with the index and middle fingers'),
  ('동그라미 표시','makes an okay sign by touching the index fingertip to the thumb'),
  ('손짓으로 부르기','beckons with the index finger'),
  ('손바닥으로 멈춤','raises an open palm to signal stop'),
  ('손가락으로 세기','counts on the fingers one finger at a time'),
  ('작은 크기 표현','holds the thumb and index finger slightly apart to show a small size')],
 '집기·섬세한 조작':[
  ('동전 집기','picks up a small coin between the thumb and index finger'),
  ('바늘 잡기','holds a needle delicately between the thumb and index finger'),
  ('종이 모서리 집기','pinches the corner of a sheet of paper'),
  ('단추 끼우기','buttons a shirt with both hands'),
  ('지퍼 당기기','pinches and pulls a small zipper'),
  ('열쇠 돌리기','holds a small key between the fingers and turns it'),
  ('실 잡아당기기','pinches a thread and pulls it gently'),
  ('작은 구슬 집기','picks up a small bead with the fingertips')],
 '일상 물건':[
  ('컵 감싸기','wraps the fingers around a drinking cup'),
  ('컵 손잡이 잡기','holds the small handle of a coffee mug'),
  ('병 잡기','grips a cylindrical water bottle'),
  ('책 받치기','supports an open book in the hands'),
  ('휴대전화 잡기','holds a phone and taps the screen with the thumb'),
  ('가방 손잡이 잡기','curls the fingers around a bag handle'),
  ('문손잡이 잡기','grasps and turns a round door knob'),
  ('우산 손잡이 잡기','wraps the fingers around an umbrella handle')],
 '도구·식사':[
  ('연필 잡기','holds a pencil with the thumb index and middle fingers'),
  ('붓 잡기','holds a paintbrush and paints carefully'),
  ('숟가락 잡기','holds a spoon between the fingers'),
  ('포크 잡기','grasps a fork to eat'),
  ('젓가락 잡기','holds chopsticks and pinches food'),
  ('가위 잡기','holds scissors and opens and closes them'),
  ('드라이버 잡기','grasps a screwdriver and twists it'),
  ('망치 잡기','holds a hammer handle firmly')],
 '전투·소품 잡기':[
  ('한손 검 잡기','grips a sword handle firmly with one hand'),
  ('양손 검 잡기','holds a sword handle firmly with both hands'),
  ('방패 손잡이 잡기','grips the handle of a shield'),
  ('도끼 자루 잡기','wraps the fingers firmly around an axe handle'),
  ('권총 손잡이 잡기','holds a pistol with the index finger extended beside the trigger'),
  ('소총 손잡이 잡기','grips a rifle handle with the trigger finger slightly curled'),
  ('활 잡기','holds a bow handle with a relaxed grip'),
  ('활시위 당기기','hooks three fingertips around a bow string')],
 '양손·접촉':[
  ('두 손 모으기','brings the palms together with fingers extended'),
  ('깍지 끼기','interlaces the fingers of both hands gently'),
  ('박수 준비','holds both hands open ready to clap'),
  ('손등 감싸기','wraps one hand gently around the other hand'),
  ('손가락 맞대기','touches the fingertips of both hands together'),
  ('부드럽게 악수','grasps another hand in a gentle handshake'),
  ('손바닥 받치기','holds one palm open while the other fingers rest on it'),
  ('손가락 마사지','gently rubs one finger with the opposite hand')],
 '활동·연기':[
  ('피아노 건반 누르기','curves the fingers and presses piano keys'),
  ('기타 줄 짚기','presses guitar strings with the fingertips'),
  ('키보드 입력','types on a keyboard with curved fingers'),
  ('작은 공 잡기','holds a small ball in the palm'),
  ('큰 공 받치기','spreads the fingers to support a large ball'),
  ('천 잡아당기기','grasps a piece of cloth and pulls it'),
  ('난간 잡기','wraps the fingers around a horizontal rail'),
  ('탁자에 손끝 대기','rests curved fingertips gently on a table')]
}

def constrained(joints):
    result={}
    for name,q in joints.items():
        angles=Rotation.from_quat(q).as_euler('XYZ')
        thumb=name.startswith('Thumb');base=name.endswith('1')
        limits=([[-40,40],[-45,45],[-15,80]] if thumb and base else
                [[-18,18],[-25,25],[-8,95]] if thumb else
                [[-12,12],[-24,24],[-8,90]] if base else
                [[-6,6],[-8,8],[-4,110]])
        angles=np.clip(angles,np.deg2rad(np.array(limits)[:,0]),np.deg2rad(np.array(limits)[:,1]))
        result[name]=Rotation.from_euler('XYZ',angles).as_quat().round(6).tolist()
    return result

def vector(hands):
    return np.array([q for side in ['right','left'] for q in hands[side].values()])

def distance(a,b):
    return np.sqrt(np.mean((2*np.arccos(np.clip(np.abs(np.sum(a*b,axis=-1)),0,1)))**2,axis=-1))

def main():
    OUT.mkdir(parents=True,exist_ok=True);raw=OUT/'source';raw.mkdir(exist_ok=True)
    prompts=[(category,name,'A person '+action+'.') for category,items in PROMPTS.items() for name,action in items]
    models=None;candidates=[];started=time.monotonic()
    for start in range(0,len(prompts),4):
        group=prompts[start:start+4];missing=[(start+i,p) for i,p in enumerate(group) if not (raw/f'{start+i:03}.json').is_file()]
        if missing:
            if models is None: models=load_models()
            sequences=generate_many(models,[p[2] for _,p in missing],731+start)
            for (i,p),frames in zip(missing,sequences):
                (raw/f'{i:03}.json').write_text(json.dumps(dict(prompt=p[2],seed=731+start,frames=frames)),'utf-8')
        for i,(category,name,prompt) in enumerate(group,start):
            frames=json.loads((raw/f'{i:03}.json').read_text())['frames'];pool=[]
            for frame in range(2,len(frames)-2,3):
                hands={side:constrained(frames[frame][side]) for side in ['right','left']}
                pool.append(dict(category=category,name=name,prompt=prompt,frame=frame,seed=731+start,hands=hands,promptIndex=i))
            # Keep distinctive frames rather than a sequence of near duplicates.
            vectors=np.stack([vector(p['hands']) for p in pool]);chosen=[len(pool)//2]
            nearest=distance(vectors,vectors[chosen[0]])
            for _ in range(min(13,len(pool)-1)):
                j=int(nearest.argmax())
                if nearest[j]<np.deg2rad(3):break
                chosen.append(j);nearest=np.minimum(nearest,distance(vectors,vectors[j]))
            candidates.extend(pool[j] for j in chosen)
        print(f'CLUTCH prompts {start+len(group)}/{len(prompts)}; candidates {len(candidates)}; {time.monotonic()-started:.0f}s',flush=True)
    # Global dedup, balanced round-robin across descriptions.
    selected=[];vectors=[];groups=[[c for c in candidates if c['promptIndex']==i] for i in range(len(prompts))]
    for rank in range(14):
        for group in groups:
            if rank>=len(group):continue
            item=group[rank];v=vector(item['hands'])
            if vectors and distance(np.stack(vectors),v).min()<np.deg2rad(2):continue
            selected.append(item);vectors.append(v)
            if len(selected)==500:break
        if len(selected)==500:break
    if len(selected)<500:raise RuntimeError(f'Only {len(selected)} distinct poses; retain source and extend prompts.')
    counts={};entries=[]
    for i,item in enumerate(selected):
        counts[item['name']]=counts.get(item['name'],0)+1
        entries.append(dict(id=f'clutch-{i+1:03}',name=f"{item['name']} {counts[item['name']]}",category=item['category'],source='CLUTCH',prompt=item['prompt'],frame=item['frame'],seed=item['seed'],hands=item['hands']))
    (OUT/'catalog.json').write_text(json.dumps(dict(version=1,engine='CLUTCH',static=True,entries=entries),ensure_ascii=False,separators=(',',':')),'utf-8')
    print('SAVED',len(entries),'static poses',flush=True)

if __name__=='__main__':main()
