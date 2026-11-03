import { useState } from 'react';
import { useNavigate } from 'react-router';
import HeroScene from './HeroScene';

export default function TitleScreen() {
  const navigate = useNavigate();
  const [howto, setHowto] = useState(false);

  return (
    <main className="scr scr-title">
      <HeroScene />
      <div className="scr-shade" />

      <div className="title-box">
        <h1 className="logo">
          くまった！
          <small>― クマからの避難 ―</small>
        </h1>

        <nav className="menu" aria-label="メニュー">
          <button className="mbtn primary" type="button" onClick={() => navigate('/stages')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
            <span>はじめる</span>
          </button>
          <button className="mbtn" type="button" onClick={() => setHowto(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" /></svg>
            <span>あそびかた</span>
          </button>
          <a className="bear-info" href="https://www.env.go.jp/nature/choju/effort/effort12/" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3h7v7M21 3L10 14M10 5H4v16h16v-6" /></svg>
            クマ情報
          </a>
        </nav>
      </div>

      {howto && (
        <div className="scr-modal" role="dialog" aria-modal="true" aria-labelledby="howtoTitle" onClick={() => setHowto(false)}>
          <div className="scr-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2 id="howtoTitle">あそびかた</h2>
            <ol className="mhow">
              <li><b>1</b><span>夜の森を抜けて<strong>避難小屋</strong>へ。マウス（スマホは画面をドラッグ）で見回し、WASD（スマホは左スティック）で進む。心臓の音が速くなったら、クマが近い。</span></li>
              <li><b>2</b><span>クマにこちらを見られたら、<strong>走らず、目を逸らさず</strong>、クマを画面に捉えたまま <strong>S でゆっくり後ずさり</strong>。背中を見せたり走ったりすると突進される。</span></li>
              <li><b>3</b><span>立ち上がって<strong>威嚇</strong>してきたら、数メートルまで引きつけて<strong>スプレー</strong>（Space）。間に合わなければ<strong>防御姿勢</strong>（E 長押し）で首を守る。</span></li>
            </ol>
            <button className="mbtn" type="button" autoFocus onClick={() => setHowto(false)}>とじる</button>
          </div>
        </div>
      )}
    </main>
  );
}
