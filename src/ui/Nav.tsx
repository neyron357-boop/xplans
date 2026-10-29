import { rootsHref } from '../lib/router';
import { A } from './A';

export type Tab = 'today' | 'roots' | 'memory';

const TABS: [Tab, string][] = [
  ['today', 'Сегодня'],
  ['roots', 'Корни'],
  ['memory', 'Память'],
];

const HREF: Record<Tab, () => string> = {
  today: () => '#/today',
  roots: rootsHref,
  memory: () => '#/memory',
};

/** Small marks instead of icons: where you are, the roots, the rings. */
function Glyph({ tab }: { tab: Tab }) {
  return (
    <svg class="nav__glyph" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {tab === 'today' && (
        <>
          <circle cx="11" cy="11" r="3.2" fill="currentColor" stroke="none" />
          <circle cx="11" cy="11" r="8" />
        </>
      )}
      {tab === 'roots' && (
        <>
          <path d="M2.5 5.5C8 5.5 11 11 18.5 11" />
          <path d="M2.5 16.5C8 16.5 11 11 18.5 11" />
          <path d="M2.5 11H18.5" />
          <circle cx="18.5" cy="11" r="2.2" fill="currentColor" stroke="none" />
        </>
      )}
      {tab === 'memory' && (
        <>
          <circle cx="11" cy="11" r="2.6" />
          <circle cx="11" cy="11" r="6.2" />
          <circle cx="11" cy="11" r="9.6" />
        </>
      )}
    </svg>
  );
}

export function Nav({ active }: { active: Tab }) {
  const i = TABS.findIndex(([id]) => id === active);
  return (
    <nav class="nav" aria-label="Разделы">
      <span class="nav__ind" style={{ '--i': String(i) }} aria-hidden="true" />
      {TABS.map(([id, label]) => (
        <A key={id} href={HREF[id]()} replace current={id === active}>
          <Glyph tab={id} />
          <span>{label}</span>
        </A>
      ))}
    </nav>
  );
}
