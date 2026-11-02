/** Total XP needed to reach each level (index 0 = Lv.1). The cap is Lv.20. */
export const LV = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 4900, 5900, 7000, 8200, 9600, 11200, 13000, 15000, 17200];

export const TITLES = [
  '見習いハイカー', '山歩きビギナー', '気配を読む人', '森のベテラン', '冷静沈着', '山の案内人', 'クマ対策マスター', '沈着の達人',
  '森の賢者', '伝説の登山者', '山の語り部', '黄金の登山者', '不動の心', '山の守り人',
  '風を読む者', '霧を越える者', '雪原の旅人', '北の山の主', '百戦錬磨', 'くまったの頂点',
];

/** Rewards unlocked at a level: more choice, harder modes, and card looks. */
export const REWARDS: Record<number, string> = {
  3: 'クマの視界（扇形）を表示せずに挑戦',
  5: '道具の候補が4つに増える',
  12: 'プレイヤーカードが金色に',
  15: 'プレイヤーカードが虹色に',
  20: 'プレイヤーカードが「頂点」仕様に',
};

export const NOLANE_LV = 3;
export const FOURTOOLS_LV = 5;
export const NOMETER_LV = 10;
export const GOLD_CARD_LV = 12;
export const RAINBOW_CARD_LV = 15;
export const APEX_CARD_LV = 20;

export interface LevelInfo {
  /** 1-based level */
  l: number;
  title: string;
  /** progress to the next level, 0-100 (0 at the cap) */
  pct: number;
  /** XP still needed (0 at the cap) */
  toNext: number;
}

const lvIndex = (xp: number) => {
  let l = 0;
  for (let i = 0; i < LV.length; i++) if (xp >= LV[i]) l = i;
  return l;
};

export const lvInfo = (xp: number): LevelInfo => {
  const l = lvIndex(xp);
  const lo = LV[l];
  const hi = LV[l + 1];
  return { l: l + 1, title: TITLES[l], pct: hi ? ((xp - lo) / (hi - lo)) * 100 : 0, toNext: hi ? hi - xp : 0 };
};

export const nextReward = (level: number) => Object.keys(REWARDS).map(Number).find((l) => l > level);
