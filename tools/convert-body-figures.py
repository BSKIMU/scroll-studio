"""Convert the user's Rigify figures to the app's canonical humanoid skeleton.

Run on a copy, with Blender --factory-startup --disable-autoexec. The source
rigs are retained in the blend file; only new runtime objects are exported.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector, Quaternion

output = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
output.mkdir(parents=True, exist_ok=True)
reports = []

def convert(key, source_name):
    source = bpy.data.objects[source_name]
    originals = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == source for m in o.modifiers)]
    specs, mapping = {}, {}
    def bone(name, first, last=None, parent=None, weights=None):
        a, b = source.data.bones[first], source.data.bones[last or first]
        specs[name] = (source.matrix_world @ a.head_local, source.matrix_world @ b.tail_local, parent)
        for w in weights or [first]: mapping[w] = name
    bone('Hips', 'DEF-spine', weights=['DEF-spine','DEF-pelvis.L','DEF-pelvis.R'])
    bone('Spine', 'DEF-spine.001', parent='Hips')
    bone('Spine1', 'DEF-spine.002', parent='Spine')
    bone('Spine2', 'DEF-spine.003', parent='Spine1')
    bone('Neck', 'DEF-spine.004', 'DEF-spine.005', 'Spine2', ['DEF-spine.004','DEF-spine.005'])
    bone('Head', 'DEF-spine.006', parent='Neck')
    for side, suffix in [('Left','L'),('Right','R')]:
        bone(side+'Shoulder', 'DEF-shoulder.'+suffix, parent='Spine2')
        for name, original, parent in [('Arm','upper_arm','Shoulder'),('ForeArm','forearm','Arm'),('UpLeg','thigh','Hips'),('Leg','shin','UpLeg')]:
            first = 'DEF-'+original+'.'+suffix
            bone(side+name, first, first+'.001', parent if parent=='Hips' else side+parent, [first,first+'.001'])
        bone(side+'Hand','DEF-hand.'+suffix,parent=side+'ForeArm')
        for n in range(1,5): mapping['DEF-palm.%02d.%s'%(n,suffix)] = side+'Hand'
        bone(side+'Foot','DEF-foot.'+suffix,parent=side+'Leg')
        bone(side+'ToeBase','DEF-toe.'+suffix,parent=side+'Foot')
        for finger, original in [('Thumb','thumb'),('Index','f_index'),('Middle','f_middle'),('Ring','f_ring'),('Pinky','f_pinky')]:
            for n in range(1,4):
                name = side+'Hand'+finger+str(n)
                bone(name,'DEF-%s.%02d.%s'%(original,n,suffix),parent=side+'Hand' if n==1 else side+'Hand'+finger+str(n-1))
            a,b,_ = specs[name]
            specs[side+'Hand'+finger+'4'] = (b.copy(),b+(b-a)*.2,name)
    # One coordinate space for meshes and bones, in metres with feet at zero.
    coords = [o.matrix_world @ v.co for o in originals for v in o.data.vertices]
    zmin,zmax = min(v.z for v in coords),max(v.z for v in coords)
    scale = 1.75/(zmax-zmin)
    def point(v): return (v-Vector((0,0,zmin)))*scale
    collection = bpy.data.collections.new('Runtime_'+key)
    bpy.context.scene.collection.children.link(collection)
    data = bpy.data.armatures.new(key+'_skeleton')
    rig = bpy.data.objects.new(key+'_rig',data)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name,(head,tail,parent) in specs.items():
        b=data.edit_bones.new('mixamorig'+name);b.head=point(head);b.tail=point(tail)
        if parent: b.parent=data.edit_bones['mixamorig'+parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    meshes, unmapped, max_dropped_weight = [], {}, 0
    for original in originals:
        mesh = bpy.data.objects.new(key+'_'+original.name, original.data.copy())
        collection.objects.link(mesh)
        for v in mesh.data.vertices: v.co=point(original.matrix_world @ v.co)
        # Rebuild weights; segmented Rigify bend bones share the runtime limb.
        weights = []
        for v in original.data.vertices:
            values={}
            for g in v.groups:
                old=original.vertex_groups[g.group].name
                if g.weight < 1e-8: continue
                name=mapping.get(old)
                if not name:
                    unmapped[old]=unmapped.get(old,0)+1
                    continue
                values[name]=values.get(name,0)+g.weight
            if not values: raise RuntimeError('Unweighted vertex: '+original.name+':'+str(v.index))
            weights.append(values)
        mesh.vertex_groups.clear()
        groups={name:mesh.vertex_groups.new(name='mixamorig'+name) for name in specs}
        for i,values in enumerate(weights):
            total=sum(values.values())
            max_dropped_weight=max(max_dropped_weight,sum(sorted(values.values(),reverse=True)[4:])/total)
            for name,value in values.items(): groups[name].add([i],value/total,'REPLACE')
        modifier=mesh.modifiers.new('Runtime skin','ARMATURE');modifier.object=rig
        mesh.parent=rig
        meshes.append(mesh)
    if unmapped: raise RuntimeError('Unmapped weighted bones: '+json.dumps(unmapped))
    def update(): bpy.context.view_layer.update()
    def aim(name, direction):
        b=rig.pose.bones['mixamorig'+name]
        matrix=b.matrix.copy();q=(b.tail-b.head).normalized().rotation_difference(Vector(direction))
        matrix=q.to_matrix().to_4x4() @ matrix
        matrix.translation=b.head.copy();b.matrix=matrix;update()
    # Normalize only the export bind pose. Mixamo's world rotation deltas expect
    # horizontal arms and palms down; the artist's joint locations are preserved.
    for side, sign in [('Left',1),('Right',-1)]:
        aim(side+'Arm',(sign,0,0));aim(side+'ForeArm',(sign,0,0))
        hand=rig.pose.bones['mixamorig'+side+'Hand']
        middle=rig.pose.bones['mixamorig'+side+'HandMiddle1']
        q=(middle.head-hand.head).normalized().rotation_difference(Vector((sign,0,0)))
        matrix=q.to_matrix().to_4x4() @ hand.matrix;matrix.translation=hand.head.copy();hand.matrix=matrix;update()
        index=rig.pose.bones['mixamorig'+side+'HandIndex1'].head
        pinky=rig.pose.bones['mixamorig'+side+'HandPinky1'].head
        across=index-pinky;across.x=0;across.normalize()
        q=across.rotation_difference(Vector((0,-1,0)))
        matrix=q.to_matrix().to_4x4() @ hand.matrix;matrix.translation=hand.head.copy();hand.matrix=matrix;update()
        for finger in ['Thumb','Index','Middle','Ring','Pinky']:
            first=rig.pose.bones['mixamorig'+side+'Hand'+finger+'1']
            direction=first.tail-first.head
            if finger!='Thumb': direction.z=0
            direction.normalize()
            for n in range(1,4): aim(side+'Hand'+finger+str(n),direction)
    # Bake this pose into the geometry and bind matrices, retaining skin weights.
    for mesh in meshes:
        bpy.context.view_layer.objects.active=mesh
        bpy.ops.object.modifier_apply(modifier=mesh.modifiers[0].name)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
    for mesh in meshes:
        modifier=mesh.modifiers.new('Runtime skin','ARMATURE');modifier.object=rig
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for mesh in meshes: mesh.select_set(True)
    bpy.context.view_layer.objects.active=rig
    path=output/(key+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_skins=True,export_def_bones=True,export_cameras=False,export_lights=False)
    reports.append({'model':key,'sourceRig':source_name,'originalBones':len(source.data.bones),'runtimeBones':len(data.bones),'meshes':len(meshes),'vertices':sum(len(m.data.vertices) for m in meshes),'bytes':path.stat().st_size,'unmappedWeights':unmapped,'maxDroppedWeight':max_dropped_weight})
    for mesh in meshes: mesh.select_set(False)
    rig.select_set(False)

convert('bodykun','body_kun_rig')
convert('bodychan','rig')
(output/'body-figures-report.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print('BODY_FIGURES_EXPORTED',json.dumps(reports))
