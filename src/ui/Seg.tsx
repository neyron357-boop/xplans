import type { RootsTab } from '../lib/router';
import { A } from './A';

const TABS: [RootsTab, string][] = [
  ['tree', 'Древо'],
  ['ready', 'Что если'],
  ['aces', 'Рукав'],
];

export function Seg({ tab }: { tab: RootsTab }) {
  const i = TABS.findIndex(([id]) => id === tab);
  return (
    <nav class="seg" aria-label="Корни">
      <span class="seg__ind" style={{ '--i': String(i) }} aria-hidden="true" />
      {TABS.map(([id, label]) => (
        <A key={id} href={`#/roots/${id}`} replace current={id === tab}>
          {label}
        </A>
      ))}
    </nav>
  );
}
