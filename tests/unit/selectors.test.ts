import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeed } from '../../src/data/seed';
import {
  bestHabitLift, blocksOn, energyPeak, freeMinutes, habitDone, habitsDoneOn, planRate, sessionsInBlock, streak, timeByCategory,
} from '../../src/data/selectors';
import type { AppState, Habit } from '../../src/data/types';

// Демо-дані будуються відносно «сьогодні», тому фіксуємо дату макетів: середа, 11 листопада 2026
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 11, 14, 20));
});
afterEach(() => vi.useRealTimers());

const TODAY = '2026-11-11';
const habit = (s: AppState, name: string) => s.habits.find((h) => h.name === name)!;

function makeHabit(log: Habit['log'], extra: Partial<Habit> = {}): Habit {
  return { id: 'h', name: 'Тест', color: 'mint', kind: 'check', log, createdAt: '2026-01-01', ...extra };
}

describe('серії звичок', () => {
  it('демо-дані дають серії з макета: 21, 6, 1, 12, 0', () => {
    const s = createSeed();
    expect(streak(habit(s, 'Зарядка 10 хв'))).toBe(21);
    expect(streak(habit(s, 'Без телефона до 9:00'))).toBe(6);
    expect(streak(habit(s, '10 000 кроків'))).toBe(1);
    expect(streak(habit(s, 'Читання 30 сторінок'))).toBe(12);
    expect(streak(habit(s, 'Сон до 23:30'))).toBe(0);
  });

  it('серія не обривається, поки сьогодні ще не відмічено', () => {
    const h = makeHabit({ '2026-11-09': { done: true }, '2026-11-10': { done: true } });
    expect(streak(h, TODAY)).toBe(2);
    h.log[TODAY] = { done: true };
    expect(streak(h, TODAY)).toBe(3);
  });

  it('лічильник виконано, коли досягнуто ціль', () => {
    const h = makeHabit({ [TODAY]: { done: false, value: 9999 } }, { kind: 'count', target: 10000 });
    expect(habitDone(h, TODAY)).toBe(false);
    h.log[TODAY] = { done: false, value: 10000 };
    expect(habitDone(h, TODAY)).toBe(true);
  });

  it('сьогодні виконано 2 з 5, як у макеті', () => {
    expect(habitsDoneOn(createSeed(), TODAY)).toEqual({ done: 2, total: 5 });
  });
});

describe('розклад', () => {
  it('блоки дня впорядковані за часом', () => {
    const bs = blocksOn(createSeed(), TODAY);
    expect(bs).toHaveLength(10);
    expect(bs.map((b) => b.start)).toEqual([...bs.map((b) => b.start)].sort((a, b) => a - b));
  });

  it('вільний час від 14:20 до кінця дня — 3 год 25 хв', () => {
    expect(freeMinutes(createSeed(), TODAY, 14 * 60 + 20)).toBe(205);
  });

  it('2-годинний блок — це 4 помодоро по 25+5', () => {
    const s = createSeed();
    const english = blocksOn(s, TODAY).find((b) => b.title.startsWith('Англійська'))!;
    expect(sessionsInBlock(english, s)).toBe(4);
  });

  it('план дня: 5 з 10 блоків', () => {
    expect(planRate(createSeed(), [TODAY])).toEqual({ done: 5, total: 10 });
  });

  it('час за категоріями рахується в хвилинах', () => {
    const t = timeByCategory(createSeed(), [TODAY]);
    expect(t.study).toBe(120);
    expect(t.work).toBe(150);
  });
});

describe('підказки', () => {
  it('пік енергії демо-даних — 9:00–11:00', () => {
    expect(energyPeak(createSeed())).toEqual({ from: 9 * 60, to: 11 * 60 });
  });

  it('без відміток енергії піку немає', () => {
    expect(energyPeak({ ...createSeed(), days: {} })).toBeNull();
  });

  it('інсайт знаходить звичку «Сон до 23:30» з позитивним ефектом', () => {
    const lift = bestHabitLift(createSeed());
    expect(lift?.habit.name).toBe('Сон до 23:30');
    expect(lift!.lift).toBeGreaterThan(0.2);
  });
});
