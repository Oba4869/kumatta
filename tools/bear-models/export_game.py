"""split.blend + fix.py -> game-ready bears: one flat colour per face, split into body + 4 legs,
in the game's frame (three.js: Y up, nose toward +Z, feet on y = 0, nose-to-rump 2.95)."""
import bpy, bmesh, sys, math, importlib.util
import numpy as np
from mathutils import Vector, Matrix
d, fixp, key, out = sys.argv[1:5]
bpy.ops.wm.open_mainfile(filepath=f'{d}/split.blend')
spec = importlib.util.spec_from_file_location('fix', fixp); fx = importlib.util.module_from_spec(spec); spec.loader.exec_module(fx)
ob = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name[-4:] if '.' in o.name else 'base') == key][0]
for o in [o for o in bpy.data.objects if o is not ob]: bpy.data.objects.remove(o)
cols = fx.fix(key, np.load(f'{d}/{key}_cols.npy'), np.load(f'{d}/{key}_geo.npy'))
me = ob.data
# bake transform, turn nose (-x) to -y (= three.js +z), scale, feet to 0
me.transform(ob.matrix_world); ob.matrix_world = Matrix()
# line the body up with the axes: principal direction of the footprint -> x (nose side is -x)
vs = np.array([v.co[:] for v in me.vertices]); xy = vs[:, :2] - vs[:, :2].mean(0)
w, V = np.linalg.eigh(np.cov(xy.T)); ax = V[:, np.argmax(w)]
ang = math.atan2(ax[1], ax[0])
if ax[0] > 0: ang += math.pi  # keep the head on -x? decide by where the nose is: furthest point from the centre along the axis
me.transform(Matrix.Rotation(-ang, 4, 'Z'))
vs = np.array([v.co[:] for v in me.vertices]); c0 = vs.mean(0)
# the head is the end that is higher up
hi = vs[vs[:, 2] > np.percentile(vs[:, 2], 80)]
if hi[:, 0].mean() > c0[0]: me.transform(Matrix.Rotation(math.pi, 4, 'Z'))
print('turned', round(math.degrees(ang), 1))
me.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
vs = np.array([v.co[:] for v in me.vertices])
mn, mx = vs.min(0), vs.max(0)
s = 2.95 / (mx[1] - mn[1])
nose_y = mn[1]
me.transform(Matrix.Translation(Vector((-(mn[0] + mx[0]) / 2, 0, -mn[2]))))
me.transform(Matrix.Scale(s, 4))
me.transform(Matrix.Translation(Vector((0, -(nose_y * 0 + (mn[1]) * s) - 1.83 + 0, 0))))
vs = np.array([v.co[:] for v in me.vertices]); print('bounds', vs.min(0).round(2), vs.max(0).round(2))
a = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
lin2srgb = lambda c: np.clip(c, 0, 1) ** (1 / 2.2)
for p, c in zip(me.polygons, cols):
    cc = np.clip(c, 0, 1)
    for li in p.loop_indices: a.data[li].color = (*cc, 1)
    p.use_smooth = False
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
mat = bpy.data.materials.new('bear'); mat.use_nodes = True
nt = mat.node_tree; b = nt.nodes['Principled BSDF']; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.9
me.materials.clear(); me.materials.append(mat)
# ---- split: legs below the belly
H = vs[:, 2].max()
belly = H * float(sys.argv[5]) if len(sys.argv) > 5 else H * 0.4
zmid = (vs[:, 1].min() + vs[:, 1].max()) / 2   # blender y = -three z
groups = {k: [] for k in ['body', 'legFL', 'legFR', 'legHL', 'legHR']}
# the parts overlap a little at the cut so no gap opens when a leg swings
for p in me.polygons:
    c = p.center
    if c.z < belly + 0.1:
        groups[('legF' if c.y < zmid else 'legH') + ('L' if c.x < 0 else 'R')].append(p.index)
    if c.z >= belly - 0.06:
        groups['body'].append(p.index)
for k, idx in groups.items():
    bm = bmesh.new(); bm.from_mesh(me); keep = set(idx)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    pm = bpy.data.meshes.new(k); bm.to_mesh(pm); bm.free()
    po = bpy.data.objects.new(k, pm); bpy.context.collection.objects.link(po)
    if k.startswith('leg'):
        pts = np.array([v.co[:] for v in pm.vertices])
        piv = Vector((float(np.median(pts[:, 0])), float(np.median(pts[:, 1])), belly + 0.18))
        pm.transform(Matrix.Translation(-piv)); po.location = piv
    print(k, len(pm.polygons), tuple(round(v, 2) for v in po.location))
bpy.data.objects.remove(ob)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_vertex_color='ACTIVE', export_materials='EXPORT')
