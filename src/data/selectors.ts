import type { AppState, Block, Category, Habit, ISODate } from './types';
import { addDays, parseHHMM, rangeDays, todayISO, weekStart } from '../lib/date';

export const CATEGORY_META: Record<Category, { label: string; cls: string; color: string }> = {
  work: { label: 'Робота', cls: 'sky', color: 'var(--c-sky)' },
  health: { label: "Здоров'я", cls: 'mint', color: 'var(--c-mint)' },
  study: { label: 'Навчання', cls: 'lilac', color: 'var(--c-lilac)' },
  personal: { label: 'Особисте', cls: 'peach', color: 'var(--c-peach)' },
  errands: { label: 'Справи', cls: 'ash', color: 'var(--c-outline)' },
};
export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export const HABIT_COLOR: Record<Habit['color'], string> = {
  peach: 'var(--c-peach)',
  mint: 'var(--c-mint)',
  sky: 'var(--c-sky)',
  lilac: 'var(--c-lilac)',
  lime: 'var(--c-lime)',
};

export function blocksOn(s: AppState, date: ISODate): Block[] {
  return s.blocks.filter((b) => b.date === date).sort((a, b) => a.start - b.start || a.end - b.end);
}

export function habitDone(h: Habit, date: ISODate): boolean {
  const e = h.log[date];
  if (!e) return false;
  if (h.kind === 'count') return (e.value ?? 0) >= (h.target ?? 1) || e.done;
  return e.done;
}

/** Серія: поспіль виконані дні до сьогодні (або до вчора, якщо сьогодні ще ні) */
export function streak(h: Habit, date: ISODate = todayISO()): number {
  let d = habitDone(h, date) ? date : addDays(date, -1);
  let n = 0;
  while (habitDone(h, d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function habitsDoneOn(s: AppState, date: ISODate) {
  const active = s.habits.filter((h) => h.createdAt <= date);
  return { done: active.filter((h) => habitDone(h, date)).length, total: active.length };
}

/** Частка виконаних звичок за період (0..1), разом з поточним днем */
export function habitRate(s: AppState, days: ISODate[]): number {
  let done = 0;
  let total = 0;
  for (const d of days) {
    const r = habitsDoneOn(s, d);
    done += r.done;
    total += r.total;
  }
  return total ? done / total : 0;
}

export function focusMinutesOn(s: AppState, date: ISODate): number {
  return s.sessions.filter((x) => x.date === date).reduce((a, x) => a + x.minutes, 0);
}

export function focusMinutesIn(s: AppState, days: ISODate[]): number {
  const set = new Set(days);
  return s.sessions.filter((x) => set.has(x.date)).reduce((a, x) => a + x.minutes, 0);
}

export function weekDays(date: ISODate = todayISO()): ISODate[] {
  return rangeDays(weekStart(date), 7);
}

export function lastDays(count: number, end: ISODate = todayISO()): ISODate[] {
  return rangeDays(addDays(end, -(count - 1)), count);
}

export function planRate(s: AppState, days: ISODate[]) {
  const set = new Set(days);
  const bs = s.blocks.filter((b) => set.has(b.date));
  return { done: bs.filter((b) => b.done).length, total: bs.length };
}

export function timeByCategory(s: AppState, days: ISODate[]): Record<Category, number> {
  const set = new Set(days);
  const out = { work: 0, health: 0, study: 0, personal: 0, errands: 0 } as Record<Category, number>;
  for (const b of s.blocks) if (set.has(b.date)) out[b.category] += b.end - b.start;
  return out;
}

/** Кількість помодоро в блоці (25 + 5) */
export function sessionsInBlock(b: Block, s: AppState): number {
  const cycle = s.settings.workMin + s.settings.breakMin;
  return Math.max(1, Math.round((b.end - b.start) / cycle));
}

export function completedSessionsForBlock(s: AppState, blockId: string, date: ISODate, title: string): number {
  return s.sessions.filter((x) => x.date === date && x.completed && (x.blockId === blockId || (!x.blockId && x.title === title))).length;
}

/** Вільні хвилини від `from` до кінця дня */
export function freeMinutes(s: AppState, date: ISODate, from: number): number {
  const end = s.settings.dayEnd * 60;
  if (from >= end) return 0;
  const bs = blocksOn(s, date);
  let free = 0;
  let cur = from;
  for (const b of bs) {
    if (b.end <= cur) continue;
    if (b.start > cur) free += Math.min(b.start, end) - cur;
    cur = Math.max(cur, b.end);
    if (cur >= end) break;
  }
  if (cur < end) free += end - cur;
  return free;
}

/** Пікова година енергії за останні 14 днів → «9:00–11:00» */
export function energyPeak(s: AppState): { from: number; to: number } | null {
  const byHour = new Map<number, { sum: number; n: number }>();
  for (const d of lastDays(14)) {
    for (const m of s.days[d]?.energy ?? []) {
      const hr = Math.floor(parseHHMM(m.at) / 60);
      const cur = byHour.get(hr) ?? { sum: 0, n: 0 };
      cur.sum += m.level;
      cur.n++;
      byHour.set(hr, cur);
    }
  }
  if (!byHour.size) return null;
  const avg = [...byHour.entries()].map(([hr, v]) => [hr, v.sum / v.n] as const).sort((a, b) => a[0] - b[0]);
  const best = Math.max(...avg.map((x) => x[1]));
  const peakHours = avg.filter((x) => x[1] >= best - 0.35).map((x) => x[0]);
  // найдовший суцільний відрізок навколо найкращої години
  const top = avg.find((x) => x[1] === best)![0];
  let from = top;
  let to = top;
  while (peakHours.includes(from - 1)) from--;
  while (peakHours.includes(to + 1)) to++;
  return { from: from * 60, to: (to + 1) * 60 };
}

/**
 * Інсайт: на скільки більше блоків закривається в дні після виконання звички
 * (за 28 днів). Повертає найсильніший позитивний ефект.
 */
export function bestHabitLift(s: AppState) {
  const days = lastDays(28, addDays(todayISO(), -1));
  let best: { habit: Habit; lift: number } | null = null;
  for (const h of s.habits) {
    const after: number[] = [];
    const notAfter: number[] = [];
    for (const d of days) {
      const p = planRate(s, [d]);
      if (!p.total) continue;
      const rate = p.done / p.total;
      (habitDone(h, addDays(d, -1)) ? after : notAfter).push(rate);
    }
    if (after.length < 3 || notAfter.length < 3) continue;
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const base = avg(notAfter);
    if (!base) continue;
    const lift = avg(after) / base - 1;
    if (!best || lift > best.lift) best = { habit: h, lift };
  }
  return best && best.lift > 0.05 ? best : null;
}
