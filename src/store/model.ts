export type Id = string;

/** Local calendar day, 'YYYY-MM-DD'. A day lasts until 04:00 of the next morning. */
export type DayKey = string;

export interface Goal {
  id: Id;
  title: string;
  /** The line you are on: "ты здесь". */
  activeLineId: Id | null;
  createdAt: DayKey;
}

export interface Line {
  id: Id;
  goalId: Id;
  /** The line this one backs up; null for a root line. */
  parentId: Id | null;
  code: string;
  name: string;
  /** When to switch to this line. */
  cond: string;
  step: string;
  /** The step for low-energy days. */
  mini: string;
  closed: boolean;
  closedAt?: DayKey;
  reason?: string;
  createdAt: DayKey;
}

/** A 12-week season with one goal in focus. */
export interface Arc {
  id: Id;
  no: number;
  goalId: Id;
  start: DayKey;
  weeks: number;
}

export interface Ace {
  id: Id;
  name: string;
  gives: string;
  lineIds: Id[];
  /** Helps every line. */
  all?: boolean;
}

export interface Runway {
  /** Days the money lasts, as of `setOn`; counts down by itself. */
  days: number | null;
  setOn: DayKey | null;
  /** Below this many days, offer to switch to `lineId`. */
  threshold: number;
  lineId: Id | null;
}

export interface Habit {
  id: Id;
  name: string;
  archived?: boolean;
}

export type Change = 'none' | 'moved' | 'broke' | 'chance' | 'low';

/** Everything answered on one day. These are the signals the app will learn from. */
export interface DayLog {
  energy?: number;
  change?: Change;
  note?: string;
  stepDone?: boolean;
  stepLineId?: Id;
  habits?: Id[];
  runwaySnoozed?: boolean;
}

/** A date with as much precision as is known. */
export interface When {
  y: number;
  m?: number;
  d?: number;
}

export type MemoryKind = 'note' | 'moved' | 'chance' | 'line' | 'closed' | 'arc';

export interface Memory {
  id: Id;
  title: string;
  note?: string;
  /** null: before the app, "раньше". */
  when: When | null;
  kind: MemoryKind;
  /** The line or arc this memory is about. */
  ref?: Id;
  links?: Id[];
  createdAt: DayKey;
}

export type Cover =
  | { t: 'line'; id: Id }
  | { t: 'ace'; id: Id }
  | { t: 'runway' }
  | { t: 'low' }
  | { t: 'arc' };

/** A life event the plan should survive, and what covers it. */
export interface Risk {
  id: Id;
  title: string;
  covers: Cover[];
}

export interface AppState {
  v: 1;
  createdAt: DayKey;
  focusGoalId: Id;
  goals: Goal[];
  lines: Line[];
  arcs: Arc[];
  aces: Ace[];
  runway: Runway;
  habits: Habit[];
  days: Record<DayKey, DayLog>;
  memories: Memory[];
  risks: Risk[];
  backupAt: DayKey | null;
}
