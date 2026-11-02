/**
 * Post-processing: bloom on glowing things (eyes, lantern, fireflies), then one grading pass:
 * colour grade, vignette, film grain, and a danger pulse (red tint, chromatic split, desaturation).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uDanger: { value: 0 },
    uBeat: { value: 0 },
    uGrade: { value: new THREE.Vector3(1, 1, 1) },
    uAspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uDanger; uniform float uBeat; uniform vec3 uGrade; uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r = length(c * vec2(uAspect, 1.0));
      /* chromatic split grows with danger and each heartbeat */
      float ca = (0.0012 + uDanger * 0.004 + uBeat * 0.006) * r;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * ca).b;
      /* grade: cold shadows, warm light */
      float l = dot(col, vec3(0.299,0.587,0.114));
      vec3 shadowTint = vec3(0.86, 0.96, 1.12);
      vec3 lightTint = vec3(1.08, 1.0, 0.9);
      col *= mix(shadowTint, lightTint, smoothstep(0.05, 0.5, l));
      col *= uGrade;
      /* danger: drain colour and push red into the edges */
      col = mix(col, vec3(l), uDanger * 0.45);
      float edge = smoothstep(0.35, 0.95, r);
      col = mix(col, col * vec3(1.4, 0.35, 0.3) + vec3(0.08, 0.0, 0.0), edge * (uDanger * 0.65 + uBeat * 0.35));
      /* vignette */
      col *= mix(1.0, 0.18, smoothstep(0.25, 1.05, r));
      /* grain */
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime * 13.7)) - 0.5;
      col += g * 0.022;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export function makePost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, grade: [number, number, number]) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.86);
  composer.addPass(bloom);
  const gradePass = new ShaderPass(GradeShader);
  gradePass.uniforms.uGrade.value.set(...grade);
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
  return {
    composer,
    grade: gradePass.uniforms as typeof GradeShader.uniforms,
    setSize(w: number, h: number, pr: number) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      bloom.resolution.set(w * pr * 0.5, h * pr * 0.5);
      gradePass.uniforms.uAspect.value = w / h;
    },
  };
}
