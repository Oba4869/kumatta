/** SVG sprites drawn into the play scene. Colors come from CSS classes (.bear, .rabbit …) so they follow the theme. */
const NS = 'http://www.w3.org/2000/svg';

export const mk = (tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement => {
  const n = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(n);
  return n;
};

/** Web Animations API, guarded for old browsers. */
export const anim = (node: Element, frames: Keyframe[], opt: KeyframeAnimationOptions | number) => {
  try {
    return node.animate(frames, opt);
  } catch {
    return null;
  }
};

/** 'tsuki' = Asian black bear (Honshu/Shikoku), 'higuma' = brown bear (Hokkaido). */
export type BearKind = 'tsuki' | 'higuma';

export interface BearSprite {
  outer: SVGElement;
  body: SVGElement;
}

export const makeBear = (parent: Element, kind: BearKind): BearSprite => {
  const fur = kind === 'higuma' ? 'higuma' : 'bear';
  const snout = kind === 'higuma' ? 'higuma-snout' : 'snout';
  const outer = mk('g', {}, parent);
  const body = mk('g', { class: 'bear-body' }, outer);
  mk('circle', { cx: -22, cy: -66, r: kind === 'higuma' ? 9 : 11, class: fur }, body);
  mk('circle', { cx: 22, cy: -66, r: kind === 'higuma' ? 9 : 11, class: fur }, body);
  mk('rect', { x: -34, y: -30, width: 68, height: 44, rx: 22, class: fur }, body);
  if (kind === 'higuma') mk('ellipse', { cx: 0, cy: -58, rx: 26, ry: 14, class: fur }, body);
  mk('circle', { cx: 0, cy: -44, r: 30, class: fur }, body);
  mk('ellipse', { cx: 0, cy: -31, rx: 12, ry: 9, class: snout }, body);
  mk('circle', { cx: 0, cy: -36, r: 3.5, class: 'bear' }, body);
  mk('circle', { cx: -11, cy: -50, r: 3.4, class: 'eye' }, body);
  mk('circle', { cx: 11, cy: -50, r: 3.4, class: 'eye' }, body);
  return { outer, body };
};

/** A bear seen from the side, nose down, not looking at you (it has not noticed you yet). */
export const makeBearSide = (parent: Element, kind: BearKind): BearSprite => {
  const fur = kind === 'higuma' ? 'higuma' : 'bear', snout = kind === 'higuma' ? 'higuma-snout' : 'snout';
  const outer = mk('g', {}, parent);
  const body = mk('g', { class: 'bear-body' }, outer);
  mk('ellipse', { cx: -6, cy: -30, rx: 44, ry: 26, class: fur }, body);
  mk('rect', { x: -40, y: -16, width: 14, height: 18, rx: 5, class: fur }, body);
  mk('rect', { x: -14, y: -16, width: 14, height: 18, rx: 5, class: fur }, body);
  mk('rect', { x: 10, y: -16, width: 14, height: 18, rx: 5, class: fur }, body);
  mk('circle', { cx: 36, cy: -24, r: 17, class: fur }, body);
  mk('circle', { cx: 30, cy: -40, r: 6, class: fur }, body);
  mk('ellipse', { cx: 50, cy: -16, rx: 8, ry: 6, class: snout }, body);
  mk('circle', { cx: 40, cy: -28, r: 2.4, class: 'eye' }, body);
  return { outer, body };
};

export const makeRabbit = (parent: Element) => {
  const g = mk('g', { class: 'critter' }, parent);
  mk('ellipse', { cx: 0, cy: -10, rx: 14, ry: 10, class: 'rabbit' }, g);
  mk('circle', { cx: 10, cy: -20, r: 8, class: 'rabbit' }, g);
  mk('ellipse', { cx: 8, cy: -36, rx: 3, ry: 10, class: 'rabbit' }, g);
  mk('ellipse', { cx: 14, cy: -35, rx: 3, ry: 10, class: 'rabbit' }, g);
  return g;
};

export const makeBird = (parent: Element) => {
  const g = mk('g', { class: 'critter' }, parent);
  mk('path', { d: 'M-12 -20 Q-6 -28 0 -20 Q6 -28 12 -20', fill: 'none', style: 'stroke:var(--ink)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
  return g;
};

export const makeTanuki = (parent: Element) => {
  const g = mk('g', { class: 'critter' }, parent);
  mk('ellipse', { cx: -22, cy: -10, rx: 7, ry: 5, class: 'mask' }, g);
  mk('ellipse', { cx: -4, cy: -12, rx: 18, ry: 11, class: 'tanuki' }, g);
  mk('circle', { cx: 9, cy: -32, r: 3.5, class: 'tanuki' }, g);
  mk('circle', { cx: 20, cy: -32, r: 3.5, class: 'tanuki' }, g);
  mk('circle', { cx: 14, cy: -23, r: 10, class: 'tanuki' }, g);
  mk('ellipse', { cx: 15, cy: -23, rx: 8, ry: 3.5, class: 'mask' }, g);
  return g;
};

export const makeBoar = (parent: Element) => {
  const g = mk('g', { class: 'critter' }, parent);
  mk('rect', { x: -18, y: -8, width: 6, height: 8, class: 'boar' }, g);
  mk('rect', { x: 8, y: -8, width: 6, height: 8, class: 'boar' }, g);
  mk('ellipse', { cx: 0, cy: -18, rx: 26, ry: 14, class: 'boar' }, g);
  mk('ellipse', { cx: 24, cy: -16, rx: 10, ry: 8, class: 'boar' }, g);
  mk('ellipse', { cx: 33, cy: -15, rx: 4, ry: 5, class: 'snout' }, g);
  mk('path', { d: 'M27 -10 q4 -2 6 -8', class: 'tusk', fill: 'none', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
  return g;
};

export const makeWolf = (parent: Element) => {
  const g = mk('g', { class: 'critter' }, parent);
  mk('path', { d: 'M-22 -20 Q-34 -24 -34 -38', class: 'wolftail', fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  mk('rect', { x: -16, y: -12, width: 4, height: 12, class: 'wolf' }, g);
  mk('rect', { x: 10, y: -12, width: 4, height: 12, class: 'wolf' }, g);
  mk('ellipse', { cx: 0, cy: -18, rx: 24, ry: 10, class: 'wolf' }, g);
  mk('path', { d: 'M14 -24 L20 -42 L25 -32 L38 -27 L33 -18 L16 -15 Z', class: 'wolf' }, g);
  return g;
};

/** Four grass patches: two far, two near. */
export const SPOTS = [
  { x: 100, y: 300, s: 0.8 },
  { x: 262, y: 296, s: 0.8 },
  { x: 78, y: 400, s: 1.1 },
  { x: 284, y: 396, s: 1.1 },
];
const BLADES: [number, number][] = [[-30, -34], [-18, -50], [-6, -40], [6, -56], [18, -42], [30, -34], [-24, -24], [24, -26]];

export interface Patch {
  x: number;
  y: number;
  s: number;
  g: SVGElement;
  /** where creatures appear (behind the grass) */
  slot: SVGElement;
  tuft: SVGElement;
  /** generous invisible tap target over the grass */
  hit: SVGElement;
}

export const buildPatches = (layer: Element): Patch[] =>
  SPOTS.map((p) => {
    const g = mk('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' }, layer);
    const slot = mk('g', {}, g);
    const tuft = mk('g', { class: 'tuft' }, g);
    BLADES.forEach(([bx, h], i) => {
      const x = bx * p.s, hh = h * p.s, w = 7 * p.s, tip = (i % 2 ? 4 : -4) * p.s;
      mk('path', { d: 'M' + (x - w) + ' 0 Q' + (x - 2 * p.s) + ' ' + hh * 0.5 + ' ' + (x + tip) + ' ' + hh + ' Q' + (x + 2 * p.s) + ' ' + hh * 0.5 + ' ' + (x + w) + ' 0 Z', class: i % 3 === 0 ? 'g2' : 'g1' }, tuft);
    });
    mk('ellipse', { cx: 0, cy: 0, rx: 38 * p.s, ry: 6 * p.s, class: 'g1' }, tuft);
    const hit = mk('ellipse', { cx: 0, cy: -22 * p.s, rx: 62 * p.s, ry: 52 * p.s, class: 'hit' }, g);
    return { ...p, g, slot, tuft, hit };
  });
