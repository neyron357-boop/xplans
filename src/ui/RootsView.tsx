import { useMemo, useRef } from 'preact/hooks';
import type { Id, Line } from '../store/model';
import { kindOf, layoutRoots } from '../lib/roots';
import { LineChip } from './LineChip';
import { useWidth } from './useWidth';

interface Props {
  lines: Line[];
  activeId: Id | null | undefined;
  height: number;
  /** Line codes become buttons. */
  onSelect?: (id: Id) => void;
  selectedId?: Id | null;
  /** Line codes as plain tags. */
  tags?: boolean;
  /** This line grows in. */
  drawId?: Id | null;
  /** Mark the active line with "ты здесь". */
  here?: boolean;
  label?: string;
}

export function RootsView({ lines, activeId, height, onSelect, selectedId, tags, drawId, here, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 342);
  const lay = useMemo(() => layoutRoots(lines, activeId, w, height), [lines, activeId, w, height]);
  const byId = new Map(lines.map((l) => [l.id, l]));
  const aria = label ?? `Корни плана: ${lines.map((l) => (l.closed ? `${l.code} закрыта` : l.code)).join(', ') || 'пусто'}`;

  return (
    <div class="roots" ref={box} style={{ height: `${height}px` }}>
      <svg class="roots__svg" width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={aria}>
        <g class="rt-bg">
          {lay.bg.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {lay.fibers.map((f, i) => (
          <path key={`f${i}`} class={`rt-fiber rt-fiber--${f.kind}`} d={f.d} />
        ))}
        {lay.threads.map((t) => {
          const grow = t.id === drawId && t.kind !== 'closed';
          return <path key={t.id} class={`rt rt--${t.kind}${grow ? ' xp-draw' : ''}`} d={t.d} pathLength={grow ? 100 : undefined} />;
        })}
        {lay.threads.map((t) => t.ring && <circle key={`r${t.id}`} class="rt-ring" cx={t.ring.x} cy={t.ring.y} r={5} />)}
        <circle class="rt-goal-ring" cx={lay.goal.x} cy={lay.goal.y} r={19} />
        <circle class="rt-goal" cx={lay.goal.x} cy={lay.goal.y} r={13} />
        <circle class="rt-origin" cx={lay.origin.x} cy={lay.origin.y} r={6} />
        {lay.nodes.map((n, i) => (
          <circle key={`n${i}`} class={`rt-node rt-node--${n.kind}`} cx={n.x} cy={n.y} r={5} />
        ))}
        {lay.here && (
          <>
            <circle class="rt-here" cx={lay.here.x} cy={lay.here.y} r={7} />
            <circle class="rt-here-ring" cx={lay.here.x} cy={lay.here.y} r={12} />
          </>
        )}
      </svg>
      {here && lay.here && (
        <span class="roots__here" style={{ left: `${lay.here.x - 26}px`, top: `${lay.here.y + 16}px` }}>
          ты здесь
        </span>
      )}
      {(onSelect || tags) &&
        lay.chips.map((c) => {
          const l = byId.get(c.id);
          if (!l) return null;
          const kind = kindOf(l, activeId);
          const pos = { left: `${c.x}px`, top: `${c.y}px` };
          if (!onSelect) {
            return (
              <span key={c.id} class="roots__tag" style={pos}>
                <LineChip code={l.code} kind={kind} on={kind === 'main'} />
              </span>
            );
          }
          return (
            <button
              key={c.id}
              type="button"
              class="roots__chip"
              style={pos}
              aria-pressed={c.id === selectedId}
              aria-label={`Линия ${l.code}${l.closed ? ', закрыта' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <LineChip code={l.code} kind={kind} on={c.id === selectedId} />
            </button>
          );
        })}
    </div>
  );
}
