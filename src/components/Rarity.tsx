import { RARITY } from '../data/dex';

export default function Rarity({ star }: { star: number }) {
  return <span className={'rar r' + star}><span>{'★'.repeat(star)} {RARITY[star]}</span></span>;
}
