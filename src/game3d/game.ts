/**
 * Bear Survival — the 3D game, first person by default (V toggles an overhead view).
 *
 * Reach the refuge hut at the end of the trail. Bears patrol the forest:
 *   patrol  → notices you (sight cone, very close, running footsteps, or your scent when you are upwind)
 *   alert   → stares. Keep it on screen and step back slowly (S): its alert drops and it loses interest.
 *             Walking toward it, looking away, or turning your back raises it; running → chase.
 *   threaten→ rears up and growls, then edges closer. Let it come to a few metres and spray.
 *             If it reaches you, the defensive posture (hold E) is your last resort.
 *   chase   → you ran / showed your back. It is faster than you. Only a close-range spray stops it.
 *
 * Mountain conditions change the look and the rules (fog, dusk, wind and scent, the stream masking your
 * steps, Hokkaido's brown bears and first snow). Tools: bell/radio make far bears move off, spray, and
 * helmet/backpack shorten the posture. The run ends in an Outcome for the app's scoring and feedback.
 */
import * as THREE from 'three';
import { RARITY, RW, DEX, dexEntry } from '../data/dex';
import type { WeatherId } from '../data/conditions';
import type { ToolId } from '../data/tools';
import { NOLANE_LV } from '../data/levels';
import { SwipePad } from '../game/swipe';
import type { Outcome, PlayCondition, Tier } from '../game/types';
import { Audio3D } from './audio3d';
import { ICONS, makeBear, makeCritter, makeHand, makeHiker, type BearKind, type BearRig, type CritterKind } from './actors';
import { makePost } from './post';
import { softDot } from './textures';
import { buildWorld, GOAL_Z, groundY, HALF_W, pathX, START_Z, type Look, type World } from './world';

export interface EngineSetup {
  cond: PlayCondition;
  wx: WeatherId | null;
  tools: ToolId[];
  level: number;
  knownDex: Record<string, boolean>;
}
export interface EngineHooks {
  onDone: (o: Outcome) => void;
  onQuit?: () => void;
}

type BState = 'patrol' | 'alert' | 'threaten' | 'chase' | 'stunned' | 'flee' | 'gone';
interface Bear {
  rig: BearRig; cub: boolean; mother: Bear | null; isMother: boolean;
  x: number; z: number; dir: number; home: { x: number; z: number }; target: { x: number; z: number }; wait: number;
  state: BState; alert: number; chase: number; stunT: number; fleeT: number; growlT: number; huffT: number; walkT: number; stepT: number;
  rearT: number; heardBell: boolean; seen: boolean; breathT: number;
}
interface Critter { kind: CritterKind; x: number; z: number; g: THREE.Group | null; t: number; done: boolean; dir: number }

const LABEL: Record<BState, string> = { patrol: '巡回', alert: '警戒', threaten: '威嚇', chase: '突進', stunned: 'ひるんだ', flee: '退散', gone: '—' };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const angDiff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const WALK = 3.3, BACK = 1.6, RUN = 6.6;
const ATTACK_DIST = 1.7;

export class Game3D {
  private root: HTMLElement;
  private setup: EngineSetup;
  private hooks: EngineHooks;
  private ac = new AbortController();
  private timers: number[] = [];
  private raf = 0;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.05, 260);
  private post!: ReturnType<typeof makePost>;
  private world!: World;
  private snd!: Audio3D;
  private fx: SwipePad | null = null;
  private ro: ResizeObserver | null = null;

  /* config from the mountain and tools */
  private kind: BearKind;
  private look: Look;
  private quiet: boolean;
  private windy: boolean;
  private sprayMax: number;
  private chaseSpeed: number;
  private guardNeed: number;
  private sightR: number;
  private wind = { x: 0, z: 1 };
  private windT = 6;

  /* state */
  private state: 'intro' | 'play' | 'end' = 'intro';
  private T = 0;
  private last = 0;
  private camMode: 'fp' | 'tp' = 'fp';
  private yaw = Math.PI;
  private pitch = -0.04;
  private px = 0;
  private pz = START_Z;
  private face = Math.PI;
  private walkT = 0;
  private wasRunning = false;
  private wasLookAway = false;
  private guardHold = 0;
  private sprays = 0;
  private bellT = 0;
  private stepT = 0;
  private nextBeat = 0;
  private beat = 0;
  private danger = 0;
  private shake = 0;
  private fovKick = 0;
  private eye = 1.62;
  private bears: Bear[] = [];
  private critters: Critter[] = [];
  private keys: Record<string, boolean> = {};
  private touch = { x: 0, y: 0, run: false, guard: false, back: false };
  private coarse = matchMedia('(pointer:coarse)').matches;
  private promptKey = '';
  private mouseDrag = false;
  private lookTouch: { id: number; x: number; y: number } | null = null;
  private msg = { text: '', until: 0, prio: 0 };
  private sprayFx: { pts: THREE.Points; v: number[]; life: number }[] = [];
  private puffs: { s: THREE.Sprite; life: number; v: THREE.Vector3 }[] = [];
  private dexSeen = new Set<string>();
  private dexNew: string[] = [];
  private hud: { nearBear: Bear | null; nearest: number; lookAway: boolean } = { nearBear: null, nearest: 1e9, lookAway: false };
  private stats = { lookAways: 0, runs: 0, runNear: 0, backoffs: 0, alerts: 0, sprayHit: 0, sprayFar: 0, sprayEarly: 0, sprayHeadwind: false, guardSaves: 0, cubNear: false, scared: 0, cause: null as null | 'chase' | 'reached' | 'cub', motherMet: false };

  /* scene objects */
  private hiker!: ReturnType<typeof makeHiker>;
  private tpSpot!: THREE.SpotLight;
  private tpFill!: THREE.PointLight;
  private fpSpot!: THREE.SpotLight;
  private hand!: THREE.Group;
  private sprayCan!: THREE.Group;
  private beam!: THREE.Mesh;
  private dust!: THREE.Points;
  private puffTex = softDot('rgba(255,255,255,0.8)', 'rgba(255,255,255,0.2)');

  constructor(root: HTMLElement, setup: EngineSetup, hooks: EngineHooks) {
    this.root = root;
    this.setup = setup;
    this.hooks = hooks;
    const c = setup.cond, wx = setup.wx, tools = setup.tools;
    this.kind = c.higuma ? 'higuma' : 'tsuki';
    this.look = c.id === 'fog' || wx === 'fog' ? 'fog' : wx === 'snow' ? 'snow' : c.id === 'dusk' ? 'dusk' : 'night';
    this.quiet = !!c.quiet || wx === 'snow';
    this.windy = !!c.gusty;
    this.sprayMax = c.higuma ? 4.4 : 5.5;
    this.chaseSpeed = c.higuma ? 12 : 10.5;
    this.guardNeed = 0.75 - (tools.includes('pack') ? 0.15 : 0) - (tools.includes('helmet') ? 0.15 : 0);
    this.sightR = this.look === 'fog' ? 9 : this.look === 'dusk' ? 11 : 12.5;
    this.sprays = tools.includes('spray') ? 3 : 0;
  }

  private $<T extends HTMLElement = HTMLElement>(sel: string): T {
    const el = this.root.querySelector(sel);
    if (!el) throw new Error('missing element ' + sel);
    return el as T;
  }
  private later(fn: () => void, ms: number) { this.timers.push(window.setTimeout(fn, ms)); }

  /* ================= minimap (heading-up, player at centre) ================= */
  private mapTrail: { x: number; z: number }[] | null = null;
  private mapR = 46;
  /** last time each bear had noticed the player; only those bears appear on the map */
  private spottedAt = new Map<Bear, number>();
  private drawMap(heading: number) {
    const cv = this.root.querySelector<HTMLCanvasElement>('#minimap');
    if (!cv) return;
    const css = cv.clientWidth || 140, dpr = Math.min(2, devicePixelRatio || 1), px = Math.round(css * dpr);
    if (cv.width !== px) { cv.width = px; cv.height = px; }
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (!this.mapTrail) { this.mapTrail = []; for (let z = START_Z + 6; z >= GOAL_Z - 6; z -= 1.5) this.mapTrail.push({ x: pathX(z), z }); }
    /* zoom in while a bear is watching, so it does not sit on top of the player arrow */
    const watched = this.bears.some((b) => (b.state === 'alert' || b.state === 'threaten' || b.state === 'chase') && Math.hypot(b.x - this.px, b.z - this.pz) < 26);
    this.mapR += ((watched ? 24 : 46) - this.mapR) * 0.06;
    const S = css / 2, R = this.mapR, k = S / R, sh = Math.sin(heading), ch = Math.cos(heading);
    const P = (x: number, z: number): [number, number] => {
      const dx = x - this.px, dz = z - this.pz;
      return [S + (-dx * ch + dz * sh) * k, S - (dx * sh + dz * ch) * k];
    };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, css, css);
    ctx.save();
    ctx.beginPath(); ctx.arc(S, S, S - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(6,10,9,.86)'; ctx.fillRect(0, 0, css, css);
    // forest area (inside the boundary) slightly lighter, outside darker
    const corners = [P(-HALF_W, START_Z + 20), P(HALF_W, START_Z + 20), P(HALF_W, GOAL_Z - 20), P(-HALF_W, GOAL_Z - 20)];
    ctx.beginPath(); corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = 'rgba(38,58,44,.75)'; ctx.fill();
    // trail
    const tr = this.mapTrail;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, col] of [[3.4 * k + 3, 'rgba(0,0,0,.45)'], [3.4 * k, '#c9a46a']] as const) {
      ctx.beginPath(); tr.forEach((p, i) => { const [x, y] = P(p.x, p.z); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    }
    // start marker
    const [sx, sy] = P(pathX(START_Z), START_Z);
    ctx.fillStyle = 'rgba(241,231,207,.7)'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
    // view cone of the player
    const fov = 0.55;
    ctx.fillStyle = 'rgba(255,236,170,.16)';
    ctx.beginPath(); ctx.moveTo(S, S); ctx.arc(S, S, S * 0.55, -Math.PI / 2 - fov, -Math.PI / 2 + fov); ctx.closePath(); ctx.fill();
    ctx.restore();
    // hut (clamped to the rim when far)
    const cab = this.world.cabin;
    let [hx, hy] = P(cab.x, cab.z);
    const dx = hx - S, dy = hy - S, dl = Math.hypot(dx, dy), lim = S - 11, far = dl > lim;
    if (far) { hx = S + dx / dl * lim; hy = S + dy / dl * lim; }
    ctx.fillStyle = '#e2bc72'; ctx.strokeStyle = '#14100e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx, hy - 8); ctx.lineTo(hx + 7, hy - 1); ctx.lineTo(hx + 5, hy - 1); ctx.lineTo(hx + 5, hy + 6); ctx.lineTo(hx - 5, hy + 6); ctx.lineTo(hx - 5, hy - 1); ctx.lineTo(hx - 7, hy - 1); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // bears: only a bear that has noticed you appears (its cub too). While it watches you it pulses;
    // once it calms down the mark stays a few seconds, fading, so you know where it was.
    for (const b of this.bears) {
      const src = b.cub && b.mother ? b.mother : b;
      if (src.state === 'alert' || src.state === 'threaten' || src.state === 'chase' || src.state === 'stunned') this.spottedAt.set(b, this.T);
    }
    for (const b of this.bears) {
      const seenT = this.spottedAt.get(b);
      if (seenT == null || b.state === 'gone') continue;
      const since = this.T - seenT, fade = since <= 0.05 ? 1 : Math.max(0, 1 - since / 6);
      if (fade <= 0) { this.spottedAt.delete(b); continue; }
      const src = b.cub && b.mother ? b.mother : b;
      const live = since <= 0.05;
      let [bx, by] = P(b.x, b.z);
      const ddx = bx - S, ddy = by - S, dd = Math.hypot(ddx, ddy), rim = S - 8;
      const pinned = dd > rim;
      if (pinned) { bx = S + ddx / dd * rim; by = S + ddy / dd * rim; }
      const col = !live ? '#cfc6b0' : src.state === 'chase' ? '#ff3b30' : src.state === 'threaten' ? '#ff8a3d' : src.state === 'stunned' ? '#86d6ff' : '#ffd166';
      const r = b.cub ? 3 : 4.6;
      ctx.globalAlpha = fade;
      if (live && !b.cub && src.state !== 'stunned') {
        const ph = (this.T * (src.state === 'alert' ? 1.2 : 2.2)) % 1;
        ctx.beginPath(); ctx.arc(bx, by, r + 2 + ph * 9, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.globalAlpha = fade * (1 - ph); ctx.lineWidth = 1.6; ctx.stroke(); ctx.globalAlpha = fade;
      }
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#14100e'; ctx.stroke();
      if (!b.cub && !pinned) { // two tiny ears so it reads as a bear
        ctx.beginPath(); ctx.arc(bx - r * 0.7, by - r * 0.75, r * 0.38, 0, Math.PI * 2); ctx.arc(bx + r * 0.7, by - r * 0.75, r * 0.38, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // player arrow (always pointing up)
    ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#14100e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(S, S - 8); ctx.lineTo(S + 6, S + 6); ctx.lineTo(S, S + 3); ctx.lineTo(S - 6, S + 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // rim
    ctx.beginPath(); ctx.arc(S, S, S - 1, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(226,188,114,.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    // "up = facing" tick
    ctx.fillStyle = 'rgba(226,188,114,.9)'; ctx.beginPath(); ctx.moveTo(S, 2); ctx.lineTo(S + 4, 8); ctx.lineTo(S - 4, 8); ctx.closePath(); ctx.fill();
  }

  /* ================= setup ================= */
  start() {
    const canvas = this.$<HTMLCanvasElement>('#g3d');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.look === 'fog' ? 0.95 : 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.world = buildWorld(this.scene, { look: this.look, stream: this.setup.cond.id === 'stream', windy: this.windy, lite: this.coarse });
    this.scene.add(this.camera);
    this.buildPlayer();
    this.spawnBears();
    this.spawnCritters();
    this.post = makePost(this.renderer, this.scene, this.camera, this.world.grade);
    this.snd = new Audio3D({ stream: this.setup.cond.id === 'stream', windy: this.windy, snow: this.look === 'snow' });
    const c = this.setup.cond;
    this.fx = new SwipePad(this.root, { avgMax: c.avg, lim: c.lim, level: this.setup.level }, { onSwipe: () => {}, onFail: () => {} });
    this.px = pathX(START_Z); this.pz = START_Z;
    if (this.windy) { this.setWind(rnd(0, 6.28)); this.$('#swind').hidden = false; }
    this.renderSprays();
    this.$('#tSpray').hidden = this.sprays === 0;
    document.body.classList.add('fp');
    this.bind();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.root);
    this.say('避難小屋を目指せ。クマに出会っても、走らない', 'hint', 3.5, 1);
    let seen = false; try { seen = localStorage.getItem('bearReflex.help3d') === '1'; } catch { /* ignore */ }
    if (seen) this.state = 'play'; else this.$('#help').hidden = false;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    (window as unknown as { __g3d?: unknown }).__g3d = this;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ac.abort();
    this.timers.forEach(clearTimeout);
    this.ro?.disconnect();
    this.snd?.destroy();
    this.fx?.destroy();
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* ignore */ }
    document.body.classList.remove('fp');
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    });
    this.post?.composer.dispose();
    this.renderer?.dispose();
    this.state = 'end';
  }

  private resize() {
    const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, this.coarse ? 1.25 : 1.25);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, pr);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 72 : 60;
    this.camera.updateProjectionMatrix();
  }

  private buildPlayer() {
    this.hiker = makeHiker();
    this.scene.add(this.hiker.g);
    /* soft light over the hiker so the overhead view is readable */
    this.tpFill = new THREE.PointLight(0x9fb4d8, 18, 22, 1.4); this.tpFill.position.set(0, 9, 2); this.hiker.g.add(this.tpFill);
    /* overhead-view flashlight on the hiker */
    this.tpSpot = new THREE.SpotLight(0xffe2b0, 70, 26, 0.55, 0.55, 1.5);
    this.tpSpot.position.set(0.3, 1.1, 0.4);
    this.tpSpot.castShadow = true; this.tpSpot.shadow.mapSize.set(1024, 1024); this.tpSpot.shadow.bias = -0.0015;
    const tt = new THREE.Object3D(); tt.position.set(0.3, 0, 6); this.hiker.g.add(tt); this.tpSpot.target = tt; this.hiker.g.add(this.tpSpot);
    /* first-person flashlight, held in front of the camera */
    this.fpSpot = new THREE.SpotLight(0xffe6bf, 85, 30, 0.48, 0.5, 1.35);
    this.fpSpot.castShadow = true; this.fpSpot.shadow.mapSize.setScalar(this.coarse ? 512 : 1024); this.fpSpot.shadow.camera.near = 0.2; this.fpSpot.shadow.bias = -0.0015;
    /* the light sits just in front of the lens, so it lights the forest and not the hand holding it */
    this.fpSpot.position.set(0.24, -0.23, -0.72);
    const ft = new THREE.Object3D(); ft.position.set(0.05, -0.55, -8); this.camera.add(ft); this.fpSpot.target = ft; this.camera.add(this.fpSpot);
    const fill = new THREE.PointLight(0xffd8a8, 0.35, 3, 2); fill.position.set(0, 0.2, 0); this.camera.add(fill);
    /* the right hand holds the flashlight; the left hand brings the spray up when used */
    this.hand = new THREE.Group();
    const rh = makeHand(1); rh.position.set(0, -0.005, 0.03); this.hand.add(rh);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 14), new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.35, metalness: 0.7 }));
    body.rotation.x = Math.PI / 2; this.hand.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.034, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.3, metalness: 0.8 }));
    head.rotation.x = Math.PI / 2; head.position.z = -0.14; this.hand.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff0c8, emissiveIntensity: 1.1 }));
    lens.position.z = -0.171; lens.rotation.y = Math.PI; this.hand.add(lens);
    this.camera.add(this.hand);
    this.sprayCan = new THREE.Group();
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.17, 16), new THREE.MeshStandardMaterial({ color: 0xc8501a, roughness: 0.35, metalness: 0.3 }));
    can.rotation.x = Math.PI / 2 - 0.3; this.sprayCan.add(can);
    const capM = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
    capM.rotation.x = Math.PI / 2 - 0.3; capM.position.set(0, 0.026, -0.1); this.sprayCan.add(capM);
    const lh = makeHand(-1); lh.position.set(0.01, -0.01, 0.03); this.sprayCan.add(lh);
    this.sprayCan.visible = false;
    this.camera.add(this.sprayCan);
    /* light shaft in the air in front of the flashlight */
    const cg = new THREE.ConeGeometry(2.8, 13, 40, 1, true);
    cg.translate(0, -6.5, 0); cg.rotateX(Math.PI / 2);
    const cm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(0xffe2b0) }, uAlpha: { value: this.look === 'fog' ? 0.08 : 0.035 } },
      vertexShader: 'varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vD = -position.z / 13.0; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = pow(1.0 - clamp(vD,0.0,1.0), 1.6) * smoothstep(0.08, 0.35, vD); gl_FragColor = vec4(uColor * edge * fall * uAlpha, 1.0); }',
    });
    this.beam = new THREE.Mesh(cg, cm);
    this.beam.position.copy(this.fpSpot.position);
    this.beam.rotation.x = -0.065;
    this.camera.add(this.beam);
    /* dust motes in the beam */
    const N = 260, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = rnd(-2.2, 2.2); p[i * 3 + 1] = rnd(-1.5, 1.2); p[i * 3 + 2] = -rnd(0.8, 9); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: softDot(), color: 0xfff0d0, size: 0.03, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.camera.add(this.dust);
  }

  private spawnBears() {
    const c = this.setup.cond;
    const n = c.id === 'dusk' ? 6 : c.higuma ? 4 : 5;
    const span = START_Z - 30 - (GOAL_Z + 14);
    for (let i = 0; i < n; i++) {
      const z = START_Z - 30 - (span / (n - 1)) * i + rnd(-5, 5);
      const side = i % 2 ? 1 : -1;
      const x = clamp(pathX(z) + side * rnd(5, 11), -HALF_W + 2, HALF_W - 2);
      this.bears.push(this.makeBear(x, z, false));
    }
    if (Math.random() < 0.55) {
      const m = this.bears[Math.floor(n / 2)];
      const cub = this.makeBear(clamp(m.x + (m.x > pathX(m.z) ? -2.6 : 2.6), -HALF_W + 1, HALF_W - 1), m.z + 3, true);
      cub.mother = m; m.isMother = true;
      this.bears.push(cub);
    }
  }

  private makeBear(x: number, z: number, cub: boolean): Bear {
    const rig = makeBear(this.kind, cub, this.coarse);
    rig.root.position.set(x, groundY(x, z), z);
    this.scene.add(rig.root);
    return {
      rig, cub, mother: null, isMother: false, x, z, dir: rnd(0, 6.28), home: { x, z }, target: { x, z }, wait: rnd(0.5, 2),
      state: 'patrol', alert: 0, chase: 0, stunT: 0, fleeT: 0, growlT: 0, huffT: 2, walkT: rnd(0, 5), stepT: 0, rearT: 0, heardBell: false, seen: false, breathT: 0,
    };
  }

  private spawnCritters() {
    const pool: CritterKind[] = [];
    DEX.forEach((d) => { if (d.ev && d.ev !== 'wind' && d.ev !== 'wolf') for (let i = 0; i < RW[d.star]; i++) pool.push(d.ev as CritterKind); });
    const c = this.setup.cond, wx = this.setup.wx;
    if (c.higuma && (wx === 'fog' || wx === 'snow')) for (let i = 0; i < 10; i++) pool.push('wolf');
    for (let i = 0; i < 4; i++) {
      const z = START_Z - 18 - i * 42 + rnd(-8, 8);
      this.critters.push({ kind: pool[Math.floor(Math.random() * pool.length)], x: pathX(z), z, g: null, t: 0, done: false, dir: Math.random() < 0.5 ? 1 : -1 });
    }
  }

  private setWind(a: number) {
    this.wind = { x: Math.sin(a), z: Math.cos(a) };
  }

  /* ================= input ================= */
  private bind() {
    const sig = { signal: this.ac.signal };
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.useSpray(); }
      if (e.code === 'KeyV' && !e.repeat) this.toggleView();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    }, sig);
    addEventListener('keyup', (e) => { this.keys[e.code] = false; }, sig);
    addEventListener('blur', () => { this.keys = {}; }, sig);
    const canvas = this.$<HTMLCanvasElement>('#g3d');
    canvas.addEventListener('mousedown', () => {
      if (this.state !== 'play' || this.camMode !== 'fp') return;
      this.mouseDrag = true;
      try { const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined; if (r && r.catch) r.catch(() => {}); } catch { /* dragging still works */ }
    }, sig);
    addEventListener('mouseup', () => { this.mouseDrag = false; }, sig);
    addEventListener('mousemove', (e) => {
      if (this.camMode !== 'fp' || this.state !== 'play') return;
      if (document.pointerLockElement === canvas || this.mouseDrag) { this.yaw -= e.movementX * 0.0026; this.pitch = clamp(this.pitch - e.movementY * 0.002, -0.75, 0.45); }
    }, sig);
    canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !this.lookTouch) this.lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY }; }, sig);
    canvas.addEventListener('pointermove', (e) => {
      const lt = this.lookTouch;
      if (!lt || e.pointerId !== lt.id || this.camMode !== 'fp') return;
      this.yaw -= (e.clientX - lt.x) * 0.006; this.pitch = clamp(this.pitch - (e.clientY - lt.y) * 0.004, -0.75, 0.45);
      lt.x = e.clientX; lt.y = e.clientY;
    }, sig);
    const endLook = (e: PointerEvent) => { if (this.lookTouch && e.pointerId === this.lookTouch.id) this.lookTouch = null; };
    canvas.addEventListener('pointerup', endLook, sig); canvas.addEventListener('pointercancel', endLook, sig);
    /* touch stick and buttons */
    const stick = this.$('#stick'), knob = this.$('#knob');
    let sid: number | null = null;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2;
      if (m > max) { dx = dx / m * max; dy = dy / m * max; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.touch.x = dx / max; this.touch.y = dy / max;
      /* pushing the stick all the way to the edge = running (the thing you should not do) */
      this.touch.run = m >= max * 0.97;
      knob.classList.toggle('run', this.touch.run);
    };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; try { stick.setPointerCapture(sid); } catch { /* ignore */ } move(e); }, sig);
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) move(e); }, sig);
    const up = (e: PointerEvent) => { if (e.pointerId !== sid) return; sid = null; this.touch.x = this.touch.y = 0; this.touch.run = false; knob.classList.remove('run'); knob.style.transform = ''; };
    stick.addEventListener('pointerup', up, sig); stick.addEventListener('pointercancel', up, sig);
    const hold = (el: HTMLElement, key: 'back' | 'guard') => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ } this.touch[key] = true; el.classList.add('on'); }, sig);
      const off = () => { this.touch[key] = false; el.classList.remove('on'); };
      el.addEventListener('pointerup', off, sig); el.addEventListener('pointercancel', off, sig); el.addEventListener('contextmenu', (e) => e.preventDefault(), sig);
    };
    hold(this.$('#tBack'), 'back'); hold(this.$('#tGuard'), 'guard');
    const openHelp = () => { if (this.state === 'end') return; this.$('#help').hidden = false; this.state = 'intro'; try { document.exitPointerLock(); } catch { /* ignore */ } };
    this.$('#helpBtn').addEventListener('click', (e) => { e.stopPropagation(); openHelp(); }, sig);
    this.$('#helpOk').addEventListener('click', (e) => { e.stopPropagation(); this.$('#help').hidden = true; try { localStorage.setItem('bearReflex.help3d', '1'); } catch { /* ignore */ } if (this.state === 'intro') { this.state = 'play'; this.last = performance.now(); } }, sig);
    this.$('#tSpray').addEventListener('pointerdown', (e) => { e.preventDefault(); this.useSpray(); }, sig);
    this.$('#viewBtn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleView(); }, sig);
    this.$('#quit').addEventListener('click', () => this.hooks.onQuit?.(), sig);
  }

  private toggleView() {
    this.camMode = this.camMode === 'fp' ? 'tp' : 'fp';
    if (this.camMode === 'fp') this.yaw = this.face;
    else try { document.exitPointerLock(); } catch { /* ignore */ }
    this.$('#viewBtn').textContent = this.camMode === 'fp' ? '視点：一人称' : '視点：見下ろし';
    document.body.classList.toggle('fp', this.camMode === 'fp');
  }

  /* ================= HUD helpers ================= */
  private say(text: string, kind: 'hint' | 'good' | 'bad' = 'hint', secs = 1.6, prio = 1) {
    if (this.T < this.msg.until && prio < this.msg.prio) return;
    const el = this.$('#advice');
    if (this.msg.text !== text) {
      el.textContent = text;
      el.className = kind;
      if (!reduce()) el.animate([{ transform: 'translate(-50%,0) scale(.9)', opacity: 0.4 }, { transform: 'translate(-50%,0) scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    } else el.className = kind;
    this.msg = { text, until: this.T + secs, prio };
  }
  private toast(t: string) {
    const el = this.$('#toast');
    el.textContent = t; el.hidden = false;
    el.animate([{ opacity: 0, transform: 'translate(-50%,-8px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 200 });
    this.later(() => { el.hidden = true; }, 1800);
  }
  private dexHit(id: string) {
    const d = dexEntry(id);
    if (!d || this.setup.knownDex[id] || this.dexSeen.has(id)) return;
    this.dexSeen.add(id); this.dexNew.push(id);
    this.toast((d.star >= 3 ? RARITY[d.star] + '！ ' : '') + '図鑑に登録：' + d.name);
  }
  private renderSprays() {
    const box = this.$('#spraypips');
    box.innerHTML = this.sprays === 0 && !this.setup.tools.includes('spray') ? '<em>持っていない</em>' : [0, 1, 2].map((i) => `<i class="${i < this.sprays ? '' : 'used'}"></i>`).join('');
  }

  /* ================= spray ================= */
  private useSpray() {
    if (this.state !== 'play') return;
    if (!this.setup.tools.includes('spray')) { this.say('撃退スプレーは持ってきていない。防御姿勢（E）で身を守る', 'bad', 1.8, 3); return; }
    if (this.sprays <= 0) { this.say('スプレーはもう残っていない…', 'bad', 1.5, 3); return; }
    this.sprays--; this.renderSprays();
    this.snd.spray();
    this.spawnSprayFx();
    if (this.camMode === 'fp') { this.sprayCan.visible = true; this.later(() => { this.sprayCan.visible = false; }, 700); }
    /* against the wind it blows back into your own face */
    if (this.windy && Math.sin(this.face) * this.wind.x + Math.cos(this.face) * this.wind.z < -0.55) {
      this.stats.sprayHeadwind = true;
      this.say('向かい風でスプレーが自分にかかった！ 風向きを確かめて使う', 'bad', 2.4, 5);
      this.flash('#ffb45a', 0.5);
      return;
    }
    let best: Bear | null = null, bd = 1e9;
    for (const b of this.bears) {
      if (b.state === 'gone' || b.state === 'flee' || b.cub) continue;
      const dx = b.x - this.px, dz = b.z - this.pz, d = Math.hypot(dx, dz);
      const inFront = Math.abs(angDiff(Math.atan2(dx, dz), this.face)) < 0.7;
      if (inFront && d < bd) { bd = d; best = b; }
    }
    if (!best || bd > this.sprayMax + 3) { this.stats.sprayFar++; this.snd.miss(); this.say('空振り！ クマのいない方向・遠すぎる距離では届かない', 'bad', 2.2, 4); return; }
    const maxR = best.state === 'chase' ? this.sprayMax - 1 : this.sprayMax;
    if (bd > maxR) { this.stats.sprayFar++; this.snd.miss(); this.say(this.setup.cond.higuma ? '遠すぎる！ ヒグマは3〜4mまで引きつけて' : '遠すぎる！ 射程は数メートル。もっと引きつけて', 'bad', 2.2, 4); return; }
    if (bd < 1.1) { this.snd.miss(); this.say('近すぎて間に合わない！ 防御姿勢（E）を！', 'bad', 1.8, 4); return; }
    if (best.state === 'patrol' || best.state === 'alert') { this.stats.sprayEarly++; this.snd.miss(); this.say('早すぎる！ スプレーは威嚇して近づいてきた時に使う', 'bad', 2.2, 4); return; }
    best.state = 'stunned'; best.stunT = 4.5; best.alert = 60; best.chase = 0;
    this.stats.sprayHit++; this.snd.good();
    this.flash('#ffb45a', 0.3);
    this.fx?.callout('命中！', 'ok');
    this.say('接近を引きつけてからのスプレー成功！', 'good', 2.6, 5);
  }
  private spawnSprayFx() {
    const N = 140, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), v: number[] = [];
    const ox = this.px + Math.sin(this.face) * 0.5, oz = this.pz + Math.cos(this.face) * 0.5, oy = groundY(this.px, this.pz) + (this.camMode === 'fp' ? this.eye - 0.25 : 1.1);
    for (let i = 0; i < N; i++) {
      p[i * 3] = ox; p[i * 3 + 1] = oy; p[i * 3 + 2] = oz;
      const a = this.face + rnd(-0.25, 0.25), s = rnd(4, 9);
      v.push(Math.sin(a) * s, rnd(-0.4, 0.6), Math.cos(a) * s);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: this.puffTex, color: 0xff8a3a, size: 0.5, transparent: true, opacity: 0.8, depthWrite: false }));
    this.scene.add(pts); this.sprayFx.push({ pts, v, life: 1.0 });
  }
  private flash(color: string, a: number) {
    const f = this.$('#flash'); f.style.background = color;
    f.animate([{ opacity: a }, { opacity: 0 }], { duration: 450, easing: 'ease-out' });
  }

  /* ================= the loop ================= */
  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.state === 'play') this.update(dt);
    else if (this.state === 'intro') this.T += 0; /* paused behind the controls guide */
    this.animate(dt);
    this.post.composer.render(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.T += dt;
    const fp = this.camMode === 'fp', K = this.keys, tch = this.touch;
    /* --- which bear matters most --- */
    let focus: Bear | null = null, fScore = -1, nearest = 1e9, nearBear: Bear | null = null;
    for (const b of this.bears) {
      if (b.state === 'gone' || b.cub) continue;
      const d = Math.hypot(b.x - this.px, b.z - this.pz);
      if (d < nearest) { nearest = d; nearBear = b; }
      const sc = (b.state === 'chase' ? 400 : b.state === 'threaten' ? 300 : b.state === 'alert' ? 200 : b.state === 'stunned' ? 150 : 0) + b.alert - d;
      if (d < 30 && sc > fScore) { fScore = sc; focus = b; }
    }
    const engaged = !!focus && (focus.state === 'alert' || focus.state === 'threaten' || focus.state === 'chase');
    const toFocus = focus ? Math.atan2(focus.x - this.px, focus.z - this.pz) : 0;
    /* --- intent --- */
    let ix = 0, iz = 0;
    if (fp) {
      let fwd = 0, str = 0;
      if (K.KeyW || K.ArrowUp) fwd += 1;
      if (K.KeyS || K.ArrowDown) fwd -= 1;
      if (K.KeyA) str -= 1;
      if (K.KeyD) str += 1;
      if (K.ArrowLeft) this.yaw += dt * 2.2;
      if (K.ArrowRight) this.yaw -= dt * 2.2;
      fwd -= tch.y; str += tch.x;
      /* the 後ずさり button: turn to face the bear and step back */
      if (tch.back && engaged) {
        this.yaw += angDiff(toFocus, this.yaw) * Math.min(1, dt * 9);
        /* turn to face it first, then step back */
        fwd = Math.abs(angDiff(toFocus, this.yaw)) < 0.45 ? -1 : 0; str = 0;
      }
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
      ix = fx * fwd + rx * str; iz = fz * fwd + rz * str;
    } else {
      if (K.KeyA || K.ArrowLeft) ix -= 1;
      if (K.KeyD || K.ArrowRight) ix += 1;
      if (K.KeyW || K.ArrowUp) iz -= 1;
      if (K.KeyS || K.ArrowDown) iz += 1;
      ix += tch.x; iz += tch.y;
      if (tch.back && engaged) { ix = -Math.sin(toFocus); iz = -Math.cos(toFocus); }
    }
    const im = Math.hypot(ix, iz); if (im > 1) { ix /= im; iz /= im; }
    const moving = im > 0.15;
    const wantRun = (K.ShiftLeft || K.ShiftRight || tch.run) && moving;
    const guarding = !!(K.KeyE || tch.guard);
    this.guardHold = guarding ? this.guardHold + dt : 0;
    const inPosture = this.guardHold >= this.guardNeed;
    this.$('#postureLab').textContent = inPosture ? '防御姿勢：うつ伏せで首を守っている' : guarding ? '防御姿勢：とっています…' : (this.coarse ? '防御姿勢：ボタン長押し' : '防御姿勢：E 長押し');

    const looking = !fp || (!!focus && Math.abs(angDiff(this.yaw, toFocus)) < 0.62);
    const lookAway = fp && engaged && focus!.state !== 'chase' && !looking;

    /* --- move --- */
    let speed = 0, backing = false, awayLooking = false, mode: 'sneak' | 'walk' | 'run' = 'walk';
    if (moving && !inPosture && !guarding) {
      const dirA = Math.atan2(ix, iz);
      const away = engaged && Math.abs(angDiff(dirA, toFocus)) > Math.PI / 2;
      if (wantRun) { speed = RUN; mode = 'run'; }
      else if (engaged && focus!.state !== 'chase') { speed = BACK; mode = 'sneak'; backing = away && looking; awayLooking = away && !looking; }
      else speed = WALK * Math.min(1, im);
      let nx = this.px + Math.sin(dirA) * speed * dt, nz = this.pz + Math.cos(dirA) * speed * dt;
      for (const t of this.world.colliders) {
        const d = Math.hypot(nx - t.x, nz - t.z), min = t.r + 0.35;
        if (d < min && d > 0) { nx = t.x + (nx - t.x) / d * min; nz = t.z + (nz - t.z) / d * min; }
      }
      this.px = clamp(nx, -HALF_W, HALF_W); this.pz = clamp(nz, GOAL_Z - 6, START_Z + 4);
      if (!fp) {
        const faceTo = engaged && !wantRun && focus!.state !== 'chase' ? toFocus : dirA;
        this.face += angDiff(faceTo, this.face) * Math.min(1, dt * 10);
      }
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = mode === 'run' ? 0.26 : speed === BACK ? 0.62 : 0.44;
        this.snd.step(mode);
        /* the kuma-suzu swings with every step: one or two clapper knocks, more and louder when running,
           silent when you creep; the radio plays on its own (see below) */
        if (this.setup.tools.includes('bell') && mode !== 'sneak') {
          const run = mode === 'run';
          this.snd.bell(run ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1 + (Math.random() < 0.6 ? 1 : 0), run ? 1 : 0.6 + Math.random() * 0.3);
          this.scareByTools(true);
        }
      }
    } else if (engaged && !fp) this.face += angDiff(toFocus, this.face) * Math.min(1, dt * 6);
    if (fp) this.face = this.yaw;
    if (this.setup.tools.includes('radio')) { this.bellT -= dt; if (this.bellT <= 0) { this.bellT = 2.4; this.ringTools(); } }
    const running = speed === RUN;
    if (running && !this.wasRunning) this.stats.runs++;
    this.wasRunning = running;
    if (lookAway && !this.wasLookAway) this.stats.lookAways++;
    this.wasLookAway = lookAway;
    this.hud = { nearBear, nearest, lookAway };

    /* --- wind shifts --- */
    if (this.windy) {
      this.windT -= dt;
      if (this.windT <= 0) { this.windT = rnd(7, 12); this.setWind(rnd(0, 6.28)); this.toast('風向きが変わった'); this.dexHit('c-wind'); }
    }

    /* --- bears --- */
    const P = { running, backing, moving: speed > 0, lookAway, awayLooking };
    for (const b of this.bears) this.updateBear(b, dt, P);
    if (this.state !== 'play') return;
    this.updateCritters(dt);

    /* cubs */
    for (const b of this.bears) if (b.cub && b.state !== 'gone' && Math.hypot(b.x - this.px, b.z - this.pz) < 9) {
      this.stats.cubNear = true;
      this.say('子グマに近づくな！ 近くに母グマがいる', 'bad', 1.2, 3);
      const m = b.mother;
      if (m && (m.state === 'patrol' || m.state === 'alert')) { m.state = 'threaten'; m.alert = Math.max(m.alert, 85); this.snd.growl(m); this.stats.motherMet = true; }
    }

    /* --- the right button at the right moment --- */
    {
      const dF = focus ? Math.hypot(focus.x - this.px, focus.z - this.pz) : 99;
      const sprayReady = this.sprays > 0 && !!focus && ((focus.state === 'threaten' && dF <= this.sprayMax && dF > 1.1) || (focus.state === 'chase' && dF <= this.sprayMax - 1 && dF > 1.1));
      const guardReady = !!focus && ((focus.state === 'threaten' && dF < 4.5) || focus.state === 'chase');
      const backShow = engaged && focus!.state !== 'chase';
      this.$('#tBack').hidden = !backShow;
      this.$('#tSpray').classList.toggle('ready', sprayReady);
      this.$('#tGuard').classList.toggle('ready', guardReady);
      const c = this.coarse;
      const kb = (k: string) => '<kbd>' + k + '</kbd>';
      let key = '', html = '';
      if (focus?.state === 'chase') { key = 'chase' + sprayReady; html = sprayReady ? (c ? '「スプレー」を押す！' : kb('Space') + ' 今！スプレー') : (c ? '「防御」を長押し' : kb('E') + ' 長押しで防御姿勢'); }
      else if (focus?.state === 'threaten') { key = 'thr' + sprayReady + guardReady; html = sprayReady ? (c ? '「スプレー」を押す！' : kb('Space') + ' 今！スプレー') : guardReady ? (c ? '「防御」を長押し' : kb('E') + ' 長押しで防御姿勢') : (c ? '「後ずさり」を長押し　近づいたらスプレー' : kb('S') + ' 後ずさり　' + kb('Space') + ' 近づいたらスプレー'); }
      else if (focus?.state === 'alert') { key = 'alert'; html = c ? '「後ずさり」を長押し（クマの方を向いたまま下がる）' : 'クマを画面に入れたまま ' + kb('S') + ' で後ずさり'; }
      else if (this.T < 14) { key = 'intro'; html = c ? '左のスティックで進む　画面をなぞって見回す' : kb('W') + ' 進む　' + kb('マウス') + ' 見回す（クリックで固定）'; }
      if (key !== this.promptKey) {
        this.promptKey = key;
        const pr = this.$('#prompt');
        pr.innerHTML = html; pr.hidden = !html;
        if (html && !reduce()) pr.animate([{ opacity: 0, transform: 'translate(-50%,6px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 220 });
      }
    }

    /* --- advice --- */
    if (running && engaged) { this.stats.runNear++; this.say('走るな！ クマの本能を刺激する！', 'bad', 1.0, 4); }
    else if (lookAway) this.say(awayLooking ? '背中を見せるな！ クマを見たまま後ずさり' : '目を逸らすな！ クマを見ながらゆっくり後退', 'bad', 0.6, 3);
    else if (running && nearest < 22) this.say('走ると足音で気づかれる。クマの近くでは走らない', 'bad', 0.8, 2);
    else if (focus?.state === 'chase') this.say(this.sprays ? '突進してくる！ 走っても逃げきれない — 引きつけてスプレー！' : '突進してくる！ 走っても逃げきれない', 'bad', 0.5, 3);
    else if (focus?.state === 'threaten') this.say(backing ? '目を逸らさずに後ずさり中… ' + (this.sprays ? '近づいてきたら引きつけてスプレー' : '迫ってきたら防御姿勢') : this.sprays ? '立ち上がって威嚇している！ 数メートルまで引きつけてスプレー' : '威嚇している！ ぶつかる前に防御姿勢（E）', 'hint', 0.5, 2);
    else if (focus?.state === 'alert') this.say(backing ? '目を逸らさずにゆっくり後ずさり中…' : 'クマがこちらを見ている。走らず、目を離さずにゆっくり後退（S）', backing ? 'good' : 'hint', 0.5, 2);
    else if (focus?.state === 'stunned') this.say('クマがひるんでいる。今のうちに、ゆっくりその場を離れる', 'good', 0.5, 2);
    else if (nearest < 16) this.say('クマはまだ気づいていない。静かに、距離をとって進もう', 'hint', 0.5, 1);
    else if (this.T > this.msg.until) this.say('避難小屋を目指せ。クマに出会っても、走らない', 'hint', 0.5, 0);

    /* --- meters, heartbeat, danger --- */
    const al = focus ? focus.alert : 0, ch = focus ? focus.chase : 0;
    (this.$('#alertbar').firstElementChild as HTMLElement).style.width = clamp(al, 0, 100) + '%';
    (this.$('#chasebar').firstElementChild as HTMLElement).style.width = clamp(ch, 0, 100) + '%';
    const sl = this.$('#stateLab'), st = focus ? focus.state : null;
    sl.textContent = st ? LABEL[st] : '—'; sl.className = 'state st-' + (st ?? 'none');
    this.$('#distLab').textContent = '小屋まで ' + Math.max(0, Math.round(this.pz - GOAL_Z)) + 'm';
    const k = clamp(1 - nearest / 24, 0, 1);
    const stDanger = !focus ? 0 : focus.state === 'chase' ? 1 : focus.state === 'threaten' ? 0.75 : focus.state === 'alert' ? 0.4 : 0;
    this.danger = lerp(this.danger, Math.max(k * 0.45, stDanger), Math.min(1, dt * 3));
    this.$('#vign').style.opacity = String(k * 0.55 + (engaged ? 0.15 : 0));
    this.$('#heart').style.opacity = k > 0 ? '1' : '0';
    if (k > 0 && this.T >= this.nextBeat) {
      this.nextBeat = this.T + 60 / lerp(70, 175, Math.max(k, stDanger));
      this.snd.heart(k);
      this.beat = 1;
      const h = this.$('#heart'); h.classList.remove('beat'); void h.offsetWidth; h.classList.add('beat');
    }
    /* --- goal --- */
    const cab = this.world.cabin;
    if (Math.hypot(this.px - cab.x, this.pz - (cab.z + 3.2)) < 2.4) this.endGame(true);
  }

  private ringTools() {
    const bell = this.setup.tools.includes('bell');
    if (bell) this.snd.bell(2, 0.8); else this.snd.radio();
    this.scareByTools(bell);
  }

  /** Bears that hear the bell / radio from far enough away usually move off before they see you. */
  private scareByTools(bell: boolean) {
    for (const b of this.bears) {
      if (b.cub || b.heardBell || b.state !== 'patrol') continue;
      const d = Math.hypot(b.x - this.px, b.z - this.pz);
      if (d > (bell ? 26 : 22) || d < 11) continue;
      b.heardBell = true;
      /* most bears move off when they hear people coming; not all */
      if (Math.random() < 0.6) {
        b.state = 'flee'; b.fleeT = 7; this.stats.scared++;
        this.toast((bell ? '鈴' : 'ラジオ') + 'の音で、クマが先に離れていった');
      }
    }
  }

  private updateBear(b: Bear, dt: number, P: { running: boolean; backing: boolean; moving: boolean; lookAway: boolean; awayLooking: boolean }) {
    if (b.state === 'gone') return;
    const dx = this.px - b.x, dz = this.pz - b.z, d = Math.hypot(dx, dz);
    const toP = Math.atan2(dx, dz);
    let moveSpeed = 0, moveDir = b.dir;
    if (b.cub) {
      b.walkT += dt; b.x = b.home.x + Math.sin(b.walkT * 0.6) * 0.9; b.z = b.home.z + Math.cos(b.walkT * 0.4) * 0.7; b.dir = b.walkT * 0.5 + Math.PI / 2;
      this.poseBear(b, dt, 0.5); this.seeBear(b, d); return;
    }
    switch (b.state) {
      case 'patrol': {
        b.alert = Math.max(0, b.alert - 10 * dt); b.chase = Math.max(0, b.chase - 40 * dt);
        if (b.wait > 0) { b.wait -= dt; b.dir += Math.sin(this.T * 0.7 + b.home.x) * dt * 0.6; }
        else {
          const tx = b.target.x - b.x, tz = b.target.z - b.z, td = Math.hypot(tx, tz);
          if (td < 0.5) { b.wait = rnd(1.2, 3.4); b.target = { x: clamp(b.home.x + rnd(-6, 6), -HALF_W + 1, HALF_W - 1), z: b.home.z + rnd(-6, 6) }; }
          else { moveDir = Math.atan2(tx, tz); moveSpeed = 1.4; }
        }
        /* noticing you: sight, very close, footsteps, or scent from upwind */
        const upwind = this.windy && d > 1 && ((b.x - this.px) / d) * this.wind.x + ((b.z - this.pz) / d) * this.wind.z > 0.72;
        const inCone = Math.abs(angDiff(toP, b.dir)) < 0.95 && d < this.sightR;
        const hearR = P.running ? (this.quiet ? 11 : 18) : 0;
        if (inCone || d < 5.5 || d < hearR || (upwind && d < 17)) {
          b.state = 'alert'; b.alert = Math.max(b.alert, P.running ? 55 : 30); this.stats.alerts++;
          if (P.running) b.chase = 60;
          this.snd.huff(b);
          if (upwind && !inCone && d >= 5.5) this.say('風上にいたので、においで気づかれた', 'bad', 2, 3);
        }
        break;
      }
      case 'alert': {
        b.dir += angDiff(toP, b.dir) * Math.min(1, dt * 4);
        if (P.running) b.chase += 260 * dt; else b.chase = Math.max(0, b.chase - 35 * dt);
        if (P.awayLooking) b.chase += 110 * dt;
        if (P.lookAway) b.alert += 16 * dt;
        if (P.backing) b.alert -= 13 * dt;
        else if (P.moving && !P.awayLooking) b.alert += 22 * dt;
        else b.alert += (d < 10 ? 3.5 : -4) * dt;
        if (d < 6) b.alert += 14 * dt;
        b.alert = clamp(b.alert, 0, 100);
        b.huffT -= dt; if (b.huffT <= 0) { this.snd.huff(b); b.huffT = rnd(2.5, 4); }
        if (b.chase >= 100) this.startChase(b);
        else if (b.alert >= 70 || d < 4) { b.state = 'threaten'; b.rearT = 0; this.snd.growl(b); b.growlT = 2.4; this.fx?.callout('威嚇！', 'warn'); }
        else if (b.alert <= 0 && d > 11) {
          b.state = 'patrol'; b.wait = rnd(1, 2); this.stats.backoffs++; this.snd.good();
          this.say('目を離さずに距離をとれた。クマは興味をなくした', 'good', 2.4, 4);
        }
        break;
      }
      case 'threaten': {
        b.dir += angDiff(toP, b.dir) * Math.min(1, dt * 5);
        if (P.running) b.chase += 320 * dt; else b.chase = Math.max(0, b.chase - 25 * dt);
        if (P.awayLooking) b.chase += 140 * dt;
        b.alert = clamp(b.alert + (P.backing ? -6 : 6) * dt + (P.lookAway ? 10 * dt : 0), 0, 100);
        /* rears up and growls, drops, takes a few steps; again */
        b.rearT += dt;
        const cyc = b.rearT % 3.2;
        if (cyc > 1.7 && d > 1.2) { moveDir = toP; moveSpeed = 2.2; }
        b.growlT -= dt; if (b.growlT <= 0) { this.snd.growl(b); b.growlT = rnd(2, 3.2); }
        if (b.chase >= 100) this.startChase(b);
        else if (b.alert < 45 && d > 9) b.state = 'alert';
        else if (d < ATTACK_DIST) this.contact(b, false);
        break;
      }
      case 'chase': {
        b.chase = 100; b.alert = 100;
        moveDir = toP; moveSpeed = this.chaseSpeed; b.dir = toP;
        if (d < ATTACK_DIST) this.contact(b, true);
        break;
      }
      case 'stunned': {
        b.stunT -= dt; b.chase = 0;
        if (b.stunT <= 0) { b.state = 'flee'; b.fleeT = 9; }
        break;
      }
      case 'flee': {
        b.alert = Math.max(0, b.alert - 15 * dt);
        moveDir = Math.atan2(-dx, -dz); moveSpeed = 4.5; b.dir += angDiff(moveDir, b.dir) * Math.min(1, dt * 4);
        b.fleeT -= dt;
        if (b.fleeT <= 0 || d > 45) { b.state = 'gone'; this.scene.remove(b.rig.root); return; }
        break;
      }
    }
    if (moveSpeed) {
      b.dir += angDiff(moveDir, b.dir) * Math.min(1, dt * (b.state === 'chase' ? 12 : 3));
      b.x = clamp(b.x + Math.sin(b.dir) * moveSpeed * dt, -HALF_W - 5, HALF_W + 5);
      b.z += Math.cos(b.dir) * moveSpeed * dt;
      b.stepT -= dt * moveSpeed;
      if (b.stepT <= 0) { b.stepT = 1.1; if (d < 26) this.snd.bearStep(b, b.state === 'chase'); }
    }
    this.poseBear(b, dt, moveSpeed);
    this.seeBear(b, d);
  }

  /** Field guide entries when a bear first comes into view close enough to see. */
  private seeBear(b: Bear, d: number) {
    if (b.seen || d > 16) return;
    const inView = this.camMode === 'tp' || Math.abs(angDiff(Math.atan2(b.x - this.px, b.z - this.pz), this.yaw)) < 0.7;
    if (!inView) return;
    b.seen = true;
    if (b.cub) this.dexHit(this.kind === 'higuma' ? 'c-hcub' : 'c-cub');
    else {
      this.dexHit(this.kind === 'higuma' ? 'c-higuma' : 'c-bear');
      if (b.isMother) { this.dexHit('c-mother'); this.stats.motherMet = true; }
    }
  }

  private startChase(b: Bear) {
    if (b.state === 'chase') return;
    b.state = 'chase'; b.chase = 100;
    this.snd.roar(b); this.flash('#ff2a1a', 0.3); this.shake = 0.6;
    this.fx?.callout('突進！', 'warn');
    this.say('走るな！ 背中を見せたので突進してきた！', 'bad', 1.6, 5);
  }

  private contact(b: Bear, fromChase: boolean) {
    if (!fromChase && this.guardHold >= this.guardNeed) {
      this.stats.guardSaves++;
      b.state = 'flee'; b.fleeT = 8; this.snd.good(); this.shake = 0.4;
      this.flash('#ffffff', 0.25);
      this.say('うつ伏せで首の後ろを守った。クマは離れていった', 'good', 2.8, 5);
      return;
    }
    this.stats.cause = fromChase ? 'chase' : (this.stats.cubNear && b.isMother ? 'cub' : 'reached');
    this.shake = 1;
    this.endGame(false);
  }

  private poseBear(b: Bear, dt: number, sp: number) {
    const r = b.rig;
    r.root.position.set(b.x, groundY(b.x, b.z), b.z);
    r.root.rotation.y = b.dir;
    const gallop = b.state === 'chase';
    b.walkT += dt * (sp > 0 ? 2 + sp * (gallop ? 1.6 : 1.3) : 0);
    const sw = sp > 0 ? Math.sin(b.walkT * 3) * Math.min(0.75, 0.2 + sp * 0.05) : 0;
    const L = r.legs;
    /* rearing up on the hind legs while threatening */
    const rearing = b.state === 'threaten' && (b.rearT % 3.2) < 1.7;
    const rear = rearing ? -0.95 : gallop ? 0.08 : 0;
    r.hips.rotation.x = lerp(r.hips.rotation.x, rear, Math.min(1, dt * (rearing ? 5 : 8)));
    r.hips.position.y = 0.95 + (sp > 0 ? Math.abs(Math.sin(b.walkT * 3)) * (gallop ? 0.12 : 0.04) : 0);
    if (rearing) { L[0].rotation.x = lerp(L[0].rotation.x, 1.1 + Math.sin(this.T * 7) * 0.2, dt * 6); L[1].rotation.x = lerp(L[1].rotation.x, 1.1 - Math.sin(this.T * 7) * 0.2, dt * 6); }
    else { L[0].rotation.x = gallop ? sw : sw; L[1].rotation.x = gallop ? sw * 0.8 : -sw; }
    L[2].rotation.x = gallop ? -sw : -sw; L[3].rotation.x = gallop ? -sw * 0.8 : sw;
    /* a heavy, rolling gait: shoulders sway side to side with each step */
    r.hips.rotation.z = lerp(r.hips.rotation.z, sp > 0 && !rearing ? Math.sin(b.walkT * 3) * (gallop ? 0.03 : 0.06) : 0, Math.min(1, dt * 8));
    r.head.position.y = lerp(r.head.position.y, b.state === 'patrol' ? 0.12 : 0.2, Math.min(1, dt * 3));
    /* head: sniffing the ground on patrol, locked on you otherwise, shaking when stunned */
    const watching = b.state === 'alert' || b.state === 'threaten' || b.state === 'chase';
    const rel = watching ? clamp(angDiff(Math.atan2(this.px - b.x, this.pz - b.z), b.dir), -0.7, 0.7) : 0;
    r.head.rotation.y = b.state === 'stunned' ? Math.sin(this.T * 18) * 0.5 : lerp(r.head.rotation.y, rel + (b.state === 'threaten' ? Math.sin(this.T * 4) * 0.2 : 0), dt * 5);
    r.head.rotation.x = lerp(r.head.rotation.x, b.state === 'patrol' ? 0.3 + Math.sin(this.T * 1.3 + b.home.x) * 0.15 : rearing ? 0.5 : watching ? -0.28 : 0, dt * 4);
    /* jaws open when it growls or charges; breathing; ears flick, and flatten when it is angry */
    const open = b.state === 'threaten' ? (rearing ? 0.55 + Math.sin(this.T * 9) * 0.08 : 0.25) : gallop ? 0.4 : b.state === 'alert' ? 0.08 : 0.03;
    r.jaw.rotation.x = lerp(r.jaw.rotation.x, open, Math.min(1, dt * 10));
    const br = 1 + Math.sin(this.T * (b.state === 'patrol' ? 1.6 : 3.2) + b.home.x) * (b.state === 'patrol' ? 0.012 : 0.028);
    r.body.scale.set(br, br, 1);
    const angry = b.state === 'threaten' || gallop;
    r.ears.forEach((e, i) => {
      const flick = Math.sin(this.T * 0.9 + i * 2 + b.home.z) > 0.97 ? Math.sin(this.T * 30) * 0.3 : 0;
      e.rotation.x = lerp(e.rotation.x, angry ? -0.7 : flick, Math.min(1, dt * 8));
    });
    r.eyeMat.emissive.setHex(b.state === 'chase' || b.state === 'threaten' ? 0xff2a1a : 0xe2bc72);
    r.eyeMat.emissiveIntensity = b.state === 'chase' || b.state === 'threaten' ? 4.5 : 2.2;
    /* gaze cone (hidden from Lv.3) and the "?" / "!" badge */
    const cd = Math.hypot(b.x - this.px, b.z - this.pz);
    r.cone.visible = !b.cub && this.setup.level < NOLANE_LV && (b.state === 'patrol' || b.state === 'alert') && cd < 28;
    r.coneMat.color.setHex(b.state === 'alert' ? 0xff8a3d : 0xf0c86e);
    r.coneMat.opacity = b.state === 'alert' ? 0.13 : 0.07;
    const ic = (ICONS as Record<string, THREE.Texture>)[b.state];
    r.icon.visible = !!ic && !b.cub;
    if (ic && r.icon.material.map !== ic) { r.icon.material.map = ic; r.icon.material.needsUpdate = true; }
    /* breath in the cold air */
    if ((b.state === 'threaten' || b.state === 'alert' || gallop) && cd < 20) {
      b.breathT -= dt;
      if (b.breathT <= 0) {
        b.breathT = gallop ? 0.35 : rearing ? 0.6 : 1.4;
        const wp = r.breath.clone(); r.head.localToWorld(wp);
        this.puff(wp, b.dir);
      }
    }
  }

  private puff(p: THREE.Vector3, dir: number) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, color: 0xc8d2d8, transparent: true, opacity: 0.35, depthWrite: false }));
    s.position.copy(p); s.scale.setScalar(0.25);
    this.scene.add(s);
    this.puffs.push({ s, life: 1.2, v: new THREE.Vector3(Math.sin(dir) * 0.6, 0.25, Math.cos(dir) * 0.6) });
  }

  private updateCritters(dt: number) {
    for (const c of this.critters) {
      if (c.done) continue;
      if (!c.g) {
        if (Math.hypot(c.x - this.px, c.z - this.pz) > 9) continue;
        c.g = makeCritter(c.kind);
        c.x = this.px + Math.sin(this.face) * 6 - c.dir * 4; c.z = this.pz + Math.cos(this.face) * 6;
        c.g.position.set(c.x, groundY(c.x, c.z), c.z);
        c.g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.g.rotation.y -= Math.PI / 2;
        if (c.kind === 'wolf') c.g.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m) { m.transparent = true; m.opacity = 0.75; } });
        this.scene.add(c.g);
        const line: Record<CritterKind, [string, string?]> = {
          rabbit: ['ウサギが跳ねていった'], bird: ['小鳥が飛び立った'], tanuki: ['タヌキが横切った'],
          boar: ['イノシシが走り抜けた！', 'イノシシに出会ったら、刺激しないようゆっくり後ずさりして離れる'],
          wolf: ['…今のは、オオカミ？ エゾオオカミは明治時代に絶滅したとされている'],
        };
        this.say(line[c.kind][0] + (line[c.kind][1] ? '　' + line[c.kind][1] : ''), 'hint', 2.4, 1);
        this.snd.rustle(c);
        this.dexHit('c-' + c.kind);
      }
      c.t += dt;
      const sp = c.kind === 'boar' ? 9 : c.kind === 'wolf' ? 3 : c.kind === 'bird' ? 5 : 5;
      c.x += c.dir * sp * dt;
      const y = groundY(c.x, c.z) + (c.kind === 'bird' ? 0.4 + c.t * 2.5 : c.kind === 'rabbit' ? Math.abs(Math.sin(c.t * 10)) * 0.25 : 0);
      c.g.position.set(c.x, y, c.z);
      if (c.t > 2.4) { this.scene.remove(c.g); c.done = true; }
    }
  }

  /* ================= per-frame visuals ================= */
  private animate(dt: number) {
    const fpNow = this.camMode === 'fp' && this.state === 'play';
    const posture = this.guardHold >= this.guardNeed, crouch = this.guardHold > 0;
    const gy = groundY(this.px, this.pz);
    /* hiker (overhead view) */
    const h = this.hiker;
    h.g.visible = !fpNow;
    h.g.position.set(this.px, gy, this.pz); h.g.rotation.y = this.face;
    const moving = this.keys.KeyW || this.keys.KeyA || this.keys.KeyS || this.keys.KeyD || this.keys.ArrowUp || this.keys.ArrowDown || Math.hypot(this.touch.x, this.touch.y) > 0.15;
    this.walkT += dt * (moving && !crouch ? (this.wasRunning ? 13 : 7) : 0);
    const sw = moving && !crouch ? Math.sin(this.walkT) * 0.6 : 0;
    h.legs[0].rotation.x = sw; h.legs[1].rotation.x = -sw;
    h.body.position.y = posture ? -0.55 : crouch ? -0.25 : Math.abs(Math.sin(this.walkT)) * 0.04;
    h.body.rotation.x = lerp(h.body.rotation.x, posture ? 1.2 : 0, Math.min(1, dt * 8));
    this.tpSpot.visible = this.tpFill.visible = !fpNow;
    this.fpSpot.visible = this.hand.visible = this.beam.visible = this.dust.visible = fpNow;

    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.beat = Math.max(0, this.beat - dt * 3);
    const sx = (Math.random() - 0.5) * this.shake * 0.12, sy = (Math.random() - 0.5) * this.shake * 0.12;
    if (fpNow) {
      this.eye = lerp(this.eye, posture ? 0.42 : crouch ? 1.1 : 1.62, Math.min(1, dt * 8));
      const bob = moving && !crouch ? Math.sin(this.walkT) * (this.wasRunning ? 0.07 : 0.03) : Math.sin(this.T * 1.6) * 0.008;
      this.camera.position.set(this.px + sx, gy + this.eye + bob + sy, this.pz);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(posture ? -0.95 : this.pitch + Math.sin(this.T * 0.9) * 0.004, this.yaw - Math.PI, moving ? Math.sin(this.walkT * 0.5) * 0.01 : 0);
      this.fovKick = lerp(this.fovKick, this.wasRunning ? 9 : 0, Math.min(1, dt * 4));
      const baseFov = this.camera.aspect < 0.8 ? 72 : 60;
      if (Math.abs(this.camera.fov - (baseFov + this.fovKick)) > 0.05) { this.camera.fov = baseFov + this.fovKick; this.camera.updateProjectionMatrix(); }
      this.hand.position.set(0.24 + Math.cos(this.walkT * 0.5) * 0.01, -0.24 + bob * 0.5 - (posture ? 0.3 : 0), -0.5);
      this.hand.rotation.set(0.04, 0.05, 0);
      this.sprayCan.position.set(-0.2, -0.22, -0.45);
      this.fpSpot.intensity = (posture ? 20 : 85) * (0.97 + Math.random() * 0.03);
      /* dust drifts slowly */
      const dp = this.dust.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < dp.length; i += 3) { dp[i + 1] += Math.sin(this.T * 0.4 + i) * dt * 0.05; dp[i] += Math.cos(this.T * 0.3 + i) * dt * 0.04; }
      this.dust.geometry.attributes.position.needsUpdate = true;
    } else {
      const tgt = new THREE.Vector3(this.px * 0.9, gy + 17, this.pz + 7.5);
      this.camera.position.lerp(tgt, Math.min(1, dt * 4));
      this.camera.position.x += sx; this.camera.position.y += sy;
      this.camera.rotation.order = 'XYZ';
      this.camera.lookAt(this.px * 0.95, gy + 0.6, this.pz - 2.2);
    }
    this.snd.listener = { x: this.px, z: this.pz, yaw: this.face };
    this.snd.update(dt, this.T);
    this.world.update(dt, this.T, new THREE.Vector3(this.px, 0, this.pz));
    /* post */
    const g = this.post.grade;
    g.uTime.value = this.T;
    g.uDanger.value = this.state === 'end' && !this.won ? 1 : this.danger;
    g.uBeat.value = this.beat * clamp(this.danger + 0.2, 0, 1);

    /* HUD: way to the hut, and where the nearest bear is when off screen (hidden from Lv.10) */
    if (this.state === 'play') {
      const cab = this.world.cabin;
      const toCab = Math.atan2(cab.x - this.px, cab.z - this.pz);
      this.$('#compass').style.setProperty('--a', (-angDiff(toCab, this.face) * 180 / Math.PI).toFixed(1) + 'deg');
      this.drawMap(fpNow ? this.face : Math.PI);
      const nb = this.hud.nearBear, ind = this.$('#bearDir');
      if (fpNow && nb && this.hud.nearest < 30) {
        const rel = angDiff(Math.atan2(nb.x - this.px, nb.z - this.pz), this.yaw);
        ind.style.opacity = Math.abs(rel) > 0.6 ? String(clamp(1.2 - this.hud.nearest / 30, 0.45, 1)) : '0';
        ind.style.setProperty('--a', (-rel * 180 / Math.PI).toFixed(1) + 'deg');
        ind.classList.toggle('hot', nb.state === 'threaten' || nb.state === 'chase');
      } else ind.style.opacity = '0';
      if (this.windy) { const wa = Math.atan2(this.wind.x, this.wind.z); this.$('#swind').style.setProperty('--a', (-angDiff(wa, this.face) * 180 / Math.PI).toFixed(1) + 'deg'); }
    }
    /* spray clouds and breath */
    for (let i = this.sprayFx.length - 1; i >= 0; i--) {
      const f = this.sprayFx[i], a = f.pts.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < f.v.length / 3; j++) { a[j * 3] += f.v[j * 3] * dt; a[j * 3 + 1] += f.v[j * 3 + 1] * dt; a[j * 3 + 2] += f.v[j * 3 + 2] * dt; f.v[j * 3] *= 0.93; f.v[j * 3 + 2] *= 0.93; }
      f.pts.geometry.attributes.position.needsUpdate = true;
      f.life -= dt; (f.pts.material as THREE.PointsMaterial).opacity = Math.max(0, f.life * 0.8);
      (f.pts.material as THREE.PointsMaterial).size = 0.5 + (1 - f.life) * 1.2;
      if (f.life <= 0) { this.scene.remove(f.pts); f.pts.geometry.dispose(); this.sprayFx.splice(i, 1); }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life -= dt; p.s.position.addScaledVector(p.v, dt); p.s.scale.setScalar(0.25 + (1.2 - p.life) * 0.7);
      p.s.material.opacity = Math.max(0, p.life * 0.3);
      if (p.life <= 0) { this.scene.remove(p.s); p.s.material.dispose(); this.puffs.splice(i, 1); }
    }
  }

  /* ================= the end ================= */
  private won = false;
  private endGame(win: boolean) {
    if (this.state !== 'play') return;
    this.state = 'end';
    this.won = win;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* ignore */ }
    const o = this.outcome(win);
    if (win) {
      this.snd.win();
      this.say('避難小屋に着いた！', 'good', 5, 9);
      const sub = { rainbow: '一度も気づかれずに抜けた', gold: '正しい行動だけで抜けた', silver: '生還。次はもっと落ち着いて' }[o.tier!];
      this.later(() => this.fx!.reveal(o.tier!, undefined, undefined, sub).then(() => this.hooks.onDone(o)), 600);
      return;
    }
    this.snd.lose();
    const txt = this.stats.cause === 'chase' ? '走って逃げて、追いつかれた' : this.stats.cause === 'cub' ? '子グマに近づき、母グマに襲われた' : 'クマに襲われた';
    this.$('#dimtext').textContent = txt;
    this.$('#dim').classList.add('on');
    this.later(() => this.hooks.onDone(o), reduce() ? 800 : 1800);
  }

  private outcome(win: boolean): Outcome {
    const s = this.stats;
    const slips = (s.runs ? 1 : 0) + (s.lookAways ? 1 : 0) + (s.cubNear ? 1 : 0) + (s.guardSaves ? 1 : 0) + (s.sprayFar + s.sprayEarly || s.sprayHeadwind ? 1 : 0);
    const tier: Tier | null = !win ? null : slips === 0 && s.alerts === 0 ? 'rainbow' : slips === 0 ? 'gold' : 'silver';
    return {
      cond: this.setup.cond, wx: this.setup.wx, tools: [...this.setup.tools],
      rustles: s.alerts, stops: s.backoffs, scared: s.scared,
      stopped: s.alerts ? s.backoffs > 0 : null,
      reaction: null, tier,
      bearState: s.cause === 'chase' ? 'charging' : s.alerts ? (s.motherMet ? 'mother' : 'near') : null,
      leftQuietly: s.backoffs > 0,
      swipeFast: false, turned: false, ran: s.cause === 'chase' || s.runNear > 0, froze: false, mother: s.motherMet,
      cubOK: false, cubBad: false, cubSlow: false,
      sprayEarly: s.sprayFar + s.sprayEarly > 0, sprayHeadwind: s.sprayHeadwind, sprayOK: s.sprayHit > 0, postureOK: s.guardSaves > 0,
      chargeFail: !win && s.cause !== 'chase', ranCharge: false,
      dexNew: [...this.dexNew],
      escaped: win, noisy: s.runs, cubNear: s.cubNear, spottedBy: null, time: this.T * 1000,
      spotted: s.alerts, backedOff: s.backoffs, charges: s.guardSaves, lookAways: s.lookAways,
    };
  }
}
