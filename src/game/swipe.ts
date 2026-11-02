/**
 * The pull that moves you away from the bear (Monster-Strike-style slingshot, without a ball).
 *
 * Touch anywhere and pull: down = back away facing the bear, sideways = turn and quietly leave.
 * Which one is right depends on the bear (see engine.ts). Too fast counts as running, whatever the direction.
 * A band stretches from where the finger landed; a gauge fills, turns gold when far enough, red when too fast.
 *
 * Also owns the rainbow / gold / silver reveal, played right after a good release.
 * Drives markup rendered by <SwipeField /> and <RevealLayers /> inside `root` (looked up by id).
 */
import { NOLANE_LV, NOMETER_LV } from '../data/levels';
import { sfx, tone } from '../lib/sound';
import { anim } from './sprites';
import type { Tier } from './types';

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type SwipeDir = 'back' | 'side';

export interface SwipeOptions {
  /** max average speed (px/ms) */
  avgMax: number;
  /** ms before the player counts as frozen */
  lim: number;
  /** player level: hides the red "too fast" trail and the speed meter as it rises */
  level: number;
}

export type SwipeFail = 'fast' | 'froze';

export interface SwipeHooks {
  /** a slow, long-enough swipe; `reaction` = ms from start to the first touch */
  onSwipe: (dir: SwipeDir, quality: { reaction: number; peak: number; wobble: number }) => void;
  /** decided the direction (after ~40px), before it is finished: lets the caller reject it early */
  onDirection?: (dir: SwipeDir) => boolean;
  onFail: (why: SwipeFail, reaction: number | null) => void;
}

/** how far a swipe must travel (px) */
const MIN_SWIPE = 120;
/** travel before the direction is decided (px) */
const DECIDE_AT = 40;
const PEAK_MAX = 1.0;

const TIER: Record<Tier, { label: string; sub: string }> = {
  rainbow: { label: '虹　完璧な判断', sub: '一瞬で見抜いて、正しく動けた' },
  gold: { label: '金　上手な判断', sub: '状況を見て、正しく動けた' },
  silver: { label: '銀　判断成功', sub: '正しく動けた。次はもっと早く' },
};

interface Drag { x0: number; y0: number; t0: number; lx: number; ly: number; lt: number; sm: number; peak: number; dir: SwipeDir | null; pts: [number, number][] }

/**
 * The tier rates the decision, not the finger: how fast you read the bear and chose the right move.
 * `best` = the best move for this bear (an acceptable but second-best move tops out at gold).
 */
export const judgeTier = (ms: number, best = true): Tier =>
  ms < 1000 && best ? 'rainbow' : ms < 2000 ? 'gold' : 'silver';
/** Charge: how fast you went into the defensive posture (or sprayed). */
export const guardTier = (ms: number): Tier => (ms < 800 ? 'rainbow' : ms < 1500 ? 'gold' : 'silver');

interface Guard { need: number; t0: number; hold: number | null; x: number; y: number; onGuard: (reaction: number) => void; onBreak: () => void }

export class SwipePad {
  private root: HTMLElement;
  private opt: SwipeOptions;
  private hooks: SwipeHooks;
  private ac = new AbortController();
  private timers: number[] = [];
  private raf = 0;
  private active = false;
  private t0 = 0;
  private drag: Drag | null = null;
  reaction: number | null = null;
  /** guard mode (charge): long-press anywhere = defensive posture, pulling = running */
  private guard: Guard | null = null;

  constructor(root: HTMLElement, opt: SwipeOptions, hooks: SwipeHooks) {
    this.root = root;
    this.opt = opt;
    this.hooks = hooks;
    this.bind();
  }

  private $<T extends HTMLElement = HTMLElement>(sel: string): T {
    const el = this.root.querySelector(sel);
    if (!el) throw new Error('missing element ' + sel);
    return el as T;
  }
  private later(fn: () => void, ms: number) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  /** Opens the swipe area and starts the clock. */
  start(opening = 'どう動く？') {
    this.$('#swipe').hidden = false;
    const speed = this.root.querySelector<HTMLElement>('#speed');
    if (speed) speed.hidden = this.opt.level >= NOMETER_LV;
    this.clearTrail();
    this.callout(opening);
    this.active = true;
    this.reaction = null;
    this.t0 = performance.now();
    const tick = () => {
      if (!this.active) return;
      const el = performance.now() - this.t0;
      const bar = this.root.querySelector<HTMLElement>('#enctime');
      if (bar) bar.style.width = Math.max(0, 100 - (el / this.opt.lim) * 100) + '%';
      if (el > this.opt.lim && !this.drag) { this.fail('froze'); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  elapsed() {
    return performance.now() - this.t0;
  }

  stop() {
    this.active = false;
    this.drag = null;
    this.guard = null;
    cancelAnimationFrame(this.raf);
    const area = this.root.querySelector<HTMLElement>('#swipe');
    if (area) area.hidden = true;
  }

  destroy() {
    this.stop();
    this.ac.abort();
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private fail(why: SwipeFail) {
    this.stop();
    this.hooks.onFail(why, this.reaction);
  }

  /** Big game-style call-out across the screen. */
  callout(text: string, kind: 'go' | 'warn' | 'ok' = 'go') {
    const el = this.root.querySelector<HTMLElement>('#callout');
    if (!el) return;
    /* two stacked copies: a thick dark outline behind, the bright gradient letters in front */
    const back = document.createElement('span'), front = document.createElement('span');
    back.className = 'co-back';
    front.className = 'co-front';
    back.textContent = front.textContent = text;
    el.replaceChildren(back, front);
    el.setAttribute('aria-label', text);
    el.className = 'callout ' + kind;
    el.hidden = false;
    anim(el, [
      { transform: 'translate(-50%,-50%) scale(2.4) skewX(-10deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(.92) skewX(-10deg)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%,-50%) scale(1.04) skewX(-10deg)', opacity: 1, offset: 0.28 },
      { transform: 'translate(-50%,-50%) scale(1) skewX(-10deg)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%,-50%) scale(1.1) skewX(-10deg)', opacity: 0 },
    ], { duration: reduce() ? 900 : 1100, easing: 'ease-out', fill: 'forwards' });
  }

  /* ---------- the slingshot: anchor where the finger landed, a stretched band, a gauge at the finger ---------- */
  private clearTrail() {
    const svg = this.$('#sling');
    svg.classList.remove('on', 'ready', 'fast', 'guard');
  }

  private drawSling(d: Drag, fast: boolean) {
    const area = this.$('#swipe').getBoundingClientRect();
    const ax = d.x0 - area.left, ay = d.y0 - area.top;
    const fx = d.lx - area.left, fy = d.ly - area.top;
    const dist = Math.hypot(fx - ax, fy - ay);
    const pull = Math.min(1, dist / MIN_SWIPE);
    const svg = this.$('#sling');
    svg.classList.add('on');
    svg.classList.toggle('ready', pull >= 1);
    /* the red warning is a hint that higher levels go without */
    svg.classList.toggle('fast', fast && this.opt.level < NOLANE_LV);
    for (const id of ['#band', '#bandglow']) {
      const l = this.$(id);
      l.setAttribute('x1', String(ax)); l.setAttribute('y1', String(ay));
      l.setAttribute('x2', String(fx)); l.setAttribute('y2', String(fy));
    }
    const anchor = this.$('#anchor');
    anchor.setAttribute('cx', String(ax)); anchor.setAttribute('cy', String(ay));
    const deg = (Math.atan2(fy - ay, fx - ax) * 180) / Math.PI - 90;
    this.$('#grip').setAttribute('transform', 'translate(' + fx + ' ' + fy + ') rotate(' + deg + ')');
    this.$('#gaugemeter').style.strokeDashoffset = String(214 * (1 - pull));
    svg.style.setProperty('--pull', String(pull));
  }

  /** Where the finger let go, in page coordinates (the reveal flies from here). */
  lastPoint: { x: number; y: number } | null = null;

  /**
   * Guard mode for a charge: hold a finger still anywhere for `need` ms to take the defensive posture.
   * Pulling away (the reflex the encounter trained) counts as running.
   */
  startGuard(need: number, onGuard: (reaction: number) => void, onBreak: () => void) {
    this.stop();
    this.$('#swipe').hidden = false;
    this.clearTrail();
    this.$('#sling').classList.add('guard');
    this.hint('画面を長押し＝防御姿勢（引っぱると逃げたことになる）');
    this.callout('突進！', 'warn');
    this.guard = { need, t0: performance.now(), hold: null, x: 0, y: 0, onGuard, onBreak };
    const tick = () => {
      const g = this.guard;
      if (!g) return;
      if (g.hold != null) {
        const pct = Math.min(1, (performance.now() - g.hold) / g.need);
        this.$('#gaugemeter').style.strokeDashoffset = String(214 * (1 - pct));
        this.$('#sling').classList.toggle('ready', pct >= 1);
        if (pct >= 1) {
          const r = g.hold - g.t0;
          this.stop();
          this.clearTrail();
          g.onGuard(r);
          return;
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private guardDown(x: number, y: number) {
    const g = this.guard!;
    g.hold = performance.now();
    g.x = x; g.y = y;
    const now = g.hold;
    this.drawSling({ x0: x, y0: y, t0: now, lx: x, ly: y, lt: now, sm: 0, peak: 0, dir: null, pts: [] }, false);
    this.$('#gaugemeter').style.strokeDashoffset = '214';
  }

  private bind() {
    const area = this.$('#swipe');
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) =>
      area.addEventListener(type, fn as EventListener, { signal: this.ac.signal });
    on('contextmenu', (e) => e.preventDefault());
    on('pointerdown', (e) => {
      if (this.guard) {
        e.preventDefault();
        try { area.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        this.guardDown(e.clientX, e.clientY);
        return;
      }
      if (!this.active) return;
      e.preventDefault();
      try { area.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      const now = performance.now();
      if (this.reaction == null) this.reaction = now - this.t0;
      this.drag = { x0: e.clientX, y0: e.clientY, t0: now, lx: e.clientX, ly: e.clientY, lt: now, sm: 0, peak: 0, dir: null, pts: [[e.clientX, e.clientY]] };
      this.clearTrail();
      this.drawSling(this.drag, false);
    });
    on('pointermove', (e) => {
      const g = this.guard;
      if (g) {
        if (g.hold != null && Math.hypot(e.clientX - g.x, e.clientY - g.y) >= DECIDE_AT) {
          this.stop();
          this.clearTrail();
          g.onBreak();
        }
        return;
      }
      const d = this.drag;
      if (!d || !this.active) return;
      const now = performance.now();
      const dt = Math.max(1, now - d.lt);
      const inst = Math.hypot(e.clientX - d.lx, e.clientY - d.ly) / dt;
      d.sm = d.sm * 0.7 + inst * 0.3;
      d.peak = Math.max(d.peak, d.sm);
      d.lx = e.clientX;
      d.ly = e.clientY;
      d.lt = now;
      d.pts.push([e.clientX, e.clientY]);
      if (d.pts.length > 80) d.pts.shift();
      const fast = d.sm > this.opt.avgMax;
      const wasReady = this.$('#sling').classList.contains('ready');
      this.drawSling(d, fast);
      if (!wasReady && !fast && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) >= MIN_SWIPE) this.callout('はなせ！', 'ok');
      const f = this.root.querySelector<HTMLElement>('#speedfill');
      if (f) {
        f.style.width = Math.min(100, (d.sm / 1.4) * 100) + '%';
        f.classList.toggle('fast', fast);
      }
      if (fast && !d.dir) this.callout('ゆっくり！', 'warn');
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      /* decide the direction once the finger has clearly moved one way */
      if (!d.dir && Math.hypot(dx, dy) >= DECIDE_AT) {
        if (dy < 0 && Math.abs(dy) > Math.abs(dx)) { this.drag = null; this.clearTrail(); this.hint('下か横へ、ゆっくり引っぱろう'); return; }
        d.dir = Math.abs(dx) > Math.abs(dy) ? 'side' : 'back';
        if (this.hooks.onDirection && !this.hooks.onDirection(d.dir)) { this.stop(); return; }
      }
      if (d.peak > PEAK_MAX) this.fail('fast');
    });
    const guardUp = () => {
      if (!this.guard) return false;
      this.guard.hold = null;
      this.$('#sling').classList.remove('on', 'ready');
      return true;
    };
    on('pointerup', () => { if (!guardUp()) this.release(); });
    on('pointercancel', () => { if (guardUp()) return; this.drag = null; this.clearTrail(); });
  }

  private hint(text: string) {
    const h = this.root.querySelector<HTMLElement>('#swipehint');
    if (h) h.textContent = text;
  }

  private release() {
    const d = this.drag;
    if (!d || !this.active) return;
    this.drag = null;
    const [lx, ly] = d.pts[d.pts.length - 1];
    const dx = lx - d.x0, dy = ly - d.y0;
    const dist = Math.hypot(dx, dy);
    const dur = Math.max(1, performance.now() - d.t0);
    if (!d.dir || dist < MIN_SWIPE) { this.clearTrail(); this.hint('もっと長く、ゆっくり引っぱろう'); return; }
    if (dist / dur > this.opt.avgMax || d.peak > PEAK_MAX) { this.fail('fast'); return; }
    /* wobble: sideways drift relative to the main direction */
    const wobble = d.dir === 'back' ? Math.abs(dx) / Math.max(1, Math.abs(dy)) : Math.abs(dy) / Math.max(1, Math.abs(dx));
    this.lastPoint = { x: lx, y: ly };
    this.burst(lx, ly);
    this.stop();
    this.clearTrail();
    sfx.whoosh();
    this.hooks.onSwipe(d.dir, { reaction: this.reaction ?? 9999, peak: d.peak, wobble });
  }

  /* ---------- reveal: an orb charges up over three shakes, then bursts into its tier color ---------- */
  /** Shockwave and sparks where the finger let go. */
  private burst(x: number, y: number) {
    const host = this.root.querySelector<HTMLElement>('.play-inner') ?? this.root;
    const r = host.getBoundingClientRect();
    const fx = document.createElement('span');
    fx.className = 'releasefx';
    fx.style.left = x - r.left + 'px';
    fx.style.top = y - r.top + 'px';
    host.appendChild(fx);
    anim(fx, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }], { duration: reduce() ? 1 : 600, easing: 'ease-out', fill: 'forwards' });
    this.sparks(fx, 'gold', 12, 90);
    this.later(() => fx.remove(), 1400);
  }

  /** `ms` = decision time, shown under the tier name. */
  reveal(tier: Tier, from?: { x: number; y: number }, ms?: number, subText?: string) {
    return new Promise<void>((done) => {
      const w = this.$('#orbwrap'), orb = this.$('#orb'), ring = this.$('#orbring'), lab = this.$('#tierlab'), sub = this.$('#tiersub');
      w.dataset.tier = 'hidden';
      w.style.setProperty('--charge', '0');
      lab.textContent = '';
      sub.textContent = '';
      lab.classList.remove('slam');
      w.hidden = false;
      anim(w, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      if (from && !reduce()) {
        /* a ball of light flies from where you let go to the middle */
        const to = orb.getBoundingClientRect();
        const dx = from.x - (to.left + to.width / 2), dy = from.y - (to.top + to.height / 2);
        anim(orb, [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.35)' }, { transform: 'translate(0,0) scale(1.12)', offset: 0.75 }, { transform: 'translate(0,0) scale(1)' }], { duration: 520, easing: 'cubic-bezier(.3,.8,.3,1)' });
      } else anim(orb, [{ transform: 'scale(0) rotate(-90deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: reduce() ? 1 : 420, easing: 'cubic-bezier(.2,1.5,.4,1)' });
      const shakes = reduce() ? 0 : 3;
      for (let i = 0; i < shakes; i++) {
        this.later(() => {
          const a = 10 + i * 7;
          w.style.setProperty('--charge', String((i + 1) / shakes));
          anim(orb, [{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-' + a + 'deg) scale(1.04)' }, { transform: 'rotate(' + a + 'deg) scale(1.04)' }, { transform: 'rotate(0) scale(1)' }], { duration: 280 });
          tone(440 + i * 160, 0.14, 'triangle', 0.08);
        }, 500 + i * 380);
      }
      const at = 500 + shakes * 380 + 80;
      this.later(() => {
        w.dataset.tier = tier;
        sfx.boom();
        sfx.sparkle(tier);
        const flash = this.root.querySelector<HTMLElement>('#flash');
        if (flash && !reduce()) {
          flash.style.background = tier === 'rainbow' ? 'conic-gradient(var(--rb1),var(--rb2),var(--rb3),var(--rb4),var(--rb5),var(--rb1))' : tier === 'gold' ? 'var(--gold)' : 'var(--silver)';
          anim(flash, [{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0 }], { duration: 420 });
        }
        anim(ring, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: reduce() ? 1 : 700, easing: 'ease-out' });
        anim(orb, [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1.12)' }], { duration: reduce() ? 1 : 460, easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'forwards' });
        this.sparks(this.$('#sparks'), tier, tier === 'rainbow' ? 30 : tier === 'gold' ? 22 : 14, 170);
        lab.textContent = TIER[tier].label;
        sub.textContent = (ms != null ? '判断 ' + (ms / 1000).toFixed(2) + '秒　' : '') + (subText ?? TIER[tier].sub);
        lab.classList.add('slam');
      }, at);
      const hold = tier === 'rainbow' ? 1900 : 1500;
      this.later(() => anim(w, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }), at + hold - 220);
      this.later(() => { w.hidden = true; done(); }, at + hold);
    });
  }

  /** Star-shaped sparks flying out from the middle of `host`. */
  private sparks(host: HTMLElement, tier: Tier, n: number, reach: number) {
    if (reduce()) return;
    const cols = tier === 'rainbow' ? ['var(--rb1)', 'var(--rb2)', 'var(--rb3)', 'var(--rb4)', 'var(--rb5)'] : tier === 'gold' ? ['var(--gold)', '#FFF3C4', '#FFFFFF'] : ['var(--silver)', '#FFFFFF'];
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i');
      sp.className = 'spk' + (i % 3 === 0 ? ' dot' : '');
      sp.style.background = cols[i % cols.length];
      host.appendChild(sp);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = reach * (0.55 + Math.random() * 0.6), sz = 0.6 + Math.random() * 0.9;
      anim(sp, [
        { transform: 'translate(-50%,-50%) scale(' + sz + ') rotate(0)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px),calc(-50% + ' + Math.sin(a) * d + 'px)) scale(' + sz * 0.3 + ') rotate(' + (180 + Math.random() * 360) + 'deg)', opacity: 0 },
      ], { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.15,.8,.3,1)', fill: 'forwards' });
      this.later(() => sp.remove(), 1300);
    }
  }
}
