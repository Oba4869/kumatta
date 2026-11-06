import { useEffect, useRef, useState } from 'react';
import { DEX, type DexEntry } from '../data/dex';
import DexAnimalViewer from './DexAnimalViewer';
import { SRC } from '../data/sources';
import type { Profile } from '../lib/profile';
import { PIC } from './Icons';
import Rarity from './Rarity';

interface Props {
  profile: Profile;
  active: boolean;
  onSeen: (id: string) => void;
}

/** Field guide: creatures that came out of the grass. Locked ones show only a hint. */
export default function DexScreen({ profile, active, onSeen }: Props) {
  const [selected, setSelected] = useState<DexEntry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (active && selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [active, selected]);

  const got = DEX.filter((d) => profile.dex[d.id]).length;
  return (
    <section className="profile-content" aria-label="図鑑の登録状況">
      <div className="dexhead">
        <span className="chip">{got} / {DEX.length}</span>
      </div>
      <p className="lead">草むらから出てきたいきものが登録されます。レアないきものほど、なかなか出会えません。</p>
      <div className="dexgrid">
        {DEX.map((d) =>
          profile.dex[d.id] ? (
            <button key={d.id} className="dexcard dex-entry" type="button" onClick={() => { setSelected(d); onSeen(d.id); }}>
              <span className="pic">{PIC[d.pic]}</span>
              {profile.unreadDex.includes(d.id) && <span className="collection-new">NEW</span>}
              <span><b>{d.name}</b><span className="meta"><Rarity star={d.star} /></span></span>
            </button>
          ) : (
            <div key={d.id} className="dexcard locked">
              <div className="flex items-center gap-2.5">
                <span className="pic">{PIC.lock}</span>
                <div>
                  <b>？？？</b>
                  <span className="meta"><Rarity star={d.star} /></span>
                  <span className="meta">{d.hint}</span>
                </div>
              </div>
            </div>
          ),
        )}
      </div>
      {selected && (
        <dialog ref={dialog} className="dex-detail" aria-labelledby="dex-detail-title"
          onClose={() => setSelected(null)} onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation(); }}>
          <div className="dex-detail-content">
            <header>
              <h2 id="dex-detail-title">{selected.name}</h2>
              <button type="button" onClick={() => dialog.current?.close()} autoFocus>とじる</button>
            </header>
            <Rarity star={selected.star} />
            {selected.ev !== 'wind' && <DexAnimalViewer entry={selected} />}
            <p>{selected.text}</p>
            {selected.src && <cite>出典：{SRC[selected.src]}</cite>}
          </div>
        </dialog>
      )}
    </section>
  );
}
