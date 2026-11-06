import type { Condition } from '../data/conditions';

type Id = Condition['id'];

interface Pal {
  sky: string[];
  ridge: string;
  far: string;
  mid: string;
  near: string;
  ground: string;
  trail: string;
}

/** One palette per mountain, so each stage reads differently at a glance. */
const PAL: Record<Id, Pal> = {
  calm: { sky: ['#07122e', '#1f3a78', '#3d62a8'], ridge: '#142a58', far: '#18335f', mid: '#0f2449', near: '#08142b', ground: '#0c1c38', trail: '#2a416b' },
  stream: { sky: ['#06171f', '#154651', '#2b7480'], ridge: '#0f3a44', far: '#13434d', mid: '#0c303a', near: '#071e25', ground: '#0a2a33', trail: '#2a5560' },
  dusk: { sky: ['#2a2160', '#b94a6e', '#ffb35c'], ridge: '#43284f', far: '#5a3366', mid: '#3a2048', near: '#1d1027', ground: '#2a1630', trail: '#7a4a5c' },
  wind: { sky: ['#16222f', '#4a6378', '#8aa3b6'], ridge: '#2f4658', far: '#2c4254', mid: '#1f3140', near: '#101a24', ground: '#18262f', trail: '#43596a' },
  fog: { sky: ['#4a5459', '#8d9aa0', '#c3ccd0'], ridge: '#6c7a80', far: '#667479', mid: '#4a585e', near: '#2a353a', ground: '#364247', trail: '#6a797f' },
  hokkaido: { sky: ['#0b1530', '#3f5f8a', '#a7bfd8'], ridge: '#4d6a8f', far: '#3b5272', mid: '#2a3d57', near: '#16222f', ground: '#dce6ef', trail: '#aebfd0' },
};

const ALT: Record<Id, string> = {
  calm: '月明かりの下、道の先に避難小屋の明かりが見える夜の山道',
  stream: '沢が流れ、広葉樹が立ち並ぶ夜の山道',
  dusk: '夕日が山並みに沈む薄暗い山道',
  wind: '強風で木々が傾き、葉が舞う山道',
  fog: '深い霧に包まれた山道',
  hokkaido: '雪をかぶった山々と、雪が舞う北海道の森',
};

interface T { x: number; base: number; h: number; w: number }

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
};

const rowT = (n: number, x0: number, x1: number, base: number, h: number, w: number, seed: number): T[] => {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => ({
    x: x0 + ((x1 - x0) * i) / (n - 1) + (r() - 0.5) * 10,
    base,
    h: h * (0.8 + r() * 0.4),
    w: w * (0.85 + r() * 0.3),
  }));
};

/** Three-tier conifer silhouette. */
const conifer = (t: T) => {
  let d = '';
  for (let i = 0; i < 3; i++) {
    const top = t.base - t.h + i * t.h * 0.26;
    const bottom = top + t.h * 0.46;
    const hw = (t.w / 2) * (0.5 + i * 0.25);
    d += `M${t.x} ${top}L${t.x + hw} ${bottom}L${t.x - hw} ${bottom}Z`;
  }
  return d;
};

/** Snow resting on the top tier of a conifer. */
const snowCap = (t: T) => {
  const top = t.base - t.h;
  const bottom = top + t.h * 0.3;
  const hw = (t.w / 2) * 0.5 * (0.3 / 0.46);
  return `M${t.x} ${top}L${t.x + hw} ${bottom}L${t.x - hw} ${bottom}Z`;
};

/** Round-crowned broadleaf tree with a trunk. */
const broadleaf = (t: T) => {
  const r = t.w * 0.55;
  const cy = t.base - t.h * 0.62;
  return `M${t.x - t.w * 0.06} ${t.base}V${cy}H${t.x + t.w * 0.06}V${t.base}Z` + `M${t.x - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
};

const join = (list: T[], fn: (t: T) => string) => list.map(fn).join('');

const FAR_T = rowT(14, -5, 325, 112, 46, 24, 3);
const MID_T = rowT(8, 0, 320, 134, 84, 42, 5);
const ROUND_T = rowT(7, 12, 308, 142, 62, 44, 9);
const NEAR_T: T[] = [{ x: 8, base: 190, h: 170, w: 80 }, { x: 312, base: 190, h: 170, w: 80 }];

const FAR = join(FAR_T, conifer);
const MID = join(MID_T, conifer);
const NEAR = join(NEAR_T, conifer);
const ROUND = join(ROUND_T, broadleaf);
const MID_CAPS = join(MID_T, snowCap);
const NEAR_CAPS = join(NEAR_T, snowCap);

const FLAKES = (() => {
  const r = seeded(11);
  return Array.from({ length: 70 }, () => ({ x: r() * 320, y: r() * 180, r: 0.6 + r() * 1.5 }));
})();

const LEAVES = (() => {
  const r = seeded(21);
  return Array.from({ length: 12 }, () => ({ x: r() * 320, y: 30 + r() * 120, a: r() * 180 }));
})();

const STARS = [[30, 18], [70, 34], [112, 12], [160, 28], [205, 14], [290, 22], [262, 60], [48, 56], [136, 52]];
const FIREFLIES = [[96, 132], [128, 120], [180, 128], [236, 134], [268, 118], [150, 142]];

const cap = (x: number, y: number, w: number) =>
  `M${x} ${y}L${x - w} ${y + w * 1.3}L${x - w * 0.4} ${y + w * 1.05}L${x} ${y + w * 1.5}L${x + w * 0.4} ${y + w * 1.05}L${x + w} ${y + w * 1.3}Z`;

/** Illustration for one mountain. Drawn in SVG so no image files are needed; swap for artwork any time. */
export default function StageArt({ id, className, animated = false }: { id: Id; className: string; animated?: boolean }) {
  const p = PAL[id];
  const sky = `sa-sky-${id}`;
  const blur = `sa-blur-${id}`;
  const isFog = id === 'fog';
  const lean = id === 'wind';

  /* conifers lean in the wind; the nearer the row, the more */
  const farT = lean ? 'translate(14 0) skewX(-6)' : undefined;
  const nearT = lean ? 'translate(28 0) skewX(-10)' : undefined;

  return (
    <svg className={animated ? `${className} stage-motion` : className} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label={ALT[id]}>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          {p.sky.map((c, i) => <stop key={c} offset={i / (p.sky.length - 1)} stopColor={c} />)}
        </linearGradient>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <rect width="320" height="180" fill={`url(#${sky})`} />

      {(id === 'calm' || id === 'stream' || id === 'hokkaido') && (
        <g className={id === 'hokkaido' ? undefined : 'stage-twinkle'}>
          {STARS.map(([x, y]) => <circle key={x} cx={x} cy={y} r="0.9" fill="#fff" opacity=".8" />)}
        </g>
      )}

      {/* sun or moon */}
      {id === 'dusk' && (
        <>
          <circle cx="86" cy="108" r="58" fill="#ff9a5c" opacity=".4" filter={`url(#${blur})`} />
          <circle cx="86" cy="108" r="26" fill="#ffe2a8" />
        </>
      )}
      {id === 'calm' && (
        <>
          <circle cx="240" cy="40" r="34" fill="#bcd0ef" opacity=".4" filter={`url(#${blur})`} />
          <circle cx="240" cy="40" r="15" fill="#f4f8ff" />
        </>
      )}
      {id === 'stream' && (
        <>
          <circle cx="262" cy="36" r="26" fill="#9fe0e8" opacity=".35" filter={`url(#${blur})`} />
          <circle cx="262" cy="36" r="11" fill="#e8fbff" />
        </>
      )}
      {id === 'wind' && <circle cx="256" cy="44" r="10" fill="#e9f0f6" opacity=".6" />}
      {isFog && <circle cx="236" cy="46" r="34" fill="#fff" opacity=".45" filter={`url(#${blur})`} />}
      {id === 'hokkaido' && <circle cx="268" cy="30" r="8" fill="#eef4ff" opacity=".9" />}

      {id === 'wind' && (
        <g fill="#b6c8d8" opacity=".5" filter={`url(#${blur})`}>
          <ellipse cx="60" cy="34" rx="46" ry="8" />
          <ellipse cx="190" cy="52" rx="62" ry="9" />
          <ellipse cx="290" cy="26" rx="36" ry="6" />
        </g>
      )}

      {id === 'dusk' && (
        <g className="stage-crows" stroke="#2a1630" strokeWidth="1.1" fill="none" strokeLinecap="round">
          <path d="M196 38q4-5 8 0q4-5 8 0" />
          <path d="M224 52q3-4 6 0q3-4 6 0" />
          <path d="M176 56q3-4 6 0q3-4 6 0" />
        </g>
      )}

      {/* distant ridge */}
      {(id === 'dusk' || id === 'hokkaido' || id === 'calm') && (
        <path d="M0 118L36 84L62 104L108 56L150 106L196 74L238 104L282 66L320 98V124H0Z" fill={p.ridge} />
      )}
      {id === 'hokkaido' && (
        <g fill="#f4f8ff">
          <path d={cap(36, 84, 9)} />
          <path d={cap(108, 56, 14)} />
          <path d={cap(196, 74, 11)} />
          <path d={cap(282, 66, 12)} />
        </g>
      )}

      <g transform={farT} opacity={isFog ? 0.55 : 1}>
        <path d={FAR} fill={p.far} />
      </g>
      {isFog && <ellipse cx="160" cy="112" rx="200" ry="16" fill="#e4eaec" opacity=".55" filter={`url(#${blur})`} />}

      {/* the lit refuge hut at the end of the trail */}
      {id === 'calm' && (
        <g transform="translate(46 0)">
          <circle cx="57" cy="126" r="16" fill="#ffb238" opacity=".35" filter={`url(#${blur})`} />
          <rect x="47" y="122" width="22" height="13" fill="#0b1630" />
          <path d="M44 122L58 110L72 122Z" fill="#0b1630" />
          <rect x="53" y="125" width="7" height="7" fill="#ffcf6b" />
        </g>
      )}

      <g transform={lean ? 'translate(20 0) skewX(-8)' : undefined} opacity={isFog ? 0.82 : 1}>
        <path d={id === 'stream' ? ROUND : MID} fill={p.mid} />
        {id === 'hokkaido' && <path d={MID_CAPS} fill="#f4f8ff" opacity=".9" />}
      </g>

      <path d="M0 140Q160 128 320 140V180H0Z" fill={p.ground} />
      <path d="M118 180Q150 152 168 138L184 138Q188 158 232 180Z" fill={p.trail} />

      {id === 'stream' && (
        <g>
          <path d="M0 154Q70 142 150 156T320 148V176Q240 184 150 174T0 172Z" fill="#3a8294" />
          <path d="M0 154Q70 142 150 156T320 148" stroke="#c6f0f6" strokeWidth="1.2" fill="none" opacity=".8" />
          <path className="stage-ripples" d="M24 162q22-4 44 0M110 168q22-4 44 0M214 160q22-4 44 0M70 172q18-3 36 0" stroke="#d8f8fb" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".75" />
          <ellipse cx="252" cy="154" rx="9" ry="3.4" fill="#0a2229" />
          <ellipse cx="38" cy="160" rx="7" ry="3" fill="#0a2229" />
          <ellipse cx="146" cy="175" rx="10" ry="3.4" fill="#0a2229" />
        </g>
      )}

      {id === 'dusk' && <rect className="stage-dusk-light" y="136" width="320" height="6" fill="#ff9a5c" opacity=".25" filter={`url(#${blur})`} />}

      <g transform={nearT}>
        <path d={NEAR} fill={p.near} />
        {id === 'hokkaido' && <path d={NEAR_CAPS} fill="#f4f8ff" opacity=".9" />}
      </g>

      {id === 'calm' && FIREFLIES.map(([x, y], i) => (
        <circle key={x} cx={x} cy={y} r="1.2" fill="#d9ff8a">
          <animate attributeName="opacity" values="0.2;1;0.2" dur={`${(2.4 + i * 0.5) / (animated ? 2 : 1)}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {lean && (
        <g className="stage-wind">
          <g stroke="#e3edf5" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".45">
            <path d="M14 52q30-8 60 0t60 0" />
            <path d="M120 82q30-8 60 0t60 0" />
            <path d="M40 112q30-8 60 0t60 0" />
            <path d="M200 64q30-8 60 0t40 0" />
          </g>
          {LEAVES.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx="2.6" ry="1.2" fill="#c8d89a" opacity=".85" transform={`rotate(${l.a} ${l.x} ${l.y})`} />)}
        </g>
      )}

      {isFog && (
        <g className="stage-fog" fill="#eef2f3" filter={`url(#${blur})`}>
          <ellipse cx="80" cy="150" rx="150" ry="20" opacity=".5" />
          <ellipse cx="250" cy="132" rx="130" ry="16" opacity=".42" />
          <ellipse cx="160" cy="172" rx="200" ry="14" opacity=".5" />
        </g>
      )}

      {id === 'hokkaido' && (
        <g className="stage-snow">
          {FLAKES.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r={f.r} fill="#fff" opacity=".88" />)}
        </g>
      )}
    </svg>
  );
}
