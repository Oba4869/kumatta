/**
 * Low-poly models for the small animals (made with Tripo from our reference art, cleaned up in Blender,
 * see tools/bear-models/). Each .glb holds one mesh "body": facing +X, feet on y = 0, one flat colour per face.
 * Animals without a model keep their built-in shapes.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CritterKind } from './actors';

const files = import.meta.glob('../assets/critters/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
let cache: Partial<Record<CritterKind, THREE.BufferGeometry>> | null = null;
let pending: Promise<unknown> | null = null;

/** The model's geometry for this animal if it has one and it has loaded, otherwise null. */
export const getCritterModel = (kind: CritterKind) => cache?.[kind] ?? null;

export function loadCritters() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  const loader = new GLTFLoader();
  pending = Promise.all(
    Object.entries(files).map(async ([path, url]) => {
      const kind = path.split('/').pop()!.replace('.glb', '') as CritterKind;
      const gltf = await loader.loadAsync(url);
      const mesh = gltf.scene.getObjectByName('body') as THREE.Mesh;
      return [kind, mesh.geometry] as const;
    }),
  )
    .then((list) => (cache = Object.fromEntries(list)))
    .catch((e) => {
      console.warn('animal models failed to load, using built-in shapes', e);
      cache = {};
    });
  return pending;
}
