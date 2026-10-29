import type { DayKey, When } from '../store/model';

/** A late night still belongs to the day before. */
const DAY_START_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayKey(now = new Date()): DayKey {
  return ymd(new Date(now.getTime() - DAY_START_HOUR * 3_600_000));
}

export function parseDay(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function whenOf(k: DayKey): When {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m, d };
}

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_OF = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function dayLabel(k: DayKey): string {
  const d = parseDay(k);
  return `${WEEKDAYS[d.getDay()]} · ${d.getDate()} ${MONTHS_OF[d.getMonth()]}`;
}

export function whenLabel(w: When | null): string {
  if (!w) return 'раньше';
  if (w.m && w.d) return `${w.d} ${MONTHS_OF[w.m - 1]} ${w.y}`;
  if (w.m) return `${MONTHS[w.m - 1]} ${w.y}`;
  return String(w.y);
}

/** Where a date falls inside its year, 0..1. A month without a day means its middle. */
export function yearFraction(w: When): number {
  const start = new Date(w.y, 0, 1).getTime();
  const length = new Date(w.y + 1, 0, 1).getTime() - start;
  return (new Date(w.y, (w.m ?? 1) - 1, w.d ?? 15).getTime() - start) / length;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  return b === 1 ? one : many;
}

export function agoLabel(days: number): string {
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}
