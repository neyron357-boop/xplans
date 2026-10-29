import type { ComponentChildren } from 'preact';

export function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class="toggle" aria-pressed={on} onClick={onClick}>
      <span class="toggle__box" aria-hidden="true">
        {on && (
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M3.5 8.5 L6.5 11.5 L12.5 5" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </button>
  );
}
