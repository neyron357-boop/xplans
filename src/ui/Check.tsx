/** A ring that fills and draws its tick when done. */
export function Check({ done }: { done: boolean }) {
  return (
    <svg class={`check${done ? ' is-done' : ''}`} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle class="check__ring" cx="11" cy="11" r="10" />
      <circle class="check__fill" cx="11" cy="11" r="11" />
      <path class="check__tick" d="M6.5 11.5 L9.5 14.5 L15.5 8" pathLength={1} />
    </svg>
  );
}
