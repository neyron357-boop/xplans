import type { AppState } from './model';

/** Accepts saved or imported data, filling fields added in later versions. Throws on anything else. */
export function normalize(raw: unknown): AppState {
  const r = raw as Partial<AppState> | null;
  if (!r || typeof r !== 'object' || r.v !== 1 || !Array.isArray(r.goals) || !Array.isArray(r.lines)) {
    throw new Error('Not XPlans data');
  }
  return {
    v: 1,
    createdAt: r.createdAt ?? '',
    focusGoalId: r.focusGoalId ?? r.goals[0]?.id ?? '',
    goals: r.goals,
    lines: r.lines,
    arcs: r.arcs ?? [],
    aces: r.aces ?? [],
    runway: { days: null, setOn: null, threshold: 14, lineId: null, ...r.runway },
    habits: r.habits ?? [],
    days: r.days ?? {},
    memories: r.memories ?? [],
    risks: r.risks ?? [],
    backupAt: r.backupAt ?? null,
  };
}
