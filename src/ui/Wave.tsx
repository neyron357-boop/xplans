const BARS = 34;

/** Loudness of speech along the wave, the same every time. */
const loud = (i: number) => Math.min(1, 0.22 + 0.78 * Math.abs(0.62 * Math.sin(i * 1.37 + 0.5) + 0.38 * Math.sin(i * 0.41 + 2.1)));

/**
 * Speech as a sound wave. The share you understand plays; the uncertain part glows faintly;
 * the rest stays quiet. After a check the wave fills or empties bar by bar.
 */
export function Wave({ low, high }: { low: number | null; high: number | null }) {
  const label = low == null ? 'Уровень ещё не измерен' : low === high ? `Понимание ${low}%` : `Понимание ${low}–${high}%`;
  return (
    <div class="wave" role="img" aria-label={label}>
      {Array.from({ length: BARS }, (_, i) => {
        const at = ((i + 0.5) / BARS) * 100;
        const state = low == null ? 'off' : at <= low ? 'on' : at <= (high ?? low) ? 'half' : 'off';
        return (
          <span
            key={i}
            class={`wave__bar is-${state}`}
            style={{ '--h': `${Math.round(8 + 40 * loud(i))}px`, '--i': String(i), '--t': `${(0.8 + (i % 7) * 0.13).toFixed(2)}s` }}
          />
        );
      })}
    </div>
  );
}
