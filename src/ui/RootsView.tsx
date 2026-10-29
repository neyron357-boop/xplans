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
  /** This line grows in after the others are there. */
  drawId?: Id | null;
  /** Mark the active line with "ты здесь". */
  here?: boolean;
  label?: string;
}

/**
 * The roots grow in when they appear: the line you are on first, then the backups,
 * then their fibers, nodes and codes. A selected line stands out; the rest step back.
 */
export function RootsView({ lines, activeId, height, onSelect, selectedId, tags, drawId, here, label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 342);
  const lay = useMemo(() => layoutRoots(lines, activeId, w, height), [lines, activeId, w, height]);
  const byId = new Map(lines.map((l) => [l.id, l]));
  const aria = label ?? `Корни плана: ${lines.map((l) => (l.closed ? `${l.code} закрыта` : l.code)).join(', ') || 'пусто'}`;

  // When one line is being drawn, the others are already there.
  const delay = new Map<Id, number>();
  let k = 0;
  for (const t of lay.threads) {
    delay.set(t.id, drawId ? (t.id === drawId ? 320 : 0) : t.kind === 'main' ? 0 : t.kind === 'closed' ? 200 : 160 + k++ * 110);
  }
  const at = (id: Id, extra = 0) => ({ '--d': `${(delay.get(id) ?? 0) + extra}ms` });
  const hasSel = !!onSelect && !!selectedId;

  return (
    <div class={`roots${hasSel ? ' has-sel' : ''}`} ref={box} style={{ height: `${height}px` }}>
      <svg class="roots__svg" width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={aria}>
        <defs>
          <radialGradient id="rt-ember">
            <stop offset="0" stop-color="var(--line-main)" stop-opacity="0.32" />
            <stop offset="0.5" stop-color="var(--line-main)" stop-opacity="0.08" />
            <stop offset="1" stop-color="var(--line-main)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <circle class="rt-glow" cx={lay.goal.x} cy={lay.goal.y} r={48} fill="url(#rt-ember)" />
        {lay.here && activeId && <circle class="rt-glow rt-glow--here" cx={lay.here.x} cy={lay.here.y} r={30} fill="url(#rt-ember)" style={at(activeId, 600)} />}
        <g class="rt-bg">
          {lay.bg.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {lay.fibers.map((f, i) => (
          <path
            key={`f${f.id}${i}`}
            class={`rt-fiber rt-fiber--${f.kind}`}
            d={f.d}
            style={{ ...at(f.id, 520), '--o': f.dir < 0 ? '0% 100%' : '0% 0%', '--sd': `${-i * 0.9}s` }}
          />
        ))}
        {lay.threads.map((t) =>
          t.kind === 'closed' ? (
            <path key={t.id} class="rt rt--closed rt-fade" d={t.d} style={at(t.id)} />
          ) : (
            <path
              key={`${t.id}:${t.id === drawId}`}
              class={`rt rt--${t.kind} rt-in${t.id === selectedId ? ' is-sel' : ''}`}
              d={t.d}
              pathLength={1}
              style={at(t.id)}
            />
          ),
        )}
        {lay.threads.map((t) => t.ring && <circle key={`r${t.id}`} class="rt-ring pop-in" cx={t.ring.x} cy={t.ring.y} r={5} style={at(t.id, 300)} />)}
        <circle class="rt-goal-ring" cx={lay.goal.x} cy={lay.goal.y} r={19} />
        <circle class="rt-goal pop-in" cx={lay.goal.x} cy={lay.goal.y} r={13} />
        <circle class="rt-origin pop-in" cx={lay.origin.x} cy={lay.origin.y} r={6} />
        {lay.nodes.map((n) => (
          <circle key={`n${n.id}`} class={`rt-node rt-node--${n.kind} pop-in`} cx={n.x} cy={n.y} r={5} style={at(n.id, 600)} />
        ))}
        {lay.here && activeId && (
          <>
            <circle class="rt-here-pulse" cx={lay.here.x} cy={lay.here.y} r={12} style={at(activeId, 900)} />
            <circle class="rt-here pop-in" cx={lay.here.x} cy={lay.here.y} r={7} style={at(activeId, 600)} />
            <circle class="rt-here-ring pop-in" cx={lay.here.x} cy={lay.here.y} r={12} style={at(activeId, 700)} />
          </>
        )}
      </svg>
      {here && lay.here && activeId && (
        <span class="roots__here" style={{ left: `${lay.here.x - 26}px`, top: `${lay.here.y + 16}px`, ...at(activeId, 800) }}>
          ты здесь
        </span>
      )}
      {(onSelect || tags) &&
        lay.chips.map((c) => {
          const l = byId.get(c.id);
          if (!l) return null;
          const kind = kindOf(l, activeId);
          const pos = { left: `${c.x}px`, top: `${c.y}px`, ...at(c.id, 500) };
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
