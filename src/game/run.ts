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

/** Builds the setup for a mountain the player picked on the stage-select screen. */
export const drawStage = (p: Profile, id: Condition['id']): RunSetup => {
  const base = CONDS.find((c) => c.id === id)!;
  const nOffer = lvInfo(p.xp).l >= FOURTOOLS_LV ? 4 : 3;
  const offer = shuffle(TOOL_IDS).slice(0, nOffer);
  const wx = base.wxs ? base.wxs[Math.floor(Math.random() * base.wxs.length)] : null;
  return { base, wx, offer };
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
  /* Hokkaido has only the snow weather now, so fall back to the whole list when the filter leaves nothing */
  const picked = base.wxs?.filter((w) => (snowNow ? w.id === 'snow' : w.id !== 'snow'));
  const wxPool = base.wxs ? (picked?.length ? picked : base.wxs) : null;
  const wx = wxPool ? wxPool[Math.floor(Math.random() * wxPool.length)] : null;
  return { setup: { base, wx, offer }, profile: { ...p, sinceSnow } };
};
