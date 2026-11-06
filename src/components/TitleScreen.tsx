import { useState } from 'react';
import { useNavigate } from 'react-router';
import HeroScene from './HeroScene';
import wordmark from '../assets/kumatta-wordmark.svg';

export default function TitleScreen() {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'howto' | 'bear' | null>(null);

  return (
    <main className="scr scr-title">
      <HeroScene />
      <div className="scr-shade" />

      <div className="title-box">
        <h1 className="logo">
          <img className="logo-wordmark" src={wordmark} alt="くまった！" />
          <small>― クマからの避難 ―</small>
        </h1>

        <nav className="menu" aria-label="メニュー">
          <button className="mbtn primary" type="button" onClick={() => navigate('/stages')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
            <span>はじめる</span>
          </button>
          <button className="mbtn" type="button" onClick={() => setDialog('howto')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" /></svg>
            <span>あそびかた</span>
          </button>
          <button className="mbtn" type="button" onClick={() => navigate('/dex?section=profile', { state: { fromMenu: true } })}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
            <span>図鑑・きろく</span>
          </button>
          <button className="mbtn" type="button" onClick={() => setDialog('bear')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6M14 3h7v7m0-7L10 14" /></svg>
            <span>くま情報</span>
          </button>
        </nav>
      </div>

      {dialog && (
        <div className="scr-modal" role="dialog" aria-modal="true" aria-labelledby="titleDialogHeading" onClick={() => setDialog(null)} onKeyDown={(e) => { if (e.key === 'Escape') setDialog(null); }}>
          <div className="scr-modal-panel" onClick={(e) => e.stopPropagation()}>
            <h2 id="titleDialogHeading">{dialog === 'howto' ? 'あそびかた' : 'くま情報'}</h2>
            {dialog === 'howto' ? <ol className="mhow">
              <li><b>1</b><span>夜の森を抜けて<strong>避難小屋</strong>へ。マウス（スマホは画面をドラッグ）で見回し、WASD（スマホは左スティック）で進む。心臓の音が速くなったら、クマが近い。</span></li>
              <li><b>2</b><span>クマにこちらを見られたら、<strong>走らず、目を逸らさず</strong>、クマを画面に捉えたまま <strong>S でゆっくり後ずさり</strong>。背中を見せたり走ったりすると突進される。</span></li>
              <li><b>3</b><span>立ち上がって<strong>威嚇</strong>してきたら、数メートルまで引きつけて<strong>スプレー</strong>（Space）。間に合わなければ<strong>防御姿勢</strong>（E 長押し）で首を守る。</span></li>
            </ol> : <ul className="mhow">
              <li>ゲームにはヒグマとツキノワグマが登場します。</li>
              <li>ゲーム中はクマが近づくと心臓の音が速くなります。クマの位置を確かめながら、避難小屋を目指しましょう。</li>
            </ul>}
            <button className="mbtn" type="button" autoFocus onClick={() => setDialog(null)}>とじる</button>
          </div>
        </div>
      )}
    </main>
  );
}
