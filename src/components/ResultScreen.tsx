import { useEffect, useRef, useState } from 'react';
import { dexEntry } from '../data/dex';
import { REWARDS } from '../data/levels';
import { SRC } from '../data/sources';
import { buildFeedback } from '../game/feedback';
import { RANK_LABEL, RANK_LINE, type RunResult } from '../game/scoring';
import type { Outcome } from '../game/types';
import { sfx } from '../lib/sound';
import StageArt from './StageArt';
import './ResultScreen.css';

interface Props {
  review?: boolean;
  onReview: () => void;
  onResult: () => void;
  outcome: Outcome;
  result: RunResult;
  onAgain: () => void;
  onNext: () => void;
  onDex: () => void;
}
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function BookIcon() {
  return <svg viewBox="0 0 48 44" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true"><path d="M24 9C17 3 9 3 3 5v32c8-2 15-1 21 4 6-5 13-6 21-4V5C37 3 31 3 24 9Z"/><path d="M24 9v32"/></svg>;
}
function AwardIcon() {
  return <svg viewBox="0 0 48 52" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m24 3 6 3 6 1 2 6 4 5-2 7v6l-6 3-4 5-7-1-6 1-4-5-6-3v-7l-2-6 4-5 2-6 7-1Z"/><path d="m13 35-4 15 9-4 5 5 2-13m5-1 5 14 4-6 7 3-5-17M24 12l3 6 6 1-5 5 1 6-5-3-6 3 1-6-5-5 7-1Z"/></svg>;
}
function ExternalIcon() {
  return <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h9v9M25 3 12 16M11 6H4v19h19v-7"/></svg>;
}
function RetreatDiagram() {
  return <svg className="report-diagram" viewBox="0 0 570 270" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="クマを見ながら、ゆっくり後退する人の図">
    <g className="diagram-lines"><path d="M83 39c0-16 11-28 27-28 17 0 27 12 27 28s-11 28-27 28c-15 0-27-12-27-28Z"/><path d="M73 39h78M108 11v27h47M92 76l35 3 2 80 28 94h-25l-35-75-12 75H62l22-101 5-55M112 93l-1 65M86 83l-22 3-9 62 22 4"/>
    <path d="M350 116 Q356 106 365 103 L372 91 Q372 80 380 80 L387 82 Q391 72 404 72 Q426 59 448 63 Q463 56 479 62 Q499 62 510 71 Q535 75 546 92 Q562 112 561 139 L558 171 Q554 182 551 188 L565 226 Q565 230 559 230 H534 L522 212 L515 193 Q506 207 506 226 Q506 231 499 231 H473 Q468 230 473 222 L482 204 L484 188 Q463 190 448 181 L436 206 L436 230 H405 Q400 230 405 221 L413 207 L413 181 Q398 173 390 160 L366 156 L342 143 Q332 137 339 129 Z"/>
    <path d="M154 55 339 88" strokeDasharray="3 12"/>
    </g><path d="M39 210H4m0 0 15-15M4 210l15 15" stroke="#b8f30b" strokeWidth="7"/>
  </svg>;
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

export default function ResultScreen({ outcome: o, result: r, onAgain, onNext, review = false, onReview, onResult }: Props) {
  const missions = [
    { label: '避難小屋に到着', ok: !!o.escaped },
    { label: 'クマの前で走らなかった', ok: !o.ran && !o.ranCharge },
    { label: 'クマから目を逸らさなかった', ok: !(o.lookAways > 0) },
  ];
  const allClear = missions.every(x => x.ok);
  const { box, fire } = useConfetti();
  const [xpPct, setXpPct] = useState(r.before.pct);
  const [xpAnimate, setXpAnimate] = useState(true);
  const [lvShown, setLvShown] = useState(r.before);
  const [lvUp, setLvUp] = useState<string | null>(null);

  /* XP bar fills, rolls over on level-up, then celebrates. */
  useEffect(() => {
    if (review) return;
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


  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const feedback = buildFeedback(o);
  const orderedFeedback = [...feedback.filter(f => f.kind === 'bad'), ...feedback.filter(f => f.kind === 'good'), ...feedback.filter(f => f.kind === 'info')];
  const current = orderedFeedback[feedbackIndex] ?? orderedFeedback[0];
  const countMatch = current?.title.match(/[（(](\d+)回[）)]/);
  const issueTitle = current?.title.replace(/[（(]\d+回[）)]/, '');
  const sentences = current?.text.match(/[^。！？]+[。！？]?/g) ?? [];
  const freshDex = r.freshDex.map(dexEntry).filter(d => d != null);
  const weather = o.cond.wxs?.find(w => w.id === o.wx);
  const place = o.cond.name + (weather && weather.id !== 'clear' ? '・' + weather.name : '');
  const time = o.escaped ? (o.time == null ? '—' : Math.round(o.time / 1000) + '秒') : (o.reaction == null ? '—' : (o.reaction / 1000).toFixed(2) + '秒');
  const switchFeedback = (step: number) => setFeedbackIndex(i => (i + step + orderedFeedback.length) % orderedFeedback.length);

  return <main className={'descent-report ' + (review ? 'descent-review' : 'descent-summary')}>
    <div className="descent-background" aria-hidden="true"><StageArt id="fog" /></div>
    <div className="descent-canvas">
      {!review && <>
        <button className="descent-back" type="button" aria-label="山の選択へ戻る" onClick={onNext}>‹</button>
        <section className="descent-verdict" aria-labelledby="descentTitle">
          <h1 id="descentTitle">{o.escaped ? '下山成功' : RANK_LABEL[r.rank]}</h1>
          <p>{o.escaped ? '落ち着いて行動できた' : RANK_LINE[r.rank].replace('下の', '次の')}</p>
        </section>
        <div className="descent-rank" role="img" aria-label={r.rank + 'ランク'}>
          <svg viewBox="0 0 150 150" aria-hidden="true"><circle className="rank-track" cx="75" cy="75" r="65"/><circle className="rank-accent" cx="75" cy="75" r="65"/><text x="75" y="78" dominantBaseline="central" textAnchor="middle">{r.rank}</text></svg>
          <div className="confetti" ref={box} aria-hidden="true" />
        </div>
        <ul className="descent-missions" aria-label="今回の目標">{missions.slice(0, 2).map(m => <li key={m.label}><span className={m.ok ? 'mission-check' : 'mission-miss'} aria-label={m.ok ? '達成' : '未達成'}>{m.ok ? '✓' : '×'}</span>{m.label}</li>)}</ul>
        <div className="descent-divider" />
        <section className="descent-growth" aria-label="獲得経験値とレベル">
          <p className="descent-xp">+{r.gain} <span>XP</span></p>
          <p className="descent-level">Lv.{lvShown.l} {lvShown.title}</p>
          <div className="descent-xpbar" role="progressbar" aria-label="レベルの進み具合" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpPct)}><i style={{ width: xpPct + '%', transition: xpAnimate ? undefined : 'none' }} /></div>
          {lvUp && <p className="descent-levelup" role="status">{lvUp}</p>}
        </section>
        <div className="descent-rewards" aria-label="今回の獲得記録">
          <div className="descent-reward-row"><AwardIcon /><div>{r.freshBadges.length ? r.freshBadges.map(b => <p key={b.id}>{b.name}</p>) : <p className="reward-empty">新しいバッジなし</p>}</div></div>
          <div className="descent-reward-row"><BookIcon /><div>{freshDex.length ? freshDex.map(d => <p key={d.id}>図鑑登録 {d.name} <span className="descent-star" aria-label={'レア度' + d.star}>{'★'.repeat(d.star)}</span></p>) : <p className="reward-empty">新しい図鑑登録なし</p>}</div></div>
        </div>
        <p className="descent-run-meta">{place}・{time}・やり過ごし {o.stops}/{o.rustles}</p>
        <button className="descent-button descent-next" type="button" onClick={onReview}>次へ <span className="descent-orange" aria-hidden="true">→</span></button>
      </>}
      {review && <>
        <header className="descent-review-heading"><h1>ふりかえり</h1><p>次は、ここを意識しよう。</p></header>
        <div className="descent-review-rule" />
        {current && <article className={'descent-feedback ' + current.kind} aria-live="polite">
          <h2><svg className="descent-warning" viewBox="0 0 54 50" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{current.kind === 'bad' ? <><path d="M27 3 51 46H3Z"/><path d="M27 18v12m0 8v1"/></> : <path d="m7 27 13 13L47 9"/>}</svg><span>{issueTitle}</span>{countMatch && <span className="descent-count">{countMatch[1]}回</span>}</h2>
          <div className="descent-explanation"><p className="descent-advice">{sentences[0]}</p>{sentences.length > 1 && <p className="descent-reason">{sentences.slice(1).join('')}</p>}</div>
          <button className="descent-details" type="button" onClick={() => detailDialog.current?.showModal()}>詳しく見る <ExternalIcon /></button>
        </article>}
        <RetreatDiagram />

        <div className="descent-review-actions"><button className="descent-button descent-again" type="button" onClick={onAgain}><svg className="descent-orange" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 5-9 7 9 7M12 12h13a16 16 0 1 1-16 19"/></svg>もう一度プレイ</button><button className="descent-button descent-map" type="button" onClick={onNext}>山を選ぶ</button></div>
      </>}
      <button className="descent-page" type="button" onClick={review ? onResult : onReview} aria-label={review ? '結果画面へ戻る' : 'ふりかえりへ進む'}>{review ? '2 / 2' : '1 / 2'}</button>

    </div>
    <dialog className="descent-detail-dialog" ref={detailDialog} aria-label="ふりかえりの詳細" onClick={e => { if (e.target === detailDialog.current) detailDialog.current?.close(); }}>
      <button className="descent-detail-close" type="button" onClick={() => detailDialog.current?.close()} aria-label="詳細を閉じる">×</button>
      <h2>{current?.title}</h2><p>{current?.text}</p>{current?.src && <cite>出典：{SRC[current.src]}</cite>}
        {orderedFeedback.length > 1 && <nav className="descent-feedback-nav" aria-label="ほかのふりかえり"><button type="button" onClick={() => switchFeedback(-1)} aria-label="前のふりかえり">‹</button><span>{feedbackIndex + 1} / {orderedFeedback.length}</span><button type="button" onClick={() => switchFeedback(1)} aria-label="次のふりかえり">›</button></nav>}
      <h3>今回の目標</h3><ul>{missions.map(m => <li key={m.label}>{m.ok ? '✓' : '×'} {m.label}</li>)}</ul>
    </dialog>
  </main>;
}
