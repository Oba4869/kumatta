"""Per-face colour fixes, in the game frame: x = sideways, -y = toward the nose, z = up (metres, nose-to-rump 2.95)."""
import numpy as np

CREAM = np.array([0.72, 0.63, 0.48])
MUZZLE = np.array([0.62, 0.52, 0.4])


def lin(c):
    return np.clip(c, 0, 1) ** 2.2


def fix(key, cols, geo):
    c = np.array(cols, float)
    if key != '.002':
        return lin(c)
    # tsukinowaguma: the reconstruction smeared brown and grey onto its back; everything becomes black fur,
    # then the pale muzzle and the crescent bib are painted back on
    pos, nrm = geo[:, :3], geo[:, 3:]
    y = pos[:, 1]; f = (y - y.min()) / (y.max() - y.min())     # 0 = nose tip, 1 = rump
    z = pos[:, 2]; x = pos[:, 0]
    lum = c.mean(1)
    fur = 0.1 + (np.clip(lum, 0, 0.5) - 0.2) * 0.4
    out = np.stack([fur, fur, fur * 1.08], 1)
    # muzzle: the front of the snout, below the eyes
    nose_z = z[f < 0.02].mean()
    muzzle = (f < 0.1) & (z < nose_z + 0.1) & (z > nose_z - 0.22) & (lum > 0.3)
    out[muzzle] = MUZZLE
    # crescent: a V on the chest, centred under the head. Only on the surface you see from the front:
    # a front-view depth buffer keeps the faces nearest the camera in each little square
    front = nrm[:, 1] < -0.15
    bx, bz = np.floor(x / 0.05).astype(int), np.floor(z / 0.05).astype(int)
    near = {}
    for i in np.where(front)[0]:
        k = (bx[i], bz[i]); near[k] = min(near.get(k, 9), y[i])
    seen = np.array([front[i] and y[i] < near.get((bx[i], bz[i]), 9) + 0.1 for i in range(len(y))])
    xc = np.median(x[seen & (f < 0.3) & (z > 0.6) & (z < 0.9)])
    dx = np.abs(x - xc)
    zc = 0.66 + 0.85 * dx
    cres = seen & (f > 0.08) & (f < 0.4) & (dx < 0.36) & (np.abs(z - zc) < 0.085 - 0.06 * dx) & ~muzzle
    out[cres] = CREAM
    print('muzzle', muzzle.sum(), 'crescent', cres.sum(), 'xc %.2f nose_z %.2f' % (xc, nose_z))
    return lin(out)
