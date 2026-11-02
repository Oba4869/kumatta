/** Official sources behind every "correct action" and explanation in the game. */
export const SRC = {
  env: '環境省「クマ類の出没対応マニュアル」',
  rinya: '林野庁「クマ対策の注意事項」',
  miyagi: '宮城県「ツキノワグマの被害に遭わないために」',
  toyama: '富山県教育委員会「県立学校におけるクマへの対応について」',
  envr: '環境省「クマ類の保護及び管理に関するレポート（令和6年度版）」',
  hyogo: '兵庫県「イノシシによる人身被害防止について」',
  kyoto: '京都府レッドデータブック2015「ニホンオオカミ」',
  shiretoko: '知床財団「出会った時は（ヒグマ対処法）」',
  jta: '観光庁 多言語解説文データベース「エゾシカ」',
} as const;

export type SourceKey = keyof typeof SRC;
