"""One animal out of a Tripo sheet model (split.blend from process.py) -> one game-ready mesh.

usage: python3 export_critter.py <proc dir> <part key> <zlo> <zhi> <length> <out.glb>
  zlo/zhi: keep only faces whose centre height is inside this range (to cut apart animals that touch)
  length: nose-to-tail length in game units
The result faces +X (three.js), feet on y = 0, centred on x/z, one flat colour per face, mesh named "body".
"""
import bpy, bmesh, sys, math
import numpy as np
from mathutils import Matrix, Vector

d, key, zlo, zhi, length, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
bpy.ops.wm.open_mainfile(filepath=f'{d}/split.blend')
ob = [o for o in bpy.data.objects if o.type == 'MESH' and (o.name[-4:] if '.' in o.name else 'base') == key][0]
for o in [o for o in bpy.data.objects if o is not ob]:
    bpy.data.objects.remove(o)
cols = np.load(f'{d}/{key}_cols.npy')
me = ob.data
me.transform(ob.matrix_world); ob.matrix_world = Matrix()
# keep the faces in the height range, and their colours
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
keep = [zlo <= f.calc_center_median().z <= zhi for f in bm.faces]
bmesh.ops.delete(bm, geom=[f for f, k in zip(bm.faces, keep) if not k], context='FACES')
bm.to_mesh(me); bm.free()
cols = cols[np.array(keep)]
# drop crumbs (bits of the neighbouring animal): keep only the biggest connected piece
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
comp = [-1] * len(bm.faces); n = 0
for f0 in bm.faces:
    if comp[f0.index] >= 0: continue
    stack = [f0]; comp[f0.index] = n
    while stack:
        f = stack.pop()
        for e in f.edges:
            for g in e.link_faces:
                if comp[g.index] < 0: comp[g.index] = n; stack.append(g)
    n += 1
comp = np.array(comp); big = np.bincount(comp).argmax()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if comp[f.index] != big], context='FACES')
bm.to_mesh(me); bm.free()
cols = cols[comp == big]
print('pieces', n)
# line the body up: longest direction of the footprint -> x, head (the higher end) toward +x
vs = np.array([v.co[:] for v in me.vertices]); xy = vs[:, :2] - vs[:, :2].mean(0)
w, V = np.linalg.eigh(np.cov(xy.T)); ax = V[:, np.argmax(w)]
me.transform(Matrix.Rotation(-math.atan2(ax[1], ax[0]), 4, 'Z'))
vs = np.array([v.co[:] for v in me.vertices])
hi = vs[vs[:, 2] > np.percentile(vs[:, 2], 85)]
if hi[:, 0].mean() < vs[:, 0].mean():
    me.transform(Matrix.Rotation(math.pi, 4, 'Z'))
vs = np.array([v.co[:] for v in me.vertices]); mn, mx = vs.min(0), vs.max(0)
me.transform(Matrix.Translation(Vector((-(mn[0] + mx[0]) / 2, -(mn[1] + mx[1]) / 2, -mn[2]))))
me.transform(Matrix.Scale(length / (mx[0] - mn[0]), 4))
vs = np.array([v.co[:] for v in me.vertices]); print('size', (vs.max(0) - vs.min(0)).round(2), 'faces', len(me.polygons))
a = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
cols = np.clip(cols, 0, 1)
name = out.split('/')[-1].replace('.glb', '')
if name == 'tanuki':
    # the reconstruction lost the tanuki's markings (it read as a fox): darker coat, black legs, the black eye mask
    P = np.array([p.center[:] for p in me.polygons]); X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
    L, Hh = X.max() - X.min(), Z.max()
    f = (X.max() - X) / L                        # 0 = nose tip
    cols = cols * 0.72
    DARK = np.array([0.2, 0.16, 0.13])
    cols[Z < Hh * 0.32] = DARK                   # legs and paws
    head = f < 0.2
    zn = Z[f < 0.03].mean()                      # nose height
    cols[head & (f < 0.035)] = DARK * 0.6        # nose
    mask = head & (f > 0.04) & (f < 0.16) & (Z > zn - 0.01) & (Z < zn + 0.07) & (np.abs(Y) > 0.015)
    cols[mask] = DARK
    cols[head & (f > 0.035) & (f < 0.08) & (Z < zn + 0.01)] = [0.62, 0.52, 0.4]   # pale muzzle
    cols[f > 0.93] = DARK                        # tail tip
    print('tanuki mask', mask.sum())
lin = cols ** 2.2
for p, c in zip(me.polygons, lin):
    for li in p.loop_indices: a.data[li].color = (*c, 1)
    p.use_smooth = False
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
mat = bpy.data.materials.new('critter'); mat.use_nodes = True
nt = mat.node_tree; b = nt.nodes['Principled BSDF']; vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], b.inputs['Base Color'])
me.materials.clear(); me.materials.append(mat)
ob.name = 'body'
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_vertex_color='ACTIVE', export_materials='EXPORT')
