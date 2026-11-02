import { useRef, useState } from 'react';
import { diffStars } from '../data/conditions';
import { MAX_TOOLS, TOOLS, type ToolId } from '../data/tools';
import type { RunSetup } from '../game/types';
import type { Profile } from '../lib/profile';
import HeroScene from './HeroScene';
import PlayerCard from './PlayerCard';
import { COND_ICON, CheckIcon, TOOL_ICON } from './Icons';

interface Props {
  profile: Profile;
  setup: RunSetup;
  picked: ToolId[];
  onPick: (tools: ToolId[]) => void;
  onGo: () => void;
  onDex: () => void;
}

/** The three moves of the game, shown next to the start button. */
const MOVES = [
  {
    label: '見回す',
    pc: 'マウス',
    sp: '画面をなぞる',
    icon: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  },
  {
    label: '動く',
    pc: 'WASD',
    sp: 'スティック',
    icon: <><path d="M8 4.5c1.6 0 2.4 1.6 2.4 3.6S9.6 12 8 12s-2.4-1.9-2.4-3.9S6.4 4.5 8 4.5zM16 11c1.6 0 2.4 1.6 2.4 3.6S17.6 18.5 16 18.5s-2.4-1.9-2.4-3.9S14.4 11 16 11z" /><path d="M6.6 14.5h2.8M14.6 21h2.8" /></>,
  },
  {
    label: 'クマを見たまま下がる',
    pc: 'S',
    sp: '後ずさり',
    icon: <><path d="M12 3v11M7.5 9.5L12 14l4.5-4.5" /><path d="M5 20h14" /></>,
  },
];

export default function StartScreen({ profile, setup, picked, onPick, onGo, onDex }: Props) {
  const [full, setFull] = useState(false);
  const toolRefs = useRef<Partial<Record<ToolId, HTMLButtonElement | null>>>({});
  const { base, wx, offer } = setup;

  const toggle = (k: ToolId) => {
    if (picked.includes(k)) { onPick(picked.filter((x) => x !== k)); setFull(false); return; }
    if (picked.length >= MAX_TOOLS) {
      /* replay the little shake on the card the player tried to add */
      const b = toolRefs.current[k];
      if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      setFull(true);
      return;
    }
    onPick([...picked, k]);
  };

  const left = MAX_TOOLS - picked.length;
  const ready = left <= 0;
  const countLabel = full && ready ? '持てるのは' + MAX_TOOLS + 'つまで' : ready ? '準備OK' : 'あと' + left + 'つ';
  const goHint = ready ? '持ち物：' + picked.map((k) => TOOLS[k].name).join('・') : '道具をあと' + left + 'つ選ぶと出発できます';

  const today = new Date();
  const dateLabel = today.getMonth() + 1 + '月' + today.getDate() + '日';

  return (
    <section className="panel start" aria-labelledby="startTitle">
      <div className="st-hero">
        <HeroScene />
        <div className="st-hero-text">
          <h1 id="startTitle">走りたくなる、<br />その一瞬をこらえろ。</h1>
          <p className="lead">夜の森でクマに出会ったとき、正しく動けるかを試すサバイバルゲーム</p>
        </div>
      </div>

      {/* the trail-entry form: everything about *this* walk lives on it */}
      <div className="permit" aria-label="入山届">
        <div className="permit-band">
          <span className="permit-title">入山届</span>
          <span className="permit-date">{dateLabel}</span>
        </div>

        <div className="permit-row st-mountain">
          <h2 className="permit-h">今日の山</h2>
          <div className="cond" aria-live="polite">
            <span className="cicon" aria-hidden="true">{COND_ICON[base.id]}</span>
            <div className="ctext">
              <b>{base.name + (wx ? '・' + wx.name : '')}</b>
              <span className="cdiff" aria-label={'難易度 4段階中' + base.diff}>難易度 {diffStars(base.diff)}</span>
              <span className="cdesc">{(wx?.desc ?? '') + base.desc}</span>
            </div>
          </div>
        </div>

        <div className="permit-row st-tools">
          <div className="st-hrow">
            <h2 className="permit-h" id="toolsTitle">持ち物（{MAX_TOOLS}つ選ぶ）</h2>
            <span className={'st-count' + (ready ? ' done' : '') + (full ? ' warn' : '')} aria-live="polite">{countLabel}</span>
          </div>
          <div className="tools" role="group" aria-labelledby="toolsTitle">
            {offer.map((k) => (
              <button
                key={k}
                ref={(el) => { toolRefs.current[k] = el; }}
                type="button"
                className="tool"
                aria-pressed={picked.includes(k)}
                title={TOOLS[k].desc}
                aria-label={TOOLS[k].name + '。' + TOOLS[k].desc}
                onClick={() => toggle(k)}
              >
                <span className="ti">{TOOL_ICON[k]}</span>
                <span className="tt"><span className="tn">{TOOLS[k].name}</span><span className="te">{TOOLS[k].eff}</span></span>
                <span className="chk" aria-hidden="true"><CheckIcon /></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="startbar st-go">
        <button className="btn btn-primary btn-go" type="button" onClick={onGo} disabled={!ready} aria-describedby="goHint"><span>森へ入る</span></button>
        <p className="go-hint" id="goHint" aria-live="polite">{goHint}</p>
      </div>

      <ol className="st-moves" aria-label="あそびかたの要約">
        {MOVES.map((m, i) => (
          <li key={m.label}>
            <span className="mv-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24">{m.icon}</svg>
              <i>{i + 1}</i>
            </span>
            <span className="mv-text">
              <b>{m.label}</b>
              <kbd className="pc">{m.pc}</kbd>
              <kbd className="sp">{m.sp}</kbd>
            </span>
          </li>
        ))}
      </ol>

      <div className="st-record">
        <PlayerCard profile={profile} onClick={onDex} />
      </div>

      <details className="howto-box st-howto" open={profile.runs === 0}>
        <summary>あそびかた</summary>
        <ol className="howto">
          <li><b>1</b><span>夜の森を抜けて<strong>避難小屋</strong>へ。マウス（スマホは画面をドラッグ）で見回し、WASD（スマホは左スティック）で進む。心臓の音が速くなったら、クマが近い。</span></li>
          <li><b>2</b><span>クマにこちらを見られたら、<strong>走らず、目を逸らさず</strong>、クマを画面に捉えたまま <strong>S でゆっくり後ずさり</strong>。背中を見せたり走ったりすると突進される。</span></li>
          <li><b>3</b><span>立ち上がって<strong>威嚇</strong>してきたら、数メートルまで引きつけて<strong>スプレー</strong>（Space）。間に合わなければ<strong>防御姿勢</strong>（E 長押し）で首を守る。</span></li>
        </ol>
      </details>
    </section>
  );
}
