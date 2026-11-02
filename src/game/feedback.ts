import type { SourceKey } from '../data/sources';
import { isDanger } from './scoring';
import type { Outcome } from './types';

export type FeedbackKind = 'good' | 'bad' | 'info';

export interface FeedbackItem {
  kind: FeedbackKind;
  title: string;
  text: string;
  /** omitted for explanations of a game rule rather than real-world advice */
  src?: SourceKey;
}

/** Builds the "ふりかえり" list. Every explanation is tied to an official source. */
export const buildFeedback = (o: Outcome): FeedbackItem[] => {
  const it: FeedbackItem[] = [];
  const add = (kind: FeedbackKind, title: string, text: string, src?: SourceKey) => it.push({ kind, title, text, src });
  const has = (k: string) => o.tools.includes(k as never);
  const higuma = !!o.cond.higuma;
  const danger = isDanger(o);

  if (o.cubBad) add('bad', '子グマに近づいた', '子グマが1頭でいても、近くに母グマがいる可能性が高い。近づかず、速やかにその場を離れる。', 'env');
  if (o.cubOK) add('good', '子グマから離れた', '子グマを見たら近づかず、速やかにその場を離れる。母グマは子を守るため攻撃的になることが多い。', 'env');
  if (o.cubSlow) add('info', '子グマの前で迷った', '子グマを見たら、すぐにその場を離れる。近くに母グマがいる可能性が高い。', 'env');
  if (o.cond.id === 'dusk') add('info', '今回の条件：' + o.cond.name, '朝夕の薄暗い時間帯は特に注意する。', 'miyagi');
  else if (['stream', 'wind', 'fog'].includes(o.cond.id) || o.wx === 'fog') add('info', '今回の条件：' + o.cond.name, '霧や強風のある日、沢沿いは注意力が落ちやすい。いつも以上に慎重に行動する。', 'miyagi');
  if (o.escaped && !o.spotted) add('good', '見つからずに山を抜けた', 'クマが気づいていないときは、静かにその場を離れる。', 'miyagi');
  else if (o.escaped) add('good', '避難小屋までたどり着いた', 'クマに気づかれても、落ち着いて対処できた。次は気づかれる前に、静かに距離をとることを目指そう。', 'miyagi');
  if (o.backedOff) add('good', 'クマを見ながらゆっくり離れた', 'クマを見ながらゆっくり後退し、静かに距離をとる。背中を見せて走ってはいけない。', 'env');
  if (o.lookAways) add('bad', 'クマから目を逸らした（' + o.lookAways + '回）', 'クマを見ながら、ゆっくり後退する。背中を見せて逃げると、攻撃性を高めることがある。', 'miyagi');
  if (o.cubNear) add('bad', '子グマに近づいた', '子グマが1頭でいても、近くに母グマがいる可能性が高い。近づかず、速やかにその場を離れる。', 'env');
  if (o.noisy) add('info', '走って移動した（' + o.noisy + '回）', 'ゲームでは、走ると足音が遠くまで届き、クマに気づかれやすくなる。クマを見かけても、走って逃げてはいけない。', 'env');
  if (o.cond.gusty) add('info', '風向きのルール', 'ゲームのルール：風上にいると、においでクマに気づかれやすくなる。スプレーは向かい風だと自分にかかる。');
  if (has('bell') || has('radio')) add('info', '音で人がいることを知らせた', (o.scared ? '音でクマが先に離れていった場面が' + o.scared + '回あった。' : '') + '鈴やラジオで人の存在を知らせると、出会う可能性を下げられる。ただし、音を出していても出会うことはある。', 'rinya');
  if (o.ran) add('bad', 'クマの前で走った', '慌てて走って逃げてはいけない。背中を見せて逃げると、攻撃性を高めることがある。', 'env');
  if (o.mother && o.backedOff && !danger) add('good', '子連れのクマから離れた', '子連れのクマに出会ったら、速やかにその場を離れる。母グマは子を守るため攻撃的になることが多い。', 'env');
  if (o.sprayHeadwind) add('bad', '向かい風でスプレーを使った', 'スプレーは風向きによっては自分にもかかる。使う前に風向きを確かめる。', 'env');
  if (o.sprayEarly) {
    if (higuma) add('bad', '遠くでスプレーを使った', 'ヒグマが3〜4mまで迫ってから、目と鼻をめがけて噴射する。', 'shiretoko');
    else add('bad', '遠くでスプレーを使った', '撃退スプレーの射程は約5mと短い。遠くから噴射しても届かない。', 'env');
  }
  if (o.sprayOK) {
    if (higuma) add('good', 'スプレーを引き付けて使えた', '3〜4mまで迫ったら、目と鼻をめがけて一気に噴射する。', 'shiretoko');
    else add('good', 'スプレーを引き付けて使えた', '十分に引き付けて、クマの顔に向けてためらわず噴射する。風向きにも注意する。', 'env');
  }
  if (o.postureOK) {
    if (higuma) add('good', '防御姿勢をとれた', 'うつ伏せになって顔と腹部を守り、首の後ろは手で守る。バックパックはプロテクター代わりになる。', 'shiretoko');
    else add('good', '防御姿勢をとれた', '両腕で顔と頭を覆い、すぐにうつ伏せになる。' + (has('pack') ? 'リュックを背負っていると背中も守られる。' : ''), 'env');
  }
  if (o.postureOK && has('helmet')) add('good', 'ヘルメットで頭を守った', 'クマによるけがは頭部に多い。出没情報があるときは、ヘルメットをかぶりリュックを背負う。', 'toyama');
  if (o.chargeFail) add('bad', '身を守る行動が間に合わなかった', '突進されたら、両腕で顔と頭を覆い、すぐにうつ伏せになる。スプレーがあれば引き付けて噴射する。', 'env');
  if (o.ranCharge) add('bad', '突進から背を向けて逃げた', '突進してくるクマからは走って逃げきれない。背中を見せて逃げると、攻撃性を高めることがある。その場で防御姿勢をとる。', 'env');
  add('info', 'ゲームの「正解」について', '攻撃を完全に避ける方法はないとされている。ここでの正解は、被害を小さくできる可能性を高める行動です。', 'env');
  return it;
};
