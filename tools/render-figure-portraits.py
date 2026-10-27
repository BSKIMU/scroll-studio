"""Render the existing local figures; never modify source GLBs or rigs."""
import bpy
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
out=root/'dist/assets/portraits';out.mkdir(parents=True,exist_ok=True)
for name in ('bodychan','bodykun','mixamo'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root/f'dist/assets/{name}.glb'))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bounds=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    zmax=max(v.z for v in bounds);zmin=min(v.z for v in bounds);h=zmax-zmin
    mat=bpy.data.materials.new('Portrait clay');mat.diffuse_color=(.60,.68,.73,1)
    for o in meshes:
        o.data.materials.clear();o.data.materials.append(mat)
    scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'
    scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.4
    scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True
    scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='WORLD'
    scene.display.shading.show_specular_highlight=True
    scene.display.shading.background_type='WORLD';scene.world=bpy.data.worlds.new('Backdrop');scene.world.color=(.09,.11,.14)
    target=Vector((0,0,zmax-h*.055))
    bpy.ops.object.camera_add(location=target+Vector((h*.10,-h*2,h*.015)))
    camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=h*.16;scene.camera=camera
    scene.render.resolution_x=240;scene.render.resolution_y=280;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out/f'{name}.png')
    bpy.ops.render.render(write_still=True)
