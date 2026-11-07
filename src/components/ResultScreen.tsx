import { useEffect, useRef, useState } from 'react';
import { BADGES } from '../data/badges';
import { diffStars } from '../data/conditions';
import { dexEntry } from '../data/dex';
import { REWARDS } from '../data/levels';
import { SRC } from '../data/sources';
import { TOOLS } from '../data/tools';
import { buildFeedback, type FeedbackIllustration, type FeedbackItem, type FeedbackKind } from '../game/feedback';
import cubApproach from '../assets/review-illustrations/cub-approach.webp';
import fleeCharge from '../assets/review-illustrations/flee-charge.webp';
import lookAway from '../assets/review-illustrations/look-away.webp';
import protectionTooLate from '../assets/review-illustrations/protection-too-late.webp';
import runInFront from '../assets/review-illustrations/run-in-front.webp';
import sprayHeadwind from '../assets/review-illustrations/spray-headwind.webp';
import sprayTooFar from '../assets/review-illustrations/spray-too-far.webp';
import { RANK_LABEL, RANK_LINE, type RunResult } from '../game/scoring';
import type { Outcome, Tier } from '../game/types';
import { sfx } from '../lib/sound';
import { MedalIcon, PIC } from './Icons';
import RankEmblem from './RankEmblem';
import Rarity from './Rarity';

interface Props {
  outcome: Outcome;
  result: RunResult;
  onAgain: () => void;
  onNext: () => void;
  onDex: () => void;
}

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIER_CHIP: Record<Tier, string> = { rainbow: '虹の判断', gold: '金の判断', silver: '銀の判断' };
const ESC_LINE: Record<string, string> = { S: '静かに動き、一度も見つからずに山を抜けた', A: '下山成功。あと少しで完璧', B: '下山成功。次はもっと静かに', C: '下の「見直したい行動」を確認しよう' };
const TIER_SHORT: Record<Tier, string> = { rainbow: '虹', gold: '金', silver: '銀' };
const STATE: Record<string, string> = { far: '遠く・気づいていない', near: 'こちらを見ている', mother: '子連れ', charging: 'いきなり突進' };

const FB_ICON: Record<FeedbackKind, React.ReactNode> = {
  good: <path d="M5 12l5 5 9-10" />,
  bad: <path d="M12 7v6M12 17h.01" />,
  info: <path d="M12 11v6M12 7h.01" />,
};

/** A line drawing of the mistake, beside each "見直したい行動" (drawn by 小林さん, recoloured to the game's cream and gold). */
const FB_ILLUSTRATION: Record<FeedbackIllustration, string> = {
  'cub-approach': cubApproach,
  'look-away': lookAway,
  'run-in-front': runInFront,
  'spray-headwind': sprayHeadwind,
  'spray-too-far': sprayTooFar,
  'protection-too-late': protectionTooLate,
  'flee-charge': fleeCharge,
};

function FeedbackCard({ item, open = false }: { item: FeedbackItem; open?: boolean }) {
  return (
    <details className={'item ' + item.kind} open={open}>
      <summary>
        <span className="ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{FB_ICON[item.kind]}</svg>
        </span>
        <h3>{item.title}</h3>
      </summary>
      <div className="body">
        {item.kind === 'bad' && <img className="rs-illustration" src={FB_ILLUSTRATION[item.illustration]} alt="" width="720" height="480" loading="lazy" />}
        <p>{item.text}</p>
        {item.src && <cite>出典：{SRC[item.src]}</cite>}
      </div>
    </details>
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
  const bearLine = o.escaped && !o.spotted ? 'クマ：見つからずに下山　｜　' : o.escaped ? 'クマ：見つかったが下山　｜　' : o.bearState ? 'クマ：' + STATE[o.bearState] + '　｜　' : '';

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

  let delay = 0.3;
  const nextDelay = () => { const d = delay; delay += 0.15; return d + 's'; };

  /* the first thing to fix is shown open with its drawing; the rest fold */
  const firstBad = badItems[0]?.title;

  return (
    <section className={'panel result rs-card r-' + r.rank} aria-labelledby="rsTitle">
      <div className="confetti" ref={box} aria-hidden="true" />

      {/* ---- top: the verdict ---- */}
      <header className="rs-card-top">
        <div className="permit-band">
          <span className="permit-title">下山報告</span>
          {o.tier && <span className={'rs-tier ' + o.tier}>{TIER_CHIP[o.tier]}</span>}
        </div>
        <p className="rs-cond">{condLine}</p>
        <div className="rs-vbody">
          <RankEmblem rank={r.rank} stamp={!reduce()} />
          <div className="rs-vtext">
            <p className="rs-cap">くまった判定</p>
            <h2 id="rsTitle">{RANK_LABEL[r.rank]}</h2>
            <p className="rs-line">{o.escaped ? ESC_LINE[r.rank] : RANK_LINE[r.rank]}</p>
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
        </ol>
        {allClear && <p className="ms-all" style={{ animationDelay: '1.45s' }}>3つすべて達成</p>}
      </header>

      {/* ---- middle: the review (left) and progress (right) ---- */}
      <div className="rs-card-body">
        <section className="rs-review" aria-labelledby="rvTitle">
          <h3 className="rs-h" id="rvTitle">ふりかえり</h3>
          {badItems.length > 0 && (
            <div className="fb-group bad">
              <div className="rs-sub"><span>見直したい行動</span><span className="rs-n">{badItems.length}</span></div>
              <div className="items">{badItems.map((it) => <FeedbackCard key={it.title} item={it} open={it.title === firstBad} />)}</div>
            </div>
          )}
          {goodItems.length > 0 && (
            <div className="fb-group good">
              <div className="rs-sub"><span>よかった行動</span><span className="rs-n">{goodItems.length}</span><span className="sec-hint">タップで解説</span></div>
              <div className="items">{goodItems.map((it) => <FeedbackCard key={it.title} item={it} />)}</div>
            </div>
          )}
          <details className="memo">
            <summary><span>今回のメモ</span><span className="sec-hint">{infoItems.length}件</span></summary>
            <div className="items">{infoItems.map((it) => <FeedbackCard key={it.title} item={it} />)}</div>
          </details>
        </section>

        <aside className="rs-side">
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
            {bearLine}持ち物：{names}
            {p.best != null && !r.newRec ? '　｜　自己ベスト ' + (p.best / 1000).toFixed(2) + '秒' : ''}
          </p>
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
                    <span className="medal"><MedalIcon /></span>
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

          <details className="collection">
            <summary><span>バッジ一覧</span><span>{BADGES.filter((b) => p.badges[b.id]).length} / {BADGES.length}</span></summary>
            <ul className="badgelist">
              {BADGES.map((b) => (
                <li key={b.id}>
                  <span className={'medal' + (p.badges[b.id] ? '' : ' off')}><MedalIcon /></span>
                  <div>
                    <b>{p.badges[b.id] ? b.name : '？？？'}</b>
                    <span>{b.hint}{b.prog && !p.badges[b.id] ? '（' + b.prog(p) + '）' : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      {/* ---- bottom: what next ---- */}
      <footer className="startbar rs-actions">
        <button className="btn btn-plain btn-again" type="button" onClick={onAgain}>同じ山でもう一度</button>
        <button className="btn btn-primary btn-go" type="button" onClick={onNext}>次の山へ</button>
      </footer>
    </section>
  );
}
