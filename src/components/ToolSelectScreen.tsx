import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { MAX_TOOLS, TOOLS, type ToolId } from '../data/tools';
import { useGame } from '../GameContext';
import { CheckIcon } from './Icons';
import bellImage from '../assets/tools/bell.png';
import radioImage from '../assets/tools/radio.png';
import sprayImage from '../assets/tools/spray.png';
import packImage from '../assets/tools/pack.png';
import helmetImage from '../assets/tools/helmet.png';
import StageArt from './StageArt';

const TOOL_IMAGE: Record<ToolId, string> = {
  bell: bellImage,
  radio: radioImage,
  spray: sprayImage,
  pack: packImage,
  helmet: helmetImage,
};
export default function ToolSelectScreen() {
  const navigate = useNavigate();
  const { setup, picked, setPicked, startRun } = useGame();
  const [full, setFull] = useState(false);
  const [info, setInfo] = useState<ToolId | null>(null);
  const toolRefs = useRef<Partial<Record<ToolId, HTMLButtonElement | null>>>({});

  if (!setup) return null; // guarded by the route wrapper
  const { base, wx, offer } = setup;

  const toggle = (k: ToolId) => {
    setInfo(k);
    if (picked.includes(k)) { setPicked(picked.filter((x) => x !== k)); setFull(false); return; }
    if (picked.length >= MAX_TOOLS) {
      /* replay the little shake on the card the player tried to add */
      const b = toolRefs.current[k];
      if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      setFull(true);
      return;
    }
    setPicked([...picked, k]);
  };

  const ready = picked.length >= MAX_TOOLS;
  const sub = full && ready ? '持てるのは' + MAX_TOOLS + 'つまで。' : MAX_TOOLS + 'つまで選択。';

  return (
    <main className="scr scr-tools">
      <StageArt id={base.id} className="scr-bg blurred" />
      <div className="scr-shade" />

      <header className="scr-head">
        <button className="scr-back" type="button" aria-label="山の選択へ戻る" onClick={() => navigate('/stages')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <h1 id="toolsTitle">持ち物を選ぶ</h1>
        <span className="scr-chip">{base.short + (wx ? '・' + wx.name : '')} 難易度 {diffStars(base.diff)}</span>
      </header>

      <div className="tools-body">
        <p className={'scr-sub' + (full ? ' warn' : '')} aria-live="polite">{sub}</p>

        <div className="mtools" role="group" aria-labelledby="toolsTitle">
          {offer.map((k) => {
            const on = picked.includes(k);
            return (
              <button
                key={k}
                ref={(el) => { toolRefs.current[k] = el; }}
                type="button"
                className={'mtool' + (on ? ' on' : '') + (!on && ready ? ' dim' : '')}
                aria-pressed={on}
                aria-label={TOOLS[k].name + '。' + TOOLS[k].desc}
                onClick={() => toggle(k)}
              >
                <span className="mchk" aria-hidden="true"><CheckIcon /></span>
                <span className="mti">{TOOL_ICON[k]}</span>
                <span className="mti"><img src={TOOL_IMAGE[k]} alt="" aria-hidden="true" draggable={false} /></span>
                <span className="mtn">{TOOLS[k].name}</span>
              </button>
            );
          })}
        </div>

        <p className="tool-desc" aria-live="polite">{info ? TOOLS[info].eff + '。' + TOOLS[info].desc : ' '}</p>
      </div>

      <footer className="scr-foot">
        <button className="mbtn go" type="button" onClick={startRun} disabled={!ready}>
          <span>プレイ開始</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
        </button>
      </footer>
    </main>
  );
}
