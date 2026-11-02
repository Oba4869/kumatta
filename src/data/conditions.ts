/**
 * Each run draws one mountain condition. Conditions change which tools pay off,
 * so the best pair of tools differs from run to run.
 */
export type WeatherId = 'clear' | 'fog' | 'snow';

export interface CondMods {
  dist?: number;
  quiet?: boolean;
  win?: number;
}

export interface Weather {
  id: WeatherId;
  name: string;
  desc: string;
  mods: CondMods;
}

export interface Condition {
  id: 'calm' | 'stream' | 'dusk' | 'wind' | 'fog' | 'hokkaido';
  short: string;
  name: string;
  desc: string;
  /** ms the player has to press "立ち止まる" after a rustle */
  win: number;
  /** meters to the bear when the player stopped in time */
  dist: number;
  /** difficulty shown to the player (1-4) */
  diff: number;
  /** ms for the bear to close 12m when it charges */
  charge: number;
  /** half-width of the straight-pull lane (px) */
  lane: number;
  /** max average pull speed (px/ms) */
  avg: number;
  /** ms before the player counts as "froze" in the encounter */
  lim: number;
  quiet?: boolean;
  bearBias?: number;
  windDecoy?: number;
  gusty?: boolean;
  higuma?: boolean;
  /** Hokkaido rolls its own weather. The phantom wolf only shows in fog or first snow. */
  wxs?: Weather[];
}

export const CONDS: Condition[] = [
  { id: 'calm', short: '晴れ', name: '晴れ・静かな山道', desc: '月明かりの静かな夜。見通しは比較的よい', win: 1300, dist: 15, diff: 1, charge: 2700, lane: 34, avg: 0.35, lim: 4500 },
  { id: 'stream', short: '沢沿い', name: '沢沿いの道', desc: '水の音で足音が届きにくいが、クマの気配にも気づきにくい', win: 950, dist: 15, quiet: true, diff: 2, charge: 2500, lane: 32, avg: 0.35, lim: 4200 },
  { id: 'dusk', short: '夕方', name: '夕方の山道', desc: '薄暗く、クマが動きやすい時間帯。クマが多い', win: 1100, dist: 15, bearBias: 0.15, diff: 2, charge: 2400, lane: 30, avg: 0.34, lim: 4000 },
  { id: 'wind', short: '強風', name: '強風の日', desc: '風向きが変わる。風上にいるとにおいで気づかれ、向かい風のスプレーは自分にかかる', win: 1300, dist: 15, windDecoy: 0.35, gusty: true, diff: 3, charge: 2300, lane: 26, avg: 0.34, lim: 4000 },
  { id: 'fog', short: '霧', name: '霧の山道', desc: '霧で見通しが悪い。気づいたときには距離が近い', win: 1300, dist: 10, diff: 3, charge: 2200, lane: 30, avg: 0.33, lim: 3800 },
  {
    id: 'hokkaido', short: '北海道', name: '北海道の山', desc: 'ここにすむのはヒグマ。突進が速く、スプレーは3〜4mまで引き付ける', win: 1300, dist: 15, higuma: true, diff: 4, charge: 2000, lane: 28, avg: 0.32, lim: 3600,
    wxs: [
      { id: 'clear', name: '晴れ', desc: '', mods: {} },
      { id: 'fog', name: '霧', desc: '霧で見通しが悪く、出会うときは距離が近い。', mods: { dist: 10 } },
      { id: 'snow', name: '初雪', desc: '雪が音を吸い、物音に気づきにくい。', mods: { quiet: true, win: 1000 } },
    ],
  },
];

/** The snow map comes about 1 in 10 mountains, and never more than 10 in a row without it. */
export const SNOW_EVERY = 10;

export const diffStars = (d: number) => '★'.repeat(d) + '☆'.repeat(4 - d);
