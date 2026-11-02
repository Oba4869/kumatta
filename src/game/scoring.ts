import { BADGES, type Badge } from '../data/badges';
import { lvInfo, type LevelInfo } from '../data/levels';
import type { Profile } from '../lib/profile';
import type { Outcome, Rank } from './types';

export const RANK_LABEL: Record<Rank, string> = { S: '完璧な判断', A: '正しく動けた', B: 'もう一歩', C: '要復習' };
export const RANK_LINE: Record<Rank, string> = {
  S: '走らず、目を逸らさず、正しく対処できた',
  A: 'あと少しで完璧',
  B: '落ち着いて動けた。次は一歩先へ',
  C: '下の「見直したい行動」を確認しよう',
};

/** Any of these ends the run as a dangerous action. */
export const isDanger = (o: Outcome) => o.ran || o.swipeFast || o.turned || o.chargeFail || o.ranCharge || o.cubBad;

export const rankOf = (o: Outcome): Rank => {
  if (isDanger(o)) return 'C';
  if (o.escaped) {
    /* perfect = never found, never ran, never near a cub; each slip costs a step */
    const slips = (o.noisy > 0 ? 1 : 0) + (o.lookAways > 0 ? 1 : 0) + (o.cubNear ? 1 : 0) + (o.charges > 0 ? 1 : 0) + (o.sprayEarly || o.sprayHeadwind ? 1 : 0);
    return slips === 0 ? 'S' : slips === 1 ? 'A' : 'B';
  }
  const r = rankCore(o);
  /* going near a cub is never "almost perfect" */
  return o.cubNear && (r === 'S' || r === 'A') ? 'B' : r;
};

const rankCore = (o: Outcome): Rank => {
  if (o.froze) return 'B';
  const pts =
    (o.stopped ? 1 : 0) +
    (o.reaction != null && o.reaction < 1500 ? 1 : 0) +
    ((o.sprayOK || o.postureOK || o.leftQuietly) && !o.sprayEarly && !o.sprayHeadwind ? 1 : 0);
  return pts === 3 ? 'S' : pts === 2 ? 'A' : 'B';
};

export interface RunResult {
  rank: Rank;
  gain: number;
  before: LevelInfo;
  after: LevelInfo;
  freshBadges: Badge[];
  freshDex: string[];
  newRec: boolean;
  profile: Profile;
}

/** Applies one run to the profile. Records and badges are only earned by correct play. */
export const scoreRun = (prev: Profile, o: Outcome): RunResult => {
  const rank = rankOf(o);
  const p: Profile = {
    ...prev,
    badges: { ...prev.badges },
    conds: { ...prev.conds },
    tools: { ...prev.tools },
    dex: { ...prev.dex },
  };
  const before = lvInfo(p.xp);
  const freshDex = o.dexNew.filter((id) => !prev.dex[id]);
  freshDex.forEach((id) => { p.dex[id] = true; });
  p.runs++;
  o.tools.forEach((k) => { p.tools[k] = true; });
  if (o.sprayOK) p.sprayHits++;
  p.scared += o.scared;
  if (rank !== 'C') { p.streak++; p.conds[o.cond.id] = true; } else p.streak = 0;
  p.sStreak = rank === 'S' ? p.sStreak + 1 : 0;
  const newRec = !!o.tier && o.reaction != null && (p.best == null || o.reaction < p.best);
  if (newRec) p.best = o.reaction;
  const freshBadges = BADGES.filter((b) => !p.badges[b.id] && b.test(o, rank, p));
  freshBadges.forEach((b) => { p.badges[b.id] = true; });
  const base = { S: 100, A: 70, B: 40, C: 15 }[rank] + (o.tier ? { rainbow: 30, gold: 15, silver: 5 }[o.tier] : 0);
  const gain = Math.round(base * (1 + (o.cond.diff - 1) * 0.25)) + freshBadges.length * 20 + freshDex.length * 10;
  p.xp += gain;
  return { rank, gain, before, after: lvInfo(p.xp), freshBadges, freshDex, newRec, profile: p };
};
