"""Export user-provided props without running embedded Blender scripts."""
import bpy,json,sys,math,re
from pathlib import Path
from mathutils import Vector,Matrix
kind=sys.argv[sys.argv.index('--')+1]
out=Path(__file__).resolve().parent.parent/'local'/'prop-library';out.mkdir(parents=True,exist_ok=True)
if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
weapons={
 'Colt 1911':('Pistol',.22),'Glock 27':('Pistol',.18),'P226':('Pistol',.20),'USP':('Pistol',.20),
 'MX4':('SMG',.65),'MP7':('SMG',.42),'Mini Uzi':('SMG',.36),'MP5A4':('SMG',.68),'MP5SD6':('SMG',.78),'Skorpion':('SMG',.30),
 'SVDs':('Sniper',1.1),'Galil SR':('Sniper',1.05),'PSG-1':('Sniper',1.2),'Model 7':('Sniper',1.05),
 'R870':('Shotgun',.98),'SPAS-12':('Shotgun',1.04),'QBB-95':('LMG',1.0)}
if kind=='axe':
    bpy.ops.object.select_all(action='DESELECT')
    axe_parts=[o for o in bpy.context.scene.objects if o.type=='MESH']
    for o in axe_parts:o.select_set(True)
    bpy.context.view_layer.objects.active=axe_parts[0];bpy.ops.object.join();bpy.context.object.name='Viking Axe'
source=[o for o in bpy.context.scene.objects if o.type=='MESH' and (kind in ('guns','axe') or o.name==('shield' if kind=='shield' else 'Cube.001'))]
rows=[]
for original in source:
    name=original.name if kind in ('guns','axe') else 'Shield' if kind=='shield' else 'Long Sword'
    category,length=weapons.get(name,('Rifle',.87)) if kind=='guns' else ('Shield',.62) if kind=='shield' else ('Axe',.85) if kind=='axe' else ('Sword',1.08)
    slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-');folder=out/slug;folder.mkdir(exist_ok=True)
    o=original.copy();o.data=original.data.copy();bpy.context.scene.collection.objects.link(o)
    o.parent=None;o.matrix_world=Matrix.Identity(4)
    if kind=='guns':
        ys=[v.co.y for v in o.data.vertices];scale=length/(max(ys)-min(ys))
        # Canonical muzzle points toward glTF +Z; origin is the gripping hand.
        grip=Vector((0,1.55,-.70)) if category!='Pistol' else Vector((0,2.05,-2.0))
        for v in o.data.vertices:v.co=(v.co-grip)*scale
    elif kind in ('sword','axe'):
        zs=[v.co.z for v in o.data.vertices];scale=length/(max(zs)-min(zs))
        for v in o.data.vertices:v.co=(v.co-Vector((0,.16,-2.3) if kind=='axe' else (0,0,-9.0)))*scale
    else:
        scale=length/(max(v.co.y for v in o.data.vertices)-min(v.co.y for v in o.data.vertices))
        for v in o.data.vertices:
            x,y,z=v.co;v.co=Vector((x,-z,y))*scale
    # Legacy Blender Internal weapon materials have no PBR nodes.
    for slot in o.material_slots:
        if slot.material:
            m=slot.material.copy();slot.material=m
            if not m.use_nodes:m.use_nodes=True
            shader=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if shader:
                shader.inputs['Base Color'].default_value=m.diffuse_color
                shader.inputs['Roughness'].default_value=.48
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.export_scene.gltf(filepath=str(folder/'model.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_apply=True)
    rows.append(dict(id=slug,name=name,category=category,url='/api/prop-library/'+slug+'/model.glb',thumbnail='/api/prop-library/'+slug+'/thumb.png',length=length,source=Path(bpy.data.filepath).name))
    # Real model thumbnail, no generated illustration.
    for other in bpy.context.scene.objects:other.hide_render=other!=o
    scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=240;scene.render.resolution_y=200;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
    scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
    points=[o.matrix_world@Vector(v) for v in o.bound_box];center=sum(points,Vector())/8
    camera=bpy.data.objects.new('Library preview camera',bpy.data.cameras.new('Library camera'));scene.collection.objects.link(camera);camera.hide_render=False
    camera.location=center+(Vector((1.7,-.3,.3)) if kind=='guns' else Vector((1.4,-.4,.3)) if kind=='axe' else Vector((.4,-1.4,.4)))*length
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=length*1.25;scene.camera=camera
    scene.render.filepath=str(folder/'thumb.png');bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera,do_unlink=True);bpy.data.objects.remove(o,do_unlink=True)
(out/(kind+'-catalog.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2),'utf-8')
print('PROP_LIBRARY',kind,len(rows))
