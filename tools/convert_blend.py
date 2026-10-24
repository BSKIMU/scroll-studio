import bpy, sys
from pathlib import Path
output=Path(sys.argv[sys.argv.index('--')+1])
result=bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_visible=True,export_cameras=False,export_lights=False,export_apply=True)
if not output.exists() or output.stat().st_size<100:
    raise RuntimeError('No GLB geometry exported')
print('SCROLL_STUDIO_CONVERSION_OK',output.stat().st_size)
