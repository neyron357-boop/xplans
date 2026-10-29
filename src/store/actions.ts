import type { AppState, Change, Cover, DayKey, DayLog, Goal, HabitLink, Id, Line, Memory, MemoryKind, Verdict, When } from './model';
import { commit } from './store';
import { dayKey, daysBetween, whenOf } from '../lib/dates';
import { uid } from '../lib/id';

/* Reading */

export const byCode = (a: Line, b: Line) => a.code.localeCompare(b.code, 'en', { numeric: true });

export function currentGoal(s: AppState): Goal | undefined {
  return s.goals.find((g) => g.id === s.focusGoalId) ?? s.goals[0];
}

export function goalLines(s: AppState, goalId: Id | undefined): Line[] {
  return s.lines.filter((l) => l.goalId === goalId).sort(byCode);
}

export function activeLine(s: AppState): Line | undefined {
  const g = currentGoal(s);
  return s.lines.find((l) => l.id === g?.activeLineId && !l.closed);
}

export function runwayLeft(s: AppState, today: DayKey): number | null {
  const { days, setOn } = s.runway;
  if (days == null || !setOn) return null;
  return Math.max(0, days - daysBetween(setOn, today));
}

export function currentArc(s: AppState, goalId: Id | undefined) {
  return s.arcs.filter((a) => a.goalId === goalId).sort((a, b) => b.no - a.no)[0];
}

/** A, B, C for root lines; A1, A2 for backups of A; A1.1 for backups of A1. */
export function nextCode(s: AppState, goalId: Id, parentId: Id | null): string {
  const used = new Set(s.lines.filter((l) => l.goalId === goalId).map((l) => l.code));
  const parent = s.lines.find((l) => l.id === parentId);
  if (!parent) {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!used.has(ch)) return ch;
    return `Z${used.size}`;
  }
  const base = parent.code + (/\d$/.test(parent.code) ? '.' : '');
  let n = 1;
  while (used.has(base + n)) n++;
  return base + n;
}

export function coverOk(s: AppState, c: Cover): boolean {
  if (c.t === 'line') return s.lines.some((l) => l.id === c.id && !l.closed);
  if (c.t === 'ace') return s.aces.some((a) => a.id === c.id);
  if (c.t === 'runway') return s.runway.days != null;
  return true;
}

/* Day */

const logOf = (d: AppState, day: DayKey): DayLog => (d.days[day] ??= {});

export function setEnergy(day: DayKey, energy: number) {
  commit((d) => {
    logOf(d, day).energy = energy;
  });
}

export function setChange(day: DayKey, change: Change | undefined, note = '') {
  commit((d) => {
    const log = logOf(d, day);
    log.change = change;
    log.note = note.trim() || undefined;
    if (change === 'low') log.energy ??= 1;
  });
}

export function toggleStep(day: DayKey, lineId: Id) {
  commit((d) => {
    const log = logOf(d, day);
    log.stepDone = !(log.stepDone && log.stepLineId === lineId);
    log.stepLineId = lineId;
  });
}

const minuteNow = () => {
  const t = new Date();
  return t.getHours() * 60 + t.getMinutes();
};

/** Marking a habit today also notes the time, so its usual hour can show up later. */
export function toggleHabit(day: DayKey, id: Id) {
  commit((d) => {
    const log = logOf(d, day);
    const done = new Set(log.habits);
    const at = { ...log.habitAt };
    if (done.has(id)) {
      done.delete(id);
      delete at[id];
    } else {
      done.add(id);
      if (day === dayKey()) at[id] = minuteNow();
    }
    log.habits = [...done];
    log.habitAt = Object.keys(at).length ? at : undefined;
  });
}

export function snoozeRunway(day: DayKey) {
  commit((d) => {
    logOf(d, day).runwaySnoozed = true;
  });
}

export function saveHabits(list: { id?: Id; name: string; link?: HabitLink }[]) {
  commit((d) => {
    const keep = list.filter((h) => h.name.trim());
    const kept = new Set(keep.map((h) => h.id));
    for (const h of d.habits) if (!kept.has(h.id)) h.archived = true;
    for (const h of keep) {
      const old = h.id ? d.habits.find((x) => x.id === h.id) : undefined;
      if (old) {
        old.name = h.name.trim();
        old.archived = undefined;
        old.link = h.link;
      } else {
        d.habits.push({ id: uid(), name: h.name.trim(), link: h.link });
      }
    }
  });
}

/* Lines */

function remember(d: AppState, title: string, kind: MemoryKind, extra: Partial<Memory> = {}) {
  const today = dayKey();
  d.memories.push({ id: uid(), title, kind, when: whenOf(today), createdAt: today, ...extra });
}

export function addLine(p: {
  goalId: Id;
  parentId: Id | null;
  name: string;
  cond?: string;
  activate?: boolean;
  riskId?: Id;
}): Id {
  const id = uid();
  commit((d) => {
    const code = nextCode(d, p.goalId, p.parentId);
    const name = p.name.trim();
    const cond = p.cond?.trim() ?? '';
    d.lines.push({ id, goalId: p.goalId, parentId: p.parentId, code, name, cond, step: '', mini: '', closed: false, createdAt: dayKey() });
    const g = d.goals.find((x) => x.id === p.goalId);
    if (g && (p.activate || !g.activeLineId)) g.activeLineId = id;
    if (p.riskId) d.risks.find((r) => r.id === p.riskId)?.covers.push({ t: 'line', id });
    remember(d, `${code} · ${name}`, 'line', { ref: id, note: cond ? `→ ${cond}` : undefined });
  });
  return id;
}

export function updateLine(id: Id, patch: Partial<Pick<Line, 'name' | 'cond'>>) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === id);
    if (l) Object.assign(l, patch);
  });
}

/** A new step text starts undone, even if today's old step was done. */
export function setStep(day: DayKey, lineId: Id, step: string, mini: string) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === lineId);
    if (!l) return;
    const changed = l.step !== step.trim();
    l.step = step.trim();
    l.mini = mini.trim();
    const log = d.days[day];
    if (changed && log?.stepLineId === lineId) log.stepDone = false;
  });
}

export function setActive(lineId: Id) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === lineId);
    const g = d.goals.find((x) => x.id === l?.goalId);
    if (l && g && !l.closed) g.activeLineId = l.id;
  });
}

export function closeLine(id: Id, reason: string | undefined, nextId: Id | null) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === id);
    if (!l) return;
    l.closed = true;
    l.closedAt = dayKey();
    l.reason = reason || undefined;
    const g = d.goals.find((x) => x.id === l.goalId);
    if (g && g.activeLineId === id) g.activeLineId = nextId;
    remember(d, `${l.code} закрыта`, 'closed', { ref: id, note: reason || undefined });
  });
}

export function reopenLine(id: Id) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === id);
    if (!l) return;
    l.closed = false;
    l.closedAt = undefined;
    l.reason = undefined;
    const g = d.goals.find((x) => x.id === l.goalId);
    if (g && !g.activeLineId) g.activeLineId = id;
  });
}

/** Only for lines without backups of their own. */
export function deleteLine(id: Id) {
  commit((d) => {
    const l = d.lines.find((x) => x.id === id);
    if (!l || d.lines.some((x) => x.parentId === id)) return;
    d.lines = d.lines.filter((x) => x.id !== id);
    for (const a of d.aces) a.lineIds = a.lineIds.filter((x) => x !== id);
    for (const r of d.risks) r.covers = r.covers.filter((c) => !(c.t === 'line' && c.id === id));
    if (d.runway.lineId === id) d.runway.lineId = null;
    const g = d.goals.find((x) => x.id === l.goalId);
    if (g?.activeLineId === id) g.activeLineId = d.lines.find((x) => x.goalId === g.id && !x.closed)?.id ?? null;
  });
}

/* Goals and arcs */

function startArc(d: AppState, goalId: Id) {
  if (d.arcs.some((a) => a.goalId === goalId)) return;
  const no = Math.max(0, ...d.arcs.map((a) => a.no)) + 1;
  const id = uid();
  d.arcs.push({ id, no, goalId, start: dayKey(), weeks: 12 });
  const title = d.goals.find((g) => g.id === goalId)?.title ?? '';
  remember(d, `Арка ${no}: ${title}`, 'arc', { ref: id, note: '12 недель' });
}

export function renameGoal(id: Id, title: string) {
  commit((d) => {
    const g = d.goals.find((x) => x.id === id);
    if (g && title.trim()) g.title = title.trim();
  });
}

export function setFocus(goalId: Id) {
  commit((d) => {
    d.focusGoalId = goalId;
    startArc(d, goalId);
  });
}

export function addGoal(title: string, firstLine: string) {
  commit((d) => {
    const today = dayKey();
    const id = uid();
    const lineId = uid();
    d.goals.push({ id, title: title.trim(), activeLineId: lineId, createdAt: today });
    d.lines.push({ id: lineId, goalId: id, parentId: null, code: 'A', name: firstLine.trim(), cond: 'основная', step: '', mini: '', closed: false, createdAt: today });
    d.focusGoalId = id;
    startArc(d, id);
  });
}

/* Aces, runway, risks */

export function saveAce(a: { id?: Id; name: string; gives: string; lineIds: Id[]; all: boolean }) {
  commit((d) => {
    const data = { name: a.name.trim(), gives: a.gives.trim(), lineIds: a.all ? [] : a.lineIds, all: a.all || undefined };
    const old = a.id ? d.aces.find((x) => x.id === a.id) : undefined;
    if (old) Object.assign(old, data);
    else d.aces.push({ id: uid(), ...data });
  });
}

export function deleteAce(id: Id) {
  commit((d) => {
    d.aces = d.aces.filter((a) => a.id !== id);
    for (const r of d.risks) r.covers = r.covers.filter((c) => !(c.t === 'ace' && c.id === id));
  });
}

export function setRunway(p: { days: number | null; threshold: number; lineId: Id | null }) {
  commit((d) => {
    d.runway = { days: p.days, setOn: p.days == null ? null : dayKey(), threshold: p.threshold, lineId: p.lineId };
  });
}

export function saveRisk(r: { id?: Id; title: string; covers: Cover[] }) {
  commit((d) => {
    const old = r.id ? d.risks.find((x) => x.id === r.id) : undefined;
    if (old) {
      old.title = r.title.trim();
      old.covers = r.covers;
    } else {
      d.risks.push({ id: uid(), title: r.title.trim(), covers: r.covers });
    }
  });
}

export function deleteRisk(id: Id) {
  commit((d) => {
    d.risks = d.risks.filter((r) => r.id !== id);
  });
}

/* Memory */

export function rememberNow(title: string, kind: MemoryKind, ref?: Id) {
  commit((d) => remember(d, title.trim(), kind, { ref }));
}

export function saveMemory(m: { id?: Id; title: string; note: string; when: When | null; links: Id[] }): Id {
  const id = m.id ?? uid();
  commit((d) => {
    const data = { title: m.title.trim(), note: m.note.trim() || undefined, when: m.when, links: m.links.length ? m.links : undefined };
    const old = d.memories.find((x) => x.id === id);
    if (old) Object.assign(old, data);
    else d.memories.push({ id, kind: 'note', createdAt: dayKey(), ...data });
  });
  return id;
}

export function deleteMemory(id: Id) {
  commit((d) => {
    d.memories = d.memories.filter((m) => m.id !== id);
    for (const m of d.memories) if (m.links) m.links = m.links.filter((x) => x !== id);
  });
}

export function markBackup() {
  commit((d) => {
    d.backupAt = dayKey();
  });
}

/* Knowledge */

export function saveStudy(p: { id?: Id; name: string; next: string; lineId: Id | null; measured: boolean }): Id {
  const id = p.id ?? uid();
  commit((d) => {
    const data = { name: p.name.trim(), next: p.next.trim() || undefined, lineId: p.lineId ?? undefined };
    const old = d.studies.find((x) => x.id === id);
    if (old) {
      Object.assign(old, data);
      // Checks already taken are history; measuring is only switched off before the first one.
      if (p.measured) old.measure ??= { checks: [] };
      else if (!old.measure?.checks.length) old.measure = undefined;
    } else {
      d.studies.push({ id, ...data, measure: p.measured ? { checks: [] } : undefined, createdAt: dayKey() });
    }
  });
  return id;
}

export function deleteStudy(id: Id) {
  commit((d) => {
    d.studies = d.studies.filter((x) => x.id !== id);
  });
}

/** One check a day: a second answer on the same day replaces the first. */
export function addCheck(studyId: Id, day: DayKey, value: number) {
  commit((d) => {
    const m = d.studies.find((x) => x.id === studyId)?.measure;
    if (!m) return;
    m.checks = [...m.checks.filter((c) => c.day !== day), { day, value }].sort((a, b) => a.day.localeCompare(b.day));
  });
}

/* Me */

export function setVerdict(key: string, v: Verdict | undefined) {
  commit((d) => {
    if (v) d.verdicts[key] = v;
    else delete d.verdicts[key];
  });
}

export function saveRules(list: { id?: Id; text: string }[]) {
  commit((d) => {
    d.rules = list.filter((r) => r.text.trim()).map((r) => ({ id: r.id ?? uid(), text: r.text.trim() }));
  });
}

export function notePause(day: DayKey) {
  commit((d) => {
    const log = logOf(d, day);
    log.pauses = (log.pauses ?? 0) + 1;
  });
}
