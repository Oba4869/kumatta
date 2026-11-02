import type { Rank } from '../game/types';

/** Ring color per rank. */
const INK: Record<Rank, string> = { S: 'var(--accent)', A: 'var(--accent)', B: 'var(--muted)', C: 'var(--warn)' };

/** Rank emblem: a clean double ring with the rank letter. S gets a soft glow. */
export default function RankEmblem({ rank, stamp }: { rank: Rank; stamp: boolean }) {
  const ink = INK[rank];
  return (
    <div className={'letter emb rank-ring r-' + rank + (stamp ? ' stamp' : '')} aria-label={rank + 'ランク'} role="img">
      <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
        {rank === 'S' && <circle cx="60" cy="60" r="58" fill="none" stroke={ink} strokeWidth="8" opacity=".14" />}
        <circle cx="60" cy="60" r="54" fill="rgba(255,255,255,.03)" stroke={ink} strokeWidth="3" />
        <circle cx="60" cy="60" r="46" fill="none" stroke={ink} strokeWidth="1" opacity=".45" />
        <text x="60" y="62" textAnchor="middle" dominantBaseline="central" fill={ink} style={{ font: "800 56px 'Shippori Mincho B1', serif" }}>{rank}</text>
      </svg>
    </div>
  );
}
