"""Tripo GLB (4 bears in one) -> 4 separate low-poly bears with one flat colour per face."""
import bpy, bmesh, sys, math
import numpy as np
from mathutils import Vector
src, outdir, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.data.objects if o.type == 'MESH'][0]
img = [i for i in bpy.data.images if 'basecolor' in i.name][0]
W, H = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, :3]  # linear floats, row 0 = bottom
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0005)
bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.data.objects if o.type == 'MESH']
np.save(f'{outdir}/tex.npy', px[::4, ::4])
for o in parts:
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    # sample the texture per face BEFORE decimating would be ideal, but faces change; sample after
    d = o.modifiers.new('d', 'DECIMATE'); d.ratio = target / len(o.data.polygons)
    bpy.ops.object.modifier_apply(modifier='d')
    me = o.data
    uv = me.uv_layers.active.data
    cols = []
    for p in me.polygons:
        # average a few texture samples across the face (centre + towards each corner)
        us = [uv[li].uv for li in p.loop_indices]
        cu = sum((u.x for u in us)) / len(us); cv = sum((u.y for u in us)) / len(us)
        acc = np.zeros(3); n = 0
        for t in (0.0, 0.4):
            for u in us:
                x = (cu + (u.x - cu) * t) % 1; y = (cv + (u.y - cv) * t) % 1
                acc += px[int(y * (H - 1)), int(x * (W - 1))]; n += 1
        cols.append(acc / n)
    np.save(f'{outdir}/{o.name[-4:] if "." in o.name else "base"}_cols.npy', np.array(cols))
    c = np.array([p.center[:] for p in me.polygons]); nr = np.array([p.normal[:] for p in me.polygons])
    np.save(f'{outdir}/{o.name[-4:] if "." in o.name else "base"}_geo.npy', np.concatenate([c, nr], 1))
    print(o.name, len(me.polygons))
bpy.ops.wm.save_as_mainfile(filepath=f'{outdir}/split.blend')
