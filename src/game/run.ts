import { CONDS, SNOW_EVERY, type Condition } from '../data/conditions';
import { FOURTOOLS_LV, lvInfo } from '../data/levels';
import { TOOL_IDS } from '../data/tools';
import type { Profile } from '../lib/profile';
import type { RunSetup } from './types';

const shuffle = <T,>(a: T[]) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/**
 * Draws the next mountain: a condition different from the last one, its weather,
 * and the tool cards on offer. Returns the profile with the snow counter advanced.
 */
export const drawRun = (p: Profile, prev: Condition['id'] | null): { setup: RunSetup; profile: Profile } => {
  /* Snow map: about 1 in 10 mountains, and never more than 10 in a row without it. */
  let sinceSnow = (p.sinceSnow || 0) + 1;
  const snowNow = sinceSnow >= SNOW_EVERY || Math.random() < 0.03;
  if (snowNow) sinceSnow = 0;
  const pool = CONDS.filter((c) => c.id !== prev);
  const base = snowNow ? CONDS.find((c) => c.id === 'hokkaido')! : pool[Math.floor(Math.random() * pool.length)];
  const nOffer = lvInfo(p.xp).l >= FOURTOOLS_LV ? 4 : 3;
  const offer = shuffle(TOOL_IDS).slice(0, nOffer);
  const wxPool = base.wxs ? base.wxs.filter((w) => (snowNow ? w.id === 'snow' : w.id !== 'snow')) : null;
  const wx = wxPool ? wxPool[Math.floor(Math.random() * wxPool.length)] : null;
  return { setup: { base, wx, offer }, profile: { ...p, sinceSnow } };
};
