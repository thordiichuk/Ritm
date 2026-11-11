import type { ISODate } from '../data/types';

export const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function hhmm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** «13–15», «18–19:30», «15:30» — короткий діапазон як у телефонному макеті */
export function shortRange(start: number, end: number): string {
  const f = (m: number) => (m % 60 === 0 ? String(Math.floor(m / 60)) : `${Math.floor(m / 60)}:${pad(m % 60)}`);
  return `${f(start)}–${f(end)}`;
}

/** Понеділок тижня, до якого належить дата */
export function weekStart(s: ISODate): ISODate {
  const d = fromISO(s);
  const dow = (d.getDay() + 6) % 7;
  return addDays(s, -dow);
}

export function isoWeekNumber(s: ISODate): number {
  const d = fromISO(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
export const WEEKDAYS = ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя'];
export const MONTHS_GEN = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];
export const MONTHS_SHORT = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

export function weekdayIdx(s: ISODate): number {
  return (fromISO(s).getDay() + 6) % 7;
}

export function weekdayName(s: ISODate): string {
  return WEEKDAYS[weekdayIdx(s)];
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «11 листопада» */
export function dayMonth(s: ISODate): string {
  const d = fromISO(s);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function rangeDays(from: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

/** «3 год 45 хв», «40 хв», «2 год» */
export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h} год ${m} хв`;
  if (h) return `${h} год`;
  return `${m} хв`;
}

/** Українська множина: plural(21, ['день','дні','днів']) */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** 14.5 → «14,5» */
export const num = (n: number, digits = 1) =>
  (Math.round(n * 10 ** digits) / 10 ** digits).toString().replace('.', ',');
