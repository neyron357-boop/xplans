import { rootsHref } from '../lib/router';
import { A } from './A';

export type Tab = 'today' | 'roots' | 'memory';

export function Nav({ active }: { active: Tab }) {
  const tabs: [Tab, string, string][] = [
    ['today', '#/today', 'Сегодня'],
    ['roots', rootsHref(), 'Корни'],
    ['memory', '#/memory', 'Память'],
  ];
  return (
    <nav class="nav" aria-label="Разделы">
      {tabs.map(([id, href, label]) => (
        <A key={id} href={href} replace current={id === active}>
          {label}
        </A>
      ))}
    </nav>
  );
}
