"""Private, loopback character import jobs. Sources never leave this machine."""
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import json, os, re, subprocess, threading, uuid

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = ROOT / 'local' / 'character-library'
LOCK = threading.Lock()
LIMIT = 150 * 1024 * 1024

def write(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False), 'utf-8')
    tmp.replace(path)

def respond(handler, value):
    return handler.send_data(json.dumps(value, ensure_ascii=False).encode(), 'application/json; charset=utf-8')

def folder_for(key):
    if not re.fullmatch(r'[a-f0-9]{32}', key): raise ValueError('잘못된 캐릭터 ID입니다.')
    folder = LIBRARY / key
    if not folder.is_dir(): raise ValueError('캐릭터 파일을 찾지 못했습니다.')
    return folder

def get(handler, blender):
    parts = urlsplit(handler.path).path.removeprefix('/api/character-library/').split('/')
    if parts == ['catalog']:
        entries = [json.loads(p.read_text('utf-8')) for p in sorted(LIBRARY.glob('*/entry.json'))]
        return respond(handler, dict(available=bool(blender), entries=entries))
    try:
        if len(parts) != 2: raise ValueError()
        folder = folder_for(parts[0]); filename = parts[1]
        if filename not in ['job.json', 'info.json', 'preview.glb', 'model.glb', 'entry.json']: raise ValueError()
        path = folder / filename
        if not path.is_file(): return handler.send_error(404)
        return handler.send_data(path.read_bytes(), 'model/gltf-binary' if path.suffix == '.glb' else 'application/json; charset=utf-8')
    except ValueError: return handler.send_error(404)

def launch(folder, stage, blender):
    write(folder/'job.json', dict(state='running', stage=stage, progress=0, message='Blender를 준비합니다.'))
    def run():
        try:
            with (folder/(stage+'.log')).open('wb') as log:
                subprocess.run([blender, '--background', '--factory-startup', '--disable-autoexec', '--python', str(ROOT/'tools/character_autorig.py'), '--', str(folder), stage], cwd=ROOT, stdout=log, stderr=log, timeout=300, check=True, creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            status = json.loads((folder/'job.json').read_text('utf-8'))
            if status.get('state') != 'done': raise RuntimeError()
        except Exception:
            status = json.loads((folder/'job.json').read_text('utf-8'))
            if status.get('state') != 'failed':
                write(folder/'job.json', dict(state='failed', stage=stage, message='변환이 완료되지 않았습니다. 모델 복잡도·파일 형식을 확인하세요. 로컬 작업 로그에 원인이 기록됩니다.'))
        finally: LOCK.release()
    threading.Thread(target=run, daemon=True).start()

def validate_request(data):
    if not isinstance(data, dict): raise ValueError('리깅 설정이 올바르지 않습니다.')
    if data.get('mode') == 'existing': return dict(mode='existing')
    markers = data.get('markers', {})
    names = ['chin', 'groin', 'leftWrist', 'rightWrist', 'leftElbow', 'rightElbow', 'leftKnee', 'rightKnee']
    import math
    if not isinstance(markers, dict) or set(markers) != set(names): raise ValueError('8개 마커를 모두 배치하세요.')
    for value in markers.values():
        if not isinstance(value, list) or len(value) != 3 or not all(isinstance(n, (float,int)) and math.isfinite(n) and abs(n)<3 for n in value): raise ValueError('마커 좌표가 올바르지 않습니다.')
    if not .3 < markers['groin'][1] < markers['chin'][1] < 1.75: raise ValueError('사타구니와 턱 높이를 확인하세요.')
    for side, sign in [('left',1),('right',-1)]:
        w,e,k = [markers[side+n] for n in ['Wrist','Elbow','Knee']]
        if w[0]*sign <= e[0]*sign or e[0]*sign < .08 or not 0<k[1]<markers['groin'][1]: raise ValueError('팔을 벌린 A/T 포즈에서 손목·팔꿈치·무릎의 좌우와 높이를 확인하세요.')
    if data.get('lod') not in ['body','hands']: raise ValueError('스켈레톤 상세도를 선택하세요.')
    return dict(mode='generate', markers=markers, lod=data['lod'])

def post(handler, blender):
    if not blender: return handler.fail(503, '로컬 Blender가 필요합니다.')
    try:
        parsed=urlsplit(handler.path); size=int(handler.headers.get('Content-Length','0'))
        importing=parsed.path=='/api/character-library/import'
        if not 0<size<=(LIMIT if importing else 12000): return handler.fail(413, '캐릭터 파일은 150MB 이하로 선택하세요.')
        if not LOCK.acquire(blocking=False): return handler.fail(409, '다른 캐릭터를 처리 중입니다. 완료 후 다시 시도하세요.')
        launched=False
        try:
            handler.connection.settimeout(120)
            if importing:
                query=parse_qs(parsed.query); name=query.get('name',['character'])[0]
                ext=Path(name).suffix.lower()
                if ext not in ['.glb','.fbx','.obj']: raise ValueError('GLB, FBX, OBJ 캐릭터 파일을 선택하세요.')
                key=uuid.uuid4().hex;folder=LIBRARY/key;folder.mkdir(parents=True)
                with (folder/('source'+ext)).open('xb') as output:
                    remaining=size
                    while remaining:
                        chunk=handler.rfile.read(min(1048576,remaining))
                        if not chunk: raise ValueError('파일 전송이 중단되었습니다.')
                        output.write(chunk);remaining-=len(chunk)
                write(folder/'source.json',dict(name=Path(name).stem[:100],ext=ext))
                launch(folder,'prepare',blender);launched=True
                return respond(handler,dict(id=key))
            parts=parsed.path.removeprefix('/api/character-library/').split('/')
            if len(parts)!=2 or parts[1]!='rig': raise ValueError('잘못된 리깅 요청입니다.')
            folder=folder_for(parts[0])
            if not (folder/'prepared.blend').is_file(): raise ValueError('먼저 캐릭터를 불러오세요.')
            data=validate_request(json.loads(handler.rfile.read(size)))
            if (folder/'entry.json').exists(): raise ValueError('이미 등록된 캐릭터입니다. 다시 불러와 수정하세요.')
            write(folder/'request.json',data);launch(folder,'rig',blender);launched=True
            return respond(handler,dict(id=parts[0]))
        finally:
            if not launched: LOCK.release()
    except (ValueError,TypeError,KeyError) as e: return handler.fail(400,str(e) or '잘못된 요청입니다.')
