/**
 * Low-poly bear models (made with Tripo from our own reference art, cleaned up and split in Blender).
 *
 * Each .glb holds the bear in the rig's frame (Y up, nose toward +Z, feet on y = 0, nose-to-rump 2.95)
 * as five meshes: `body` (torso and head) and four legs `legFL` `legFR` `legHL` `legHR`, each leg with its
 * origin at the hip/shoulder so it can swing. Colours are one flat colour per face (vertex colours).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BearKind } from './actors';
import tsukiUrl from '../assets/bears/tsuki.glb?url';
import higumaUrl from '../assets/bears/higuma.glb?url';

export interface BearPart { geo: THREE.BufferGeometry; pivot: THREE.Vector3 }
export interface BearModel {
  body: BearPart;
  /** front-left, front-right, hind-left, hind-right (same order as the rig's legs) */
  legs: BearPart[];
  /** tip of the nose, and the two eyes, in model space */
  nose: THREE.Vector3;
  eyes: THREE.Vector3[];
}

const URLS: Record<BearKind, string> = { tsuki: tsukiUrl, higuma: higumaUrl };
const LEGS = ['legFL', 'legFR', 'legHL', 'legHR'];
let cache: Partial<Record<BearKind, BearModel>> | null = null;
let pending: Promise<unknown> | null = null;

/** The model for this kind if it has loaded, otherwise null (the rig then builds its own furry bear). */
export const getBearModel = (kind: BearKind) => cache?.[kind] ?? null;

export function loadBears() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  const loader = new GLTFLoader();
  pending = Promise.all(
    (Object.keys(URLS) as BearKind[]).map(async (kind) => {
      const gltf = await loader.loadAsync(URLS[kind]);
      const part = (name: string): BearPart => {
        const o = gltf.scene.getObjectByName(name) as THREE.Mesh | undefined;
        const mesh = o?.isMesh ? o : (o?.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh);
        if (!mesh) throw new Error(`bear ${kind}: no ${name}`);
        return { geo: mesh.geometry, pivot: o!.position.clone() };
      };
      const body = part('body');
      /* nose = the most forward points; the eyes sit a little behind and above it */
      const p = body.geo.attributes.position;
      let zMax = -Infinity;
      for (let i = 0; i < p.count; i++) zMax = Math.max(zMax, p.getZ(i));
      const tip = new THREE.Vector3(); let n = 0;
      for (let i = 0; i < p.count; i++) if (p.getZ(i) > zMax - 0.06) { tip.x += p.getX(i); tip.y += p.getY(i); n++; }
      tip.set(tip.x / n, tip.y / n, zMax);
      const eyes = [-1, 1].map((s) => eyeOnSurface(body.geo, tip, s));
      return [kind, { body, legs: LEGS.map(part), nose: tip, eyes }] as const;
    }),
  )
    .then((list) => (cache = Object.fromEntries(list)))
    .catch((e) => {
      console.warn('bear models failed to load, using the built-in bear', e);
      cache = {};
    });
  return pending;
}

/** Finds the eye spot: behind the nose and a bit up, pushed out to the head's surface (raycast from the side). */
function eyeOnSurface(geo: THREE.BufferGeometry, tip: THREE.Vector3, side: number) {
  const z = tip.z - 0.36, y = tip.y + 0.12;
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster(new THREE.Vector3(side * 2, y, z), new THREE.Vector3(-side, 0, 0));
  const hit = ray.intersectObject(mesh)[0];
  return new THREE.Vector3(hit ? hit.point.x : side * 0.14, y, z);
}
