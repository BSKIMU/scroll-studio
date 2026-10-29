"""Loopback-only personal pose catalog and the already installed Kimodo runtime."""
from pathlib import Path
import json, math, os, re, shutil, subprocess, threading, uuid

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / 'local' / 'pose-library'
INSTALL = Path(os.environ.get('KIMODO_PATH', 'D:/다운로드/kimodo.cpp'))
JOB_LOCK = threading.Lock()
MOTIONBRICKS = Path(os.environ.get('MOTIONBRICKS_PATH', 'D:/_codex/motionbricks'))

def motionbricks_available():
    return (MOTIONBRICKS/'.venv/Scripts/python.exe').is_file() and (MOTIONBRICKS/'mmm_v6_soma_fp32.onnx').is_file()

def available():
    return all((INSTALL / p).is_file() for p in ['runtime/kmd-generate.exe', 'models/kimodo-soma-rp-v1.1-f32.gguf', 'Llama-3-Kimodo-Q8_0.gguf']) and bool(shutil.which('node'))

def category(name):
    if re.search(r'sword|fight|slash|attack|punch|kick|검|격투|베기', name, re.I): return '액션'
    if re.search(r'walk|run|stair|jump|걷|계단|달리', name, re.I): return '이동'
    if re.search(r'sit|lay|lie|앉|눕|누워', name, re.I): return '앉기·눕기'
    return '일상'

def bank():
    source = ROOT / 'local' / 'interaction-clips.json'
    return json.loads(source.read_text('utf-8')).get('clips', {}) if source.is_file() else {}

def entries():
    result = []
    for key, clip in bank().items():
        name = clip.get('label', key)
        result.append(dict(id='builtin-'+key, name=name, category=category(name+' '+key), duration=clip['duration'], kind='pose' if clip.get('static') else 'motion', source='Kimodo · 로컬 생성' if key.startswith('kimodo') else 'Mixamo · 개인 보관', local=True))
    for p in sorted(LIBRARY.glob('*/entry.json')):
        result.append(json.loads(p.read_text('utf-8')))
    return result

def respond(handler, payload):
    return handler.send_data(json.dumps(payload, ensure_ascii=False).encode('utf-8'), 'application/json; charset=utf-8')

def get(handler):
    path = handler.path.removeprefix('/api/pose-library/')
    if path == 'status': return respond(handler, dict(kimodo=available(), backend='vulkan', motionbricks=motionbricks_available(), motionbricksBackend='onnx-cpu'))
    if path == 'catalog': return respond(handler, dict(version=1, entries=entries()))
    if path.startswith('clips/'):
        key = path[6:].removesuffix('.json')
        if not re.fullmatch(r'[a-zA-Z0-9-]{1,80}', key): return handler.send_error(400)
        if key.startswith('builtin-'):
            clip = bank().get(key[8:])
            if clip: return respond(handler, clip)
        elif (LIBRARY/key/'clip.json').is_file():
            return handler.send_data((LIBRARY/key/'clip.json').read_bytes(), 'application/json; charset=utf-8')
    if path.startswith('jobs/'):
        key = path[5:]
        if re.fullmatch(r'[a-f0-9]{32}', key) and (LIBRARY/key/'job.json').is_file():
            return handler.send_data((LIBRARY/key/'job.json').read_bytes(), 'application/json; charset=utf-8')
    return handler.send_error(404)

def post(handler):
    if handler.path == '/api/pose-library/connect': return connect(handler)
    if handler.path != '/api/pose-library/generate': return handler.send_error(404)
    if not available(): return handler.fail(503, '설치된 Kimodo 실행기와 모델을 찾지 못했습니다.')
    try:
        size = int(handler.headers.get('Content-Length', '0'))
        if not 1 <= size <= 6000: return handler.send_error(413)
        data = json.loads(handler.rfile.read(size))
        prompt = data.get('prompt', '').strip()
        seconds = float(data.get('seconds', 4))
        if not 1 <= len(prompt) <= 1200 or not 2 <= seconds <= 8: return handler.send_error(400)
    except (ValueError, TypeError, AttributeError): return handler.send_error(400)
    if not JOB_LOCK.acquire(blocking=False): return handler.fail(409, '이미 동작을 생성하고 있습니다. 완료 후 다시 시도하세요.')
    key = uuid.uuid4().hex
    folder = LIBRARY/key
    folder.mkdir(parents=True)
    request = dict(prompt=prompt, frames=round(seconds*30), steps=40, seed=731, model='Kimodo-SOMA-RP-v1.1')
    (folder/'request.json').write_text(json.dumps(request, ensure_ascii=False), 'utf-8')
    def status(value):
        temp=folder/'job.tmp';temp.write_text(json.dumps(value, ensure_ascii=False),'utf-8');temp.replace(folder/'job.json')
    status(dict(state='running'))
    def run():
        try:
            with (folder/'process.log').open('wb') as log:
                subprocess.run([shutil.which('node'), str(ROOT/'tools/run-kimodo-library.mjs'), str(folder), str(INSTALL)], cwd=ROOT, stdout=log, stderr=log, timeout=1800, check=True, creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            status(dict(state='done'))
        except Exception:
            status(dict(state='failed', message='Kimodo 생성이 완료되지 않았습니다. 로컬 pose-library 폴더의 process.log를 확인하세요.'))
        finally: JOB_LOCK.release()
    threading.Thread(target=run, daemon=True).start()
    return respond(handler, dict(id=key, state='running'))

def connect(handler):
    if not motionbricks_available(): return handler.fail(503, 'MotionBricks 로컬 실행기와 모델을 찾지 못했습니다.')
    try:
        size = int(handler.headers.get('Content-Length', '0'))
        if not 1 <= size <= 16000: return handler.send_error(413)
        data = json.loads(handler.rfile.read(size));steps = data['steps'];name = data.get('name', 'AI 동작 연결')
        if not isinstance(name,str) or not 1<=len(name.strip())<=100 or not isinstance(steps,list) or not 2<=len(steps)<=8: raise ValueError()
        catalog = {e['id']: e for e in entries()};clean=[];duration=0
        for row in steps:
            key=row['id']
            if not isinstance(key,str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,80}',key) or key not in catalog: raise ValueError()
            start,end,speed=[float(row[k]) for k in ['start','end','speed']]
            if not all(math.isfinite(n) for n in [start,end,speed]) or not .25<=speed<=3 or not 0<=start<end<=catalog[key]['duration']+.01 or not .1<=(end-start)/speed<=60: raise ValueError()
            duration+=(end-start)/speed
            clean.append(dict(id=key,start=start,end=end,speed=speed))
        if duration+(len(clean)-1)*2>180: raise ValueError()
    except (ValueError,KeyError,TypeError,AttributeError):return handler.fail(400, '로컬 라이브러리 동작 2~8개와 올바른 시작·끝 시점을 선택하세요. 전체 길이는 180초 이하여야 합니다.')
    if not JOB_LOCK.acquire(blocking=False):return handler.fail(409, '다른 동작을 생성 중입니다. 완료 후 다시 시도하세요.')
    key=uuid.uuid4().hex;folder=LIBRARY/key;folder.mkdir(parents=True)
    def weapon(entry):
        if entry.get('weaponType') in ['gun','sword','axe','unarmed']:return entry['weaponType']
        text=entry.get('name','')+' '+entry.get('pack','')
        return 'sword' if re.search(r'sword|검술|검 |검격',text,re.I) else 'axe' if re.search(r'axe',text,re.I) else 'gun' if re.search(r'rifle|shooter|pistol|handgun|총|사격',text,re.I) else 'unarmed'
    weapons={weapon(catalog[row['id']]) for row in clean}
    request=dict(name=name.strip(),steps=clean)
    if len(weapons)==1:request['weaponType']=weapons.pop()
    (folder/'request.json').write_text(json.dumps(request,ensure_ascii=False),'utf-8')
    def status(value):
        temp=folder/'job.tmp';temp.write_text(json.dumps(value,ensure_ascii=False),'utf-8');temp.replace(folder/'job.json')
    status(dict(state='running',engine='motionbricks'))
    def run():
        try:
            with (folder/'process.log').open('wb') as log:
                subprocess.run([str(MOTIONBRICKS/'.venv/Scripts/python.exe'),str(ROOT/'tools/motionbricks_bridge.py'),str(folder),str(MOTIONBRICKS/'mmm_v6_soma_fp32.onnx')],cwd=ROOT,stdout=log,stderr=log,timeout=180,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            status(dict(state='done',entry=key,metrics=json.loads((folder/'metrics.json').read_text('utf-8'))))
        except Exception:status(dict(state='failed',message='연결 생성이 완료되지 않았습니다. 더 가까운 자세를 연결해 보세요. 로컬 process.log에서 원인을 확인할 수 있습니다.'))
        finally:JOB_LOCK.release()
    threading.Thread(target=run,daemon=True).start()
    return respond(handler,dict(id=key,state='running'))
