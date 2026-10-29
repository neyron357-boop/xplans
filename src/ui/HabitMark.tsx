import type { AppState, Habit, HabitLink, Line } from '../store/model';
import { currentGoal } from '../store/actions';
import { kindOf } from '../lib/roots';
import { LineChip, lineColor } from './LineChip';

export function linkedLine(s: AppState, link: HabitLink | undefined): Line | undefined {
  return link?.t === 'line' ? s.lines.find((l) => l.id === link.id) : undefined;
}

/** A habit takes the colour of what it feeds: its line, the runway, or plain ink. */
export function habitColor(s: AppState, h: Habit): string {
  if (h.link?.t === 'runway') return 'var(--line-ace)';
  const line = linkedLine(s, h.link);
  return line ? lineColor[kindOf(line, currentGoal(s)?.activeLineId)] : 'var(--ink)';
}

/** The code of what a habit feeds: A, A2, or ◆ запас. */
export function HabitMark({ s, link }: { s: AppState; link: HabitLink | undefined }) {
  if (link?.t === 'runway') return <span class="chip chip--ace">◆ запас</span>;
  const line = linkedLine(s, link);
  return line ? <LineChip code={line.code} kind={kindOf(line, currentGoal(s)?.activeLineId)} /> : null;
}
