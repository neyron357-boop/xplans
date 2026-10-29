import type { AppState, Change, DayKey, DayLog } from '../store/model';
import { smoothPath, type P } from './curves';
import { addDays, daysBetween, parseDay } from './dates';
import { runBack } from './growth';

type Days = Record<DayKey, DayLog>;

/** Monday-first weekday: 0 is Monday. */
export const weekday = (k: DayKey) => (parseDay(k).getDay() + 6) % 7;

export const WD = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
const SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const BY = ['по понедельникам', 'по вторникам', 'по средам', 'по четвергам', 'по пятницам', 'по субботам', 'по воскресеньям'];
const ON = ['на понедельник', 'на вторник', 'на среду', 'на четверг', 'на пятницу', 'на субботу', 'на воскресенье'];

/** A day counts once strength or a change was answered. */
export const answered = (log: DayLog | undefined): log is DayLog => !!log && (log.energy != null || log.change != null);

export interface Finding {
  /** Holds the conclusion, so a changed conclusion is asked about again. */
  key: string;
  text: string;
  fix?: string;
  /** A guess worth checking with you; plain facts are not asked about. */
  ask: boolean;
  /** Mean strength by weekday, for the picture of the rhythm. */
  week?: (number | null)[];
  best?: number;
}

export interface Growing {
  key: string;
  title: string;
  have: number;
  need: number;
  /** Enough days are in, but they are too much alike yet. */
  wait?: string;
}

export interface Reading {
  found: Finding[];
  growing: Growing[];
  /** Days in a row with the step done. */
  stepRun: number;
  /** Habit marks over the last 7 days. */
  roots7: number;
  /** Days with an answer. */
  answered: number;
  /** The strongest weekday, once the rhythm is clear. */
  best: number | null;
}

const RECENT_DAYS = 84;

/** Patterns from the daily answers, worked out on the phone each time. Each one needs enough days first. */
export function readPatterns(s: AppState, today: DayKey): Reading {
  const days = s.days;
  const keys = Object.keys(days)
    .filter((k) => k <= today && answered(days[k]))
    .sort();
  const recent = keys.filter((k) => daysBetween(k, today) < RECENT_DAYS);
  const found: Finding[] = [];
  const growing: Growing[] = [];
  const energy = (k: DayKey) => days[k]?.energy;
  let best: number | null = null;

  // Which weekdays carry more strength.
  {
    const NEED = 14;
    const sum = Array<number>(7).fill(0);
    const n = Array<number>(7).fill(0);
    for (const k of recent) {
      const e = energy(k);
      if (e == null) continue;
      sum[weekday(k)] += e;
      n[weekday(k)]++;
    }
    const total = n.reduce((a, b) => a + b, 0);
    if (total < NEED || n.filter(Boolean).length < 5) {
      growing.push({ key: 'rhythm', title: 'Силы по дням', have: Math.min(total, NEED), need: NEED, wait: total >= NEED ? 'нужны все дни' : undefined });
    } else {
      const mean = n.map((c, i) => (c ? sum[i] / c : null));
      const firm = [0, 1, 2, 3, 4, 5, 6].filter((i) => n[i] >= 2);
      const at = (i: number) => mean[i] ?? 0;
      const hi = firm.reduce((a, b) => (at(b) > at(a) ? b : a), firm[0] ?? 0);
      const lo = firm.reduce((a, b) => (at(b) < at(a) ? b : a), firm[0] ?? 0);
      if (firm.length >= 2 && at(hi) - at(lo) >= 0.75) {
        best = hi;
        found.push({ key: `rhythm:${hi}:${lo}`, text: `Сил больше ${BY[hi]}`, fix: `трудное — ${ON[hi]}, в ${SHORT[lo]} — минимум`, ask: true, week: mean, best: hi });
      } else {
        found.push({ key: 'rhythm:flat', text: 'Силы ровные всю неделю', fix: 'день недели не важен', ask: true, week: mean });
      }
    }
  }

  // Whether the step depends on strength.
  {
    const NEED = 10;
    const withE = recent.filter((k) => energy(k) != null);
    const low = withE.filter((k) => (energy(k) ?? 0) <= 2);
    const high = withE.filter((k) => (energy(k) ?? 0) >= 4);
    const rate = (list: DayKey[]) => list.filter((k) => days[k]?.stepDone).length / list.length;
    if (withE.length < NEED || low.length < 3 || high.length < 3) {
      growing.push({ key: 'steps', title: 'Силы ↔ шаг', have: Math.min(withE.length, NEED), need: NEED, wait: withE.length >= NEED ? 'нужны разные дни' : undefined });
    } else {
      const rl = rate(low);
      const rh = rate(high);
      if (rh < 0.4) found.push({ key: 'steps:rare', text: 'Шаг идёт редко, даже с силами', fix: 'раздели шаг на два поменьше', ask: true });
      else if (rh - rl >= 0.3) found.push({ key: 'steps:low', text: 'В слабые дни шаг не идёт', fix: 'минимум ещё меньше', ask: true });
      else if (rl >= 0.6) found.push({ key: 'steps:hold', text: 'Шаг идёт даже без сил', fix: 'линия держится', ask: false });
      else found.push({ key: 'steps:flat', text: 'Шаг почти не зависит от сил', ask: false });
    }
  }

  // What comes the day before a breakdown.
  {
    const NEED = 21;
    if (keys.length < NEED) {
      growing.push({ key: 'broke', title: 'Что ведёт к срыву', have: keys.length, need: NEED });
    } else {
      const broke = keys.filter((k) => days[k]?.change === 'broke');
      if (broke.length < 3) {
        found.push({ key: 'broke:rare', text: 'Срывов почти нет', fix: 'линия держится', ask: false });
      } else {
        const before = (k: DayKey) => days[addDays(k, -1)];
        const signs: [string, (l: DayLog) => boolean, string, string][] = [
          ['tired', (l) => l.energy != null && l.energy <= 2, 'Срыв — после дня без сил', 'после слабого дня — только минимум'],
          ['nostep', (l) => !l.stepDone, 'Срыв — после дня без шага', 'хоть минимум, но каждый день'],
          ['noroots', (l) => !l.habits?.length, 'Срыв — после дня без корешков', 'один корешок держит день'],
        ];
        const known = keys.filter((k) => answered(before(k)));
        const knownBroke = broke.filter((k) => answered(before(k)));
        let pick: Finding | null = null;
        let lift = 1.3;
        if (knownBroke.length >= 3) {
          for (const [id, has, text, fix] of signs) {
            const share = (list: DayKey[]) => list.filter((k) => has(before(k) ?? {})).length / list.length;
            const pre = share(knownBroke);
            const l = pre / Math.max(share(known), 0.05);
            if (pre >= 0.6 && l >= lift) {
              lift = l;
              pick = { key: `broke:${id}`, text, fix, ask: true };
            }
          }
        }
        if (!pick) {
          const byDay = Array<number>(7).fill(0);
          for (const k of broke) byDay[weekday(k)]++;
          const top = byDay.indexOf(Math.max(...byDay));
          if (byDay[top] >= Math.max(2, Math.ceil(broke.length / 2))) {
            pick = { key: `broke:wd${top}`, text: `Срывы чаще ${BY[top]}`, fix: `в ${SHORT[top]} — только минимум`, ask: true };
          }
        }
        found.push(pick ?? { key: 'broke:none', text: 'Срывы — без общего повода', ask: false });
      }
    }
  }

  // Whether habits give strength the next day.
  {
    const NEED = 14;
    const marks = (k: DayKey) => days[addDays(k, -1)]?.habits?.length ?? 0;
    const pairs = recent.filter((k) => energy(k) != null && !!days[addDays(k, -1)]);
    const after = pairs.filter((k) => marks(k) > 0);
    const without = pairs.filter((k) => marks(k) === 0);
    if (pairs.length < NEED || after.length < 3 || without.length < 3) {
      growing.push({ key: 'roots', title: 'Корешки ↔ силы', have: Math.min(pairs.length, NEED), need: NEED, wait: pairs.length >= NEED ? 'нужны разные дни' : undefined });
    } else {
      const mean = (list: DayKey[]) => list.reduce((a, k) => a + (energy(k) ?? 0), 0) / list.length;
      const diff = mean(after) - mean(without);
      if (diff >= 0.6) found.push({ key: 'roots:up', text: 'После корешков сил больше', fix: 'корешки держат силы', ask: true });
      else if (diff <= -0.6) found.push({ key: 'roots:down', text: 'После корешков сил меньше', fix: 'может, корешков слишком много', ask: true });
      else found.push({ key: 'roots:flat', text: 'Корешки и силы — без связи', ask: false });
    }
  }

  let roots7 = 0;
  for (let i = 0; i < 7; i++) roots7 += days[addDays(today, -i)]?.habits?.length ?? 0;
  growing.sort((a, b) => b.have / b.need - a.have / a.need);

  return {
    found,
    growing,
    stepRun: runBack(today, (k) => !!days[k]?.stepDone).run,
    roots7,
    answered: keys.length,
    best,
  };
}

/* The fabric of days */

export type Tone = 'moved' | 'chance' | 'broke' | 'low' | 'plain';

export interface Stitch {
  k: DayKey;
  x: number;
  y: number;
  /** future: later this week; before: before the app; empty: no answer; day: answered. */
  kind: 'future' | 'before' | 'empty' | 'day';
  r: number;
  tone: Tone;
  /** Brightness by strength, 0..1. */
  a: number;
  step: boolean;
  today: boolean;
}

export interface Weave {
  stitches: Stitch[];
  /** Threads through days with the step done, one per unbroken run. */
  threads: string[];
  cw: number;
  height: number;
  /** Baseline of the weekday letters. */
  letters: number;
  /** Top and height of the woven area, for the column light. */
  top: number;
  depth: number;
}

const TONE: Record<Change, Tone> = { none: 'plain', moved: 'moved', chance: 'chance', broke: 'broke', low: 'low' };

/**
 * Weeks as rows, Monday to Sunday, this week at the bottom. An answered day is a stitch:
 * bigger with more strength, coloured by what changed. Days with the step done are joined by a thread.
 */
export function weave(days: Days, today: DayKey, start: DayKey, w: number, rows = 5): Weave {
  const cw = w / 7;
  const rh = 30;
  const top = 12;
  const first = addDays(today, -weekday(today) - 7 * (rows - 1));
  const stitches: Stitch[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 7; c++) {
      const k = addDays(first, r * 7 + c);
      const base = { k, x: cw * (c + 0.5), y: top + rh * (r + 0.5), today: k === today, step: false, tone: 'plain' as Tone, a: 0 };
      const log = days[k];
      if (k > today) stitches.push({ ...base, kind: 'future', r: 3.5 });
      else if (answered(log)) {
        const e = log.energy;
        stitches.push({
          ...base,
          kind: 'day',
          r: e ? 3 + e * 1.4 : 4.5,
          tone: log.change ? TONE[log.change] : 'plain',
          a: e ? 0.3 + e * 0.14 : 0.5,
          step: !!log.stepDone,
        });
      } else stitches.push({ ...base, kind: start && k < start ? 'before' : 'empty', r: 1.6 });
    }
  }
  const threads: string[] = [];
  let run: P[] = [];
  // Between two stitches the thread swings to one side and then the other, like embroidery.
  const close = () => {
    if (run.length > 1) {
      const pts: P[] = [run[0]];
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1];
        const b = run[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const side = i % 2 ? 5 : -5;
        pts.push({ x: (a.x + b.x) / 2 - ((b.y - a.y) / len) * side, y: (a.y + b.y) / 2 + ((b.x - a.x) / len) * side }, b);
      }
      threads.push(smoothPath(pts));
    }
    run = [];
  };
  for (const st of stitches) {
    if (st.kind === 'day' && st.step) run.push({ x: st.x, y: st.y });
    else close();
  }
  close();
  return { stitches, threads, cw, height: top + rows * rh + 26, letters: top + rows * rh + 18, top, depth: rows * rh };
}
