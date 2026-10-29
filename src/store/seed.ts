import type { AppState, DayKey, Id, Rule, Study, Trait } from './model';
import { whenOf } from '../lib/dates';

/** What is being learned, from the design: English by ear first, the rest tied to lines. */
export function seedStudies(today: DayKey, lineIds: Set<Id>): Study[] {
  const line = (id: Id) => (lineIds.has(id) ? { lineId: id } : {});
  return [
    { id: 'study-en', name: 'Английский на слух', measure: { start: { low: 40, high: 50 }, checks: [] }, createdAt: today },
    { id: 'study-design', name: 'Дизайн', next: '3 работы в портфолио', ...line('line-a2'), createdAt: today },
    { id: 'study-ai', name: 'AI и приложения', next: 'XPlans — твой первый проект', createdAt: today },
    { id: 'study-parts', name: 'Запчасти', next: 'список магазинов рядом', ...line('line-a'), createdAt: today },
    { id: 'study-clients', name: 'Клиенты', next: '10 фраз для клиентов на EN', ...line('line-a1'), createdAt: today },
  ];
}

export const seedTraits = (): Trait[] => [
  { id: 'trait-best', text: 'Ищешь лучший вариант слишком долго', fix: 'таймер решения 20 мин' },
  { id: 'trait-doubt', text: 'Нет прогресса — растут сомнения', fix: 'контрольная серия раз в месяц' },
  { id: 'trait-spread', text: 'Много направлений сразу', fix: 'одна арка в фокусе, остальное на полке' },
];

export const seedRules = (): Rule[] => [
  { id: 'rule-dignity', text: 'Достоинство не обсуждается' },
  { id: 'rule-fair', text: 'Справедливо — и для других' },
  { id: 'rule-help', text: 'Попросить помощь — это ход' },
];

/** First launch starts from the plan in the design, so the app is useful right away. */
export function seed(today: DayKey): AppState {
  const { y, m } = whenOf(today);
  const goal = 'goal-income';
  const A = 'line-a';
  const A1 = 'line-a1';
  const A2 = 'line-a2';
  const line = { goalId: goal, closed: false, createdAt: today };
  return {
    v: 1,
    createdAt: today,
    focusGoalId: goal,
    goals: [{ id: goal, title: 'Стабильный доход', activeLineId: A, createdAt: today }],
    lines: [
      { ...line, id: A, parentId: null, code: 'A', name: 'Автосервис и запчасти', cond: 'основная', step: '5 откликов на этой неделе', mini: '1 отклик' },
      { ...line, id: A1, parentId: A, code: 'A1', name: 'Клиенты и продажи', cond: 'если по A 4 недели тихо', step: 'CV под продажи', mini: 'Найти 1 вакансию в продажах' },
      { ...line, id: A2, parentId: A, code: 'A2', name: 'Дизайн-заказы', cond: 'параллельно, по вечерам', step: '3 работы в портфолио', mini: '1 эскиз' },
    ],
    arcs: [{ id: 'arc-1', no: 1, goalId: goal, start: today, weeks: 12 }],
    aces: [
      { id: 'ace-languages', name: '3 языка', gives: 'таджикский · русский · английский', lineIds: [A, A1] },
      { id: 'ace-parts', name: 'Запчасти', gives: 'знаю детали и как говорить с клиентом', lineIds: [A] },
      { id: 'ace-design', name: 'Дизайн', gives: 'графика, реклама, визуал', lineIds: [A2] },
      { id: 'ace-support', name: 'Опора', gives: 'организации и люди, к кому обратиться', lineIds: [], all: true },
    ],
    runway: { days: null, setOn: null, threshold: 14, lineId: A1 },
    habits: [
      { id: 'habit-en', name: 'EN · 20 мин' },
      { id: 'habit-apply', name: 'Отклики', link: { t: 'line', id: A } },
      { id: 'habit-spend', name: 'Траты', link: { t: 'runway' } },
    ],
    days: {},
    memories: [
      { id: 'mem-russian', title: 'Русский — язык моих мыслей', note: 'выбрал сам', when: null, kind: 'note', createdAt: today },
      { id: 'mem-service', title: 'Автосервис: запчасти и клиенты', note: 'делал многое сам', when: null, kind: 'note', createdAt: today },
      { id: 'mem-films', title: 'Фильмы с английскими субтитрами', when: { y: 2024 }, kind: 'note', links: ['mem-listening'], createdAt: today },
      { id: 'mem-listening', title: 'Понимаю 40–50% на слух', when: { y, m }, kind: 'note', createdAt: today },
      { id: 'mem-arc-1', title: 'Арка 1: Стабильный доход', note: '12 недель', when: whenOf(today), kind: 'arc', ref: 'arc-1', createdAt: today },
    ],
    risks: [
      { id: 'risk-silence', title: 'Нет ответов', covers: [{ t: 'line', id: A1 }, { t: 'line', id: A2 }] },
      { id: 'risk-money', title: 'Деньги на исходе', covers: [{ t: 'runway' }] },
      { id: 'risk-tired', title: 'Нет сил', covers: [{ t: 'low' }] },
      { id: 'risk-spread', title: 'Распыление', covers: [{ t: 'arc' }] },
      { id: 'risk-health', title: 'Здоровье', covers: [] },
      { id: 'risk-home', title: 'Жильё', covers: [] },
      { id: 'risk-papers', title: 'Документы', covers: [] },
    ],
    backupAt: null,
    studies: seedStudies(today, new Set([A, A1, A2])),
    traits: seedTraits(),
    verdicts: {},
    rules: seedRules(),
  };
}
