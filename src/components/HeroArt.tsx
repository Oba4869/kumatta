/**
 * Start-screen illustration, drawn to match the 3D game: a foggy night forest under the moon,
 * the trail leading to the lit refuge hut, and a bear caught in the flashlight beam, looking back.
 */

/** A layered conifer silhouette standing on (x, y). */
function conifer(x: number, y: number, h: number, w: number) {
  const tiers = 4;
  let d = `M${x - w * 0.08} ${y} L${x + w * 0.08} ${y} L${x + w * 0.08} ${y - h * 0.12} `;
  const pts: string[] = [];
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, t1 = (i + 1) / tiers;
    const by = y - h * (0.12 + t0 * 0.8), ty = y - h * (0.12 + t1 * 0.8) - h * 0.06;
    const bw = w * (1 - t0 * 0.72) * 0.5;
    pts.push(`${x + bw} ${by}`, `${x + bw * 0.38} ${ty + h * 0.08}`);
    if (i === tiers - 1) pts.push(`${x} ${y - h}`);
  }
  d += 'L' + pts.join(' L');
  const left = pts.slice(0, -1).reverse().map((p) => { const [px, py] = p.split(' ').map(Number); return `${2 * x - px} ${py}`; });
  d += ' L' + left.join(' L') + ` L${x - w * 0.08} ${y - h * 0.12} Z`;
  return d;
}

const rand = (() => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();

const FAR = Array.from({ length: 16 }, (_, i) => ({ x: 6 + i * 23 + rand() * 12, y: 100 + rand() * 4, h: 34 + rand() * 18, w: 16 + rand() * 6 }));
const MID = [
  { x: 30, y: 116, h: 70, w: 30 }, { x: 64, y: 112, h: 58, w: 24 }, { x: 160, y: 104, h: 40, w: 17 },
  { x: 278, y: 112, h: 64, w: 26 }, { x: 312, y: 118, h: 80, w: 32 }, { x: 96, y: 108, h: 46, w: 19 },
];
const NEAR = [
  { x: 6, y: 182, h: 190, w: 70 }, { x: 352, y: 182, h: 200, w: 74 },
];
const BLADES = Array.from({ length: 70 }, (_, i) => {
  const x = (i / 70) * 372 - 6 + rand() * 4, h = 10 + rand() * 18, lean = (rand() - 0.5) * 8;
  const lit = x > 150 && x < 300;
  return { d: `M${x - 1.6} 172 Q${x + lean * 0.4} ${172 - h * 0.6} ${x + lean} ${172 - h} Q${x + lean * 0.3 + 0.6} ${172 - h * 0.5} ${x + 1.6} 172Z`, lit };
});
const FLIES = [
  { x: 84, y: 120, d: 0 }, { x: 128, y: 92, d: 1.3 }, { x: 250, y: 96, d: 2.1 }, { x: 300, y: 128, d: 0.6 }, { x: 186, y: 84, d: 2.8 }, { x: 52, y: 140, d: 1.8 },
];

export default function HeroArt() {
  return (
    <svg className="hero-art hero3d" viewBox="0 0 360 172" preserveAspectRatio="xMidYMid slice" role="img" aria-label="霧の夜の森。懐中電灯の光の先で、クマがこちらを振り返っている。道の奥に避難小屋の明かり">
      <defs>
        <linearGradient id="haSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1420" />
          <stop offset=".55" stopColor="#132229" />
          <stop offset="1" stopColor="#0b1214" />
        </linearGradient>
        <radialGradient id="haMoon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#eef4ff" stopOpacity=".9" />
          <stop offset=".18" stopColor="#bcd0ef" stopOpacity=".45" />
          <stop offset="1" stopColor="#7d97c4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="haBeam" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9dcff" stopOpacity=".2" />
          <stop offset="1" stopColor="#c9dcff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="haTorch" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffe9b8" stopOpacity=".42" />
          <stop offset=".6" stopColor="#ffd98f" stopOpacity=".12" />
          <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="haPool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffdca0" stopOpacity=".5" />
          <stop offset=".5" stopColor="#d9a15a" stopOpacity=".18" />
          <stop offset="1" stopColor="#d9a15a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="haHut" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb85a" stopOpacity=".85" />
          <stop offset="1" stopColor="#ff8a2a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="haTrail" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3a2e22" />
          <stop offset="1" stopColor="#1d1a17" />
        </linearGradient>
        <linearGradient id="haRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9c4ff" stopOpacity=".85" />
          <stop offset=".45" stopColor="#a9c4ff" stopOpacity=".15" />
          <stop offset="1" stopColor="#a9c4ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="haLitFur" cx="0.75" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#4e3a2a" stopOpacity=".55" />
          <stop offset="1" stopColor="#6b5038" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="haVig" cx="0.5" cy="0.48" r="0.72">
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".75" />
        </radialGradient>
        <filter id="haSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id="haBlur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5" /></filter>
        <filter id="haGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="haFur" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6 .9" numOctaves="2" seed="5" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id="haBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1411" />
          <stop offset=".55" stopColor="#0d0a09" />
          <stop offset="1" stopColor="#070505" />
        </linearGradient>
        <radialGradient id="haWarm" cx="0.86" cy="0.62" r="0.62">
          <stop offset="0" stopColor="#7a5636" stopOpacity=".75" />
          <stop offset=".5" stopColor="#4a3322" stopOpacity=".35" />
          <stop offset="1" stopColor="#4a3322" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="haHead" cx="0.62" cy="0.7" r="0.75">
          <stop offset="0" stopColor="#2a1f18" />
          <stop offset=".6" stopColor="#120e0c" />
          <stop offset="1" stopColor="#0a0807" />
        </radialGradient>
        <radialGradient id="haMuzzle" cx="0.62" cy="0.55" r="0.65">
          <stop offset="0" stopColor="#8a6a50" />
          <stop offset=".7" stopColor="#5a4334" />
          <stop offset="1" stopColor="#3a2c22" />
        </radialGradient>
      </defs>

      {/* sky, moon, stars */}
      <rect width="360" height="172" fill="url(#haSky)" />
      {[[40, 36], [130, 40], [150, 30], [214, 38], [262, 34], [330, 42], [190, 50], [24, 58]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r=".6" fill="#dbe6ff" opacity=".55" />
      ))}
      <circle cx="284" cy="40" r="34" fill="url(#haMoon)" />
      <circle cx="284" cy="40" r="5.5" fill="#f4f8ff" />

      {/* far forest in fog */}
      <g fill="#1f3038" opacity=".85">{FAR.map((t, i) => <path key={i} d={conifer(t.x, t.y, t.h, t.w)} />)}</g>
      <ellipse cx="180" cy="100" rx="210" ry="16" fill="#6f8b96" opacity=".16" filter="url(#haBlur)" className="ha-fog" />

      {/* moonbeams slanting through the trees */}
      <g className="ha-beams" filter="url(#haSoft)">
        <path d="M270 36 L296 36 L232 172 L168 172 Z" fill="url(#haBeam)" />
        <path d="M252 42 L266 42 L130 172 L100 172 Z" fill="url(#haBeam)" opacity=".6" />
        <path d="M300 44 L312 44 L292 172 L270 172 Z" fill="url(#haBeam)" opacity=".5" />
      </g>

      {/* ground and trail to the hut */}
      <path d="M0 108 Q120 98 180 102 T360 106 V172 H0 Z" fill="#0d1613" />
      <path d="M96 172 Q150 140 136 120 Q126 108 120 104 L126 104 Q142 112 158 124 Q196 150 278 172 Z" fill="url(#haTrail)" />

      {/* refuge hut with warm windows */}
      <g transform="translate(118 101)">
        <circle cx="0" cy="-2" r="14" fill="url(#haHut)" className="ha-hut" />
        <path d="M-7 0 V-6 L0 -11 L7 -6 V0 Z" fill="#0c0d0d" />
        <rect x="-4" y="-5" width="2.6" height="2.4" fill="#ffc46b" />
        <rect x="1.6" y="-5" width="2.6" height="2.4" fill="#ffc46b" />
      </g>

      {/* mid forest */}
      <g fill="#0e171a">{MID.map((t, i) => <path key={i} d={conifer(t.x, t.y, t.h, t.w)} />)}</g>
      <ellipse cx="120" cy="122" rx="150" ry="10" fill="#7d97a2" opacity=".12" filter="url(#haBlur)" className="ha-fog ha-fog2" />

      {/* flashlight beam and the lit patch of trail */}
      <path d="M330 168 L300 146 L150 92 L132 150 Z" fill="url(#haTorch)" className="ha-torch" />
      <ellipse cx="214" cy="140" rx="78" ry="20" fill="url(#haPool)" className="ha-torch" />

      {/* the bear: an Asian black bear on all fours, head low and turned toward you,
          caught by the flashlight from the right and rimmed by moonlight from above */}
      <g transform="translate(170 138) scale(1.05)">
        <ellipse cx="48" cy="1.2" rx="50" ry="4.2" fill="#000" opacity=".5" />
        {/* far legs, in shadow */}
        <path d="M27 -19 Q30.5 -10 29.5 -3 Q29 -.5 31 0 L38.5 0 Q40 -.6 38.6 -2.6 Q36.6 -9 37.6 -20 Z M80 -21 Q86 -11 84 -3 Q83.6 -.4 85.6 0 L92.6 0 Q94 -.8 92.4 -3 Q90.6 -12 88.4 -23 Z" fill="#050404" filter="url(#haFur)" />
        <g filter="url(#haFur)">
          <path d="M4 0 L18 0 Q20 -6 22 -9 Q25 -16 28 -21 Q40 -19 52 -20 Q60 -21 64 -23 Q71 -20 74 -12 Q76 -5 76.5 0 L90 0 Q90.5 -6 88.5 -11 Q93.5 -20 92.5 -31 Q91.5 -45 80 -50.5 Q66 -55.5 52 -51.5 Q42 -49.5 35 -54.5 Q27 -59.5 19 -54.5 Q11 -49 8.5 -40 Q6 -31 8 -22 Q9 -12 6.5 -4.5 Q5.5 -2 4 0 Z" fill="url(#haBody)" />
          <path d="M4 0 L18 0 Q20 -6 22 -9 Q25 -16 28 -21 Q40 -19 52 -20 Q60 -21 64 -23 Q71 -20 74 -12 Q76 -5 76.5 0 L90 0 Q90.5 -6 88.5 -11 Q93.5 -20 92.5 -31 Q91.5 -45 80 -50.5 Q66 -55.5 52 -51.5 Q42 -49.5 35 -54.5 Q27 -59.5 19 -54.5 Q11 -49 8.5 -40 Q6 -31 8 -22 Q9 -12 6.5 -4.5 Q5.5 -2 4 0 Z" fill="url(#haWarm)" />
          {/* muscle and fur masses: shoulder, ribs, haunch */}
          <path d="M24 -50 Q36 -55 41 -45 Q38 -35 30 -32 Q22 -36 24 -50 Z" fill="#1c1512" opacity=".3" />
          <path d="M66 -46 Q84 -50 88 -34 Q84 -22 72 -24 Q62 -32 66 -46 Z" fill="#2a1e16" opacity=".5" />
        </g>
        {/* fur strands along the back, lit by the moon */}
        <g stroke="#9fb6e8" strokeWidth=".7" strokeLinecap="round" fill="none" opacity=".55">
          <path d="M14 -48 q2 -3 5 -4.5 M20 -53 q3 -3 6 -3.5 M27 -57 q3 -1.5 6 -1 M35 -55 q3 0 5.5 2 M43 -51 q3 -.5 6 0 M51 -51.5 q3 -1.5 6 -1.5 M59 -53 q3 -1 6 -.5 M67 -53.5 q3 0 6 1 M75 -52 q3 1 5 3 M82 -48.5 q2.5 2 4 4.5 M87 -42 q2 2.5 2.5 5.5" />
        </g>
        <path d="M8.5 -40 Q11 -49 19 -54.5 Q27 -59.5 35 -54.5 Q42 -49.5 52 -51.5 Q66 -55.5 80 -50.5 Q91.5 -45 92.5 -31" fill="none" stroke="url(#haRim)" strokeWidth="1.4" strokeLinecap="round" filter="url(#haFur)" />
        {/* claws on the near paws */}
        <path d="M4.5 .3 l-1.6 1 M7.4 .4 l-1.4 1.1 M10.3 .4 l-1.2 1.1 M13.2 .4 l-1 1.1 M77 .4 l-1.4 1.1 M80 .4 l-1.2 1.1 M83 .4 l-1 1.1" stroke="#d8ccb4" strokeWidth=".8" strokeLinecap="round" opacity=".8" />
        {/* white crescent on the chest */}
        <path d="M7.5 -19.5 Q12.5 -14.5 19.5 -18 Q13.5 -17 10.5 -19.4 Q9 -20 7.5 -19.5 Z M19.5 -18 Q22 -20 23 -23 Q21 -21 19.5 -20.2 Z" fill="#e2dccd" opacity=".85" filter="url(#haFur)" />

        {/* head: carried low, snout pointing to the left, turned so both eyes catch the light */}
        <g transform="translate(9 -31)">
          <g filter="url(#haFur)">
            {/* far ear, then near ear */}
            <circle cx="-2.5" cy="-15.5" r="3.6" fill="#0b0908" />
            <circle cx="8.5" cy="-16" r="4.2" fill="#0d0a09" />
            {/* skull + neck ruff */}
            <path d="M-6 -11 Q-2 -18.5 6 -18 Q15 -17 17 -8 Q18.5 2 11 7 Q4 10 -2 7 Q-4 4 -5 1 Z" fill="url(#haHead)" />
            {/* snout reaching forward */}
            <path d="M-4.5 -9.5 Q-10 -7.8 -14.6 -4.6 Q-16.4 -3 -15.6 -0.8 Q-14.4 1.4 -11 2.2 Q-6 3.4 -1 3 Z" fill="url(#haMuzzle)" />
          </g>
          <circle cx="8.5" cy="-16" r="1.8" fill="#2c2119" />
          {/* moonlight on the brow and ear */}
          <path d="M-4.5 -12.5 Q-1 -17.6 6 -17.6 Q12 -17.4 15 -12.5" fill="none" stroke="url(#haRim)" strokeWidth=".55" strokeLinecap="round" opacity=".7" />
          {/* nose, mouth */}
          <ellipse cx="-14.6" cy="-2.9" rx="2.3" ry="1.7" fill="#050404" />
          <ellipse cx="-15.2" cy="-3.6" rx=".9" ry=".45" fill="#c9c1b6" opacity=".7" />
          <path d="M-14.2 0.6 Q-9 2.6 -3.5 1.8" stroke="#120d0b" strokeWidth=".7" fill="none" strokeLinecap="round" />
          {/* small eyes set close to the snout, with eyeshine */}
          <g className="ha-eyes" filter="url(#haGlow)">
            <ellipse cx="-5.6" cy="-9.4" rx="1.05" ry="1" fill="#ffd27a" />
            <ellipse cx="1.4" cy="-9.8" rx="1.3" ry="1.15" fill="#ffd27a" />
          </g>
          <circle cx="1.1" cy="-10.1" r=".35" fill="#fff8e0" />
          {/* breath in the cold air */}
          <ellipse className="ha-breath" cx="-19" cy="-1" rx="5" ry="2.6" fill="#dfe8f0" opacity="0" filter="url(#haSoft)" />
        </g>
      </g>

      {/* fireflies */}
      <g filter="url(#haGlow)">
        {FLIES.map((f) => <circle key={f.x} className="ha-fly" cx={f.x} cy={f.y} r="1.1" fill="#d8f49a" style={{ animationDelay: f.d + 's' }} />)}
      </g>

      {/* framing trees and foreground grass */}
      <g fill="#040707">{NEAR.map((t, i) => <path key={i} d={conifer(t.x, t.y, t.h, t.w)} />)}</g>
      <g>
        {BLADES.map((b, i) => <path key={i} d={b.d} fill={b.lit ? '#2f4a2e' : '#0a120d'} />)}
      </g>

      {/* your hand and flashlight */}
      <g transform="translate(330 168) rotate(-36)">
        <rect x="-6" y="-34" width="12" height="40" rx="3" fill="#121416" />
        <rect x="-7.5" y="-40" width="15" height="9" rx="2" fill="#1c1f22" />
        <ellipse cx="0" cy="-40" rx="7" ry="2" fill="#fff1c9" opacity=".9" filter="url(#haGlow)" />
        <path d="M-12 6 Q-14 -10 -6 -14 L8 -12 Q14 -2 12 10 Z" fill="#1a1512" />
      </g>

      <rect width="360" height="172" fill="url(#haVig)" />
    </svg>
  );
}
