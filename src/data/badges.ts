import type { Outcome, Rank } from '../game/types';
import type { Profile } from '../lib/profile';
import { CONDS } from './conditions';
import { DEX } from './dex';

export interface Badge {
  id: string;
  name: string;
  hint: string;
  /** checked after the profile is updated for this run */
  test: (o: Outcome, rank: Rank, p: Profile) => boolean;
  /** progress text like "1 / 3", for badges that build up over runs */
  prog?: (p: Profile) => string;
}

/** Records and badges are only earned by correct play. */
export const BADGES: Badge[] = [
  { id: 'first', name: 'はじめての下山', hint: '1回遊ぶ', test: (_o, _r, p) => p.runs >= 1 },
  { id: 'rainbow', name: '虹の判断', hint: '虹を出す', test: (o) => o.tier === 'rainbow' },
  { id: 'ghost', name: '気配を消す者', hint: '一度も気づかれずに下山', test: (o) => o.escaped && o.rustles === 0 },
  { id: 'quick', name: '0.8秒の壁', hint: '正しい動きで、反応0.8秒未満', test: (o) => !!o.tier && o.reaction != null && o.reaction < 800 },
  { id: 'ears', name: 'やり過ごし名人', hint: '1回の山で、気づかれかけたクマを2回やり過ごす', test: (o) => o.stops >= 2 },
  { id: 'spray', name: '引き付けの名人', hint: 'スプレーを射程内で通算3回命中', test: (_o, _r, p) => p.sprayHits >= 3, prog: (p) => Math.min(3, p.sprayHits) + ' / 3' },
  { id: 'sound', name: '音で守る', hint: '鈴やラジオでクマが離れた場面を通算3回', test: (_o, _r, p) => p.scared >= 3, prog: (p) => Math.min(3, p.scared) + ' / 3' },
  { id: 'tools', name: '道具コンプリート', hint: '5種類の道具をすべて使う', test: (_o, _r, p) => Object.keys(p.tools).length >= 5, prog: (p) => Object.keys(p.tools).length + ' / 5' },
  { id: 'weather', name: '全天候制覇', hint: 'すべての山の条件でB以上', test: (_o, _r, p) => CONDS.every((c) => p.conds[c.id]), prog: (p) => CONDS.filter((c) => p.conds[c.id]).length + ' / ' + CONDS.length },
  { id: 'sss', name: '三連S', hint: 'Sランクを3回連続', test: (_o, _r, p) => p.sStreak >= 3, prog: (p) => Math.min(3, p.sStreak) + ' / 3' },
  { id: 'dusk', name: '夕暮れの達人', hint: '夕方の山でSランク', test: (o, r) => o.cond.id === 'dusk' && r === 'S' },
  { id: 'dex', name: '図鑑マスター', hint: '図鑑をすべて埋める', test: (_o, _r, p) => DEX.every((d) => p.dex[d.id]), prog: (p) => DEX.filter((d) => p.dex[d.id]).length + ' / ' + DEX.length },
];
