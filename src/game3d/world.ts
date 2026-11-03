/**
 * The night forest: terrain, trail, conifers, dead trees, ferns, grass, rocks, the refuge hut,
 * moonbeams, drifting fog, fireflies, snow and wind-blown leaves. Everything is generated at start-up.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Kit, KitModel, Role } from './kit';
import { enhance, shared } from './materials';
import { barkTexture, fogPuff, groundTextures, signTexture, softDot, trailTextures } from './textures';

export const START_Z = 92;
export const GOAL_Z = -96;
export const HALF_W = 18;
export const pathX = (z: number) => Math.sin(z * 0.05) * 6 + Math.sin(z * 0.13) * 2;
/** terrain height: gentle rolls, rising into banks beyond the walkable strip */
export const groundY = (x: number, z: number) => {
  const edge = Math.max(0, Math.abs(x) - HALF_W + 2);
  return Math.sin(x * 0.35) * Math.sin(z * 0.27) * 0.22 + Math.sin(x * 0.9 + z * 0.6) * 0.08 + Math.pow(edge, 1.5) * 0.18;
};

export type Look = 'night' | 'dusk' | 'fog' | 'snow';
export interface WorldOpts {
  look: Look; stream: boolean; windy: boolean;
  /** phones: less grass and fewer ferns */ lite?: boolean;
  /** Kenney nature models; when missing, the forest is built from simple shapes */ kit?: Kit | null;
}
export interface Collider { x: number; z: number; r: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const UP = new THREE.Vector3(0, 1, 0);

const LOOKS: Record<Look, { fog: number; dens: number; sky: number; skyTop: number; hemiSky: number; hemiGround: number; hemi: number; moon: number; moonI: number; grade: [number, number, number] }> = {
  night: { fog: 0x0b1416, dens: 0.042, sky: 0x13212a, skyTop: 0x03070b, hemiSky: 0x4a5e80, hemiGround: 0x0b0e0c, hemi: 0.55, moon: 0x9fb6e6, moonI: 0.42, grade: [0.92, 1.0, 1.12] },
  dusk: { fog: 0x24161a, dens: 0.045, sky: 0x5a2c2a, skyTop: 0x120a16, hemiSky: 0x9a6070, hemiGround: 0x120b0a, hemi: 0.6, moon: 0xffa070, moonI: 0.5, grade: [1.12, 0.96, 0.9] },
  fog: { fog: 0x56646a, dens: 0.085, sky: 0x5f6d73, skyTop: 0x2c363b, hemiSky: 0x8a9aa6, hemiGround: 0x1a201e, hemi: 0.75, moon: 0xc8d6e6, moonI: 0.25, grade: [0.95, 1.0, 1.04] },
  snow: { fog: 0x1b252c, dens: 0.05, sky: 0x26343e, skyTop: 0x060a10, hemiSky: 0x7088aa, hemiGround: 0x2a3036, hemi: 0.65, moon: 0xcfe0ff, moonI: 0.5, grade: [0.94, 1.0, 1.1] },
};

export function buildWorld(scene: THREE.Scene, o: WorldOpts) {
  const L = LOOKS[o.look];
  const snow = o.look === 'snow';
  scene.background = new THREE.Color(L.fog);
  scene.fog = new THREE.FogExp2(L.fog, L.dens);
  shared.wind.value = o.windy ? 1.5 : 0.45;

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemi));
  const moon = new THREE.DirectionalLight(L.moon, L.moonI);
  moon.position.set(-30, 50, -40);
  scene.add(moon);

  /* ---------- sky dome with a glow on the horizon, and the moon ---------- */
  {
    const g = new THREE.SphereGeometry(160, 32, 16);
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { cLow: { value: new THREE.Color(L.sky) }, cTop: { value: new THREE.Color(L.skyTop) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 cLow; uniform vec3 cTop; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(cLow, cTop, pow(h, 0.7)), 1.0); }',
    });
    const sky = new THREE.Mesh(g, m);
    sky.renderOrder = -10;
    scene.add(sky);
    const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,255,255,1)', 'rgba(220,230,255,0.25)'), color: L.moon, fog: false, depthWrite: false, transparent: true }));
    moonS.scale.set(22, 22, 1);
    moonS.position.set(-40, 60, -150);
    scene.add(moonS);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.9)'), color: 0xffffff, fog: false, depthWrite: false, transparent: true }));
    disc.scale.set(5, 5, 1);
    disc.position.copy(moonS.position);
    scene.add(disc);
    (sky as THREE.Object3D).userData.follow = true;
    [sky, moonS, disc].forEach((s) => (s.userData.follow = true));
  }

  /* ---------- terrain ---------- */
  const gt = groundTextures(snow);
  {
    const g = new THREE.PlaneGeometry(90, 250, 150, 420);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col: number[] = [];
    const cA = new THREE.Color(snow ? 0xffffff : 0xb0b8a8), cB = new THREE.Color(snow ? 0xe2e8ec : 0x7d8a70), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, groundY(x, z));
      const n = Math.sin(x * 0.21 + z * 0.13) * Math.cos(z * 0.17 - x * 0.07);
      c.copy(cA).lerp(cB, (n + 1) / 2);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = enhance(new THREE.MeshStandardMaterial({ map: gt.map, bumpMap: gt.bump, bumpScale: 2.5, roughness: 0.95, vertexColors: true }), { rim: [0, 0, 0] });
    const ground = new THREE.Mesh(g, m);
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /* ---------- the trail: a textured ribbon laid on the terrain ---------- */
  {
    const tt = trailTextures(snow);
    const verts: number[] = [], uvs: number[] = [], idx: number[] = [];
    let v = 0, k = 0;
    for (let z = START_Z + 14; z >= GOAL_Z - 10; z -= 0.8) {
      const x = pathX(z), dx = pathX(z - 0.5) - pathX(z + 0.5);
      const nx = 1, nz = dx; const nl = Math.hypot(nx, nz);
      const w = 1.75 + Math.sin(z * 0.37) * 0.25;
      for (const s of [-1, 1]) {
        const px = x + (nx / nl) * w * s, pz = z + (nz / nl) * w * s;
        verts.push(px, groundY(px, pz) + 0.03, pz);
        uvs.push(s < 0 ? 0 : 1, v);
      }
      if (k > 0) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      v += 0.8 / 3.2; k++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: tt.map, alphaMap: tt.alpha, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const trail = new THREE.Mesh(g, m);
    trail.receiveShadow = true;
    trail.renderOrder = 1;
    scene.add(trail);
  }

  /* ---------- a stream along one bank ---------- */
  if (o.stream) {
    const verts: number[] = [], idx: number[] = [];
    let k = 0;
    for (let z = START_Z + 20; z >= GOAL_Z - 20; z -= 1) {
      const cx = pathX(z) + 9 + Math.sin(z * 0.08) * 2;
      for (const s of [-1, 1]) { const px = cx + s * 1.6; verts.push(px, groundY(px, z) - 0.05, z); }
      if (k > 0) { const a = (k - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      k++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const water = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0b1a22, roughness: 0.08, metalness: 0.6 }));
    scene.add(water);
  }

  const colliders: Collider[] = [];
  const spots: { x: number; z: number; r: number }[] = [];
  const free = (x: number, z: number, r: number) => spots.every((s) => Math.hypot(s.x - x, s.z - z) > s.r + r);
  const offTrail = (x: number, z: number, m: number) => Math.abs(x - pathX(z)) > m;
  const streamX = (z: number) => pathX(z) + 9 + Math.sin(z * 0.08) * 2;
  const offStream = (x: number, z: number) => !o.stream || Math.abs(x - streamX(z)) > 2.4;
  const cabin = new THREE.Vector3(pathX(GOAL_Z), 0, GOAL_Z - 3);
  const nearEnds = (x: number, z: number) => Math.hypot(x - pathX(START_Z), z - START_Z) < 6 || Math.hypot(x - cabin.x, z - cabin.z) < 10;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color();

  /* ---------- night-time materials for the Kenney models, one per role ---------- */
  const kit = o.kit ?? null;
  const roleMat: Partial<Record<Role, THREE.MeshStandardMaterial>> = {};
  const mat = (r: Role) => {
    if (roleMat[r]) return roleMat[r]!;
    const spec: Record<Role, [number, number, Parameters<typeof enhance>[1]]> = {
      leaf: [snow ? 0xa4b4ae : 0x1d3a29, 0.9, { rim: [0.05, 0.08, 0.11], rimPower: 3, wind: 1.6 }],
      bark: [0x3a2e26, 1, { rim: [0.05, 0.06, 0.09] }],
      wood: [0x6e5a45, 0.95, { rim: [0.05, 0.05, 0.06] }],
      rock: [snow ? 0x8f979b : 0x5c6058, 0.95, { rim: [0.06, 0.08, 0.11] }],
      moss: [snow ? 0xb9c4c2 : 0x22402c, 0.9, { rim: [0.05, 0.08, 0.06], wind: 0.6 }],
      stem: [0xcfc4ae, 0.8, { rim: [0.06, 0.06, 0.06] }],
      red: [0x9c3027, 0.7, { rim: [0.08, 0.05, 0.05] }],
      tan: [0xb99c76, 0.8, { rim: [0.07, 0.06, 0.05] }],
      flower: [0x7d6caa, 0.8, { rim: [0.06, 0.06, 0.1], wind: 1.2 }],
    };
    const [color, roughness, eo] = spec[r];
    return (roleMat[r] = enhance(new THREE.MeshStandardMaterial({ color, roughness, flatShading: true }), eo));
  };
  /** one instanced mesh per model; `place` fills in the instance transforms and returns how many it placed */
  const instance = (m: KitModel, count: number, place: (i: number) => THREE.Matrix4 | null, tint?: () => THREE.Color) => {
    const mesh = new THREE.InstancedMesh(m.geo.clone(), m.roles.map(mat), count);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const mtx = place(i);
      if (!mtx) continue;
      mesh.setMatrixAt(n, mtx);
      if (tint) mesh.setColorAt(n, tint());
      n++;
    }
    mesh.count = n;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  /* ---------- conifers: three shapes, each one instanced mesh with bark + needles ---------- */
  const bark = barkTexture();
  const barkMat = enhance(new THREE.MeshStandardMaterial({ map: bark, color: 0x8a7a6a, roughness: 1 }), { rim: [0.05, 0.06, 0.09] });
  const needleMat = enhance(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true, color: snow ? 0xc8d4d0 : 0xffffff }), { rim: [0.08, 0.12, 0.17], rimPower: 2.5, wind: 0.5 });
  const conifer = (tiers: number, slim: number) => {
    const trunk = new THREE.CylinderGeometry(0.1, 0.24, 2.6, 7, 1);
    trunk.translate(0, 1.3, 0);
    const parts: THREE.BufferGeometry[] = [];
    for (let t = 0; t < tiers; t++) {
      const r = (1.45 - t * (1.05 / tiers)) * slim, h = 1.7 - t * 0.12, y = 1.3 + t * 0.95;
      const cone = new THREE.ConeGeometry(r, h, 10, 2, true);
      const p = cone.attributes.position, cols: number[] = [];
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), rr = Math.hypot(px, pz);
        /* droop the skirt and roughen the outline */
        const edge = rr / r;
        p.setXYZ(i, px * (1 + rnd(-0.12, 0.12)), py - edge * edge * 0.35 + rnd(-0.06, 0.06), pz * (1 + rnd(-0.12, 0.12)));
        const tip = (py / h + 0.5);
        const shade = 0.35 + edge * 0.45 + tip * 0.2;
        C.setRGB(0.07 * shade, 0.16 * shade, 0.11 * shade).convertSRGBToLinear();
        if (snow && py > 0.1) C.lerp(new THREE.Color(0.85, 0.9, 0.95), 0.45 * tip);
        cols.push(C.r, C.g, C.b);
      }
      cone.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      cone.translate(0, y + h / 2, 0);
      parts.push(cone);
    }
    const leaves = mergeGeometries(parts.map((g) => g.toNonIndexed()));
    leaves.computeVertexNormals();
    const tc: number[] = []; for (let i = 0; i < trunk.attributes.position.count; i++) tc.push(1, 1, 1);
    trunk.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
    return mergeGeometries([trunk.toNonIndexed(), leaves], true);
  };
  /* the built-in conifers stay as the dense, dark mass of the forest; Kenney's tall pines are mixed in for variety */
  const KIT_TREES = ['tree_pineTallA_detailed', 'tree_pineTallB_detailed', 'tree_pineTallC_detailed', 'tree_pineTallD_detailed', 'tree_pineDefaultA', 'tree_pineDefaultB']
    .filter((n) => kit?.[n]);
  const variants = [conifer(5, 1), conifer(6, 0.85), conifer(4, 1.15)];
  /** variant index: 0-2 built-in, 3+ Kenney (about 40% of the trees when the kit is loaded) */
  const pickVariant = () => (KIT_TREES.length && Math.random() < 0.4 ? 3 + Math.floor(Math.random() * KIT_TREES.length) : Math.floor(Math.random() * 3));
  const treeSpots: { x: number; z: number; s: number; v: number }[] = [];
  for (let i = 0, t = 0; i < 330 && t < 9000; t++) {
    const z = rnd(-118, 118), edge = Math.random() < 0.38;
    const x = edge ? (Math.random() < 0.5 ? -1 : 1) * rnd(HALF_W - 1, 34) : rnd(-HALF_W, HALF_W);
    const s = rnd(0.85, 1.55);
    if (!offTrail(x, z, 3.2 + s * 0.4) || !offStream(x, z) || nearEnds(x, z) || !free(x, z, 1.1 * s)) continue;
    spots.push({ x, z, r: 1.1 * s });
    treeSpots.push({ x, z, s, v: pickVariant() });
    /* wide enough that your eyes never end up inside the lowest branches */
    if (Math.abs(x) < HALF_W + 1) colliders.push({ x, z, r: 0.85 * s + 0.2 });
    i++;
  }
  if (kit && KIT_TREES.length) {
    KIT_TREES.forEach((name, ki) => {
      const mine = treeSpots.filter((t) => t.v === 3 + ki), model = kit[name];
      instance(model, mine.length, (i) => {
        const t = mine[i];
        const k = (5.8 * t.s) / model.height;
        Q.setFromAxisAngle(UP, Math.random() * 6.28);
        return M.compose(P.set(t.x, groundY(t.x, t.z) - 0.1, t.z), Q, S.set(k, k * rnd(0.9, 1.15), k));
      }, () => C.setHSL(0.33 + rnd(-0.03, 0.04), 0.2, rnd(0.4, 0.55)).multiplyScalar(1.6));
    });
  }
  variants.forEach((geo, vi) => {
    const mine = treeSpots.filter((t) => t.v === vi);
    const mesh = new THREE.InstancedMesh(geo, [barkMat, needleMat], mine.length);
    mine.forEach((t, i) => {
      Q.setFromAxisAngle(UP, Math.random() * 6.28);
      M.compose(P.set(t.x, groundY(t.x, t.z) - 0.1, t.z), Q, S.set(t.s, t.s * rnd(0.9, 1.15), t.s));
      mesh.setMatrixAt(i, M);
      mesh.setColorAt(i, C.setHSL(0.33 + rnd(-0.04, 0.05), rnd(0.6, 1), rnd(0.42, 0.58)));
    });
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  });

  /* ---------- dead trees and fallen logs ---------- */
  {
    const parts: THREE.BufferGeometry[] = [];
    const tr = new THREE.CylinderGeometry(0.12, 0.3, 7, 7); tr.translate(0, 3.5, 0); parts.push(tr.toNonIndexed());
    for (let b = 0; b < 6; b++) {
      const br = new THREE.CylinderGeometry(0.02, 0.07, rnd(1.2, 2.4), 5);
      br.translate(0, br.parameters.height / 2, 0);
      br.rotateZ(rnd(0.6, 1.2) * (b % 2 ? 1 : -1));
      br.rotateY(rnd(0, 6.28));
      br.translate(0, rnd(2.5, 6.2), 0);
      parts.push(br.toNonIndexed());
    }
    const geo = mergeGeometries(parts);
    const dead = new THREE.InstancedMesh(geo, barkMat, 16);
    for (let i = 0; i < 16; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 50; t++) { z = rnd(-100, 100); x = rnd(-HALF_W, HALF_W); if (offTrail(x, z, 3.5) && offStream(x, z) && free(x, z, 0.8) && !nearEnds(x, z)) break; }
      spots.push({ x, z, r: 0.8 });
      colliders.push({ x, z, r: 0.35 });
      Q.setFromEuler(new THREE.Euler(rnd(-0.08, 0.08), rnd(0, 6), rnd(-0.08, 0.08)));
      M.compose(P.set(x, groundY(x, z) - 0.1, z), Q, S.setScalar(rnd(0.8, 1.2)));
      dead.setMatrixAt(i, M);
    }
    dead.castShadow = true;
    scene.add(dead);
    const logG = new THREE.CylinderGeometry(0.28, 0.32, 5, 9); logG.rotateZ(Math.PI / 2);
    const kitLog = kit?.log_large;
    const logs = kitLog ? new THREE.InstancedMesh(kitLog.geo.clone(), kitLog.roles.map(mat), 12) : new THREE.InstancedMesh(logG, barkMat, 12);
    for (let i = 0; i < 12; i++) {
      let x = 0, z = 0;
      for (let t = 0; t < 50; t++) { z = rnd(-100, 100); x = pathX(z) + (Math.random() < 0.5 ? -1 : 1) * rnd(3.5, 9); if (free(x, z, 2) && offStream(x, z) && !nearEnds(x, z)) break; }
      spots.push({ x, z, r: 1.6 });
      const a = rnd(0, 6.28);
      for (const s of [-1.6, 0, 1.6]) colliders.push({ x: x + Math.cos(a) * s, z: z - Math.sin(a) * s, r: 0.45 });
      if (kitLog) M.compose(P.set(x, groundY(x, z) - 0.05, z), Q.setFromAxisAngle(UP, a), S.set(4.6, 2.4, 2.4));
      else M.compose(P.set(x, groundY(x, z) + 0.2, z), Q.setFromAxisAngle(UP, a), S.setScalar(1));
      logs.setMatrixAt(i, M);
    }
    logs.castShadow = logs.receiveShadow = true;
    scene.add(logs);
  }

  /* ---------- rocks ---------- */
  if (kit?.rock_largeA) {
    const big = ['rock_largeA', 'rock_largeB', 'rock_largeC', 'rock_largeD'].filter((n) => kit[n]);
    const tall = ['rock_tallA', 'rock_tallB', 'rock_tallC'].filter((n) => kit[n]);
    const small = ['rock_smallA', 'rock_smallC', 'rock_smallE'].filter((n) => kit[n]);
    const place = (names: string[], count: number, scale: [number, number], near: number, collide: boolean) =>
      names.forEach((name) => instance(kit[name], Math.round(count / names.length), () => {
        const z = rnd(-110, 110), x = Math.random() < near ? pathX(z) + (Math.random() < 0.5 ? -1 : 1) * rnd(2.2, 7) : rnd(-HALF_W, HALF_W);
        if (!offStream(x, z) || nearEnds(x, z) || !offTrail(x, z, 1.8)) return null;
        const s = rnd(scale[0], scale[1]);
        if (collide && s > 1.6) colliders.push({ x, z, r: 0.42 * s });
        return M.compose(P.set(x, groundY(x, z) - 0.06, z), Q.setFromEuler(new THREE.Euler(0, rnd(0, 6.28), 0)), S.set(s, s * rnd(0.8, 1.15), s));
      }));
    place(big, 40, [1.2, 3.2], 0.55, true);
    place(tall, 10, [1.1, 2.0], 0.2, true);
    place(small, 70, [1.0, 2.4], 0.75, false);
  } else {
    const g = new THREE.DodecahedronGeometry(0.6, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + Math.sin(v.x * 5) * 0.08 + Math.cos(v.z * 4) * 0.08); v.y *= 0.65; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = enhance(new THREE.MeshStandardMaterial({ color: snow ? 0x8a9296 : 0x4f544c, roughness: 0.95, flatShading: true }), { rim: [0.06, 0.08, 0.11] });
    const rocks = new THREE.InstancedMesh(g, m, 60);
    for (let i = 0; i < 60; i++) {
      const z = rnd(-110, 110), x = Math.random() < 0.6 ? pathX(z) + (Math.random() < 0.5 ? -1 : 1) * rnd(2, 7) : rnd(-HALF_W, HALF_W), s = rnd(0.4, 1.4);
      M.compose(P.set(x, groundY(x, z) + 0.05, z), Q.setFromEuler(new THREE.Euler(rnd(0, 0.4), rnd(0, 6), rnd(0, 0.4))), S.set(s, s * rnd(0.7, 1.1), s));
      rocks.setMatrixAt(i, M);
      if (s > 1) colliders.push({ x, z, r: 0.5 * s });
    }
    rocks.castShadow = rocks.receiveShadow = true;
    scene.add(rocks);
  }

  /* ---------- ferns and undergrowth ---------- */
  {
    const fronds: THREE.BufferGeometry[] = [];
    for (let f = 0; f < 7; f++) {
      const pl = new THREE.PlaneGeometry(0.22, 1.1, 1, 5);
      const p = pl.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.55; p.setXYZ(i, p.getX(i) * (1 - y / 1.3), y, -y * y * 0.35); }
      pl.rotateX(-0.35);
      pl.rotateY((f / 7) * Math.PI * 2 + rnd(-0.2, 0.2));
      fronds.push(pl);
    }
    const g = mergeGeometries(fronds);
    const cols: number[] = []; const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = Math.min(1, p.getY(i) / 0.9); C.setRGB(0.03 + t * 0.07, 0.09 + t * 0.12, 0.05 + t * 0.04); cols.push(C.r, C.g, C.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = enhance(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, color: snow ? 0x9aa69e : 0xffffff }), { rim: [0.05, 0.08, 0.06], wind: 1.8 });
    const N = Math.round((snow ? 90 : 240) * (o.lite ? 0.6 : 1));
    const ferns = new THREE.InstancedMesh(g, m, N);
    for (let i = 0; i < N; i++) {
      const z = rnd(-110, 110), x = Math.random() < 0.7 ? pathX(z) + (Math.random() < 0.5 ? -1 : 1) * rnd(2.2, 8) : rnd(-HALF_W, HALF_W);
      const s = rnd(0.7, 1.5);
      M.compose(P.set(x, groundY(x, z), z), Q.setFromAxisAngle(UP, rnd(0, 6)), S.setScalar(s));
      ferns.setMatrixAt(i, M);
    }
    ferns.castShadow = true; ferns.receiveShadow = true;
    scene.add(ferns);
  }

  /* ---------- Kenney undergrowth: bushes, stumps, mushrooms and a few flowers by the trail ---------- */
  if (kit?.plant_bush) {
    const scatter = (names: string[], count: number, scale: [number, number], band: [number, number], solid = 0) =>
      names.filter((n) => kit[n]).forEach((name, _i, arr) => instance(kit[name], Math.round(count / arr.length), () => {
        const z = rnd(-112, 112), x = pathX(z) + (Math.random() < 0.5 ? -1 : 1) * rnd(band[0], band[1]);
        if (!offStream(x, z) || nearEnds(x, z)) return null;
        const s = rnd(scale[0], scale[1]);
        if (solid) colliders.push({ x, z, r: solid * s });
        return M.compose(P.set(x, groundY(x, z) - 0.03, z), Q.setFromAxisAngle(UP, rnd(0, 6.28)), S.setScalar(s));
      }));
    const k = o.lite ? 0.6 : 1;
    scatter(['plant_bush', 'plant_bushLarge', 'plant_bushDetailed'], Math.round((snow ? 50 : 140) * k), [2.2, 3.6], [2.6, 12]);
    scatter(['stump_old', 'stump_oldTall', 'stump_roundDetailed'], 22, [2.6, 3.6], [3, 14], 0.16);
    scatter(['log_stack'], 3, [2.6, 3.0], [4.5, 9], 0.3);
    if (!snow) {
      scatter(['mushroom_redGroup', 'mushroom_tanGroup', 'mushroom_tanTall'], Math.round(36 * k), [1.6, 2.6], [1.6, 5]);
      scatter(['flower_purpleA', 'flower_yellowB'], Math.round(30 * k), [1.8, 2.6], [1.6, 4]);
    }
  }

  /* ---------- grass blades along the trail ---------- */
  {
    const blade = new THREE.PlaneGeometry(0.07, 0.55, 1, 3);
    const bp = blade.attributes.position;
    for (let i = 0; i < bp.count; i++) { const y = bp.getY(i) + 0.275; bp.setXYZ(i, bp.getX(i) * (1 - y / 0.6), y, y * y * 0.25); }
    const cols: number[] = [];
    for (let i = 0; i < bp.count; i++) { const t = bp.getY(i) / 0.55; C.setRGB(0.03 + t * 0.12, 0.07 + t * 0.14, 0.04 + t * 0.05); cols.push(C.r, C.g, C.b); }
    blade.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const m = enhance(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, color: snow ? 0xb8c4c0 : 0xffffff }), { rim: [0.04, 0.07, 0.05], wind: 6 });
    const N = Math.round((snow ? 3000 : 11000) * (o.lite ? 0.45 : 1));
    const grass = new THREE.InstancedMesh(blade, m, N);
    for (let i = 0; i < N; i++) {
      const z = rnd(-104, 104);
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = pathX(z) + side * (1.5 + Math.pow(Math.random(), 1.6) * 9);
      const s = rnd(0.6, 1.5);
      M.compose(P.set(x, groundY(x, z), z), Q.setFromEuler(new THREE.Euler(rnd(-0.2, 0.2), rnd(0, 6.28), rnd(-0.2, 0.2))), S.set(s, s * rnd(0.7, 1.4), s));
      grass.setMatrixAt(i, M);
    }
    grass.receiveShadow = true;
    scene.add(grass);
  }

  /* ---------- the refuge hut ---------- */
  const hutLight = new THREE.PointLight(0xffa64a, 9, 22, 1.6);
  {
    const hut = new THREE.Group();
    hut.position.set(cabin.x, groundY(cabin.x, cabin.z), cabin.z);
    const logMat = enhance(new THREE.MeshStandardMaterial({ map: bark, color: 0xa0806a, roughness: 0.95 }), { rim: [0.08, 0.07, 0.06] });
    /* stacked log walls */
    const W = 5.2, D = 4.2;
    for (let r = 0; r < 8; r++) {
      const y = 0.17 + r * 0.32;
      for (const [len, px, pz, rot] of [[W + 0.6, 0, D / 2, 0], [W + 0.6, 0, -D / 2, 0], [D + 0.6, W / 2, 0, Math.PI / 2], [D + 0.6, -W / 2, 0, Math.PI / 2]] as const) {
        if (pz > 0 && Math.abs(px) < 0.8 && r < 6) { /* doorway */
          for (const s of [-1, 1]) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, (len - 1.3) / 2, 8), logMat); seg.rotation.z = Math.PI / 2; seg.position.set(s * (0.65 + (len - 1.3) / 4), y, pz); seg.castShadow = seg.receiveShadow = true; hut.add(seg); }
          continue;
        }
        const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, len, 8), logMat);
        lg.rotation.z = Math.PI / 2; lg.rotation.y = rot; lg.position.set(px, y, pz);
        lg.castShadow = lg.receiveShadow = true; hut.add(lg);
      }
    }
    const roofMat = enhance(new THREE.MeshStandardMaterial({ color: snow ? 0xdfe6ea : 0x2a2420, roughness: 1, flatShading: true }), { rim: [0.06, 0.06, 0.08] });
    for (const s of [-1, 1]) {
      const rf = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.14, D / 2 + 1.1), roofMat);
      rf.position.set(0, 3.25, s * (D / 4 + 0.25)); rf.rotation.x = s * 0.62; rf.castShadow = true; hut.add(rf);
    }
    const gable = new THREE.Shape(); gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(0, 1.4); gable.closePath();
    for (const s of [-1, 1]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), logMat); gm.rotation.y = Math.PI / 2; gm.position.set(s * W / 2, 2.6, 0); hut.add(gm); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.08), new THREE.MeshStandardMaterial({ color: 0x2e2117, roughness: 1 }));
    door.position.set(0, 1, D / 2 - 0.05); hut.add(door);
    const glow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb050, emissiveIntensity: 3.2 });
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), glow); w.position.set(s * 1.7, 1.55, D / 2 + 0.18); hut.add(w); }
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd28a, emissiveIntensity: 6 }));
    lantern.position.set(0.95, 2.25, D / 2 + 0.35); hut.add(lantern);
    hutLight.position.set(0.9, 2.3, D / 2 + 1.2); hut.add(hutLight);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), new THREE.MeshStandardMaterial({ map: signTexture('避難小屋'), roughness: 0.9 }));
    sign.position.set(0, 2.35, D / 2 + 0.2); hut.add(sign);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1 }));
    chimney.position.set(1.5, 3.9, -0.6); hut.add(chimney);
    scene.add(hut);
    colliders.push({ x: cabin.x - 1.5, z: cabin.z, r: 1.9 }, { x: cabin.x + 1.5, z: cabin.z, r: 1.9 });
  }

  /* ---------- moonbeams through the canopy ---------- */
  const beams: THREE.Mesh[] = [];
  {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uColor: { value: new THREE.Color(L.moon) }, uTime: shared.time, uAlpha: { value: o.look === 'fog' ? 0.05 : 0.09 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uAlpha; varying vec2 vUv;
        void main(){ float side = smoothstep(0.0,0.5,vUv.x) * smoothstep(1.0,0.5,vUv.x); float h = smoothstep(0.0,0.25,vUv.y) * smoothstep(1.0,0.55,vUv.y);
        float f = 0.75 + 0.25 * sin(uTime * 0.7 + vUv.y * 6.0); gl_FragColor = vec4(uColor * side * h * f * uAlpha, 1.0); }`,
    });
    for (let i = 0; i < 12; i++) {
      const z = START_Z - 10 - i * 15 + rnd(-4, 4), x = pathX(z) + rnd(-4, 4);
      const g = new THREE.PlaneGeometry(rnd(1.6, 3), 16);
      g.translate(0, 8, 0);
      for (const r of [0, Math.PI / 2]) {
        const b = new THREE.Mesh(g, m.clone());
        b.position.set(x, groundY(x, z), z);
        b.rotation.set(0.32, r + 0.6, 0.18);
        scene.add(b); beams.push(b);
      }
    }
  }

  /* ---------- drifting ground fog ---------- */
  const puffs: { s: THREE.Sprite; v: number; ph: number }[] = [];
  {
    const tex = fogPuff();
    const col = new THREE.Color(L.fog).lerp(new THREE.Color(0xb8c4c8), 0.35);
    const N = o.look === 'fog' ? 110 : 70;
    for (let i = 0; i < N; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false, opacity: o.look === 'fog' ? 0.22 : 0.13 });
      const s = new THREE.Sprite(mat);
      const z = rnd(-104, 104), x = pathX(z) + rnd(-12, 12);
      s.position.set(x, groundY(x, z) + rnd(0.3, 1.4), z);
      const k = rnd(5, 11); s.scale.set(k, k * 0.45, 1);
      mat.rotation = rnd(0, 6);
      scene.add(s); puffs.push({ s, v: rnd(0.15, 0.4), ph: rnd(0, 6) });
    }
  }

  /* ---------- fireflies / spores ---------- */
  const flies = (() => {
    const N = snow ? 0 : 220, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { const z = rnd(-105, 105); p[i * 3] = pathX(z) + rnd(-12, 12); p[i * 3 + 1] = rnd(0.4, 3); p[i * 3 + 2] = z; seed[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ map: softDot(), color: 0xd8ff8a, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
    const pts = new THREE.Points(g, m); scene.add(pts);
    return { pts, p, seed, N };
  })();

  /* ---------- snow, or wind-blown leaves, in a box that follows the camera ---------- */
  const fall = (() => {
    if (!snow && !o.windy) return null;
    const N = snow ? 1600 : 260, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = rnd(-14, 14); p[i * 3 + 1] = rnd(0, 9); p[i * 3 + 2] = rnd(-14, 14); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ map: softDot(), color: snow ? 0xffffff : 0x8a6a3a, size: snow ? 0.09 : 0.14, transparent: true, depthWrite: false, opacity: snow ? 0.9 : 0.85 });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
    return { pts, p, N };
  })();

  const follows: THREE.Object3D[] = [];
  scene.traverse((ob) => { if (ob.userData.follow) follows.push(ob); });
  const followBase = follows.map((f) => f.position.clone());

  return {
    colliders,
    cabin,
    hutLight,
    grade: L.grade,
    fogColor: new THREE.Color(L.fog),
    update(dt: number, t: number, cam: THREE.Vector3) {
      shared.time.value = t;
      follows.forEach((f, i) => f.position.set(followBase[i].x + cam.x, followBase[i].y, followBase[i].z + cam.z));
      for (const pf of puffs) {
        pf.s.position.x += Math.sin(t * 0.1 + pf.ph) * pf.v * dt * (o.windy ? 4 : 1);
        pf.s.material.rotation += dt * 0.02;
      }
      for (const b of beams) {
        const d = Math.hypot(b.position.x - cam.x, b.position.z - cam.z);
        b.visible = d < 45 && d > 4;
        const u = (b.material as THREE.ShaderMaterial).uniforms;
        u.uAlpha.value = (o.look === 'fog' ? 0.04 : 0.07) * Math.min(1, Math.max(0, (d - 4) / 10));
      }
      const fp = flies.p;
      for (let i = 0; i < flies.N; i++) {
        const s = flies.seed[i];
        fp[i * 3 + 1] = 0.5 + (Math.sin(t * 0.6 + s) + 1) * 1.2;
        fp[i * 3] += Math.sin(t * 0.3 + s) * dt * 0.3;
        fp[i * 3 + 2] += Math.cos(t * 0.25 + s * 1.3) * dt * 0.3;
      }
      if (flies.N) { flies.pts.geometry.attributes.position.needsUpdate = true; (flies.pts.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(t * 2.3) * 0.3; }
      if (fall) {
        const p = fall.p;
        for (let i = 0; i < fall.N; i++) {
          if (snow) { p[i * 3 + 1] -= dt * (0.7 + (i % 5) * 0.12); p[i * 3] += Math.sin(t + i) * dt * 0.2; }
          else { p[i * 3] += dt * (5 + (i % 7)); p[i * 3 + 1] += Math.sin(t * 3 + i) * dt * 0.8 - dt * 0.6; p[i * 3 + 2] += Math.cos(t * 2 + i) * dt * 0.6; }
          if (p[i * 3 + 1] < 0) p[i * 3 + 1] += 9;
          if (p[i * 3] > 14) p[i * 3] -= 28;
        }
        fall.pts.position.set(cam.x, groundY(cam.x, cam.z), cam.z);
        fall.pts.geometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
export type World = ReturnType<typeof buildWorld>;
