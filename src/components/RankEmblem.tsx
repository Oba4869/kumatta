import type { Rank } from '../game/types';

/** Rank emblem with a white double ring and rank letter. */
export default function RankEmblem({ rank, stamp }: { rank: Rank; stamp: boolean }) {
  return (
    <div className={'letter emb rank-ring r-' + rank + (stamp ? ' stamp' : '')} aria-label={rank + 'ランク'} role="img">
      <svg viewBox="0 0 120 120" width="104" height="104" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#fff" strokeWidth="3" />
        <circle cx="60" cy="60" r="46" fill="none" stroke="#fff" strokeWidth="1" />
        <text x="60" y="62" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="56" fontWeight="800">{rank}</text>
      </svg>
    </div>
  );
}
