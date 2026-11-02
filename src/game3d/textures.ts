/**
 * Procedural textures drawn on canvases at start-up, so the game ships no image files.
 */
import * as THREE from 'three';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!] as const;
}

function tex(c: HTMLCanvasElement, repeat = 1, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft blobs of colour scattered over a base, wrapping at the edges so it tiles. */
function blotch(x: CanvasRenderingContext2D, size: number, n: number, rMin: number, rMax: number, colors: string[], alpha: [number, number]) {
  for (let i = 0; i < n; i++) {
    const cx = Math.random() * size, cy = Math.random() * size, r = rnd(rMin, rMax);
    x.globalAlpha = rnd(alpha[0], alpha[1]);
    x.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      x.beginPath();
      x.ellipse(cx + ox, cy + oy, r, r * rnd(0.5, 1), Math.random() * 3, 0, Math.PI * 2);
      x.fill();
    }
  }
  x.globalAlpha = 1;
}

/** Forest floor: dark soil, moss, fallen needles and leaves. */
export function groundTextures(snow: boolean) {
  const S = 512;
  const [c, x] = canvas(S);
  x.fillStyle = snow ? '#c9d2d6' : '#1e271f';
  x.fillRect(0, 0, S, S);
  if (snow) {
    blotch(x, S, 220, 8, 40, ['#e6ecef', '#b7c2c7', '#dfe6ea'], [0.25, 0.6]);
    blotch(x, S, 120, 1, 3, ['#6e6458', '#8a8070'], [0.4, 0.8]);
  } else {
    blotch(x, S, 260, 10, 46, ['#26331f', '#2c3a24', '#1a2219', '#2a2a1d'], [0.25, 0.55]);
    blotch(x, S, 900, 1.2, 3.5, ['#4a3a25', '#5b4228', '#3d2f20', '#6a4a2a', '#2f3b22'], [0.5, 0.9]);
    /* needles */
    x.lineCap = 'round';
    for (let i = 0; i < 1400; i++) {
      const px = Math.random() * S, py = Math.random() * S, a = Math.random() * Math.PI, l = rnd(3, 9);
      x.strokeStyle = ['#5a4630', '#6b5236', '#3f3324', '#7a5f3c'][i % 4];
      x.globalAlpha = rnd(0.35, 0.8);
      x.lineWidth = rnd(0.6, 1.2);
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    /* a few broad leaves */
    for (let i = 0; i < 120; i++) {
      x.globalAlpha = rnd(0.5, 0.9);
      x.fillStyle = ['#6b3f1f', '#7d5a26', '#4f3a1d', '#8a4a22'][i % 4];
      x.beginPath(); x.ellipse(Math.random() * S, Math.random() * S, rnd(3, 6), rnd(1.5, 3), Math.random() * 3, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  }
  const map = tex(c, 14);
  /* roughness/bump from the same canvas, greyscale */
  const [b, bx] = canvas(S);
  bx.drawImage(c, 0, 0);
  const id = bx.getImageData(0, 0, S, S);
  for (let i = 0; i < id.data.length; i += 4) { const v = (id.data[i] + id.data[i + 1] + id.data[i + 2]) / 3; id.data[i] = id.data[i + 1] = id.data[i + 2] = Math.min(255, v * 2.2); }
  bx.putImageData(id, 0, 0);
  const bump = tex(b, 14, false);
  return { map, bump };
}

/** Packed dirt trail with pebbles and roots; alpha fades at the edges (u = across). */
export function trailTextures(snow: boolean) {
  const S = 512;
  const [c, x] = canvas(S);
  x.fillStyle = snow ? '#9aa4a8' : '#4f4535';
  x.fillRect(0, 0, S, S);
  blotch(x, S, 300, 6, 30, snow ? ['#aab4b8', '#8c969a', '#b9c2c5'] : ['#5a4f3c', '#463d2f', '#61563f', '#3e362a'], [0.3, 0.6]);
  blotch(x, S, 500, 1.5, 4.5, snow ? ['#7d878b', '#c7cfd2'] : ['#77705f', '#8a8270', '#2f2a22', '#5e5546'], [0.6, 1]);
  /* roots crossing */
  x.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    x.strokeStyle = snow ? '#6e6458' : '#2e241a'; x.globalAlpha = 0.8; x.lineWidth = rnd(3, 6);
    const y0 = Math.random() * S;
    x.beginPath(); x.moveTo(0, y0);
    x.bezierCurveTo(S * 0.3, y0 + rnd(-40, 40), S * 0.7, y0 + rnd(-40, 40), S, y0 + rnd(-30, 30)); x.stroke();
  }
  x.globalAlpha = 1;
  const map = tex(c, 1);
  map.repeat.set(1, 1);
  const [a, ax] = canvas(256);
  const g = ax.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#000'); g.addColorStop(0.18, '#666'); g.addColorStop(0.32, '#fff'); g.addColorStop(0.68, '#fff'); g.addColorStop(0.82, '#666'); g.addColorStop(1, '#000');
  ax.fillStyle = g; ax.fillRect(0, 0, 256, 256);
  /* ragged edges */
  for (let i = 0; i < 500; i++) { ax.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; ax.globalAlpha = 0.25; ax.beginPath(); ax.arc(Math.random() < 0.5 ? rnd(20, 90) : rnd(166, 236), Math.random() * 256, rnd(2, 8), 0, 7); ax.fill(); }
  const alpha = tex(a, 1, false);
  return { map, alpha };
}

/** Vertical bark grain. */
export function barkTexture() {
  const S = 256;
  const [c, x] = canvas(S);
  x.fillStyle = '#2b2119'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    x.strokeStyle = ['#1a130e', '#3a2c20', '#45362a', '#140f0b'][i % 4];
    x.globalAlpha = rnd(0.4, 0.9); x.lineWidth = rnd(1, 4);
    const px = Math.random() * S;
    x.beginPath(); x.moveTo(px, 0);
    for (let y = 0; y <= S; y += 32) x.lineTo(px + rnd(-4, 4), y);
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = tex(c, 1); t.repeat.set(1, 3); return t;
}

/** Fur: short dark strands, used as colour and bump. */
export function furTexture(base: string, light: string) {
  const S = 256;
  const [c, x] = canvas(S);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  x.lineCap = 'round';
  for (let i = 0; i < 3800; i++) {
    const px = Math.random() * S, py = Math.random() * S, a = Math.PI / 2 + rnd(-0.5, 0.5), l = rnd(4, 11);
    x.strokeStyle = Math.random() < 0.3 ? light : '#000';
    x.globalAlpha = rnd(0.15, 0.5); x.lineWidth = rnd(0.6, 1.4);
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  x.globalAlpha = 1;
  return tex(c, 2);
}

/** Round soft dot for particles, fog puffs and glows. */
export function softDot(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const [c, x] = canvas(128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.35, mid); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Ragged fog puff. */
export function fogPuff() {
  const [c, x] = canvas(256);
  for (let i = 0; i < 26; i++) {
    const cx = 128 + rnd(-60, 60), cy = 128 + rnd(-30, 30), r = rnd(30, 70);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Text on a wooden board (signs). */
export function signTexture(text: string) {
  const [c, x] = canvas(256);
  c.height = 96;
  x.fillStyle = '#6a4c35'; x.fillRect(0, 0, 256, 96);
  for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(30,20,10,.35)'; x.lineWidth = 1; x.beginPath(); const y = Math.random() * 96; x.moveTo(0, y); x.lineTo(256, y + rnd(-3, 3)); x.stroke(); }
  x.strokeStyle = '#2a1c10'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 90);
  x.fillStyle = '#f3e6c8'; x.font = '800 44px "Shippori Mincho B1",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** "?" / "!" badges floating over bears. */
export function iconTexture(txt: string, bg: string, fg: string) {
  const [c, x] = canvas(128);
  x.beginPath(); x.arc(64, 64, 52, 0, 7); x.fillStyle = bg; x.fill();
  x.lineWidth = 6; x.strokeStyle = '#e2bc72'; x.stroke();
  x.fillStyle = fg; x.font = '900 70px "Shippori Mincho B1",serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(txt, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Fur strands seen end-on: dense dots on transparent, used by the fur shells (alpha-tested). */
export function furDots() {
  const [c, x] = canvas(256);
  x.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    x.fillStyle = `rgba(255,255,255,${0.45 + v * 0.55})`;
    x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, rnd(0.6, 1.5), 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Fur strands: short downward strokes on transparent, for shaggier fur shells (alpha-tested). */
export function furStrands() {
  const [c, x] = canvas(256);
  x.clearRect(0, 0, 256, 256);
  x.lineCap = 'round';
  for (let i = 0; i < 7000; i++) {
    const px = Math.random() * 256, py = Math.random() * 256, l = rnd(3, 9), a = Math.PI / 2 + rnd(-0.35, 0.35);
    x.strokeStyle = `rgba(255,255,255,${0.45 + Math.random() * 0.55})`;
    x.lineWidth = rnd(0.8, 1.8);
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
