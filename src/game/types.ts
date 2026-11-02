import type { Condition, Weather, WeatherId } from '../data/conditions';
import type { ToolId } from '../data/tools';

/** How well the retreat went (the orb color). */
export type Tier = 'rainbow' | 'gold' | 'silver';
export type Rank = 'S' | 'A' | 'B' | 'C';
export type BearState = 'far' | 'near' | 'mother' | 'charging';

/** Everything decided before the walk starts. */
export interface RunSetup {
  /** base condition (before weather mods) */
  base: Condition;
  wx: Weather | null;
  /** tool cards offered on the start screen */
  offer: ToolId[];
}

/** Condition with the weather mods applied, as used during play. */
export type PlayCondition = Condition & { short: string };

export const applyWeather = (setup: RunSetup): PlayCondition =>
  setup.wx ? { ...setup.base, ...setup.wx.mods, short: setup.base.short + '・' + setup.wx.name } : setup.base;

/** What happened in one run. The engine fills it; scoring and feedback read it. */
export interface Outcome {
  cond: PlayCondition;
  wx: WeatherId | null;
  tools: ToolId[];
  rustles: number;
  stops: number;
  /** times a bell/radio made a bear leave first */
  scared: number;
  /** stopped in time before the bear appeared */
  stopped: boolean | null;
  /** ms from the bear appearing to the first touch */
  reaction: number | null;
  tier: Tier | null;
  /** how the bear was when it appeared: far and unaware / near and watching you / with cubs / charging at once */
  bearState: BearState | null;
  /** far, unaware bear: you turned and quietly left */
  leftQuietly: boolean;
  swipeFast: boolean;
  turned: boolean;
  ran: boolean;
  froze: boolean;
  mother: boolean;
  cubOK: boolean;
  cubBad: boolean;
  cubSlow: boolean;
  sprayEarly: boolean;
  sprayHeadwind: boolean;
  sprayOK: boolean;
  postureOK: boolean;
  chargeFail: boolean;
  ranCharge: boolean;
  /** field-guide entries first seen this run */
  dexNew: string[];
  /** stealth map: reached the trailhead without being noticed */
  escaped: boolean;
  /** stealth map: times you broke into a run */
  noisy: number;
  /** stealth map: went near a cub (its mother noticed at once) */
  cubNear: boolean;
  /** stealth map: what gave you away */
  spottedBy: 'see' | 'hear' | 'smell' | 'cub' | null;
  /** stealth map: ms from start to the trailhead or to the end */
  time: number | null;
  /** times a bear noticed you for sure */
  spotted: number;
  /** stares you backed away from slowly, as you should */
  backedOff: number;
  /** times a bear reached you and the defensive posture saved you */
  charges: number;
  /** times you took your eyes off a bear that was watching you */
  lookAways: number;
}
