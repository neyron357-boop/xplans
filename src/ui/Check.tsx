export function Check({ done }: { done: boolean }) {
  if (!done) return <span class="check" aria-hidden="true" />;
  return (
    <svg class="check-done" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="11" />
      <path d="M6.5 11.5 L9.5 14.5 L15.5 8" />
    </svg>
  );
}
