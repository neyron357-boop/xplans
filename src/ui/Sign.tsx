import type { Change } from '../store/model';

export const TONE: Record<Change, string> = {
  none: 'var(--ink-muted)',
  moved: 'var(--line-main)',
  broke: 'var(--line-closed)',
  chance: 'var(--line-ace)',
  low: 'var(--ink-muted)',
};

/** The five signs of a day, drawn so they can move: = ● ○ ◆ ‖ */
export function Sign({ kind, size = 28 }: { kind: Change; size?: number }) {
  return (
    <svg class={`sign sign--${kind}`} width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      {kind === 'none' && <path d="M8 11h12M8 17h12" />}
      {kind === 'moved' && (
        <>
          <circle class="sign__halo" cx="14" cy="14" r="11" />
          <circle class="sign__core" cx="14" cy="14" r="6.5" />
        </>
      )}
      {kind === 'broke' && <circle cx="14" cy="14" r="7" pathLength={100} stroke-dasharray="84 16" transform="rotate(-50 14 14)" />}
      {kind === 'chance' && (
        <>
          <path class="sign__core" d="M14 4 L24 14 L14 24 L4 14 Z" />
          <path class="sign__glint" d="M11 9.5 L9.5 11" />
        </>
      )}
      {kind === 'low' && <path d="M11 7v14M17 7v14" />}
    </svg>
  );
}
