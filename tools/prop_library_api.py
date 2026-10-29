"""Read-only local prop assets. Never serves arbitrary filesystem paths."""
from pathlib import Path
import json, re
ROOT=Path(__file__).resolve().parent.parent/'local'/'prop-library'
def catalog():
    rows=[]
    for p in sorted(ROOT.glob('*-catalog.json')):
        rows.extend(json.loads(p.read_text('utf-8')))
    return rows
def get(handler):
    path=handler.path.removeprefix('/api/prop-library/').split('?',1)[0]
    rows=catalog()
    if path=='catalog':
        return handler.send_data(json.dumps(dict(entries=rows),ensure_ascii=False).encode('utf-8'),'application/json; charset=utf-8')
    match=re.fullmatch(r'([a-z0-9-]{1,80})/(model\.glb|thumb\.png)',path)
    if not match or match[1] not in {r['id'] for r in rows}: return handler.send_error(404)
    file=ROOT/match[1]/match[2]
    if not file.is_file():return handler.send_error(404)
    return handler.send_data(file.read_bytes(),'model/gltf-binary' if match[2].endswith('.glb') else 'image/png')
