import type { AppState, Study } from './model';
import { dayKey } from '../lib/dates';
import { seedRules, seedStudies, seedTraits } from './seed';

const list = <T>(v: T[] | undefined, fallback: () => T[]): T[] => (Array.isArray(v) ? v : fallback());

/** A measured skill always has a list of checks, even in a hand-edited file. */
const fixStudy = (s: Study): Study => (s.measure ? { ...s, measure: { ...s.measure, checks: list(s.measure.checks, () => []) } } : s);

/**
 * Accepts saved or imported data, filling fields added in later versions. Sections that
 * arrived later start from the design's content, as on a first launch. Throws on anything else.
 */
export function normalize(raw: unknown): AppState {
  const r = raw as Partial<AppState> | null;
  if (!r || typeof r !== 'object' || r.v !== 1 || !Array.isArray(r.goals) || !Array.isArray(r.lines)) {
    throw new Error('Not XPlans data');
  }
  const lineIds = new Set(r.lines.map((l) => l.id));
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
    studies: list(r.studies, () => seedStudies(dayKey(), lineIds)).map(fixStudy),
    traits: list(r.traits, seedTraits),
    verdicts: r.verdicts && typeof r.verdicts === 'object' ? r.verdicts : {},
    rules: list(r.rules, seedRules),
  };
}
