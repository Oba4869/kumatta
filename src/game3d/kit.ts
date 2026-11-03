/**
 * Nature models from Kenney's "Nature Kit" (CC0, https://kenney.nl/assets/nature-kit).
 *
 * The .glb files are loaded once per page and kept in memory. Each model is flattened into one
 * geometry with one group per material "role" (leaves, bark, rock, …), so the forest can draw it
 * as an InstancedMesh with our own night-time materials instead of Kenney's daylight colours.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Role = 'leaf' | 'bark' | 'wood' | 'rock' | 'moss' | 'stem' | 'red' | 'tan' | 'flower';

export interface KitModel {
  /** merged geometry, base at y = 0, Kenney units (a tall pine is about 1.5 high) */
  geo: THREE.BufferGeometry;
  /** material role of each geometry group, in group order */
  roles: Role[];
  /** height of the model in Kenney units */
  height: number;
}

export type Kit = Record<string, KitModel>;

const files = import.meta.glob('../assets/nature/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** Kenney material name → our role */
const roleOf = (name: string): Role => {
  const n = name.toLowerCase();
  if (n.includes('leaf') || n.includes('leafs')) return 'leaf';
  if (n.includes('woodinner')) return 'wood';
  if (n.includes('bark') || n.includes('wood')) return 'bark';
  if (n.includes('grass')) return 'moss';
  if (n.includes('dirt') || n.includes('stone') || n.includes('rock')) return 'rock';
  if (n.includes('red')) return 'red';
  if (n.includes('tan')) return 'tan';
  if (n.includes('purple') || n.includes('yellow')) return 'flower';
  return 'stem';
};

let cache: Kit | null = null;
let pending: Promise<Kit | null> | null = null;

/** The kit if it has finished loading, otherwise null. */
export const getKit = () => cache;

/** Starts loading (once) and resolves with the kit, or null if loading failed (the forest then falls back to built-in shapes). */
export function loadKit(): Promise<Kit | null> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  const loader = new GLTFLoader();
  pending = Promise.all(
    Object.entries(files).map(async ([path, url]) => {
      const name = path.split('/').pop()!.replace('.glb', '');
      const gltf = await loader.loadAsync(url);
      gltf.scene.updateMatrixWorld(true);
      /* collect every mesh, grouped by role, in world space */
      const byRole = new Map<Role, THREE.BufferGeometry[]>();
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = ([] as THREE.Material[]).concat(mesh.material);
        const src = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        const groups = src.groups.length ? src.groups : [{ start: 0, count: (src.index ?? src.attributes.position).count, materialIndex: 0 }];
        for (const g of groups) {
          const role = roleOf(mats[g.materialIndex ?? 0]?.name ?? '');
          const part = src.index ? src.toNonIndexed() : src.clone();
          /* keep only this group's triangles */
          const pos = part.attributes.position, nor = part.attributes.normal;
          const from = g.start, to = g.start + g.count;
          const p = new Float32Array((to - from) * 3), n = new Float32Array((to - from) * 3);
          for (let i = from; i < to; i++) {
            p.set([pos.getX(i), pos.getY(i), pos.getZ(i)], (i - from) * 3);
            n.set([nor.getX(i), nor.getY(i), nor.getZ(i)], (i - from) * 3);
          }
          const piece = new THREE.BufferGeometry();
          piece.setAttribute('position', new THREE.BufferAttribute(p, 3));
          piece.setAttribute('normal', new THREE.BufferAttribute(n, 3));
          if (!byRole.has(role)) byRole.set(role, []);
          byRole.get(role)!.push(piece);
        }
      });
      const roles = [...byRole.keys()];
      const geo = mergeGeometries(roles.map((r) => mergeGeometries(byRole.get(r)!)), true);
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      geo.translate(0, -b.min.y, 0);
      geo.computeBoundingBox();
      return [name, { geo, roles, height: b.max.y - b.min.y }] as const;
    }),
  )
    .then((list) => (cache = Object.fromEntries(list)))
    .catch((e) => {
      console.warn('nature kit failed to load, using built-in shapes', e);
      pending = null;
      return null;
    });
  return pending;
}
