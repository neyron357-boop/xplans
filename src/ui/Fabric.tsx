import { useMemo, useRef } from 'preact/hooks';
import type { DayKey, DayLog } from '../store/model';
import { WD, weave, weekday } from '../lib/patterns';
import { useWidth } from './useWidth';

interface Props {
  days: Record<DayKey, DayLog>;
  today: DayKey;
  /** The day the app was started; earlier days are not counted as missed. */
  start: DayKey;
  /** The strongest weekday, lit once the rhythm is clear. */
  best: number | null;
}

/**
 * Five weeks of days woven like embroidery: a stitch for each answered day, a thread through the
 * days with the step done. Empty places stay as faint dots, so the pattern shows as it fills in.
 */
export function Fabric({ days, today, start, best }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 342);
  const lay = useMemo(() => weave(days, today, start, w), [days, today, start, w]);
  const filled = lay.stitches.filter((st) => st.kind === 'day').length;
  const now = lay.stitches.find((st) => st.today);
  let order = 0;

  return (
    <div class="fabric" ref={box} style={{ height: `${lay.height}px` }}>
      <svg width={w} height={lay.height} viewBox={`0 0 ${w} ${lay.height}`} role="img" aria-label={`Узор дней: ${filled} из ${lay.stitches.length} с ответом`}>
        <defs>
          <linearGradient id="fb-light" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--line-main)', stopOpacity: 0 }} />
            <stop offset="0.55" style={{ stopColor: 'var(--line-main)', stopOpacity: 0.14 }} />
            <stop offset="1" style={{ stopColor: 'var(--line-main)', stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        {best != null && (
          <rect class="fb-light" x={lay.cw * best + 5} y={lay.top - 4} width={lay.cw - 10} height={lay.depth + 22} rx={14} fill="url(#fb-light)" />
        )}
        {lay.threads.map((d, i) => (
          <path key={i} class="fb-thread" d={d} pathLength={1} style={{ '--d': `${600 + i * 160}ms` }} />
        ))}
        {lay.stitches.map((st) => {
          const at = { cx: Math.round(st.x * 10) / 10, cy: st.y };
          if (st.kind === 'future') return <circle key={st.k} class="fb-future" {...at} r={st.r} />;
          if (st.kind === 'before') return <circle key={st.k} class="fb-before" {...at} r={st.r} />;
          if (st.kind === 'empty') return <circle key={st.k} class="fb-empty" {...at} r={st.r} />;
          const d = `${120 + order++ * 26}ms`;
          return (
            <g key={st.k}>
              {st.step && <circle class="fb-step pop-in" {...at} r={st.r + 3.5} style={{ '--d': d }} />}
              <circle
                class={`fb-node fb-node--${st.tone} pop-in`}
                {...at}
                r={st.r}
                style={st.tone === 'plain' ? { '--d': d, fillOpacity: st.a.toFixed(2) } : { '--d': d }}
              />
            </g>
          );
        })}
        {now && (
          <>
            <circle class="fb-today-pulse" cx={now.x} cy={now.y} r={12} />
            <circle class="fb-today" cx={now.x} cy={now.y} r={12} />
          </>
        )}
        <g class="fb-letters">
          {WD.map((l, i) => (
            <text key={i} x={Math.round(lay.cw * (i + 0.5) * 10) / 10} y={lay.letters} class={i === best ? 'is-best' : i === weekday(today) ? 'is-today' : undefined}>
              {l}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
