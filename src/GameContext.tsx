import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Condition } from './data/conditions';
import { lvInfo } from './data/levels';
import type { ToolId } from './data/tools';
import type { EngineSetup } from './game/engine';
import { drawStage } from './game/run';
import { scoreRun, type RunResult } from './game/scoring';
import { applyWeather, type Outcome, type RunSetup } from './game/types';
import { loadProfile, saveProfile, type Profile } from './lib/profile';
import { audio, setSoundOn } from './lib/sound';

interface Game {
  profile: Profile;
  setup: RunSetup | null;
  picked: ToolId[];
  setPicked: (tools: ToolId[]) => void;
  play: { key: number; engine: EngineSetup } | null;
  last: { outcome: Outcome; result: RunResult } | null;
  sound: boolean;
  toggleSound: () => void;
  selectStage: (id: Condition['id']) => void;
  startRun: () => void;
  finishRun: (outcome: Outcome) => void;
}

const GameContext = createContext<Game | null>(null);

export const useGame = () => {
  const g = useContext(GameContext);
  if (!g) throw new Error('useGame must be used inside <GameProvider>');
  return g;
};

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [setup, setSetup] = useState<RunSetup | null>(null);
  const [picked, setPicked] = useState<ToolId[]>([]);
  const [play, setPlay] = useState<Game['play']>(null);
  const [last, setLast] = useState<Game['last']>(null);
  const [sound, setSound] = useState(true);

  const selectStage = (id: Condition['id']) => {
    setSetup(drawStage(profile, id));
    setPicked([]);
  };

  /** Starts (or restarts) a walk with the current mountain and tools. */
  const startRun = () => {
    if (!setup) { navigate('/stages'); return; }
    audio(); /* this tap unlocks sound on phones, before the game's first sound */
    setPlay((prev) => ({
      key: (prev?.key ?? 0) + 1,
      engine: { cond: applyWeather(setup), wx: setup.wx?.id ?? null, tools: picked, level: lvInfo(profile.xp).l, knownDex: profile.dex },
    }));
    navigate('/play');
  };

  const finishRun = (outcome: Outcome) => {
    const result = scoreRun(profile, outcome);
    saveProfile(result.profile);
    setProfile(result.profile);
    setLast({ outcome, result });
    navigate('/result', { replace: true });
  };

  const toggleSound = () => {
    setSound((s) => {
      setSoundOn(!s);
      return !s;
    });
  };

  return (
    <GameContext.Provider value={{ profile, setup, picked, setPicked, play, last, sound, toggleSound, selectStage, startRun, finishRun }}>
      {children}
    </GameContext.Provider>
  );
}
