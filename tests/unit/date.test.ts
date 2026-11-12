import { describe, expect, it } from 'vitest';
import { addDays, durationLabel, isoWeekNumber, num, plural, shortRange, weekStart } from '../../src/lib/date';

describe('дати', () => {
  it('додає дні через межу місяця й року', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('тиждень починається з понеділка', () => {
    expect(weekStart('2026-11-11')).toBe('2026-11-09'); // середа → понеділок
    expect(weekStart('2026-11-15')).toBe('2026-11-09'); // неділя → той самий понеділок
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });

  it('рахує номер тижня ISO', () => {
    expect(isoWeekNumber('2026-11-11')).toBe(46);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
  });
});

describe('форматування', () => {
  it('українська множина', () => {
    expect(plural(1, ['день', 'дні', 'днів'])).toBe('день');
    expect(plural(3, ['день', 'дні', 'днів'])).toBe('дні');
    expect(plural(11, ['день', 'дні', 'днів'])).toBe('днів');
    expect(plural(21, ['день', 'дні', 'днів'])).toBe('день');
    expect(plural(25, ['день', 'дні', 'днів'])).toBe('днів');
  });

  it('короткий діапазон часу як у макеті', () => {
    expect(shortRange(13 * 60, 15 * 60)).toBe('13–15');
    expect(shortRange(18 * 60, 19 * 60 + 30)).toBe('18–19:30');
  });

  it('тривалість', () => {
    expect(durationLabel(40)).toBe('40 хв');
    expect(durationLabel(120)).toBe('2 год');
    expect(durationLabel(225)).toBe('3 год 45 хв');
  });

  it('десятковий розділювач — кома', () => {
    expect(num(14.5)).toBe('14,5');
    expect(num(7)).toBe('7');
  });
});
