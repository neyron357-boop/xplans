import type { TargetedMouseEvent } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { Arc, DayKey, Id, Memory } from '../store/model';
import { ringsLayout, type Dot } from '../lib/rings';
import { useWidth } from './useWidth';

interface Props {
  items: Memory[];
  arcs: Arc[];
  today: DayKey;
  selectedId: Id | null;
  onSelect: (id: Id) => void;
}

/** A tap selects the nearest memory, so dots can sit close together. */
export function Rings({ items, arcs, today, selectedId, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const size = Math.min(useWidth(box, 342), 420);
  const lay = useMemo(() => ringsLayout(items, arcs, today, size), [items, arcs, today, size]);
  const sel = lay.dots.find((d) => d.id === selectedId);

  const tap = (e: TargetedMouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let best: Dot | null = null;
    let dist = 34 * 34;
    for (const d of lay.dots) {
      const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
      if (dd < dist) {
        dist = dd;
        best = d;
      }
    }
    if (best) onSelect(best.id);
  };

  return (
    <div class="rings" ref={box} style={{ height: `${size}px` }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Годовые кольца: ${lay.rings.map((r) => r.label).join(', ')}`}
        onClick={tap}
      >
        {lay.rings.map((r) => (
          <circle key={r.label} class="rg" cx={lay.c} cy={lay.c} r={r.r} />
        ))}
        {lay.past && <path class="rg-past" d={lay.past} />}
        {lay.links.map((d, i) => (
          <path key={`l${i}`} class="rg-link" d={d} />
        ))}
        {lay.done.map((d, i) => (
          <path key={`d${i}`} class="rg-arc" d={d} />
        ))}
        {lay.plan.map((d, i) => (
          <path key={`p${i}`} class="rg-plan" d={d} />
        ))}
        {lay.today && (
          <>
            <circle class="rg-today-ring" cx={lay.today.x} cy={lay.today.y} r={8} />
            <circle class="rg-today" cx={lay.today.x} cy={lay.today.y} r={3.5} />
          </>
        )}
        {lay.dots.map((d) => (
          <circle key={d.id} class={`rg-dot rg-dot--${d.kind}`} cx={d.x} cy={d.y} r={6} />
        ))}
        {sel && <circle class="rg-sel" cx={sel.x} cy={sel.y} r={11} />}
        <g class="rg-labels">
          {lay.rings.map((r) => (
            <text key={`t${r.label}`} x={r.x} y={r.y}>
              {r.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
