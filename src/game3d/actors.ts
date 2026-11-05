/**
 * Characters.
 *  - The bear: a sculpted body (shoulder hump, neck, brow, muzzle, ears, claws, fangs) wrapped in layered fur
 *    shells so its outline reads as fur, rigged to walk, rear up, open its jaws, breathe and twitch its ears.
 *  - The hiker: a big-headed, Identity V-flavoured figure for the overhead view.
 *  - The first-person hands, and the small animals for the field guide.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { enhance } from './materials';
import { furStrands, furTexture, iconTexture } from './textures';
import { getBearModel } from './bearModel';
import { getCritterModel } from './critterModel';

export type BearKind = 'tsuki' | 'higuma';

export interface BearRig {
  root: THREE.Group;
  /** pivot at the hind legs: rotate x to rear up */
  hips: THREE.Group;
  /** the torso, for breathing */
  body: THREE.Object3D;
  head: THREE.Group;
  /** lower jaw: rotate x to open */
  jaw: THREE.Group;
  ears: THREE.Object3D[];
  legs: THREE.Group[];
  eyeMat: THREE.MeshStandardMaterial;
  icon: THREE.Sprite;
  cone: THREE.Mesh;
  coneMat: THREE.MeshBasicMaterial;
  breath: THREE.Vector3;
}

const V = new THREE.Vector3();
/** A sphere pushed into shape by `fn` (unit-sphere point → final point). */
function sculpt(fn: (x: number, y: number, z: number) => [number, number, number], seg = 26) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    V.fromBufferAttribute(p, i);
    const n = 1 + Math.sin(V.x * 9 + V.z * 5) * 0.018 + Math.cos(V.y * 11 + V.x * 6) * 0.015;
    const [x, y, z] = fn(V.x * n, V.y * n, V.z * n);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
const ell = (rx: number, ry: number, rz: number, cx = 0, cy = 0, cz = 0, seg = 18) => sculpt((x, y, z) => [x * rx + cx, y * ry + cy, z * rz + cz], seg);

/** Copy of `g` pushed out along its normals by `d` (one fur shell). */
function shellOf(g: THREE.BufferGeometry, d: number) {
  const s = g.clone();
  const p = s.attributes.position, n = s.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d - d * 0.35, p.getZ(i) + n.getZ(i) * d);
  return s;
}

let strands: THREE.Texture | null = null;
const shellMats = new Map<string, THREE.MeshStandardMaterial[]>();
/** Fur shell materials: each layer alpha-tested a bit harder, so strands thin out towards the tips. */
function shellMaterials(key: string, base: number, tip: number, n: number, rim: [number, number, number]) {
  const k = key + n;
  if (shellMats.has(k)) return shellMats.get(k)!;
  strands ??= furStrands();
  const a = new THREE.Color(base), b = new THREE.Color(tip);
  const list = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return enhance(new THREE.MeshStandardMaterial({ color: a.clone().lerp(b, t * 0.7), map: strands, alphaTest: 0.36 + t * 0.48, roughness: 1, side: THREE.DoubleSide }), { rim: [rim[0] * (0.3 + t * 0.5), rim[1] * (0.3 + t * 0.5), rim[2] * (0.3 + t * 0.5)], rimPower: 2.6 });
  });
  shellMats.set(k, list);
  return list;
}

/** A furry part: the solid mesh plus `n` shells of growing length. */
function furry(geo: THREE.BufferGeometry, mat: THREE.Material, shells: THREE.MeshStandardMaterial[], len: number) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  shells.forEach((sm, i) => { const s = new THREE.Mesh(shellOf(geo, (len * (i + 1)) / shells.length), sm); s.renderOrder = 1; g.add(s); });
  return g;
}

/** Clumpy noise so the silhouette breaks into tufts instead of a smooth ball. */
const clump = (x: number, y: number, z: number) =>
  Math.sin(x * 13.1 + y * 4.3) * Math.sin(y * 9.7 + z * 12.9) * Math.sin(z * 8.9 + x * 7.3) * 0.7 +
  Math.sin(x * 23.0 + z * 19.0) * Math.sin(y * 21.0 - x * 17.0) * 0.3;
function sculptFur(fn: (x: number, y: number, z: number) => [number, number, number], seg: number, amt: number) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    V.fromBufferAttribute(p, i);
    const n = 1 + clump(V.x, V.y, V.z) * amt;
    const [x, y, z] = fn(V.x * n, V.y * n, V.z * n);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const furCache: Partial<Record<BearKind, THREE.Texture>> = {};

export function makeBear(kind: BearKind, cub = false, lite = false): BearRig {
  const hig = kind === 'higuma';
  const tex = furCache[kind] ?? (furCache[kind] = furTexture(hig ? '#3e2718' : '#100c0a', hig ? '#6a4630' : '#2a201b'));
  const baseCol = hig ? 0x36231a : 0x0e0b0a, tipCol = hig ? 0x46301f : 0x221b18;
  const rim: [number, number, number] = hig ? [0.1, 0.08, 0.06] : [0.05, 0.065, 0.1];
  /* velvet-like sheen reads as fur under the flashlight */
  const furMat = (vc = false) => enhance(new THREE.MeshPhysicalMaterial({
    map: tex, bumpMap: tex, bumpScale: 4, roughness: 0.92, color: vc ? 0xffffff : baseCol, vertexColors: vc,
    sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color(hig ? 0x4a3424 : 0x2a2420),
  }), { rim, rimPower: 2.4 });
  const fur = furMat();
  const headMat = furMat(true);
  const nShell = cub ? 3 : lite ? 3 : 7;
  const shells = shellMaterials(kind, baseCol, tipCol, nShell, rim);
  const glossy = new THREE.MeshPhysicalMaterial({ color: 0x050404, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const lip = new THREE.MeshStandardMaterial({ color: 0x0a0807, roughness: 0.6 });
  const innerEar = new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 0.9 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x3a0c0c, roughness: 0.6 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0x8e8470, roughness: 0.6 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe2bc72, emissiveIntensity: 2.2 });
  const muzzleCol = new THREE.Color(hig ? 0x6a4c34 : 0x4a3a2e), browCol = new THREE.Color(hig ? 0x2e1e14 : 0x0e0a09), headCol = new THREE.Color(baseCol);

  const root = new THREE.Group();
  const S = (hig ? 1.2 : 1) * (cub ? 0.45 : 1);
  root.scale.setScalar(S);
  const hips = new THREE.Group();
  hips.position.set(0, 0.92, -0.55);
  root.add(hips);

  /* torso: long and low, a muscular shoulder hump, deep chest, tucked belly, narrower rump */
  const humpH = hig ? 0.34 : 0.18;
  const torsoG = sculptFur((x, y, z) => {
    const w = 0.56 * (1 - 0.16 * Math.max(0, -z)) * (1 + 0.06 * Math.max(0, z));
    const hump = humpH * Math.exp(-((z - 0.3) ** 2) / 0.05) * Math.max(0, y);
    const belly = y < 0 ? y * (0.05 - 0.06 * Math.abs(z)) : 0;
    return [x * w, y * 0.54 + hump + belly + 0.05, z * 1.04 + 0.52];
  }, 40, cub ? 0.02 : 0.045);
  const neckG = sculptFur((x, y, z) => [x * 0.34, y * 0.37 + 0.1, z * 0.42 + 1.42], 20, 0.05);
  const tailG = ell(0.11, 0.09, 0.09, 0, 0.3, -0.5, 10);
  const body = furry(mergeGeometries([torsoG, neckG, tailG]), fur, shells, cub ? 0.045 : 0.09);
  hips.add(body);
  if (!hig) {
    /* the Asian black bear's pale crescent bib: a soft V on the chest */
    const cres = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 28, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1 }));
    cres.scale.set(1, 0.5, 1.2);
    cres.position.set(0, -0.12, 1.6);
    cres.rotation.set(-0.5, 0, Math.PI + Math.PI * 0.05);
    hips.add(cres);
  }

  /* head: a wedge — broad skull, a forehead that slopes into a long muzzle; coloured by vertex */
  const head = new THREE.Group();
  head.position.set(0, 0.2, 1.72);
  hips.add(head);
  const muzLen = hig ? 0.32 : 0.26;
  const headG = sculptFur((x, y, z) => {
    const f = Math.max(0, z);
    const tx = 1 - 0.5 * Math.pow(f, 1.2), ty = 1 - 0.42 * f;
    const cheeks = 1 + 0.12 * Math.max(0, -y) * (1 - f);
    return [x * 0.37 * tx * cheeks, y * 0.33 * ty - 0.08 * f + 0.03 * Math.max(0, y) * (1 - f), z * 0.4 + muzLen * f * f];
  }, 30, cub ? 0.015 : 0.025);
  {
    const p = headG.attributes.position, cols: number[] = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      c.copy(headCol).lerp(muzzleCol, smooth(0.12, 0.42, z) * (y < 0.05 ? 1 : 0.85));
      /* dark around the eyes */
      const eye = Math.exp(-(((Math.abs(x) - 0.15) ** 2) + ((y - 0.06) ** 2) + ((z - 0.24) ** 2)) / 0.006);
      c.lerp(browCol, eye * 0.7);
      cols.push(c.r, c.g, c.b);
    }
    headG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  }
  const headFur = furry(headG, headMat, shells.slice(0, Math.max(2, nShell - 3)), cub ? 0.02 : 0.035);
  /* keep the muzzle short-haired: the shells only on the skull */
  headFur.children.slice(1).forEach((m) => { (m as THREE.Mesh).scale.set(1, 1, 0.94); });
  head.add(headFur);
  const ears: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 0.25, 0.25, -0.12);
    ear.rotation.z = -sx * 0.45;
    const eg = ell(0.1, 0.1, 0.055, 0, 0, 0, 12);
    ear.add(furry(eg, fur, shells.slice(0, 2), 0.03));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(0.055, 14), innerEar);
    inner.position.set(0, -0.005, 0.056);
    ear.add(inner);
    head.add(ear); ears.push(ear);
  }
  const tipZ = 0.4 + muzLen;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), glossy);
  nose.scale.set(1.4, 0.85, 0.85); nose.position.set(0, -0.045, tipZ - 0.02);
  head.add(nose);
  for (const sx of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), lip);
    nostril.position.set(sx * 0.035, -0.06, tipZ + 0.035);
    head.add(nostril);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), glossy);
    eye.position.set(sx * 0.16, 0.07, 0.29);
    head.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
    glint.position.set(sx * 0.16, 0.075, 0.325);
    head.add(glint);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.065, 6), ivory);
    fang.rotation.x = Math.PI; fang.position.set(sx * 0.06, -0.15, tipZ - 0.12);
    head.add(fang);
  }
  /* black lips along the muzzle */
  const lipLine = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 20, Math.PI), lip);
  lipLine.rotation.set(Math.PI / 2, 0, 0); lipLine.position.set(0, -0.13, tipZ - 0.16); lipLine.scale.set(1, 1.6, 1);
  head.add(lipLine);
  /* lower jaw with mouth and teeth; rotates open */
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.12, 0.1);
  head.add(jaw);
  const jawM = new THREE.Mesh(ell(0.12, 0.05, muzLen * 0.85, 0, -0.04, muzLen * 0.85, 14), new THREE.MeshStandardMaterial({ color: muzzleCol.clone().multiplyScalar(0.85), roughness: 0.9 }));
  jaw.add(jawM);
  const tongue = new THREE.Mesh(ell(0.085, 0.02, muzLen * 0.6, 0, 0.0, muzLen * 0.8, 10), mouth);
  jaw.add(tongue);
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.055, 6), ivory);
    t.position.set(sx * 0.055, 0.02, muzLen * 1.45);
    jaw.add(t);
  }

  /* legs: heavy forearms, big thighs, broad plantigrade paws with dark claws */
  const legs: THREE.Group[] = [];
  const mkLeg = (parent: THREE.Object3D, x: number, y: number, z: number, hind: boolean) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const upper = sculptFur((a, b, c) => [a * (hind ? 0.3 : 0.24), b * (hind ? 0.44 : 0.4) - 0.3, c * (hind ? 0.34 : 0.25) + (hind ? -0.04 : 0.03)], 18, 0.05);
    const lower = sculptFur((a, b, c) => [a * 0.17, b * 0.32 - 0.66, c * 0.19 + 0.03], 14, 0.04);
    const pawG = ell(0.2, 0.085, 0.27, 0, -0.9, 0.08, 14);
    g.add(furry(mergeGeometries([upper, lower, pawG]), fur, shells.slice(0, Math.max(2, nShell - 3)), cub ? 0.03 : 0.055));
    for (let c = 0; c < 5; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.016, hind ? 0.06 : 0.09, 6), clawMat);
      claw.rotation.x = Math.PI / 2 + 0.6;
      claw.position.set((c - 2) * 0.065, -0.95, 0.33);
      g.add(claw);
    }
    parent.add(g); legs.push(g); return g;
  };
  mkLeg(hips, -0.34, -0.08, 1.24, false);
  mkLeg(hips, 0.34, -0.08, 1.24, false);
  mkLeg(root, -0.37, 0.92, -0.55, true);
  mkLeg(root, 0.37, 0.92, -0.55, true);

  /* a faint gaze cone on the ground (Identity V's hunter sight) */
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xf0c86e, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const half = 0.95, R = 12.5 / S;
  const cone = new THREE.Mesh(new THREE.CircleGeometry(R, 32, -Math.PI / 2 - half, half * 2), coneMat);
  cone.rotation.x = -Math.PI / 2; cone.position.y = 0.06 / S;
  cone.visible = !cub;
  root.add(cone);

  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: ICONS.alert, depthTest: false, transparent: true, fog: false }));
  icon.scale.set(0.8 / S, 0.8 / S, 1); icon.position.y = 2.9; icon.visible = false; icon.renderOrder = 20;
  root.add(icon);

  let breath = new THREE.Vector3(0, -0.06, tipZ + 0.05);
  const model = getBearModel(kind);
  if (model) {
    /* swap the built-in furry bear for the low-poly model, keeping the same pivots so all the animation still works */
    const HIPS = new THREE.Vector3(0, 0.95, -0.55);
    const mat = modelMat(kind, rim);
    const put = (g: THREE.Object3D, geo: THREE.BufferGeometry, at: THREE.Vector3) => {
      const m = new THREE.Mesh(geo, mat); m.position.copy(at); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    body.clear();
    head.clear();
    for (const c of [...hips.children]) if (c !== body && c !== head && !legs.includes(c as THREE.Group)) hips.remove(c);
    put(body, model.body.geo, HIPS.clone().negate());
    for (const e of model.eyes) {
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
      glint.position.copy(e).sub(HIPS);
      body.add(glint);
    }
    model.legs.forEach((part, i) => {
      const g = legs[i];
      g.clear();
      g.position.copy(part.pivot);
      if (i < 2) g.position.sub(HIPS);
      put(g, part.geo, new THREE.Vector3());
    });
    breath = model.nose.clone().sub(HIPS).sub(head.position).add(new THREE.Vector3(0, -0.04, 0.06));
  }

  return { root, hips, body, head, jaw, ears, legs, eyeMat, icon, cone, coneMat, breath };
}

const modelMats = new Map<BearKind, THREE.Material>();
/** Flat-shaded faces in the model's own colours, with the same moonlit rim as the rest of the forest. */
function modelMat(kind: BearKind, rim: [number, number, number]) {
  if (!modelMats.has(kind)) {
    modelMats.set(kind, enhance(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, side: THREE.DoubleSide, color: kind === 'higuma' ? 0xa89c94 : 0xffffff }), { rim: rim.map((v) => v * 0.8) as [number, number, number], rimPower: 2.4 }));
  }
  return modelMats.get(kind)!;
}

export const ICONS = {
  alert: iconTexture('?', '#2a2010', '#ffd166'),
  threaten: iconTexture('!', '#5a1e08', '#ffb255'),
  chase: iconTexture('!!', '#7a0c08', '#ffffff'),
  stunned: iconTexture('…', '#0c2a3a', '#86d6ff'),
};

/** The hiker for the overhead view: big head, hooded orange raincoat, scarf, boots, a pack with a bedroll. */
export function makeHiker() {
  const g = new THREE.Group();
  const coat = enhance(new THREE.MeshStandardMaterial({ color: 0xd9682b, roughness: 0.65, emissive: 0x2a0e02 }), { rim: [0.22, 0.13, 0.08] });
  const coatD = enhance(new THREE.MeshStandardMaterial({ color: 0xa8481a, roughness: 0.7 }), { rim: [0.15, 0.09, 0.05] });
  const scarf = enhance(new THREE.MeshStandardMaterial({ color: 0x8a1e22, roughness: 0.8 }), { rim: [0.15, 0.05, 0.05] });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: 0.9 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0d6bc, roughness: 0.75 });
  const pack = enhance(new THREE.MeshStandardMaterial({ color: 0x4b5e3e, roughness: 0.85 }), { rim: [0.08, 0.1, 0.07] });
  const body = new THREE.Group(); g.add(body);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => { const ms = new THREE.Mesh(geo, m); ms.position.set(x, y, z); ms.castShadow = true; parent.add(ms); return ms; };
  /* coat: a flared bell shape */
  add(sculpt((x, y, z) => { const t = (y + 1) / 2; const w = 0.36 - t * 0.12; return [x * w, y * 0.42, z * w * 0.85]; }, 20), coat, 0, 0.98, 0);
  add(new THREE.CylinderGeometry(0.29, 0.31, 0.06, 18), coatD, 0, 0.82, 0);
  add(new THREE.TorusGeometry(0.17, 0.06, 8, 18), scarf, 0, 1.36, 0.02).rotation.x = Math.PI / 2;
  const tail = add(new THREE.BoxGeometry(0.09, 0.26, 0.03), scarf, 0.1, 1.2, 0.17); tail.rotation.z = 0.2;
  /* head: big and round, inside a hood */
  add(new THREE.SphereGeometry(0.3, 22, 16), skin, 0, 1.68, 0.02);
  const hood = add(new THREE.SphereGeometry(0.35, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), coat, 0, 1.7, -0.04);
  hood.rotation.x = -0.35;
  add(new THREE.TorusGeometry(0.26, 0.045, 8, 22), coatD, 0, 1.68, 0.14);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.3 });
  for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.04, 10, 8), eyeM, sx * 0.1, 1.67, 0.29); add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8a088, roughness: 0.9 }), sx * 0.17, 1.6, 0.25); }
  /* pack with a bedroll and a little bell */
  add(new THREE.BoxGeometry(0.46, 0.52, 0.24), pack, 0, 1.04, -0.3);
  add(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.9 }), 0, 1.36, -0.32).rotation.z = Math.PI / 2;
  add(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.3, metalness: 0.8 }), 0.2, 0.86, -0.3);
  /* arms: one holding the flashlight forward */
  for (const sx of [-1, 1]) {
    const arm = add(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 10), coat, sx * 0.32, 1.08, sx > 0 ? 0.12 : 0);
    arm.rotation.x = sx > 0 ? -0.9 : 0.1; arm.rotation.z = sx * 0.2;
  }
  add(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 10), dark, 0.36, 1.02, 0.36).rotation.x = Math.PI / 2;
  const legs = [-0.12, 0.12].map((x) => {
    const l = new THREE.Group(); l.position.set(x, 0.62, 0); body.add(l);
    add(new THREE.CylinderGeometry(0.075, 0.07, 0.48, 8).translate(0, -0.24, 0), dark, 0, 0, 0, l);
    add(new THREE.BoxGeometry(0.15, 0.12, 0.24).translate(0, -0.52, 0.04), boot, 0, 0, 0, l);
    return l;
  });
  return { g, body, legs };
}

/** First-person hands: right hand holds the flashlight, left hand brings up the spray. */
export function makeHand(side: 1 | -1) {
  const g = new THREE.Group();
  const glove = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.85 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0xc85a22, roughness: 0.8 });
  const cuff = new THREE.MeshStandardMaterial({ color: 0x8a3a16, roughness: 0.8 });
  const palm = new THREE.Mesh(sculpt((x, y, z) => [x * 0.055, y * 0.045, z * 0.06], 12), glove);
  palm.position.set(side * 0.03, -0.02, 0.02); g.add(palm);
  for (let f = 0; f < 4; f++) {
    const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.06, 8), glove);
    fg.rotation.z = Math.PI / 2; fg.position.set(side * -0.005, 0.015 - f * 0.018, -0.045 + f * 0.004); g.add(fg);
  }
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.015, 0.06, 8), glove);
  thumb.rotation.set(0.6, 0, side * 0.9); thumb.position.set(side * -0.02, 0.04, -0.01); g.add(thumb);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.34, 14), sleeve);
  sl.rotation.x = Math.PI / 2 - 0.2; sl.position.set(side * 0.05, -0.06, 0.24); g.add(sl);
  const cf = new THREE.Mesh(new THREE.CylinderGeometry(0.063, 0.063, 0.05, 14), cuff);
  cf.rotation.x = Math.PI / 2 - 0.2; cf.position.set(side * 0.04, -0.035, 0.08); g.add(cf);
  return g;
}

export type CritterKind = 'rabbit' | 'bird' | 'tanuki' | 'boar' | 'wolf';
export function makeCritter(kind: CritterKind) {
  const g = new THREE.Group();
  const mat = (c: number, e = 0) => enhance(new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive: e }), { rim: [0.12, 0.14, 0.18] });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const ms = new THREE.Mesh(geo, m); ms.position.set(x, y, z); ms.scale.set(sx, sy, sz); ms.castShadow = true; g.add(ms); return ms; };
  const model = getCritterModel(kind);
  if (model) {
    /* the low-poly model, in its own colours (each animal gets its own material, so the wolf can fade on its own) */
    add(model, enhance(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, side: THREE.DoubleSide, color: 0x8c8c8c }), { rim: [0.1, 0.12, 0.16] }), 0, 0, 0).receiveShadow = true;
    return g;
  }
  const sph = new THREE.SphereGeometry(1, 14, 10);
  if (kind === 'rabbit') {
    const m = mat(0x9a9088);
    add(sph, m, 0, 0.18, 0, 0.22, 0.17, 0.15); add(sph, m, 0.2, 0.3, 0, 0.11, 0.1, 0.1);
    add(sph, m, 0.18, 0.47, 0.04, 0.03, 0.12, 0.03); add(sph, m, 0.18, 0.47, -0.04, 0.03, 0.12, 0.03);
  } else if (kind === 'bird') {
    const m = mat(0x4a4038);
    add(sph, m, 0, 0, 0, 0.12, 0.07, 0.07); add(sph, m, 0.1, 0.04, 0, 0.05, 0.05, 0.05);
    add(new THREE.BoxGeometry(0.06, 0.01, 0.34), m, -0.02, 0.02, 0);
  } else if (kind === 'tanuki') {
    const m = mat(0x7a6a58), d = mat(0x2a221c);
    add(sph, m, 0, 0.25, 0, 0.32, 0.2, 0.18); add(sph, m, 0.3, 0.33, 0, 0.14, 0.13, 0.13); add(sph, d, 0.38, 0.34, 0, 0.06, 0.04, 0.12);
    add(sph, d, -0.34, 0.24, 0, 0.14, 0.07, 0.07);
  } else if (kind === 'boar') {
    const m = mat(0x4a3a2c), w = mat(0xeee6d8);
    add(sph, m, 0, 0.42, 0, 0.6, 0.34, 0.3); add(sph, m, 0.55, 0.4, 0, 0.24, 0.2, 0.2); add(sph, mat(0x6b5444), 0.78, 0.36, 0, 0.08, 0.08, 0.08);
    add(new THREE.ConeGeometry(0.025, 0.14, 6), w, 0.72, 0.3, 0.09); add(new THREE.ConeGeometry(0.025, 0.14, 6), w, 0.72, 0.3, -0.09);
    for (const [x, z] of [[-0.35, 0.15], [-0.35, -0.15], [0.35, 0.15], [0.35, -0.15]]) add(new THREE.CylinderGeometry(0.06, 0.05, 0.3, 6), m, x, 0.15, z);
  } else {
    const m = mat(0x8a96a6, 0x223040);
    add(sph, m, 0, 0.55, 0, 0.55, 0.22, 0.2); add(sph, m, 0.55, 0.68, 0, 0.18, 0.15, 0.13); add(new THREE.ConeGeometry(0.08, 0.3, 8), m, 0.75, 0.66, 0).rotation.z = -Math.PI / 2;
    for (const [x, z] of [[-0.35, 0.1], [-0.35, -0.1], [0.35, 0.1], [0.35, -0.1]]) add(new THREE.CylinderGeometry(0.04, 0.035, 0.45, 6), m, x, 0.22, z);
    add(new THREE.CylinderGeometry(0.04, 0.08, 0.5, 6), m, -0.6, 0.55, 0).rotation.z = 1.1;
  }
  return g;
}
