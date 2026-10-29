"""Copy authorized runtime libraries only. Source FBX/Blend, jobs and paths stay local."""
import json, re, shutil
from pathlib import Path
from pose_library_api import entries, bank, LIBRARY
from prop_library_api import catalog, ROOT as PROPS

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'dist/assets/libraries'
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def clean_id(value):
    if not re.fullmatch(r'[a-zA-Z0-9-]{1,80}',value):raise ValueError('Invalid library ID')
    return value
def select(data,keys):return {k:data[k] for k in keys if k in data}

motions=[];builtins=bank()
for entry in entries():
    key=clean_id(entry['id'])
    clip=builtins[key[8:]] if key.startswith('builtin-') else json.loads((LIBRARY/key/'clip.json').read_text('utf-8'))
    # Keep only playback data; local paths, prompts and per-machine audits are not assets.
    clip=select(clip,['label','duration','legLength','bones','frames','source','static','rest'])
    write(DEST/f'pose/clips/{key}.json',clip)
    row=select(entry,['id','name','category','genre','subcategory','pack','duration','kind','source','weaponType'])
    row['local']=True # Built-in, read-only entry; user imports still live in IndexedDB.
    motions.append(row)
write(DEST/'pose/catalog.json',dict(version=1,entries=motions))

props=[]
for entry in catalog():
    key=clean_id(entry['id']);folder=DEST/'prop'/key;folder.mkdir(parents=True,exist_ok=True)
    for name in ['model.glb','thumb.png']:shutil.copyfile(PROPS/key/name,folder/name)
    row=select(entry,['id','name','category','length','source'])
    row.update(url=f'{key}/model.glb',thumbnail=f'{key}/thumb.png');props.append(row)
write(DEST/'prop/catalog.json',dict(version=1,entries=props))
hands=json.loads((ROOT/'local/hand-library/catalog.json').read_text('utf-8'))
hands['entries']=[select(e,['id','name','category','source','hands']) for e in hands['entries']]
write(DEST/'hand/catalog.json',hands)
print(f'Runtime assets: {len(motions)} motions, {len(props)} props, {len(hands["entries"])} hands')
