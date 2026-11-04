import numpy as np
def lin(c): return np.clip(c, 0, 1) ** 2.2
def fix(key, cols, geo):
    c = np.array(cols)
    if key == '.002':  # tsukinowaguma: anything brown or pale on the body -> black fur
        pos, nrm = geo[:, :3], geo[:, 3:]
        x = pos[:, 0]; L = x.max() - x.min(); f = (x - x.min()) / L  # 0 = nose
        z = pos[:, 2]; zr = (z - z.min()) / (z.max() - z.min())
        lum = c.mean(1)
        warm = (c[:, 0] - c[:, 2])
        muzzle = (f < 0.09) & (zr > 0.45) & (zr < 0.72)
        dark = np.stack([lum, lum, lum * 1.08], 1)
        dark = 0.1 + (np.clip(dark, 0, 0.5) - 0.2) * 0.4
        body = ~muzzle
        c[body] = dark[body]
        c[muzzle] = np.where((lum[muzzle] > 0.35)[:, None], [0.62, 0.52, 0.4], dark[muzzle])
        y = pos[:, 1]; yc = (y.max() + y.min()) / 2; dy = np.abs(y - yc) / L
        cres = (nrm[:, 0] < -0.15) & (f > 0.1) & (f < 0.32) & (dy < 0.1) & (np.abs(zr - (0.38 + 1.7 * dy)) < 0.065)
        c[cres] = [0.66, 0.58, 0.45]
        print('crescent faces', cres.sum())
    return lin(c)
