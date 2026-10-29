import type { ComponentChildren } from 'preact';

export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class="pill" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
