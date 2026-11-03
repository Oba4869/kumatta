import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { MAX_TOOLS, TOOLS, type ToolId } from '../data/tools';
import { useGame } from '../GameContext';
import { CheckIcon } from './Icons';
import { RadioArt, HelmetArt } from './EquipmentArt';
import campsite from '../assets/equipment/campsite-background.png';
import backpack from '../assets/equipment/backpack.png';
import bearBell from '../assets/equipment/bear-bell.png';
import bearSpray from '../assets/equipment/bear-spray.png';

const TOOL_IMAGE: Partial<Record<ToolId, string>> = { pack: backpack, bell: bearBell, spray: bearSpray };

export default function ToolSelectScreen() {
  const navigate = useNavigate();
  const { setup, picked, setPicked, startRun } = useGame();
  const [full, setFull] = useState(false);
  const [info, setInfo] = useState<ToolId | null>(null);
  const toolRefs = useRef<Partial<Record<ToolId, HTMLButtonElement | null>>>({});

  if (!setup) return null; // guarded by the route wrapper
  const { offer } = setup;

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


  return (
    <main className="scr scr-tools equipment-screen">
      <div className="equipment-background" style={{ backgroundImage: `url(${campsite})` }} aria-hidden="true" />
      <div className="equipment-layout">
        <header className="equipment-heading">
          <button className="equipment-back" type="button" aria-label="山の選択へ戻る" onClick={() => navigate('/stages')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <div><h1 id="toolsTitle">持ち物を選ぶ</h1><span>EQUIPMENT</span></div>
        </header>
        <p className={'equipment-instruction' + (full ? ' warn' : '')} aria-live="polite">
          {full && ready ? <>持てるのは <strong>{MAX_TOOLS}つまで</strong>。</> : <>役立つ道具を <strong>{MAX_TOOLS}つまで</strong>選んで、出発しよう。</>}
        </p>
        <div className="equipment-cards" role="group" aria-labelledby="toolsTitle">
          {offer.map(k => {
            const on = picked.includes(k);
            return <button key={k} ref={el => { toolRefs.current[k] = el; }} type="button"
              className={'equipment-card' + (on ? ' selected' : '')}
              aria-pressed={on} aria-label={TOOLS[k].name + '。' + TOOLS[k].desc} onClick={() => toggle(k)}>
              <span className="equipment-check" aria-hidden="true"><CheckIcon /></span>
              <span className={'equipment-item equipment-item-' + k}>
                {TOOL_IMAGE[k] ? <img src={TOOL_IMAGE[k]} alt="" draggable={false} /> : k === 'radio' ? <RadioArt /> : <HelmetArt />}
              </span>
              <span className="equipment-name">{TOOLS[k].name}</span>
            </button>;
          })}
        </div>
        <p className="sr-only" aria-live="polite">{info ? TOOLS[info].eff + '。' + TOOLS[info].desc : ''}</p>
        <div className={'equipment-start-frame' + (ready ? ' ready' : '')}>
        <button className={'equipment-start' + (ready ? ' ready' : '')} type="button" onClick={startRun} disabled={!ready}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 3 16 9L6 21Z" /></svg>
          <span>プレイ開始</span>
        </button>
        </div>
      </div>
    </main>
  );
}
