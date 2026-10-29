from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import subprocess,tempfile,os,json,sys,threading,datetime,uuid
import pose_library_api
import prop_library_api
import hand_library_api
import character_library_api
ROOT=Path(__file__).resolve().parent.parent
PORT=int(os.environ.get('SCROLL_PORT','8765'))
BACKGROUND_PRESETS={'test-light.glb':{'id':'local-test-light','name':'test.blend · 경량 배경','meshes':33,'path':ROOT/'local'/'test-background-light.glb'}}
BACKGROUND_PRESETS['tea-time.glb']={'id':'local-tea-time','name':'Tea Time · 티 타임','meshes':161,'scale':1,'version':2,'path':ROOT/'dist'/'assets'/'tea-time.glb'}
POSE_ASSETS={name:ROOT/'local'/'pose-lab'/name for name in ['walk-reference.fbx','jump-reference.glb','motion-clips/idle.json','motion-clips/stop.json','motion-clips/run.json','motion-clips/leap.json','motion-clips/leapMirror.json']}
BLENDER=next((p for p in [os.environ.get('BLENDER_PATH',''),r'D:\_codex\#3d\local\runtime\blender-4.5.9-windows-x64\blender.exe',r'C:\Program Files\Blender Foundation\Blender 3.4\blender.exe'] if p and Path(p).is_file()),None)
lock=threading.Lock()
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
    def allowed(self):
        return self.headers.get('Host') in [f'127.0.0.1:{PORT}',f'localhost:{PORT}'] and self.headers.get('Origin') in [None,f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}']
    def do_GET(self):
        if not self.allowed(): return self.send_error(403)
        if self.path.startswith('/api/character-library/'): return character_library_api.get(self,BLENDER)
        if self.path.startswith('/api/pose-library/'): return pose_library_api.get(self)
        if self.path.startswith('/api/prop-library/'): return prop_library_api.get(self)
        if self.path.startswith('/api/hand-library/'): return hand_library_api.get(self)
        if self.path=='/api/interaction-clips.json':
            source=ROOT/'local'/'interaction-clips.json'
            if not source.is_file():return self.send_error(404)
            return self.send_data(source.read_bytes(),'application/json; charset=utf-8')
        if self.path=='/api/background-presets':
            presets=[{'id':p['id'],'name':p['name'],'meshes':p['meshes'],'scale':p.get('scale'),'version':p.get('version'),'size':p['path'].stat().st_size,'url':'/api/background-presets/'+name} for name,p in BACKGROUND_PRESETS.items() if p['path'].is_file()]
            return self.send_data(json.dumps(presets,ensure_ascii=False).encode('utf-8'),'application/json; charset=utf-8')
        if self.path.startswith('/api/background-presets/'):
            preset=BACKGROUND_PRESETS.get(self.path.removeprefix('/api/background-presets/'))
            if preset is None or not preset['path'].is_file():return self.send_error(404)
            return self.send_data(preset['path'].read_bytes(),'model/gltf-binary')
        if self.path.startswith('/api/pose-lab/'):
            source=POSE_ASSETS.get(self.path.removeprefix('/api/pose-lab/'))
            if source is None or not source.is_file():return self.send_error(404)
            data=source.read_bytes();self.send_response(200);self.send_header('Content-Type','application/json' if source.suffix=='.json' else 'application/octet-stream');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-cache');self.end_headers();self.wfile.write(data);return
        if self.path=='/api/status':
            payload=json.dumps({'blender':bool(BLENDER),'skp':'browser'}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload);return
        super().do_GET()
    def send_data(self,data,content_type):
        self.send_response(200);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-cache');self.end_headers();self.wfile.write(data)
    def do_POST(self):
        if not self.allowed(): return self.send_error(403)
        if self.path.startswith('/api/character-library/'): return character_library_api.post(self,BLENDER)
        if self.path.startswith('/api/pose-library/'): return pose_library_api.post(self)
        if self.path=='/api/project-backup':
            try: size=int(self.headers.get('Content-Length','0'))
            except ValueError:return self.send_error(400)
            if size<2 or size>500*1024*1024:return self.fail(413,'백업 크기는 500MB 이하이어야 합니다.')
            folder=ROOT/'local'/'backups';folder.mkdir(exist_ok=True,parents=True)
            name=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:8]+'.scroll.json'
            path=folder/name
            self.connection.settimeout(120)
            with path.open('xb') as output:
                remaining=size
                while remaining:
                    chunk=self.rfile.read(min(1048576,remaining))
                    if not chunk:break
                    output.write(chunk);remaining-=len(chunk)
            if remaining:return self.fail(400,'백업 전송이 중단되었습니다. 원고는 변경되지 않았습니다.')
            return self.send_data(json.dumps({'path':str(path)},ensure_ascii=False).encode('utf-8'),'application/json; charset=utf-8')
        if self.path!='/api/blend': return self.send_error(404)
        if not BLENDER:return self.fail(503,'Blender를 찾지 못했습니다. BLENDER_PATH 환경변수에 실행 파일 경로를 지정하세요.')
        try: size=int(self.headers.get('Content-Length','0'))
        except ValueError:return self.send_error(400)
        if size<12 or size>150*1024*1024:return self.fail(413,'150MB 이하의 Blender 파일을 선택하세요.')
        if not lock.acquire(blocking=False):return self.fail(409,'다른 모델을 변환하고 있습니다. 완료 후 다시 시도하세요.')
        try:
            temp_root=ROOT/'local'/'tmp';temp_root.mkdir(parents=True,exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='scroll-studio-',dir=temp_root) as tmp:
                source=Path(tmp)/'source.blend';output=Path(tmp)/'scene.glb'
                self.connection.settimeout(120)
                data=self.rfile.read(size)
                if len(data)!=size:return self.fail(400,'파일 전송이 중단되었습니다.')
                if not (data.startswith(b'BLENDER') or data.startswith(b'\x1f\x8b') or data.startswith(b'\x28\xb5\x2f\xfd')):return self.fail(400,'Blender 파일 형식이 아닙니다.')
                source.write_bytes(data)
                args=[BLENDER,'--background','--factory-startup','--disable-autoexec',str(source),'--python',str(ROOT/'tools/convert_blend.py'),'--',str(output)]
                result=subprocess.run(args,capture_output=True,timeout=180,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                if result.returncode or not output.exists():
                    print(result.stdout.decode(errors='replace')[-3000:]);return self.fail(422,'Blender가 파일을 변환하지 못했습니다. 파일 버전과 외부 에셋을 확인하세요.')
                data=output.read_bytes();self.send_response(200);self.send_header('Content-Type','model/gltf-binary');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        except subprocess.TimeoutExpired:self.fail(504,'Blender 변환이 180초를 초과했습니다.')
        except Exception as e:self.fail(500,'로컬 변환 오류: '+str(e))
        finally:lock.release()
    def fail(self,status,message):
        data=message.encode('utf-8');self.send_response(status);self.send_header('Content-Type','text/plain; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
if __name__=='__main__':
    print(f'SCROLL STUDIO: http://127.0.0.1:{PORT}',flush=True)
    print('Blender available:',bool(BLENDER),flush=True)
    ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
