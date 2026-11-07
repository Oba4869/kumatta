import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CONDS, diffStars } from '../data/conditions';
import { useGame } from '../GameContext';
import StageArt from './StageArt';

export default function StageSelectScreen() {
  const navigate = useNavigate();
  const { selectStage } = useGame();
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const cond = CONDS[i];

  const move = (d: number) => setI((n) => (n + d + CONDS.length) % CONDS.length);
  const choose = () => { selectStage(cond.id); navigate('/tools'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main
      className="scr scr-stage"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
      }}
    >
      <StageArt key={'bg' + cond.id} id={cond.id} className="scr-bg blurred" />
      <div className="scr-shade" />

      <header className="scr-head">
        <button className="scr-back" type="button" aria-label="タイトルへ戻る" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1>山を選ぶ</h1>
      </header>

      <div className="stage-body">
        <button className="arrow" type="button" aria-label="前の山" onClick={() => move(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4L7 12l9 8z" /></svg>
        </button>

        <article className="stage-card" key={cond.id} aria-live="polite">
          {/* the picture sits inset in the card; the card's corners carry the bracket frame (design by 小林さん) */}
          <div className="stage-preview">
            <StageArt id={cond.id} className="stage-art" animated />
            <div className="stage-top">
              <h2>{cond.name}</h2>
              <span className="stage-diff" aria-label={'難易度 4段階中' + cond.diff}>難易度 <span className="stage-stars" aria-hidden="true">{diffStars(cond.diff)}</span></span>
            </div>
            <p className="stage-desc">{cond.desc}</p>
          </div>
        </article>

        <button className="arrow" type="button" aria-label="次の山" onClick={() => move(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4l9 8-9 8z" /></svg>
        </button>
      </div>

      <div className="dots" role="tablist" aria-label="山の一覧">
        {CONDS.map((c, n) => (
          <button key={c.id} type="button" role="tab" aria-selected={n === i} aria-label={c.short} className={n === i ? 'on' : ''} onClick={() => setI(n)} />
        ))}
      </div>

      <footer className="scr-foot">
        <button className="mbtn go" type="button" onClick={choose}>
          <span>この山にする</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
        </button>
      </footer>
    </main>
  );
}
