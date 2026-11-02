/** Player progress, kept in this browser only (localStorage). */
export interface Profile {
  runs: number;
  xp: number;
  /** best reaction time in ms, only from correct retreats */
  best: number | null;
  streak: number;
  sStreak: number;
  badges: Record<string, boolean>;
  conds: Record<string, boolean>;
  tools: Record<string, boolean>;
  sprayHits: number;
  scared: number;
  dex: Record<string, boolean>;
  /** mountains since the last snow map */
  sinceSnow: number;
}

/** Same key as the single-file prototype, so existing progress carries over. */
const KEY = 'bearReflex.v1';

export const blankProfile = (): Profile => ({
  runs: 0, xp: 0, best: null, streak: 0, sStreak: 0, badges: {}, conds: {}, tools: {}, sprayHits: 0, scared: 0, dex: {}, sinceSnow: 0,
});

export const loadProfile = (): Profile => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v ? { ...blankProfile(), ...v } : blankProfile();
  } catch {
    return blankProfile();
  }
};

export const saveProfile = (p: Profile) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be blocked (private mode); the game still works for this session */
  }
};
