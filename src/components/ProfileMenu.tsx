import { useEffect, useRef, useState } from 'react';
import { useGame } from '../GameContext';
import { BADGES } from '../data/badges';
import { DEX } from '../data/dex';
import { lvInfo, nextReward, REWARDS } from '../data/levels';
import { MedalIcon } from './Icons';
import DexScreen from './DexScreen';

const tabs = ['プロフィール', '図鑑', 'バッジ', '設定'] as const;
export default function ProfileMenu() {
  const { profile: p, sound, toggleSound } = useGame();
  const [tab, setTab] = useState<typeof tabs[number]>('プロフィール');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lv = lvInfo(p.xp), reward = nextReward(lv.l);
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  useEffect(() => () => dialog.current?.close(), []);
  return <>
    <button ref={trigger} className="paw-menu" aria-label="プロフィール・図鑑・バッジ・設定を開く" onClick={() => dialog.current?.showModal()}>
      <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><ellipse cx="10" cy="19" rx="5" ry="7" transform="rotate(-25 10 19)"/><ellipse cx="20" cy="10" rx="5" ry="7"/><ellipse cx="32" cy="11" rx="5" ry="7" transform="rotate(12 32 11)"/><ellipse cx="40" cy="22" rx="5" ry="7" transform="rotate(25 40 22)"/><path d="M12 34c0-6 8-15 13-15s14 10 14 16c0 10-10 5-14 5s-13 5-13-6"/></svg>
    </button>
    <dialog ref={dialog} aria-label="プロフィール・図鑑・バッジ・設定" className="profile-dialog" onClick={e => { if (e.target === dialog.current) close(); }}>
      <div className="profile-heading"><h2>プロフィール</h2><button aria-label="閉じる" onClick={close}>×</button></div>
      <nav className="profile-tabs" aria-label="記録メニュー">{tabs.map(t => <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
      <div className="profile-content">
      {tab === 'プロフィール' && <><div className="profile-level"><b>Lv.{lv.l}</b><span>{lv.title}</span></div><div className="profile-xp" role="progressbar" aria-label="レベルの進み具合" aria-valuenow={Math.round(lv.pct)} aria-valuemin={0} aria-valuemax={100}><i style={{width: lv.pct + '%'}} /></div><p>{lv.toNext ? `次のレベルまで ${lv.toNext} XP` : '最高レベル'}</p><div className="profile-metrics"><article><span>自己ベスト（反応時間）</span><b>{p.best == null ? '―' : (p.best / 1000).toFixed(2) + '秒'}</b></article><article><span>次のごほうび</span><b>{reward ? `Lv.${reward}` : 'すべて獲得'}</b><small>{reward ? REWARDS[reward] : '頂点に到達しました'}</small></article></div><div className="profile-totals"><span>図鑑 {DEX.filter(d => p.dex[d.id]).length} / {DEX.length}</span><span>バッジ {BADGES.filter(b => p.badges[b.id]).length} / {BADGES.length}</span><span>プレイ回数 {p.runs}</span></div></>}
      {tab === '図鑑' && <DexScreen profile={p} onBack={close} />}
      {tab === 'バッジ' && <><p>獲得 {BADGES.filter(b => p.badges[b.id]).length} / {BADGES.length}</p><ul className="profile-badges">{BADGES.map(b => <li key={b.id}><span className={p.badges[b.id] ? 'earned' : 'unearned'}><MedalIcon /></span><div><b>{p.badges[b.id] ? b.name : '？？？'}</b><small>{b.hint}</small></div><span>{p.badges[b.id] ? '✓' : b.prog?.(p)}</span></li>)}</ul></>}
      {tab === '設定' && <div className="profile-settings"><h3>サウンド</h3><label>効果音・環境音<button role="switch" aria-checked={sound} onClick={toggleSound}>{sound ? '● オン' : '○ オフ'}</button></label><p>レベル・図鑑・バッジは、このブラウザに自動保存されます。</p></div>}
      </div>
    </dialog>
  </>;
}
