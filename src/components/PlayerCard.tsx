import { BADGES } from '../data/badges';
import { DEX } from '../data/dex';
import { APEX_CARD_LV, GOLD_CARD_LV, RAINBOW_CARD_LV, REWARDS, lvInfo, nextReward } from '../data/levels';
import type { Profile } from '../lib/profile';

interface Props {
  profile: Profile;
  onClick: () => void;
}

/** Level, title and collection progress. The card itself changes look at Lv.12 / 15 / 20. */
export default function PlayerCard({ profile, onClick }: Props) {
  const li = lvInfo(profile.xp);
  const next = nextReward(li.l);
  const look = li.l >= APEX_CARD_LV ? 'rainbow apex' : li.l >= RAINBOW_CARD_LV ? 'rainbow' : li.l >= GOLD_CARD_LV ? 'gold' : '';
  const dexN = DEX.filter((d) => profile.dex[d.id]).length;
  const badgeN = BADGES.filter((b) => profile.badges[b.id]).length;

  return (
    <button className={'player ' + look} type="button" aria-label="図鑑を見る" onClick={onClick}>
      <span className="pl-top"><b>Lv.{li.l}</b><span>{li.title}</span></span>
      <span className="pl-bar" aria-hidden="true"><i style={{ width: li.pct + '%' }} /></span>
      <span className="pl-stats">
        <span>自己ベスト<b>{profile.best != null ? (profile.best / 1000).toFixed(2) + '秒' : 'なし'}</b></span>
        <span>図鑑<b>{dexN} / {DEX.length}</b></span>
        <span>バッジ<b>{badgeN} / {BADGES.length}</b></span>
      </span>
      <span className="pl-next">
        {next ? <>次のごほうび：<b>Lv.{next}</b>　{REWARDS[next]}</> : 'すべてのごほうびを解放した！'}
      </span>
    </button>
  );
}
