import { useEffect, useRef, useState } from 'react';
import cubApproach from '../assets/review-illustrations/cub-approach.png';
import fleeCharge from '../assets/review-illustrations/flee-charge.png';
import lookAway from '../assets/review-illustrations/look-away.png';
import protectionTooLate from '../assets/review-illustrations/protection-too-late.png';
import runInFront from '../assets/review-illustrations/run-in-front.png';
import sprayHeadwind from '../assets/review-illustrations/spray-headwind.png';
import sprayTooFar from '../assets/review-illustrations/spray-too-far.png';
import { BADGES } from '../data/badges';
import { diffStars } from '../data/conditions';
import { dexEntry } from '../data/dex';
import { REWARDS } from '../data/levels';
import { SRC } from '../data/sources';
import { TOOLS } from '../data/tools';
import { buildFeedback, type FeedbackIllustration, type FeedbackItem, type FeedbackKind } from '../game/feedback';
import { RANK_LABEL, RANK_LINE, type RunResult } from '../game/scoring';
import type { Outcome, Tier } from '../game/types';
import { sfx } from '../lib/sound';
import { BadgeIcon, PIC } from './Icons';
import RankEmblem from './RankEmblem';
import Rarity from './Rarity';
import StageArt from './StageArt';

interface Props {
  outcome: Outcome;
  result: RunResult;
  onAgain: () => void;
  onNext: () => void;
}

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIER_CHIP: Record<Tier, string> = { rainbow: '虹の判断', gold: '金の判断', silver: '銀の判断' };
const ESC_LINE: Record<string, string> = { S: '静かに動き、一度も見つからずに山を抜けた', A: '下山成功。あと少しで完璧', B: '下山成功。次はもっと静かに' };
const TIER_SHORT: Record<Tier, string> = { rainbow: '虹', gold: '金', silver: '銀' };
const STATE: Record<string, string> = { far: '遠く・気づいていない', near: 'こちらを見ている', mother: '子連れ', charging: 'いきなり突進' };

const FB_ICON: Record<FeedbackKind, React.ReactNode> = {
  good: <path d="M5 12l5 5 9-10" />,
  bad: <path d="M12 7v6M12 17h.01" />,
  info: <path d="M12 11v6M12 7h.01" />,
};

const FB_ILLUSTRATION: Record<FeedbackIllustration, string> = {
  'cub-approach': cubApproach,
  'look-away': lookAway,
  'run-in-front': runInFront,
  'spray-headwind': sprayHeadwind,
  'spray-too-far': sprayTooFar,
  'protection-too-late': protectionTooLate,
  'flee-charge': fleeCharge,
};

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <article className={'item ' + item.kind}>
      <div className="rs-item-heading">
        <span className="ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{FB_ICON[item.kind]}</svg>
        </span>
        <h3>{item.title}</h3>
      </div>
      <div className="body">
        <p>{item.text}</p>
        {item.kind === 'bad' && <img className="rs-illustration" src={FB_ILLUSTRATION[item.illustration]} alt="" />}
        {item.src && <cite>出典：{SRC[item.src]}</cite>}
      </div>
    </article>
  );
}

/** Bursts of colored paper from the middle of the rank card. */
function useConfetti() {
  const box = useRef<HTMLDivElement>(null);
  const fire = (n = 22) => {
    const el = box.current;
    if (!el || reduce()) return;
    el.replaceChildren();
    const cols = ['#f2d9a0', '#ffb85a', '#ff8a3a', '#e9e1cf', '#c9a35c'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.style.background = cols[i % cols.length];
      el.appendChild(c);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, d = 60 + Math.random() * 110;
      c.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(.3)', opacity: 0 },
        ],
        { duration: 1400 + Math.random() * 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
      );
    }
  };
  return { box, fire };
}

export default function ResultScreen({ outcome: o, result: r, onAgain, onNext }: Props) {
  const [review, setReview] = useState(false);
  const reviewSlides = useRef<HTMLDivElement>(null);
  const [reviewSlide, setReviewSlide] = useState(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!review) return;
    window.scrollTo(0, 0);
    reviewHeading.current?.focus({ preventScroll: true });
  }, [review]);
  const p = r.profile;
  const { box, fire } = useConfetti();
  const [xpPct, setXpPct] = useState(r.before.pct);
  const [xpAnimate, setXpAnimate] = useState(true);
  const [lvShown, setLvShown] = useState(r.before);
  const [lvUp, setLvUp] = useState<string | null>(null);

  /* XP bar fills, rolls over on level-up, then celebrates. */
  useEffect(() => {
    window.scrollTo(0, 0);
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    if (r.after.l > r.before.l) {
      later(() => setXpPct(100), 150);
      later(() => {
        setXpAnimate(false);
        setXpPct(0);
        later(() => { setXpAnimate(true); setXpPct(r.after.pct); }, 30);
        setLvShown(r.after);
        const got: string[] = [];
        for (let l = r.before.l + 1; l <= r.after.l; l++) if (REWARDS[l]) got.push(REWARDS[l]);
        setLvUp('レベルアップ！ 称号「' + r.after.title + '」' + (got.length ? '　ごほうび：' + got.join('、') : ''));
        sfx.sparkle('rainbow');
        fire();
      }, 1050);
    } else later(() => setXpPct(r.after.pct), 150);
    /* the harder the mountain, the bigger the celebration when every goal is met */
    if (allClear) later(() => fire(16 + o.cond.diff * 8), 1500);
    else if (r.freshBadges.length || r.freshDex.length || r.newRec || r.rank === 'S') {
      later(() => fire(), 250);
      later(() => sfx.sparkle(r.rank === 'S' ? 'rainbow' : 'gold'), 250);
    }
    return () => timers.forEach(clearTimeout);
    // runs once per result screen
  }, []);

  const wxo = o.cond.wxs?.find((w) => w.id === o.wx);
  const condLine = o.cond.name + (wxo && wxo.id !== 'clear' ? '・' + wxo.name : '') + '　難易度 ' + diffStars(o.cond.diff);
  const move = o.tier ? TIER_SHORT[o.tier] : o.swipeFast ? '速すぎ' : o.turned ? '背を向けた' : o.ran || o.ranCharge ? '逃げた' : o.chargeFail ? '間に合わず' : '動けず';
  const names = o.tools.map((k) => TOOLS[k].name).join('・') || 'なし';
  const bearLine = o.escaped && !o.spotted ? 'クマ：見つからずに下山' : o.escaped ? 'クマ：見つかったが下山' : o.bearState ? 'クマ：' + STATE[o.bearState] : '';

  const next = BADGES.find((b) => !p.badges[b.id] && b.prog) || BADGES.find((b) => !p.badges[b.id]);
  const prog = next?.prog ? next.prog(p) : '';
  const m = prog.match(/(\d+)\s*\/\s*(\d+)/);
  const goalPct = m ? Math.min(100, Math.round((+m[1] / +m[2]) * 100)) : 0;

  /* three goals for every walk; all three is the real "clear" */
  const missions = [
    { label: '避難小屋にたどり着く', ok: !!o.escaped },
    { label: 'クマの前で走らない', ok: !o.ran && !o.ranCharge },
    { label: 'クマから目を逸らさない', ok: !(o.lookAways > 0) },
  ];
  const allClear = missions.every((x) => x.ok);

  const fb = buildFeedback(o);
  const group = (k: FeedbackKind) => fb.filter((x) => x.kind === k);
  const badItems = group('bad'), goodItems = group('good'), infoItems = group('info');

  const slideCount = Math.ceil(badItems.length / 3);
  const moveReview = (index: number) => {
    const slides = reviewSlides.current;
    if (!slides) return;
    slides.scrollTo({ left: index * slides.clientWidth, behavior: reduce() ? 'instant' : 'smooth' });
  };

  let delay = 0.3;
  const nextDelay = () => { const d = delay; delay += 0.15; return d + 's'; };

  return (
    <>
      <div className="rs-background" aria-hidden="true">
        <StageArt id={o.cond.id} className="rs-stage-art" animated={!reduce()} />
      </div>
    <section className={'panel result ' + (review ? 'rs-review-page' : 'rs-summary-page')}>
      {!review && (
        <article className={'rank rs-verdict r-' + r.rank} aria-labelledby="rsTitle">
          <div className="confetti" ref={box} aria-hidden="true" />
          <div className="permit-band">
            <span className="permit-title">下山報告</span>
            {o.tier && <span className={'rs-tier ' + o.tier}>{TIER_CHIP[o.tier]}</span>}
          </div>
          <header className="rs-vhead">
            <span className="rs-cond">{condLine}</span>
          </header>
          <div className="rs-vbody">
            <RankEmblem rank={r.rank} stamp={!reduce()} />
            <div className="rs-vtext">
              <p className="rs-cap">くまった判定</p>
              <h2 id="rsTitle">{RANK_LABEL[r.rank]}</h2>
              {r.rank !== 'C' && <p className="rs-line">{o.escaped ? ESC_LINE[r.rank] : RANK_LINE[r.rank]}</p>}
            </div>
          </div>
          <ol className={'missions' + (allClear ? ' all' : '')} aria-label="今回の目標">
            {missions.map((x, i) => (
              <li key={x.label} className={x.ok ? 'ok' : 'ng'} style={{ animationDelay: 0.5 + i * 0.28 + 's' }}>
                <span className="ms-mark" aria-hidden="true">{x.ok ? '済' : '×'}</span>
                <span className="ms-label">{x.label}</span>
                <span className="sr-only">{x.ok ? '達成' : '未達成'}</span>
              </li>
            ))}
            {allClear && <li className="ms-all" style={{ animationDelay: '1.45s' }}>3つすべて達成</li>}
          </ol>
          <dl className="rs-stats">
            {o.escaped ? (
              <div><dt>下山タイム</dt><dd>{o.time != null ? Math.round(o.time / 1000) + '秒' : '—'}</dd></div>
            ) : (
              <div><dt>反応時間</dt><dd>{o.reaction != null ? (o.reaction / 1000).toFixed(2) + '秒' : '—'}{r.newRec && <span className="newrec">ベスト</span>}</dd></div>
            )}
            <div><dt>判断</dt><dd>{move}</dd></div>
            <div><dt>やり過ごした</dt><dd>{o.stops} / {o.rustles}</dd></div>
          </dl>
          <p className="rs-meta">
            {bearLine && <span>{bearLine}</span>}
            <span>持ち物：{names}</span>
            {p.best != null && !r.newRec && <span>自己ベスト {(p.best / 1000).toFixed(2)}秒</span>}
          </p>
        </article>
      )}

      {review && (
        <section className="rs-review-layout" aria-labelledby="rvTitle">
          <svg className="rs-illustration-filters" width="0" height="0" aria-hidden="true">
            <defs>
              <filter id="rs-illustration-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="nearGlow" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="farGlow" />
                <feMerge>
                  <feMergeNode in="farGlow" />
                  <feMergeNode in="nearGlow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
          <header className="rs-review-header">
            <button className="btn btn-plain rs-review-back" type="button" aria-label="下山報告に戻る" onClick={() => {
              setReviewSlide(0);
              setReview(false);
            }}>
              <svg width="10" height="20" viewBox="0 0 10 20" aria-hidden="true">
                <path d="M0 10 10 0v20Z" fill="currentColor" />
              </svg>
            </button>
            <h1 className="rs-h" id="rvTitle" ref={reviewHeading} tabIndex={-1}>ふりかえり</h1>
            <div className="rs-sub"><span>見直したい行動</span><span className="rs-n">{badItems.length}</span></div>
          </header>
          <div className="rs-review">
            {badItems.length === 0 && <p className="rs-review-note">今回は見直したい行動はありません。</p>}
            {badItems.length > 0 && (
              <div className="fb-group bad">
                <div
                  className="rs-review-slides"
                  id="review-slides"
                  ref={reviewSlides}
                  onScroll={(event) => {
                    const { scrollLeft, clientWidth } = event.currentTarget;
                    if (clientWidth) setReviewSlide(Math.round(scrollLeft / clientWidth));
                  }}
                >
                  {Array.from({ length: slideCount }, (_, index) => (
                    <div className="rs-review-slide" key={index}>
                      {badItems.slice(index * 3, index * 3 + 3).map((item, cardIndex) => (
                        <FeedbackCard key={cardIndex} item={item} />
                      ))}
                    </div>
                  ))}
                </div>
                {slideCount > 1 && (
                  <nav className="rs-review-nav" aria-label="見直したい行動のページ">
                    <button className="btn btn-plain" type="button" aria-controls="review-slides" disabled={reviewSlide === 0} onClick={() => moveReview(reviewSlide - 1)}>前の3件</button>
                    <span aria-live="polite">{reviewSlide + 1} / {slideCount}</span>
                    <button className="btn btn-plain" type="button" aria-controls="review-slides" disabled={reviewSlide >= slideCount - 1} onClick={() => moveReview(reviewSlide + 1)}>次の3件</button>
                  </nav>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {!review && (
        <section className="rs-review rs-summary-feedback" aria-label="よかった行動と今回のメモ">
          {goodItems.length > 0 && (
            <section className="memo rs-good" aria-labelledby="rs-good-title">
              <div className="rs-memo-heading"><h3 className="rs-good-label" id="rs-good-title">よかった行動</h3><span className="sec-hint">{goodItems.length}件</span></div>
              <div className="items">{goodItems.map((it) => <FeedbackCard key={it.title} item={it} />)}</div>
            </section>
          )}
          <section className="memo" aria-labelledby="rs-memo-title">
            <div className="rs-memo-heading"><h3 id="rs-memo-title">今回のメモ</h3><span className="sec-hint">{infoItems.length}件</span></div>
            <div className="items">{infoItems.map((it) => <FeedbackCard key={it.title} item={it} />)}</div>
          </section>
        </section>
      )}

      {!review && <aside className="rs-side">
        <section className="prog rs-progress" aria-label="成長の記録">
          <div className="progtop"><b>Lv.{lvShown.l} {lvShown.title}</b><span>+{r.gain} XP</span></div>
          <div className="xpbar" aria-hidden="true"><i style={{ width: xpPct + '%', transition: xpAnimate ? undefined : 'none' }} /></div>
          <div className="progsub">
            <span>{r.after.toNext ? '次のレベルまで ' + r.after.toNext + ' XP' : '最高レベル'}</span>
            <span>{p.streak >= 2 ? '連続クリア ' + p.streak : ''}</span>
          </div>
          {lvUp && <p className="lvup">{lvUp}</p>}

          {(r.freshBadges.length > 0 || r.freshDex.length > 0) && (
            <ul className="newbadges" aria-live="polite">
              {r.freshBadges.map((b) => (
                <li key={b.id} className="nb pop" style={{ animationDelay: nextDelay() }}>
                  <BadgeIcon id={b.id} />
                  <div><b>バッジ獲得：{b.name}</b><span>{b.hint}</span></div>
                </li>
              ))}
              {r.freshDex.map((id) => {
                const d = dexEntry(id);
                if (!d) return null;
                return (
                  <li key={id} className="nb pop" style={{ animationDelay: nextDelay() }}>
                    <span className="medal dexpic">{PIC[d.pic]}</span>
                    <div><b>図鑑に登録：{d.name}</b><span><Rarity star={d.star} /></span></div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="goal">
            {next ? (
              <>
                <div className="gtop"><span>次の目標　<b>{next.name}</b></span><span>{prog}</span></div>
                {m && <div className="gbar"><i style={{ width: goalPct + '%' }} /></div>}
                <span className="ghint">{next.hint}</span>
              </>
            ) : (
              <div className="gtop"><b>すべてのバッジを集めた！</b></div>
            )}
          </div>
        </section>

        <section className="collection" aria-labelledby="rs-badge-title">
          <div className="rs-memo-heading"><h3 id="rs-badge-title">バッジ一覧</h3><span>{BADGES.filter((b) => p.badges[b.id]).length} / {BADGES.length}</span></div>
          <ul className="badgelist">
            {BADGES.map((b) => (
              <li key={b.id}>
                <BadgeIcon id={b.id} locked={!p.badges[b.id]} />
                <div>
                  <b>{p.badges[b.id] ? b.name : '？？？'}</b>
                  <span>{b.hint}{b.prog && !p.badges[b.id] ? '（' + b.prog(p) + '）' : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>}
      <div className="startbar rs-actions">
        {review && (
          <button className="btn btn-plain btn-again" type="button" onClick={onAgain}>同じ山でもう一度</button>
        )}
        <button className="btn btn-primary btn-next" type="button" onClick={review ? onNext : () => setReview(true)}>
          <span>{review ? '次の山へ' : '振り返りを見る'}</span>
          <svg width="7.5" height="15" viewBox="0 0 6 12" aria-hidden="true">
            <path d="M6 6 0 0v12Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {review && (
        <p className="rs-review-note">本州・四国はツキノワグマ、北海道はヒグマを想定しています。解説は環境省・林野庁・自治体の資料に基づいています。</p>
      )}
    </section>
    </>
  );
}
