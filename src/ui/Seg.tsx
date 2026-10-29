import type { Section } from '../lib/router';
import { A } from './A';

const TABS: Record<Section, [string, string][]> = {
  roots: [
    ['tree', 'Древо'],
    ['ready', 'Что если'],
    ['aces', 'Рукав'],
  ],
  growth: [
    ['habits', 'Привычки'],
    ['knowledge', 'Знание'],
  ],
  me: [
    ['patterns', 'Узоры'],
    ['code', 'Кодекс'],
  ],
};

const NAMES: Record<Section, string> = { roots: 'Корни', growth: 'Рост', me: 'Я' };

/** The tabs inside a section; the light slides under the one you are on. */
export function Seg({ section, tab }: { section: Section; tab: string }) {
  const list = TABS[section];
  const i = list.findIndex(([id]) => id === tab);
  return (
    <nav class="seg" aria-label={NAMES[section]} style={{ '--count': String(list.length) }}>
      <span class="seg__ind" style={{ '--i': String(i) }} aria-hidden="true" />
      {list.map(([id, label]) => (
        <A key={id} href={`#/${section}/${id}`} replace current={id === tab}>
          {label}
        </A>
      ))}
    </nav>
  );
}
