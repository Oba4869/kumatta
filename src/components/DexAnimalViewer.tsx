import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { DexEntry } from '../data/dex';
import { makeBear, makeCritter } from '../game3d/actors';
import { getBearModel, loadBears } from '../game3d/bearModel';
import { getCritterModel, loadCritters } from '../game3d/critterModel';

function makeAnimal(entry: DexEntry, shared: Set<THREE.BufferGeometry>) {
  if (entry.ev && entry.ev !== 'wind') {
    const geometry = getCritterModel(entry.ev);
    if (geometry) shared.add(geometry);
    return makeCritter(entry.ev);
  }
  const kind = ['c-higuma', 'c-hcub'].includes(entry.id) ? 'higuma' : 'tsuki';
  const model = getBearModel(kind);
  if (model) for (const part of [model.body, ...model.legs]) shared.add(part.geo);

  function bear(cub: boolean) {
    const rig = makeBear(kind, cub, true);
    // Keep the gameplay-only objects out of the camera bounds.
    rig.cone.geometry.dispose();
    rig.coneMat.dispose();
    rig.icon.material.dispose();
    rig.root.remove(rig.cone, rig.icon);
    return rig.root;
  }

  const family = new THREE.Group();
  family.add(bear(entry.id === 'c-cub' || entry.id === 'c-hcub'));
  if (entry.id === 'c-mother') {
    const cub = bear(true);
    cub.position.set(1.05, 0, .4);
    cub.rotation.y = .25;
    family.add(cub);
  }
  return family;
}

export default function DexAnimalViewer({ entry }: { entry: DexEntry }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const container = host.current!;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([loadBears(), loadCritters()]).then(() => {
      if (cancelled) return;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setStatus('failed');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute('aria-hidden', 'true');
      container.append(renderer.domElement);

      const scene = new THREE.Scene();
      const shared = new Set<THREE.BufferGeometry>();
      const animal = makeAnimal(entry, shared);
      scene.add(animal);
      const sphere = new THREE.Box3().setFromObject(animal).getBoundingSphere(new THREE.Sphere());
      animal.position.sub(sphere.center);
      animal.scale.multiplyScalar(1 / sphere.radius);
      animal.position.divideScalar(sphere.radius);

      const camera = new THREE.PerspectiveCamera(36, 1, .05, 30);
      camera.position.set(2.8, 1.45, 3);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.minDistance = 2.5;
      controls.maxDistance = 8;
      controls.update();

      scene.add(new THREE.HemisphereLight(0xf5faff, 0x80746b, 2.4));
      const key = new THREE.DirectionalLight(0xffead1, 2.6);
      key.position.set(3, 5, 4);
      const rim = new THREE.DirectionalLight(0xc3ddff, 1.5);
      rim.position.set(-4, 2, -3);
      scene.add(key, rim);

      const render = () => renderer.render(scene, camera);
      const resize = () => {
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(container);
      controls.addEventListener('change', render);
      resize();
      setStatus('ready');

      cleanup = () => {
        observer.disconnect();
        controls.dispose();
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        animal.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          if (!shared.has(object.geometry)) geometries.add(object.geometry);
          // The game also caches the materials attached to the imported bear meshes.
          if (!entry.ev && shared.has(object.geometry)) return;
          for (const material of [object.material].flat()) materials.add(material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [entry]);

  return (
    <div className="dex-viewer" ref={host}>
      {status !== 'ready' && <p role="status">{status === 'loading' ? '3Dモデルを読み込み中…' : 'この端末では3D表示を利用できません。'}</p>}
    </div>
  );
}
