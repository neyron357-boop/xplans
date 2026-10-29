import type { Arc, DayKey, Id, Memory, MemoryKind } from '../store/model';
import { addDays, whenOf, yearFraction } from './dates';

export interface Dot {
  id: Id;
  x: number;
  y: number;
  kind: MemoryKind;
}

export interface RingsLayout {
  c: number;
  rings: { r: number; label: string; x: number; y: number }[];
  /** This year so far. */
  past: string;
  /** Arcs: lived part and planned part. */
  done: string[];
  plan: string[];
  links: string[];
  dots: Dot[];
  today: { x: number; y: number } | null;
}

const TAU = Math.PI * 2;
const MAX_YEARS = 4;
/** Year labels sit at three o'clock; spread dots avoid that spot. */
const LABEL_ANGLE = Math.PI / 2;

const round = (n: number) => Math.round(n * 10) / 10;

export const sortMemories = (list: Memory[]) => {
  const rank = (m: Memory) => (m.when ? m.when.y * 10_000 + (m.when.m ?? 6.5) * 100 + (m.when.d ?? 15) : -1);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt));
};

/**
 * Year rings, newest outside, like a tree trunk. A memory sits on its year's ring at its date,
 * clockwise from the top. Memories without a date, or older than the rings shown, go to the
 * centre ring, "раньше". Arcs are drawn along the ring: solid where lived, dashed ahead.
 */
export function ringsLayout(items: Memory[], arcs: Arc[], today: DayKey, size: number): RingsLayout {
  const k = size / 342;
  const c = size / 2;
  const outer = c - 21 * k;
  const inner = 44 * k;
  const first = 80 * k;
  const now = whenOf(today);

  // Every year gets a ring, even a quiet one, like a trunk.
  const known = [now.y, ...items.flatMap((m) => (m.when ? [m.when.y] : [])), ...arcs.map((a) => Number(a.start.slice(0, 4)))];
  const last = Math.max(...known);
  const years: number[] = [];
  for (let y = Math.max(Math.min(...known), last - MAX_YEARS + 1); y <= last; y++) years.push(y);
  const radius = new Map<number, number>();
  years.forEach((y, i) => radius.set(y, years.length === 1 ? outer : first + ((outer - first) * i) / (years.length - 1)));

  const pos = (r: number, a: number) => ({ x: c + r * Math.sin(a), y: c - r * Math.cos(a) });
  const arcPath = (r: number, a0: number, a1: number) => {
    if (a1 - a0 < 0.002) return '';
    const p = pos(r, a0);
    if (a1 - a0 >= TAU - 0.002) {
      const q = pos(r, a0 + Math.PI);
      return `M${round(p.x)} ${round(p.y)} A${round(r)} ${round(r)} 0 1 1 ${round(q.x)} ${round(q.y)} A${round(r)} ${round(r)} 0 1 1 ${round(p.x)} ${round(p.y)}`;
    }
    const q = pos(r, a1);
    return `M${round(p.x)} ${round(p.y)} A${round(r)} ${round(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${round(q.x)} ${round(q.y)}`;
  };
  /** Angle of a day inside year `y`; the next New Year counts as the full circle. */
  const angleIn = (day: DayKey, y: number) => (day >= `${y + 1}-01-01` ? TAU : day < `${y}-01-01` ? 0 : yearFraction(whenOf(day)) * TAU);

  // Dots: dated ones at their angle, the rest spread by the golden angle.
  const groups = new Map<number, { m: Memory; a: number | null }[]>();
  const add = (r: number, m: Memory, a: number | null) => groups.set(r, [...(groups.get(r) ?? []), { m, a }]);
  for (const m of items) {
    const r = m.when ? radius.get(m.when.y) : undefined;
    if (m.when && r !== undefined) add(r, m, m.when.m ? yearFraction(m.when) * TAU : null);
    else add(inner, m, null);
  }
  const dots: Dot[] = [];
  for (const [r, group] of groups) {
    let spread = 0;
    const placed = group.map(({ m, a }) => {
      let angle = a ?? (3.9 + spread++ * 2.39996) % TAU;
      if (a === null && Math.abs(angle - LABEL_ANGLE) < 0.35) angle += 0.7;
      return { m, angle };
    });
    placed.sort((p, q) => p.angle - q.angle);
    // Memories closer than a dot apart spread evenly around their shared date, not past it.
    const gap = 14 / r;
    for (let i = 0; i < placed.length; ) {
      let j = i;
      while (j + 1 < placed.length && placed[j + 1].angle - placed[j].angle < gap) j++;
      const mid = (placed[i].angle + placed[j].angle) / 2;
      for (let n = i; n <= j; n++) placed[n].angle = mid + (n - i - (j - i) / 2) * gap;
      i = j + 1;
    }
    for (const { m, angle } of placed) dots.push({ id: m.id, kind: m.kind, ...pos(r, angle) });
  }

  const at = new Map(dots.map((d) => [d.id, d]));
  const links: string[] = [];
  for (const m of items) {
    for (const id of m.links ?? []) {
      const a = at.get(m.id);
      const b = at.get(id);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const cx = mx + (mx - c) * 0.35;
      const cy = my + (my - c) * 0.35;
      links.push(`M${round(a.x)} ${round(a.y)} Q${round(cx)} ${round(cy)} ${round(b.x)} ${round(b.y)}`);
    }
  }

  const done: string[] = [];
  const plan: string[] = [];
  const along = (from: DayKey, to: DayKey, out: string[]) => {
    if (from >= to) return;
    for (const y of years) {
      const d = arcPath(radius.get(y) ?? outer, angleIn(from, y), angleIn(to, y));
      if (d) out.push(d);
    }
  };
  for (const arc of arcs) {
    const end = addDays(arc.start, arc.weeks * 7);
    along(arc.start, today < end ? today : end, done);
    along(today > arc.start ? today : arc.start, end, plan);
  }

  const nowR = radius.get(now.y);
  const nowA = yearFraction(now) * TAU;
  const rings = years.map((y) => ({ r: radius.get(y) ?? outer, label: String(y), x: c + (radius.get(y) ?? outer), y: c + 4 }));
  if (groups.has(inner)) rings.unshift({ r: inner, label: 'раньше', x: c, y: c + 4 });

  return {
    c,
    rings,
    past: nowR === undefined ? '' : arcPath(nowR, 0, nowA),
    done,
    plan,
    links,
    dots,
    today: nowR === undefined ? null : pos(nowR, nowA),
  };
}
