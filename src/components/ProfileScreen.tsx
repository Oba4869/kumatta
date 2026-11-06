import { Link, useLocation, useNavigate } from 'react-router';
import { BADGES } from '../data/badges';
import { LV, REWARDS, lvInfo, nextReward } from '../data/levels';
import { useGame } from '../GameContext';
import DexScreen from './DexScreen';
import { BadgeIcon } from './Icons';
import TitleScreen from './TitleScreen';
import '../profile.css';

const sections = [
  { id: 'profile', label: 'プロフィール', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2Z' },
  { id: 'dex', label: '図鑑', icon: 'M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15' },
  { id: 'badges', label: 'バッジ', icon: 'M18 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM7 13l-2 8 7-3 7 3-2-8' },
  { id: 'settings', label: '設定', icon: 'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2m14-7a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z' },
];

function SectionIcon({ path, filled = false }: { path: string; filled?: boolean }) {
  return <svg viewBox="0 0 24 24" fill={filled ? '#fff' : 'none'} stroke={filled ? '#fff' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}

function StopwatchIcon() {
  return (
    <svg className="profile-stat-icon" viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="44" cy="52" r="32" />
        <path d="M35 6h18M44 8v11M16 19l2 2m54-2-2 2" />
      </g>
      <path d="M44 34v18" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <circle cx="44" cy="52" r="4.5" fill="currentColor" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg className="profile-stat-icon" viewBox="0 0 88 88" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="29" width="74" height="18" rx="3" />
        <path d="M13 47v34a3 3 0 0 0 3 3h56a3 3 0 0 0 3-3V47M44 30v54" />
        <path d="M44 29c-9-2-26-3-26-15a8 8 0 0 1 9-8c8 0 14 10 17 23Zm0 0c9-2 26-3 26-15a8 8 0 0 0-9-8c-8 0-14 10-17 23Z" />
      </g>
    </svg>
  );
}

function Laurel() {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden="true">
      <path d="M20 30C8 26 4 16 9 6l1 .4C6 16 10 25 21 29Z" />
      <path d="M9 9C7 5 10 1 15 0c0 5-2 8-6 9ZM7 15C2 13 1 8 2 5c4 2 6 6 5 10Zm1 5c-5 0-8-4-8-8 4 1 8 4 8 8Zm4 5c-5 2-9-1-11-5 5-1 9 1 11 5Zm6 4c-4 3-9 2-12-1 5-3 9-2 12 1ZM9 17c-1-5 1-8 5-10 1 5-1 8-5 10Zm3 7c-2-4 0-8 4-10 2 4 0 8-4 10Zm5 4c-2-3-1-7 2-9 3 3 1 7-2 9Z" />
    </svg>
  );
}

export default function ProfileScreen() {
  const { profile, markSeen, sound, toggleSound } = useGame();
  const navigate = useNavigate();
  const { search, state } = useLocation();
  const sectionId = new URLSearchParams(search).get('section') ?? 'dex';
  const section = sections.find(({ id }) => id === sectionId) ?? sections[1];
  const level = lvInfo(profile.xp);
  const progress = level.l === LV.length ? 100 : level.pct;
  const reward = nextReward(level.l);
  const badgeCount = BADGES.filter(({ id }) => profile.badges[id]).length;

  function close() {
    if (state?.fromMenu) navigate(-1);
    else navigate('/', { replace: true });
  }

  return (
    <>
      <div className="profile-backdrop" inert aria-hidden="true"><TitleScreen /></div>
      <main className="scr profile-screen" onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
        <article className="profile-plate" aria-labelledby="profile-heading">
          <header className="profile-header">
            <h1 id="profile-heading"><SectionIcon path={section.icon} filled={section.id === 'profile'} />{section.label}</h1>
            <button className="profile-close" type="button" aria-label="とじる" onClick={close} autoFocus>
              <SectionIcon path="m6 6 12 12M18 6 6 18" />
            </button>
          </header>
          <nav className="profile-nav" data-active={section.id} aria-label="図鑑・きろくの目次">
            <span className="profile-nav-indicator" aria-hidden="true" />
            {sections.map(({ id, label, icon }) => (
              <Link key={id} to={id === 'dex' ? '/dex' : '/dex?section=' + id} replace state={state}
                aria-current={section.id === id ? 'page' : undefined}>
                <SectionIcon path={icon} filled={id === 'profile'} />{label}
              </Link>
            ))}
          </nav>
  
          <div className="profile-body">
            {/* The field guide sets the shared body height for every section. */}
            <div className="profile-body-scroll" inert={section.id !== 'dex'} aria-hidden={section.id !== 'dex'}>
              <DexScreen profile={profile} active={section.id === 'dex'} onSeen={(id) => markSeen('unreadDex', id)} />
            </div>
            {section.id !== 'dex' && (
              <div className="profile-body-scroll profile-body-overlay" key={section.id}>
                {section.id === 'profile' && (
                  <div className="profile-overview">
                    <div className="profile-level"><strong>Lv.{level.l}</strong><span className="profile-title"><Laurel />{level.title}<Laurel /></span></div>
                    <div className="profile-gauge" role="progressbar" aria-label="レベル進捗" aria-valuenow={Math.round(progress)}>
                      {progress > 0 && <span style={{ width: progress + '%' }} />}
                    </div>
                    <p className="profile-xp">{level.toNext > 0 ? `次のレベルまであと ${level.toNext.toLocaleString('ja-JP')} XP` : '最高レベル'}</p>
                    <div className="profile-stats">
                      <div className="profile-tile">
                        <div className="profile-stat-symbol"><StopwatchIcon /></div>
                        <div className="profile-stat-value"><span>自己ベスト</span><strong className={profile.best == null ? 'profile-no-best' : undefined}>{profile.best == null ? 'なし' : (profile.best / 1000).toFixed(2) + '秒'}</strong></div>
                      </div>
                      <div className="profile-tile profile-reward">
                        <div className="profile-stat-symbol"><GiftIcon /></div>
                        <div className="profile-stat-value">{reward ? <><span>次のごほうび</span><strong>Lv.{reward}</strong></> : 'すべてのごほうびを解放した！'}</div>
                        {reward && <p>{REWARDS[reward]}</p>}
                      </div>
                    </div>
                  </div>
                )}
                {section.id === 'badges' && (
                  <section className="profile-content profile-badge-list" aria-label="バッジ一覧">
                    <p className="lead">獲得済み {badgeCount} / {BADGES.length}</p>
                    <ul className="profile-badges">
                      {BADGES.map((badge) => (
                        <li key={badge.id}>
                          <button type="button" className="dexcard profile-badge-card" disabled={!profile.badges[badge.id]}
                            onClick={() => markSeen('unreadBadges', badge.id)}>
                            <BadgeIcon id={badge.id} locked={!profile.badges[badge.id]} />
                            {profile.unreadBadges.includes(badge.id) && <span className="collection-new">NEW</span>}
                            <span>
                              <b>{profile.badges[badge.id] ? badge.name : '？？？'}</b>
                              <span className="meta">{badge.hint}{!profile.badges[badge.id] && badge.prog && '（' + badge.prog(profile) + '）'}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {section.id === 'settings' && (
                  <section className="profile-content" aria-label="設定">
                    <button className="mbtn" type="button" aria-label="効果音" aria-pressed={sound} onClick={toggleSound}>
                      効果音 {sound ? 'オン' : 'オフ'}
                    </button>
                  </section>
                )}
              </div>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
