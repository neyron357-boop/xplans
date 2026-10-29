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

/** The rings draw themselves from the inside out; a tap selects the nearest memory. */
export function Rings({ items, arcs, today, selectedId, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const size = Math.min(useWidth(box, 342), 420);
  const lay = useMemo(() => ringsLayout(items, arcs, today, size), [items, arcs, today, size]);
  const sel = lay.dots.find((d) => d.id === selectedId);
  const ms = (n: number) => ({ '--d': `${n}ms` });

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
        {lay.rings.map((r, i) => (
          <circle key={r.label} class="rg rg-in" cx={lay.c} cy={lay.c} r={r.r} pathLength={1} style={ms(i * 140)} />
        ))}
        {lay.past && <path class="rg-past rg-in" d={lay.past} pathLength={1} style={ms(400)} />}
        {lay.links.map((d, i) => (
          <path key={`l${i}`} class="rg-link rg-fade" d={d} style={ms(900 + i * 80)} />
        ))}
        {lay.done.map((d, i) => (
          <path key={`d${i}`} class="rg-arc rg-in" d={d} pathLength={1} style={ms(600 + i * 100)} />
        ))}
        {lay.plan.map((d, i) => (
          <path key={`p${i}`} class="rg-plan rg-fade" d={d} style={ms(1100 + i * 100)} />
        ))}
        {lay.dots.map((d, i) => (
          <circle key={d.id} class={`rg-dot rg-dot--${d.kind} pop-in`} cx={d.x} cy={d.y} r={6} style={ms(500 + i * 60)} />
        ))}
        {lay.today && (
          <>
            <circle class="rg-today-pulse" cx={lay.today.x} cy={lay.today.y} r={8} />
            <circle class="rg-today-ring pop-in" cx={lay.today.x} cy={lay.today.y} r={8} style={ms(800)} />
            <circle class="rg-today pop-in" cx={lay.today.x} cy={lay.today.y} r={3.5} style={ms(700)} />
          </>
        )}
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
