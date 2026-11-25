import { describe, expect, it } from 'vitest';
import { blocksOn, freeMinutes, timeByCategory, timedOn, untimedOn } from '../../src/data/selectors';
import { createSeed } from '../../src/data/seed';
import type { AppState, Block } from '../../src/data/types';

const D = '2026-11-11';
const blk = (id: string, start: number, end: number, extra: Partial<Block> = {}): Block =>
  ({ id, date: D, start, end, title: id, category: 'work', done: false, subtasks: [], ...extra });

function state(blocks: Block[]): AppState {
  return { ...createSeed(), blocks };
}

describe('завдання без часу', () => {
  const s = state([blk('a', 600, 660), blk('noTime', 600, 900, { untimed: true }), blk('b', 480, 540)]);

  it('ідуть першими, далі — блоки за часом', () => {
    expect(blocksOn(s, D).map((b) => b.id)).toEqual(['noTime', 'b', 'a']);
    expect(timedOn(s, D).map((b) => b.id)).toEqual(['b', 'a']);
    expect(untimedOn(s, D).map((b) => b.id)).toEqual(['noTime']);
  });

  it('не займають вільного часу', () => {
    const without = state([blk('a', 600, 660), blk('b', 480, 540)]);
    expect(freeMinutes(s, D, 7 * 60)).toBe(freeMinutes(without, D, 7 * 60));
  });

  it('без тривалості не рахуються в «куди йде час»', () => {
    expect(timeByCategory(s, [D]).work).toBe(60 + 60);
  });

  it('з указаною тривалістю — рахуються саме нею, а не годинами start/end', () => {
    const withDur = state([blk('a', 600, 660), blk('t', 600, 900, { untimed: true, duration: 45, category: 'health' })]);
    expect(timeByCategory(withDur, [D]).health).toBe(45);
    expect(freeMinutes(withDur, D, 7 * 60)).toBe(freeMinutes(state([blk('a', 600, 660)]), D, 7 * 60)); // вільний час — як і без нього
  });
});
