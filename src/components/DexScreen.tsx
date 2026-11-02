import { DEX } from '../data/dex';
import { SRC } from '../data/sources';
import type { Profile } from '../lib/profile';
import { PIC } from './Icons';
import Rarity from './Rarity';

interface Props {
  profile: Profile;
  onBack: () => void;
}

/** Field guide: creatures that came out of the grass. Locked ones show only a hint. */
export default function DexScreen({ profile, onBack }: Props) {
  const got = DEX.filter((d) => profile.dex[d.id]).length;
  return (
    <section className="panel">
      <div className="dexhead">
        <h2>図鑑</h2>
        <span className="chip">{got} / {DEX.length}</span>
      </div>
      <p className="lead">草むらから出てきたいきものが登録されます。レアないきものほど、なかなか出会えません。</p>
      <div className="dexgrid">
        {DEX.map((d) =>
          profile.dex[d.id] ? (
            <details key={d.id} className="dexcard">
              <summary>
                <span className="pic">{PIC[d.pic]}</span>
                <div><b>{d.name}</b><span className="meta"><Rarity star={d.star} /></span></div>
              </summary>
              <p>{d.text}</p>
              {d.src && <cite>出典：{SRC[d.src]}</cite>}
            </details>
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
      <button className="btn btn-primary" type="button" onClick={onBack}>もどる</button>
    </section>
  );
}
