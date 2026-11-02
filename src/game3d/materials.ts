/**
 * Material tweaks shared by the forest:
 *  - rim light: a cold moonlit edge so dark shapes stand out of the dark (the Identity V silhouette look)
 *  - wind: instanced foliage and grass sway, more at the top
 */
import * as THREE from 'three';

export const shared = {
  time: { value: 0 },
  wind: { value: 0.4 },
};

interface Opts { rim?: [number, number, number]; rimPower?: number; wind?: number }

/** Patches a standard material. `wind` = sway amount (0 = none); sway grows with height above the instance's base. */
export function enhance<T extends THREE.MeshStandardMaterial>(m: T, o: Opts = {}): T {
  const rim = new THREE.Color(...(o.rim ?? [0.12, 0.16, 0.24]));
  const pow = o.rimPower ?? 3;
  const sway = o.wind ?? 0;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = { value: rim };
    sh.uniforms.uRimPow = { value: pow };
    sh.uniforms.uTime = shared.time;
    sh.uniforms.uWind = shared.wind;
    sh.uniforms.uSway = { value: sway };
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform float uSway;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      if (uSway > 0.0) {
        vec3 base = vec3(0.0);
        #ifdef USE_INSTANCING
          base = instanceMatrix[3].xyz;
        #endif
        float h = max(position.y, 0.0);
        float ph = base.x * 0.37 + base.z * 0.21;
        float s = (sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7) * 0.25) * uWind * uSway;
        transformed.x += s * h * h * 0.08;
        transformed.z += s * h * h * 0.05;
      }`,
    );
    sh.fragmentShader = 'uniform vec3 uRim; uniform float uRimPow;\n' + sh.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), uRimPow);
      outgoingLight += uRim * rimF;
      #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'enh' + rim.getHexString() + pow + sway;
  return m;
}
