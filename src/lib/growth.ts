import type { DayKey, DayLog, Id } from '../store/model';
import { walkable, seeded, type Curve, type P } from './curves';
import { addDays, parseDay } from './dates';

type Days = Record<DayKey, DayLog>;

export const doneOn = (days: Days, day: DayKey, id: Id) => !!days[day]?.habits?.includes(id);

/** Days in a row that pass `ok`, counted back from today. A run waits for today until the day ends. */
export function runBack(today: DayKey, ok: (day: DayKey) => boolean): { run: number; today: boolean } {
  const now = ok(today);
  let k = now ? today : addDays(today, -1);
  let run = 0;
  while (ok(k)) {
    run++;
    k = addDays(k, -1);
  }
  return { run, today: now };
}

/** The longest run of a habit ever. */
export function bestRun(days: Days, id: Id): number {
  const keys = Object.keys(days)
    .filter((k) => days[k]?.habits?.includes(id))
    .sort();
  let best = 0;
  let cur = 0;
  let prev = '';
  for (const k of keys) {
    cur = prev && addDays(prev, 1) === k ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = k;
  }
  return best;
}

/** Monday to Sunday of the week that holds `day`. */
export function weekOf(day: DayKey): DayKey[] {
  const monday = addDays(day, -((parseDay(day).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The hour a habit usually gets done: the middle of its last marks, to half an hour.
 * Marks after midnight belong to the evening before. Null until there are three.
 */
export function usualTime(days: Days, id: Id, today: DayKey): string | null {
  const marks: number[] = [];
  for (let i = 0, k = today; i < 28 && marks.length < 14; i++, k = addDays(k, -1)) {
    const m = days[k]?.habitAt?.[id];
    if (m != null) marks.push((m - 240 + 1440) % 1440);
  }
  if (marks.length < 3) return null;
  marks.sort((a, b) => a - b);
  const t = (Math.round(marks[Math.floor(marks.length / 2)] / 30) * 30 + 240) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** How far down a rootlet has grown, as a share of its full depth: quick at first, slower later. */
export const rootDepth = (run: number) => (run <= 0 ? 0.035 : 0.06 + 0.94 * Math.min(1, Math.log(1 + run) / Math.log(61)));

/**
 * The rootlet a habit can grow: from its seed at (x, top) down `len` pixels, wavering a little
 * more the deeper it goes, the same shape every time for the same habit.
 */
export function rootlet(id: Id, x: number, top: number, len: number): Curve & { side: number } {
  const rnd = seeded(id);
  const waves = 1.6 + rnd() * 1.2;
  const phase = rnd() * Math.PI * 2;
  const lean = (rnd() - 0.5) * 16;
  const amp = 5 + rnd() * 4;
  const samples: P[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i / 47;
    samples.push({ x: x + lean * t * t + amp * t * Math.sin(t * waves * Math.PI + phase), y: top + len * t });
  }
  return { ...walkable(samples), side: rnd() < 0.5 ? -1 : 1 };
}
