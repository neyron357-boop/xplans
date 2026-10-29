import { useRef } from 'preact/hooks';
import type { Check } from '../store/model';
import { smoothPath } from '../lib/curves';
import { useWidth } from './useWidth';

interface Props {
  checks: Check[];
  start?: { low: number; high: number };
  /** The next check can be taken now. */
  due: boolean;
}

const SLOTS = 12;
const H = 56;

/**
 * A year of monthly checks. Each one taken is a point at its level, joined by a line;
 * the dashed rail is where you started; the next check waits as a ring.
 */
export function Trail({ checks, start, due }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 310);
  const shown = checks.slice(-(SLOTS - 1));
  // The scale hugs the levels you have been at, so a step of ten points shows as a climb.
  const seen = [...shown.map((c) => c.value), ...(start ? [start.low, start.high] : [])];
  let lo = seen.length ? Math.max(0, Math.floor((Math.min(...seen) - 10) / 10) * 10) : 0;
  let hi = seen.length ? Math.min(100, Math.ceil((Math.max(...seen) + 10) / 10) * 10) : 100;
  if (hi - lo < 40) {
    const grow = (40 - (hi - lo)) / 2;
    lo = Math.max(0, lo - grow);
    hi = Math.min(100, lo + 40);
  }
  const y = (v: number) => Math.round((H - 7 - ((v - lo) / (hi - lo)) * (H - 14)) * 10) / 10;
  const x = (i: number) => Math.round((8 + (i * (w - 16)) / (SLOTS - 1)) * 10) / 10;
  const pts = shown.map((c, i) => ({ x: x(i), y: y(c.value) }));
  const mid = start ? (start.low + start.high) / 2 : null;
  const level = shown.length ? shown[shown.length - 1].value : (mid ?? 50);
  const next = shown.length;
  const label = `Контрольные: ${checks.length ? checks.map((c) => `${c.value}%`).join(', ') : 'ещё не было'}`;

  return (
    <div class="trail" ref={box} style={{ height: `${H}px` }}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={label}>
        {mid != null && <path class="tr-start" d={`M${x(0)} ${y(mid)} H${x(SLOTS - 1)}`} />}
        {pts.length > 1 && <path class="tr-line" d={smoothPath(pts)} pathLength={1} />}
        {Array.from({ length: Math.max(0, SLOTS - next - 1) }, (_, k) => (
          <circle key={`f${k}`} class="tr-future pop-in" cx={x(next + 1 + k)} cy={y(level)} r={3} style={{ '--d': `${300 + k * 40}ms` }} />
        ))}
        {pts.map((p, i) => (
          <circle key={`c${i}`} class="tr-dot pop-in" cx={p.x} cy={p.y} r={4} style={{ '--d': `${150 + i * 90}ms` }} />
        ))}
        {due && <circle class="tr-pulse" cx={x(next)} cy={y(level)} r={6} />}
        <circle class={`tr-next pop-in${due ? ' is-due' : ''}`} cx={x(next)} cy={y(level)} r={6} style={{ '--d': `${200 + next * 90}ms` }} />
      </svg>
    </div>
  );
}
