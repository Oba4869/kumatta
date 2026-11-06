import { useEffect, useRef } from 'react';
import { TOOLS, type ToolId } from '../data/tools';
import { GameEngine, type EngineSetup } from '../game/engine';
import type { Outcome } from '../game/types';
import { TOOL_ICON } from './Icons';
import { RevealLayers, SwipeField } from './SwipeField';

interface Props {
  setup: EngineSetup;
  onDone: (o: Outcome) => void;
  onQuit: () => void;
}

/**
 * Full-screen 3D play view with an Identity V-style HUD.
 * This component renders the markup once; the 3D game then drives it frame by frame.
 * The parent gives it a new `key` for every run, so each run starts from fresh DOM.
 */
export default function PlayScreen({ setup, onDone, onQuit }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const hooks = useRef({ onDone, onQuit });
  hooks.current = { onDone, onQuit };

  useEffect(() => {
    if (!root.current) return;
    const engine = new GameEngine(root.current, setup, {
      onDone: (o) => hooks.current.onDone(o),
      onQuit: () => hooks.current.onQuit(),
    });
    engine.start();
    document.body.classList.add('playing');
    return () => {
      engine.destroy();
      document.body.classList.remove('playing');
    };
    // setup is fixed for the lifetime of this mount (a new run gets a new key)
  }, []);

  return (
    <div className="play g3" ref={root}>
      <div className="play-inner">
        <canvas id="g3d" aria-label="夜の森を進む3Dゲーム画面" />
        <div className="g3-vign" id="vign" aria-hidden="true" />
        <div className="g3-flash" id="flash" aria-hidden="true" />

        <div className="g3-hud">
          <div className="g3-meter g3-panel">
            <div className="row"><span className="lab">クマの警戒・興奮度</span><div className="bar" id="alertbar"><i /></div><span className="state st-none" id="stateLab">—</span></div>
            <div className="row"><span className="lab">追撃ゲージ</span><div className="bar" id="chasebar"><i /></div><span className="state dist" id="distLab">小屋まで —</span></div>
          </div>
          <div className="g3-map"><canvas id="minimap" aria-label="周辺マップ（上が向いている方向）" /></div>
          <div className="g3-compass g3-panel" id="compass"><i>▲</i><span>避難小屋</span></div>
          <div className="g3-wind g3-panel" id="swind" hidden><i>▲</i><span>風</span></div>
          <div id="advice" className="hint" aria-live="polite">避難小屋を目指せ</div>
          <div className="g3-heart" id="heart" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.2 4.5 2.6.3.5.9.5 1.2 0 .9-1.4 2.3-2.6 4.5-2.6 3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" /></svg>
          </div>
          <div className="g3-beardir" id="bearDir" aria-hidden="true"><i /></div>
          <div className="g3-cross" aria-hidden="true" />
          <div className="g3-prompt" id="prompt" hidden />
          <div className="g3-status g3-panel">
            <b>撃退スプレー</b><span id="spraypips" />
            <br /><span id="postureLab">防御姿勢：長押し</span>
          </div>
          <div className="g3-keys g3-panel">
            <kbd>マウス</kbd>視点 <kbd>WASD</kbd>移動 <kbd>Shift</kbd>走る<br />
            <kbd>Space</kbd>スプレー <kbd>E</kbd>防御 <kbd>V</kbd>視点切替
          </div>
          <div className="g3-top">
            <div className="g3-topbtns">
              <button className="g3-panel g3-help-btn" id="helpBtn" type="button" aria-label="操作方法">？</button>
              <button className="g3-panel g3-view" id="viewBtn" type="button">視点：一人称</button>
            </div>
            <div className="toolchips">
              {setup.tools.map((k: ToolId) => (
                <span key={k} className="toolchip" data-k={k} title={TOOLS[k].name}>{TOOL_ICON[k]}</span>
              ))}
              <button className="toolchip quit" id="quit" type="button" aria-label="やめてスタート画面にもどる">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="g3-touch">
          <div className="g3-stick" id="stick"><span className="stick-lab">移動</span><span className="stick-run">端まで倒すと走る</span><div id="knob" /></div>
          <div className="g3-tbtns">
            <button className="tb back" id="tBack" type="button" hidden>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v12M6 13l6 6 6-6" /></svg>後ずさり<small>長押し</small>
            </button>
            <button className="tb spray" id="tSpray" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="8" width="8" height="13" rx="2" /><path d="M9 8V5h4v3M17 6h3M17 9.5h4M17 3h3" /></svg>スプレー<small className="now">今！</small>
            </button>
            <button className="tb guard" id="tGuard" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /></svg>防御<small>長押し</small>
            </button>
          </div>
        </div>

        <div className="g3-help" id="help" hidden>
          <div className="g3-help-card g3-panel" role="dialog" aria-labelledby="helpTitle">
            <h2 id="helpTitle">操作方法</h2>
            <p className="rotate-tip"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="2" /><path d="M7 3.5c2-1 5-1 7 .5M13 2l1.2 2-2.2.6" /></svg>スマホは横向きにすると遊びやすい</p>
            <div className="ctl pc">
              <div><span className="k">マウス</span><p>見回す<small>画面をクリックすると視点が固定される（Esc で解除）</small></p></div>
              <div><span className="k">W A S D</span><p>移動<small>S で後ろに下がる＝後ずさり</small></p></div>
              <div><span className="k">Shift</span><p>走る<small>クマの前では絶対にしない</small></p></div>
              <div><span className="k">Space</span><p>撃退スプレー</p></div>
              <div><span className="k">E 長押し</span><p>防御姿勢</p></div>
              <div><span className="k">V</span><p>一人称／見下ろしの切替</p></div>
            </div>
            <div className="ctl sp">
              <div><span className="k ico">◎</span><p>左のスティック：移動<small>端まで倒すと走る（クマの前ではしない）</small></p></div>
              <div><span className="k ico">☝</span><p>画面をなぞる：見回す</p></div>
              <div><span className="k ico">↓</span><p>「後ずさり」長押し<small>クマに見られた時だけ出る。クマの方を向いたまま下がる</small></p></div>
              <div><span className="k ico">◆</span><p>「スプレー」「防御」<small>使う時に光る</small></p></div>
            </div>
            <ol className="rules">
              <li><b>見られたら</b>　走らず、目を逸らさず、ゆっくり後ずさり</li>
              <li><b>威嚇されたら</b>　数メートルまで引きつけてスプレー</li>
              <li><b>間に合わなければ</b>　防御姿勢で首を守る</li>
            </ol>
            <button className="btn btn-primary g3-help-ok" id="helpOk" type="button">森へ入る</button>
          </div>
        </div>

        {/* kept (hidden) because the call-out / tier reveal helper is built around it */}
        <div className="legacy" hidden aria-hidden="true"><SwipeField /></div>
        <div className="toast" id="toast" role="status" hidden />
        <div className="dim" id="dim"><span id="dimtext" /></div>
        <RevealLayers />
      </div>
    </div>
  );
}
