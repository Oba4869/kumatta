import { RARITY } from '../data/dex';

export default function Rarity({ star }: { star: number }) {
  return <span className={'rar r' + star}>{'★'.repeat(star)} {RARITY[star]}</span>;
}
