import { useState } from 'react';
import DexScreen from './components/DexScreen';
import PlayScreen from './components/PlayScreen';
import ResultScreen from './components/ResultScreen';
import StartScreen from './components/StartScreen';
import { lvInfo } from './data/levels';
import type { ToolId } from './data/tools';
import type { EngineSetup } from './game/engine';
import { drawRun } from './game/run';
import { scoreRun, type RunResult } from './game/scoring';
import { applyWeather, type Outcome, type RunSetup } from './game/types';
import { loadProfile, saveProfile, type Profile } from './lib/profile';
import { setSoundOn } from './lib/sound';

type Screen = 'start' | 'play' | 'result' | 'dex';

/** First mountain: drawn once when the app opens. */
const initial = () => {
  const r = drawRun(loadProfile(), null);
  saveProfile(r.profile);
  return r;
};

export default function App() {
  const [first] = useState(initial);
  const [profile, setProfile] = useState<Profile>(first.profile);
  const [setup, setSetup] = useState<RunSetup>(first.setup);
  const [picked, setPicked] = useState<ToolId[]>([]);
  const [screen, setScreen] = useState<Screen>('start');
  const [beforeDex, setBeforeDex] = useState<Screen>('start');
  const [play, setPlay] = useState<{ key: number; engine: EngineSetup } | null>(null);
  const [last, setLast] = useState<{ outcome: Outcome; result: RunResult } | null>(null);
  const [sound, setSound] = useState(true);

  const go = (to: Screen) => {
    setScreen(to);
    window.scrollTo(0, 0);
  };

  /** Starts (or restarts) a walk with the current mountain and tools. */
  const startRun = () => {
    setPlay((prev) => ({
      key: (prev?.key ?? 0) + 1,
      engine: { cond: applyWeather(setup), wx: setup.wx?.id ?? null, tools: picked, level: lvInfo(profile.xp).l, knownDex: profile.dex },
    }));
    go('play');
  };

  const finishRun = (outcome: Outcome) => {
    const result = scoreRun(profile, outcome);
    saveProfile(result.profile);
    setProfile(result.profile);
    setLast({ outcome, result });
    go('result');
  };

  const nextMountain = () => {
    const r = drawRun(profile, setup.base.id);
    saveProfile(r.profile);
    setProfile(r.profile);
    setSetup(r.setup);
    setPicked([]);
    go('start');
  };

  const openDex = () => {
    setBeforeDex(screen);
    go('dex');
  };

  const toggleSound = () => {
    setSound((s) => {
      setSoundOn(!s);
      return !s;
    });
  };

  return (
    <div className="app">
      <div className="top">
        <span className="brand">くまった</span>
        <div className="top-actions">
          {screen !== 'dex' && <button className="iconbtn" type="button" onClick={openDex}>図鑑</button>}
          <button className={'iconbtn snd' + (sound ? ' on' : '')} type="button" aria-pressed={sound} aria-label="効果音" title={sound ? '効果音：オン（押すとオフ）' : '効果音：オフ（押すとオン）'} onClick={toggleSound}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
              {sound ? <path className="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path className="mute" d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
            <span className="snd-state" aria-hidden="true">{sound ? 'オン' : 'オフ'}</span>
          </button>
        </div>
      </div>

      {screen === 'start' && (
        <StartScreen profile={profile} setup={setup} picked={picked} onPick={setPicked} onGo={startRun} onDex={openDex} />
      )}
      {screen === 'play' && play && <PlayScreen key={play.key} setup={play.engine} onDone={finishRun} onQuit={() => go('start')} />}
      {/* kept mounted while the field guide is open, so coming back does not replay the result animations */}
      {last && (screen === 'result' || (screen === 'dex' && beforeDex === 'result')) && (
        <div hidden={screen !== 'result'}>
          <ResultScreen key={play?.key} outcome={last.outcome} result={last.result} onAgain={startRun} onNext={nextMountain} onDex={openDex} />
        </div>
      )}
      {screen === 'dex' && <DexScreen profile={profile} onBack={() => go(beforeDex)} />}

      <p className="foot">本州・四国はツキノワグマ、北海道はヒグマを想定しています。解説は環境省・林野庁・自治体の資料に基づいています。</p>
    </div>
  );
}
