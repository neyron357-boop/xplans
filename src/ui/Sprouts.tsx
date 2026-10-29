import type { TargetedMouseEvent } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { DayKey, DayLog, Habit, Id } from '../store/model';
import { seeded, smoothPath, type Curve } from '../lib/curves';
import { plural } from '../lib/dates';
import { bestRun, doneOn, rootDepth, rootlet, runBack } from '../lib/growth';
import { tap } from '../lib/haptics';
import { useWidth } from './useWidth';

interface Props {
  habits: Habit[];
  colors: string[];
  days: Record<DayKey, DayLog>;
  today: DayKey;
  selectedId: Id | null;
  onSelect: (id: Id) => void;
  onToggle: (id: Id) => void;
}

const H = 236;
const SOIL = 60;
const DEPTH = H - SOIL - 42;
const STAGGER = 140;

const r1 = (n: number) => Math.round(n * 10) / 10;

function soilOf(w: number, y: number, amp: number, phase: number) {
  const pts = [];
  for (let x = -10; x <= w + 44; x += 34) pts.push({ x, y: y + amp * Math.sin(x / 41 + phase) });
  return smoothPath(pts);
}

/** Layers of soil at the depth of a week and a month in a row. */
const LAYERS = [
  { days: 7, label: '7' },
  { days: 30, label: '30' },
];

function grainsOf(w: number) {
  const rnd = seeded(`soil:${Math.round(w)}`);
  return Array.from({ length: Math.round(w / 13) }, () => ({ x: rnd() * w, y: SOIL + 16 + rnd() * (H - SOIL - 24), r: 0.6 + rnd() * 0.9 }));
}

interface Col {
  h: Habit;
  i: number;
  x: number;
  color: string;
  shape: Curve & { side: number };
  run: number;
  on: boolean;
  best: number;
}

/**
 * Each habit is a seed in the soil with a rootlet under it. The rootlet goes deeper with every
 * day in a row and puts out a side hair for every full week. A broken run leaves its old depth
 * as a dotted trace, the way a closed line stays on the roots. Tapping a seed marks today.
 */
export function Sprouts({ habits, colors, days, today, selectedId, onSelect, onToggle }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 342);
  const colW = w / Math.max(1, habits.length);
  const ids = habits.map((h) => h.id).join('|');
  const shapes = useMemo(() => habits.map((h, i) => rootlet(h.id, colW * (i + 0.5), SOIL + 13, DEPTH)), [ids, colW]);
  const soil = useMemo(() => soilOf(w, SOIL, 2.2, 0), [w]);
  const layers = useMemo(
    () => LAYERS.map((l, i) => ({ ...l, y: SOIL + 13 + DEPTH * rootDepth(l.days), d: soilOf(w, SOIL + 13 + DEPTH * rootDepth(l.days), 3, 1.3 + i) })),
    [w],
  );
  const grains = useMemo(() => grainsOf(w), [w]);
  const cols: Col[] = habits.map((h, i) => {
    const { run, today: on } = runBack(today, (k) => doneOn(days, k, h.id));
    return { h, i, x: colW * (i + 0.5), color: colors[i], shape: shapes[i], run, on, best: bestRun(days, h.id) };
  });

  const pick = (e: TargetedMouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.min(habits.length - 1, Math.max(0, Math.floor((e.clientX - r.left) / colW)));
    if (habits[i]) onSelect(habits[i].id);
  };
  const label = cols.map((c) => `${c.h.name} — ${c.run} ${plural(c.run, 'день', 'дня', 'дней')} подряд`).join(', ');

  return (
    <div class={`sprouts${habits.length > 1 && selectedId ? ' has-sel' : ''}`} ref={box} style={{ height: `${H}px` }}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Корешки: ${label || 'пока нет'}`} onClick={pick}>
        {layers.map((l) => (
          <g key={l.label} class="sp-layer">
            <path d={l.d} />
            <text x={w - 2} y={l.y - 6}>
              {l.label}
            </text>
          </g>
        ))}
        <path class="sp-soil" d={soil} />
        <g class="sp-grains">
          {grains.map((g, i) => (
            <circle key={i} cx={r1(g.x)} cy={r1(g.y)} r={r1(g.r)} />
          ))}
        </g>
        {cols.map((c) => (
          <Rootlet key={c.h.id} c={c} selected={c.h.id === selectedId} />
        ))}
      </svg>
      {cols.map((c) => (
        <button
          key={`n${c.h.id}`}
          type="button"
          class="sprout__name"
          style={{ left: `${c.x - colW / 2}px`, width: `${colW}px`, '--d': `${c.i * STAGGER}ms` }}
          aria-pressed={c.h.id === selectedId}
          onClick={() => onSelect(c.h.id)}
        >
          {c.h.name}
        </button>
      ))}
      {cols.map((c) => (
        <button
          key={`s${c.h.id}`}
          type="button"
          class={`sprout__seed${!c.on && c.h.id === selectedId ? ' is-waiting' : ''}`}
          style={{ left: `${c.x}px`, top: `${SOIL}px`, '--c': c.color, '--d': `${c.i * STAGGER}ms` }}
          aria-pressed={c.on}
          aria-label={`${c.h.name}: сегодня`}
          onClick={() => {
            tap();
            onToggle(c.h.id);
            onSelect(c.h.id);
          }}
        >
          <span class="seed" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Fine hairs along the grown part, one every second day, so a long run looks richer. */
function hairsOf(c: Col): string {
  const rnd = seeded(`${c.h.id}:hairs`);
  let d = '';
  for (let k = 2; k <= Math.min(c.run, 60); k += 2) {
    const p = c.shape.at(rootDepth(k) - 0.012);
    const side = (k / 2) % 2 ? 1 : -1;
    const len = 3 + rnd() * 4;
    d += `M${r1(p.x)} ${r1(p.y)} q${r1(side * len * 0.6)} ${r1(len * 0.15)}, ${r1(side * len)} ${r1(len * 0.8)} `;
  }
  return d.trim();
}

function Rootlet({ c, selected }: { c: Col; selected: boolean }) {
  const f = rootDepth(c.run);
  const fb = c.best > c.run ? rootDepth(c.best) : 0;
  const tip = c.shape.at(f);
  const record = fb ? c.shape.at(fb) : null;
  const weeks = Math.min(8, Math.floor(c.run / 7));
  const hairs = hairsOf(c);
  const d = c.i * STAGGER;
  return (
    <g
      class={`sp-col${selected ? ' is-sel' : ''}`}
      style={{ '--c': c.color, '--d': `${d}ms`, '--sd': `${(-c.i * 1.7).toFixed(1)}s`, transformOrigin: `${r1(c.x)}px ${SOIL}px` }}
    >
      <radialGradient id={`sp-glow-${c.i}`}>
        <stop offset="0" style={{ stopColor: 'var(--c)', stopOpacity: 0.45 }} />
        <stop offset="1" style={{ stopColor: 'var(--c)', stopOpacity: 0 }} />
      </radialGradient>
      {record && <path class="sp-ghost" d={c.shape.part(f, fb)} />}
      {hairs && <path class="sp-hairs" d={hairs} />}
      {record && <circle class="sp-best" cx={r1(record.x)} cy={r1(record.y)} r={2.6} />}
      <path class="sp-root" d={c.shape.d} pathLength={1} style={{ '--f': f.toFixed(3) }} />
      <path class="sp-root sp-root--top" d={c.shape.d} pathLength={1} style={{ '--f': Math.min(f, 0.22).toFixed(3) }} />
      {Array.from({ length: weeks }, (_, k) => {
        const p = c.shape.at(rootDepth(7 * (k + 1)));
        const side = c.shape.side * (k % 2 ? -1 : 1);
        return (
          <path
            key={k}
            class="sp-fiber"
            d={`M${r1(p.x)} ${r1(p.y)} c${side * 4} 1, ${side * 9} 4, ${side * 13} 10`}
            style={{ '--o': side < 0 ? '100% 0%' : '0% 0%', '--fd': `${(-k * 0.8).toFixed(1)}s` }}
          />
        );
      })}
      {c.run > 0 && (
        <g class="sp-tip" style={{ transform: `translate(${r1(tip.x)}px, ${r1(tip.y)}px)` }}>
          {c.on && <circle class="sp-tip-glow" r={14} fill={`url(#sp-glow-${c.i})`} />}
          <circle class="sp-dot pop-in" r={3.2} style={{ '--d': `${d + 900}ms` }} />
          <text x={8} y={4}>
            {c.run}
          </text>
        </g>
      )}
    </g>
  );
}
