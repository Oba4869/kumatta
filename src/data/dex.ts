import type { SourceKey } from './sources';

/** What can come out of the grass, other than a bear decided on its own. */
export type CritterEvent = 'wind' | 'bird' | 'rabbit' | 'tanuki' | 'boar' | 'wolf';

export interface DexEntry {
  id: string;
  /** event that reveals it while walking (bears are rolled separately) */
  ev?: CritterEvent;
  pic: string;
  name: string;
  /** rarity 1-4 (how rarely it appears) */
  star: 1 | 2 | 3 | 4;
  hint: string;
  text: string;
  src?: SourceKey;
}

export const RARITY: Record<number, string> = { 1: 'ノーマル', 2: 'レア', 3: 'Sレア', 4: '激レア' };

/** Appearance weight per rarity, for everything that is not a bear. */
export const RW: Record<number, number> = { 1: 40, 2: 16, 3: 6, 4: 2 };

/** Field guide: what came out of the grass. Unlocks on sight. */
export const DEX: DexEntry[] = [
  { id: 'c-wind', ev: 'wind', pic: 'wind', name: '風', star: 1, hint: '草むらの揺れの正体を確かめる', text: '草むらの揺れの正体が、風だけのことも多い。それでも揺れたら、一度立ち止まって確かめる。', src: 'rinya' },
  { id: 'c-bird', ev: 'bird', pic: 'bird', name: '小鳥', star: 1, hint: '鳥の声がしたら、空を見てみよう', text: '物音の正体が鳥のこともある。気配に気づいて立ち止まれたなら、それで正解。' },
  { id: 'c-rabbit', ev: 'rabbit', pic: 'rabbit', name: 'ウサギ', star: 1, hint: '草むらから飛び出す小さな動物', text: '山で出会うこともある小さな動物。揺れの正体がクマとは限らないが、決めつけずに確かめる。' },
  { id: 'c-tanuki', ev: 'tanuki', pic: 'tanuki', name: 'タヌキ', star: 2, hint: '人里の近くにもすむ', text: '人里の近くにもすむ身近な動物。目のまわりの黒い模様が目印。揺れの正体を決めつけずに確かめる。' },
  { id: 'c-bear', pic: 'bear', name: 'ツキノワグマ', star: 2, hint: '草むらから…？', text: '本州・四国にすむクマ。岩手県・秋田県の人身被害の記録では、けがの部位は頭部が77%と最も多かった。', src: 'envr' },
  { id: 'c-mother', pic: 'mother', name: '子連れの母グマ', star: 3, hint: '子グマと一緒にいるクマ', text: '子連れのクマに出会ったら、速やかにその場を離れる。母グマは子を守るため攻撃的になることが多い。', src: 'env' },
  { id: 'c-higuma', pic: 'bear', name: 'ヒグマ', star: 3, hint: '北海道の山で…', text: '北海道にすむ大きなクマ。突然近くで出会ったら、走ったり大声を出したりせず、両腕をゆっくり上げて振り、穏やかに話しかけながら離れる。', src: 'shiretoko' },
  { id: 'c-hcub', pic: 'cub', name: 'ヒグマの子グマ', star: 3, hint: '北海道の山でまれに', text: '子グマには近づかない。近くに母グマがいる可能性が高い。', src: 'shiretoko' },
  { id: 'c-boar', ev: 'boar', pic: 'boar', name: 'イノシシ', star: 3, hint: 'ときどき草むらから走り出る', text: '出会ったら、刺激しないよう慌てずゆっくり後ずさりして離れる。棒を振り上げたり物を投げたりすると襲われることがある。', src: 'hyogo' },
  { id: 'c-cub', pic: 'cub', name: '子グマ', star: 3, hint: 'まれに出会う', text: '子グマが1頭でいても、近くに母グマがいる可能性が高い。母グマは子を守るため攻撃的になることが多いので、近づかずにすぐ離れる。', src: 'env' },
  { id: 'c-wolf', ev: 'wolf', pic: 'wolf', name: 'エゾオオカミ（幻）', star: 4, hint: '北海道の、霧や初雪の日に…', text: 'かつて北海道にすんでいたオオカミ。明治時代に絶滅したとされ（観光庁の解説では1889年）、いまはいない。ゲームの中だけの幻の出会い。', src: 'jta' },
];

export const dexEntry = (id: string) => DEX.find((d) => d.id === id);
