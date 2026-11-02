export type ToolId = 'bell' | 'radio' | 'spray' | 'pack' | 'helmet';

export interface Tool {
  name: string;
  /** short effect line shown on the tool card */
  eff: string;
  desc: string;
}

export const TOOLS: Record<ToolId, Tool> = {
  bell: { name: 'クマ鈴', eff: '遠くのクマが離れていく', desc: '歩くたびに鳴る。人がいることを知らせ、出会う可能性を下げる' },
  radio: { name: 'ラジオ', eff: '遠くのクマが離れていく', desc: '音を流し続けて、人がいることを知らせる' },
  spray: { name: '撃退スプレー', eff: '威嚇するクマを止める（3回）', desc: '射程は数メートル。引き付けて顔に向けて噴射する。向かい風では自分にかかる' },
  pack: { name: 'リュック', eff: '防御姿勢が早くとれる', desc: 'うつ伏せになったとき、背中を守る' },
  helmet: { name: 'ヘルメット', eff: '防御姿勢が早くとれる', desc: '頭を守る。防御姿勢がとりやすくなる' },
};

export const TOOL_IDS = Object.keys(TOOLS) as ToolId[];

/** The player always takes two tools. */
export const MAX_TOOLS = 2;
