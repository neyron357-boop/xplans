import { tabHref } from '../lib/router';
import { A } from './A';

export type Tab = 'today' | 'roots' | 'growth' | 'memory' | 'me';

const TABS: [Tab, string][] = [
  ['today', 'Сегодня'],
  ['roots', 'Корни'],
  ['growth', 'Рост'],
  ['memory', 'Память'],
  ['me', 'Я'],
];

const HREF: Record<Tab, () => string> = {
  today: () => '#/today',
  roots: () => tabHref('roots'),
  growth: () => tabHref('growth'),
  memory: () => '#/memory',
  me: () => tabHref('me'),
};

/** Small marks instead of icons: where you are, the roots, rootlets growing, the rings, a fingerprint. */
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
      {tab === 'growth' && (
        <>
          <path d="M11 20.5C11 16.5 10.6 13 11 9.6" />
          <path d="M10.9 13.6C7.4 13.6 4.9 11.4 4.4 7.8C7.9 7.8 10.4 10 10.9 13.6Z" />
          <path d="M11 9.6C11.4 6.2 13.9 3.8 17.6 3.6C17.6 7.2 15 9.6 11 9.6Z" fill="currentColor" />
        </>
      )}
      {tab === 'memory' && (
        <>
          <circle cx="11" cy="11" r="2.6" />
          <circle cx="11" cy="11" r="6.2" />
          <circle cx="11" cy="11" r="9.6" />
        </>
      )}
      {tab === 'me' && (
        <>
          <path d="M4 16.5V11a7 7 0 0 1 14 0v1.6" />
          <path d="M7.5 18.5V11a3.5 3.5 0 0 1 7 0v5" />
          <path d="M11 11v8.5" />
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
