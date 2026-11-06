import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import DexScreen from './components/DexScreen';
import PlayScreen from './components/PlayScreen';
import RotateNotice from './components/RotateNotice';
import ResultScreen from './components/ResultScreen';
import StageSelectScreen from './components/StageSelectScreen';
import TitleScreen from './components/TitleScreen';
import ToolSelectScreen from './components/ToolSelectScreen';
import { GameProvider, useGame } from './GameContext';

/** Title, stage select and tool select fill the whole screen; the other screens sit in the framed .app. */
const FULLSCREEN = ['/', '/stages', '/tools'];

const SoundIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {on ? <path className="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path className="mute" d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>
);

/** Common frame: top bar + footer around the in-game screens. */
function Layout() {
  const { sound, toggleSound } = useGame();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (FULLSCREEN.includes(pathname)) {
    return (
      <>
        <Outlet />
        <button className={'scr-sound' + (sound ? ' on' : '')} type="button" aria-pressed={sound} aria-label="効果音" title={sound ? '効果音：オン（押すとオフ）' : '効果音：オフ（押すとオン）'} onClick={toggleSound}>
          <SoundIcon on={sound} />
          <span aria-hidden="true">{sound ? 'オン' : 'オフ'}</span>
        </button>
      </>
    );
  }

  return (
    <div className="app">
      <div className="top">
        <span className="brand">くまった</span>
        <div className="top-actions">
          {pathname !== '/dex' && <button className="iconbtn" type="button" onClick={() => navigate('/dex')}>図鑑</button>}
          <button className={'iconbtn snd' + (sound ? ' on' : '')} type="button" aria-pressed={sound} aria-label="効果音" title={sound ? '効果音：オン（押すとオフ）' : '効果音：オフ（押すとオン）'} onClick={toggleSound}>
            <SoundIcon on={sound} />
            <span className="snd-state" aria-hidden="true">{sound ? 'オン' : 'オフ'}</span>
          </button>
        </div>
      </div>

      <Outlet />

      <p className="foot">本州・四国はツキノワグマ、北海道はヒグマを想定しています。解説は環境省・林野庁・自治体の資料に基づいています。</p>
    </div>
  );
}

/* Route wrappers: read the shared state and redirect if a screen is opened out of order (e.g. by reload). */

function ToolsRoute() {
  const { setup } = useGame();
  return setup ? <ToolSelectScreen /> : <Navigate to="/stages" replace />;
}

function PlayRoute() {
  const { play, finishRun } = useGame();
  const navigate = useNavigate();
  if (!play) return <Navigate to="/" replace />;
  return <PlayScreen key={play.key} setup={play.engine} onDone={finishRun} onQuit={() => navigate('/tools', { replace: true })} />;
}

function ResultRoute() {
  const { last, play, startRun } = useGame();
  const navigate = useNavigate();
  if (!last) return <Navigate to="/" replace />;
  return (
    <ResultScreen
      key={play?.key}
      outcome={last.outcome}
      result={last.result}
      onAgain={startRun}
      onNext={() => navigate('/stages')}
      onDex={() => navigate('/dex')}
    />
  );
}

function DexRoute() {
  const { profile } = useGame();
  const navigate = useNavigate();
  return <DexScreen profile={profile} onBack={() => navigate(-1)} />;
}

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TitleScreen />} />
          <Route path="stages" element={<StageSelectScreen />} />
          <Route path="tools" element={<ToolsRoute />} />
          <Route path="play" element={<PlayRoute />} />
          <Route path="result" element={<ResultRoute />} />
          <Route path="dex" element={<DexRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <RotateNotice />
    </GameProvider>
  );
}
