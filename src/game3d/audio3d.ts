/**
 * Synthesized sound with simple positioning: each bear sound is panned and attenuated by where the bear is
 * relative to the player's view, so a growl from behind really comes from behind.
 * Plus a looping ambience (wind in the trees, insects, an occasional owl, the stream).
 */
import { audio } from '../lib/sound';

type Pos = { x: number; z: number };
export interface Listener { x: number; z: number; yaw: number }

export class Audio3D {
  private ac: AudioContext | null;
  private master: GainNode | null = null;
  private amb: AudioNode[] = [];
  private nextCricket = 0;
  private nextOwl = 8;
  listener: Listener = { x: 0, z: 0, yaw: 0 };

  constructor(opts: { stream: boolean; windy: boolean; snow: boolean }) {
    this.ac = audio();
    if (!this.ac) return;
    this.master = this.ac.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ac.destination);
    /* wind through the canopy: looping noise, low-passed, slowly breathing */
    this.loopNoise(opts.windy ? 900 : 420, 0.7, opts.windy ? 0.32 : 0.12, 0.08);
    if (opts.stream) this.loopNoise(1800, 0.9, 0.09, 0.0, 'bandpass');
    if (opts.snow) this.nextCricket = 1e9; /* no insects in the snow */
  }

  private noiseBuf(sec: number) {
    const a = this.ac!, len = Math.floor(a.sampleRate * sec), b = a.createBuffer(1, len, a.sampleRate), ch = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; ch[i] = last * 3.5 + w * 0.15; }
    return b;
  }

  private loopNoise(freq: number, q: number, vol: number, lfo: number, type: BiquadFilterType = 'lowpass') {
    const a = this.ac!;
    const s = a.createBufferSource(); s.buffer = this.noiseBuf(4); s.loop = true;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = vol;
    if (lfo) {
      const o = a.createOscillator(); o.frequency.value = 0.09; const og = a.createGain(); og.gain.value = vol * 0.8;
      o.connect(og).connect(g.gain); o.start(); this.amb.push(o);
    }
    s.connect(f).connect(g).connect(this.master!); s.start();
    this.amb.push(s);
  }

  /** A panned, distance-attenuated output for a sound at `p` (or centred if no position). */
  private out(p?: Pos, vol = 1) {
    const a = this.ac!;
    const g = a.createGain();
    let v = vol;
    if (p && a.createStereoPanner) {
      const L = this.listener;
      const dx = p.x - L.x, dz = p.z - L.z, d = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz) - L.yaw;
      const pan = a.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, -Math.sin(ang)));
      /* sounds behind you are a little duller */
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.cos(ang) > 0 ? 9000 : 1800;
      v *= 1 / (1 + d * 0.12);
      g.gain.value = v;
      g.connect(lp).connect(pan).connect(this.master!);
    } else { g.gain.value = v; g.connect(this.master!); }
    return g;
  }

  private tone(f: number, d: number, type: OscillatorType, v: number, p?: Pos, when = 0, slide?: number) {
    if (!this.ac) return;
    const a = this.ac, t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(this.out(p)); o.start(t); o.stop(t + d + 0.05);
  }

  private burst(d: number, freq: number, q: number, v: number, type: BiquadFilterType, p?: Pos, when = 0) {
    if (!this.ac) return;
    const a = this.ac, len = Math.floor(a.sampleRate * d), b = a.createBuffer(1, len, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
    const s = a.createBufferSource(); s.buffer = b;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = v;
    s.connect(f).connect(g).connect(this.out(p)); s.start(a.currentTime + when);
  }

  update(dt: number, t: number) {
    if (!this.ac) return;
    if (t > this.nextCricket) {
      this.nextCricket = t + 0.6 + Math.random() * 1.4;
      const L = this.listener, a = Math.random() * 6.28, r = 6 + Math.random() * 14;
      const p = { x: L.x + Math.sin(a) * r, z: L.z + Math.cos(a) * r };
      for (let i = 0; i < 3; i++) this.tone(4200 + Math.random() * 300, 0.04, 'sine', 0.025, p, i * 0.07);
    }
    if (t > this.nextOwl) {
      this.nextOwl = t + 14 + Math.random() * 18;
      const L = this.listener, a = Math.random() * 6.28;
      const p = { x: L.x + Math.sin(a) * 25, z: L.z + Math.cos(a) * 25 };
      this.tone(420, 0.35, 'sine', 0.12, p, 0, 380); this.tone(400, 0.55, 'sine', 0.1, p, 0.45, 350);
    }
    void dt;
  }

  /* --- bear --- */
  growl(p: Pos) { this.tone(68, 1.0, 'sawtooth', 0.16, p, 0, 50); this.tone(102, 0.9, 'square', 0.04, p, 0.05, 70); this.burst(1.0, 220, 2, 0.6, 'lowpass', p); }
  roar(p: Pos) { this.tone(140, 1.2, 'sawtooth', 0.22, p, 0, 60); this.tone(90, 1.3, 'square', 0.08, p, 0, 50); this.burst(1.2, 520, 0.7, 0.9, 'bandpass', p); }
  huff(p: Pos) { this.burst(0.35, 600, 0.8, 0.35, 'bandpass', p); this.burst(0.3, 500, 0.8, 0.3, 'bandpass', p, 0.38); }
  bearStep(p: Pos, heavy: boolean) { this.burst(0.12, heavy ? 160 : 260, 1, heavy ? 0.7 : 0.35, 'lowpass', p); }
  rustle(p: Pos) { this.burst(0.45, 2600, 0.5, 0.18, 'bandpass', p); }

  /* --- player --- */
  step(kind: 'sneak' | 'walk' | 'run') { this.burst(kind === 'run' ? 0.09 : 0.07, kind === 'run' ? 900 : 700, 1, kind === 'run' ? 0.3 : kind === 'walk' ? 0.12 : 0.05, 'bandpass'); }
  heart(k: number) { this.tone(54, 0.18, 'sine', 0.3 + k * 0.45); this.tone(48, 0.16, 'sine', 0.2 + k * 0.3, undefined, 0.15); }
  breath(k: number) { this.burst(0.5, 900, 0.6, 0.04 + k * 0.08, 'bandpass'); }
  spray() { this.burst(0.8, 3800, 0.5, 0.5, 'highpass'); }
  miss() { this.burst(0.5, 2600, 0.6, 0.3, 'highpass'); this.tone(220, 0.25, 'triangle', 0.08, undefined, 0.1, 150); }
  good() { this.tone(660, 0.14, 'triangle', 0.14); this.tone(990, 0.24, 'triangle', 0.12, undefined, 0.1); }
  /**
   * A kuma-suzu (brass bear bell) hanging from the backpack.
   * Each swing knocks the clapper against the shell once or twice in quick succession —
   * "chirin-chirin" — and the shell keeps ringing with a long, bright, slightly beating tail.
   * `strikes` is how many knocks this swing makes; `force` 0..1 scales loudness.
   */
  bell(strikes = 2, force = 1) {
    if (!this.ac) return;
    const a = this.ac, now = a.currentTime;
    const bus = a.createGain(); bus.gain.value = 1;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    bus.connect(hp).connect(this.out(undefined, 1));
    /* this bell's pitch (fixed per bell, a tiny wobble per knock) */
    const base = 2350;
    /* partials of a small cast bell: ratio, level, decay (s) */
    const parts: [number, number, number][] = [[1, 1, 1.9], [1.52, 0.42, 1.2], [2.41, 0.5, 0.8], [3.33, 0.22, 0.45], [4.6, 0.12, 0.25]];
    let t = now;
    for (let k = 0; k < strikes; k++) {
      const amp = 0.03 * force * (k === 0 ? 1 : 0.55 + Math.random() * 0.3);
      const f0 = base * (0.995 + Math.random() * 0.01);
      for (const [r, l, dec] of parts) {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp * l, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
        /* two slightly detuned oscillators: the shimmering "wah-wah" of a real bell */
        for (const det of [1, 1.0035]) {
          const o = a.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * r * det, t);
          o.connect(g); o.start(t); o.stop(t + dec + 0.05);
        }
        g.connect(bus);
      }
      /* the metallic click of the clapper */
      this.burst(0.008, 6200, 2.5, 0.03 * force * (k === 0 ? 1 : 0.6), 'bandpass', undefined, t - now);
      t += 0.045 + Math.random() * 0.07;
    }
  }
  radio() { this.burst(0.4, 1400, 3, 0.08, 'bandpass'); this.tone(520, 0.3, 'square', 0.02); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.14, undefined, i * 0.12)); }
  lose() { this.tone(200, 0.7, 'sawtooth', 0.14, undefined, 0, 70); this.burst(0.7, 260, 1, 0.6, 'lowpass'); }

  destroy() {
    for (const n of this.amb) { try { (n as AudioScheduledSourceNode).stop(); } catch { /* already stopped */ } }
    this.amb = [];
    try { this.master?.disconnect(); } catch { /* ignore */ }
  }
}
