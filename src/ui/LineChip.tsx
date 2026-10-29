import type { Kind } from '../lib/roots';

export const lineColor: Record<Kind, string> = {
  main: 'var(--line-main)',
  backup: 'var(--line-backup)',
  closed: 'var(--ink-muted)',
};

export function LineChip({ code, kind, on }: { code: string; kind: Kind; on?: boolean }) {
  return <span class={`chip chip--${kind}${on ? ' is-on' : ''}`}>{code}</span>;
}
