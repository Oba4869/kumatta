/** Tiny synthesized sound effects (Web Audio API). No audio files needed. */
let ac: AudioContext | null = null;
let soundOn = true;
let hb: ReturnType<typeof setInterval> | null = null;

export const setSoundOn = (on: boolean) => {
  soundOn = on;
  if (!on) heart(false);
};

export const audio = (): AudioContext | null => {
  if (!soundOn) return null;
  try {
    if (!ac) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new Ctx();
    }
    /* iPhone can leave it 'interrupted' as well as 'suspended'; resume from either, quietly */
    if (ac.state !== 'running' && ac.state !== 'closed') void ac.resume().catch(() => {});
    return ac;
  } catch {
    return null;
  }
};

export const tone = (f: number, d: number, type: OscillatorType = 'sine', v = 0.1, delay = 0) => {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.05);
};

const noise = (d: number, f: number, q: number, v: number, type: BiquadFilterType = 'bandpass') => {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * d);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  s.buffer = buf;
  const fl = a.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = a.createGain();
  g.gain.value = v;
  s.connect(fl).connect(g).connect(a.destination);
  s.start();
};

export type SparkleTier = 'rainbow' | 'gold' | 'silver';

export const sfx = {
  bell() { tone(2637, 0.5, 'sine', 0.07); tone(3951, 0.35, 'sine', 0.04, 0.02); tone(2637, 0.4, 'sine', 0.05, 0.17); },
  radio() { noise(0.35, 1200, 0.6, 0.12); },
  rustle(quiet?: boolean) { noise(0.6, 2600, 0.8, quiet ? 0.12 : 0.4); if (quiet) noise(0.8, 700, 0.5, 0.18); },
  ping() { tone(988, 0.12, 'square', 0.05); tone(1319, 0.2, 'square', 0.05, 0.1); },
  spray() { noise(0.7, 5000, 0.4, 0.35, 'highpass'); },
  good() { tone(659, 0.15, 'triangle', 0.1); tone(988, 0.3, 'triangle', 0.1, 0.12); },
  birdsong() { [0, 0.12, 0.24].forEach((d) => tone(3400 - d * 1200, 0.07, 'sine', 0.05, d)); },
  howl() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(380, t);
    o.frequency.linearRampToValueAtTime(720, t + 0.5);
    o.frequency.linearRampToValueAtTime(560, t + 1.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 1.6);
  },
  sparkle(tier: SparkleTier) {
    const notes = tier === 'rainbow' ? [784, 988, 1175, 1568, 1976, 2349] : tier === 'gold' ? [784, 988, 1175, 1568] : [659, 880];
    notes.forEach((n, i) => tone(n, 0.25, 'triangle', 0.09, i * 0.07));
  },
  bad() { tone(196, 0.5, 'sawtooth', 0.05); },
  step() { noise(0.09, 320, 0.9, 0.22, 'lowpass'); },
  whoosh() { noise(0.45, 900, 0.5, 0.18); },
  boom() { tone(90, 0.35, 'sine', 0.25); noise(0.3, 220, 0.7, 0.25, 'lowpass'); },
};

/** Heartbeat loop while a bear is in front of you. */
/** Heartbeat whose speed follows how close the bear is (the stealth map's "terror radius"). null = silent. */
let hrTimer: ReturnType<typeof setTimeout> | null = null;
let hrPeriod: number | null = null;
export const heartRate = (period: number | null) => {
  const was = hrPeriod;
  hrPeriod = period;
  if (period == null) { if (hrTimer) clearTimeout(hrTimer); hrTimer = null; return; }
  if (was != null && hrTimer) return; /* already beating: the next beat picks up the new period */
  const beat = () => {
    if (hrPeriod == null) { hrTimer = null; return; }
    const v = Math.min(0.4, 0.12 + (900 - hrPeriod) / 1500);
    tone(58, 0.16, 'sine', v); tone(52, 0.14, 'sine', v * 0.7, 0.15);
    hrTimer = setTimeout(beat, hrPeriod);
  };
  beat();
};

export const heart = (on: boolean) => {
  if (hb) clearInterval(hb);
  hb = null;
  if (!on) return;
  const beat = () => { tone(58, 0.16, 'sine', 0.35); tone(52, 0.14, 'sine', 0.25, 0.15); };
  beat();
  hb = setInterval(beat, 680);
};
