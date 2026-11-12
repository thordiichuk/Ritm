import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backupFileName, makeBackup, parseBackup } from '../../src/data/backup';
import { createSeed, DEFAULT_SETTINGS } from '../../src/data/seed';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 9, 30));
});

describe('резервна копія', () => {
  it('копія → файл → відновлення дає ті самі дані', () => {
    const state = createSeed();
    const file = JSON.stringify(makeBackup(state));
    const res = parseBackup(file);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.blocks).toEqual(state.blocks);
    expect(res.state.habits).toEqual(state.habits);
    expect(res.state.reviews).toEqual(state.reviews);
    expect(res.summary).toMatchObject({ habits: 5, tasks: 4 });
    expect(res.summary.exportedAt.getTime()).toBe(new Date(2026, 10, 12, 9, 30).getTime());
  });

  it('запущений таймер не потрапляє в копію й не відновлюється', () => {
    const state = createSeed();
    state.timer = { title: 'X', session: 1, total: 4, phase: 'work', running: true, endsAt: 1, remainingMs: 0, workMin: 25, breakMin: 5 };
    expect(makeBackup(state).state.timer).toBeNull();
    const file = JSON.stringify({ ...makeBackup(state), state });
    const res = parseBackup(file);
    expect(res.ok && res.state.timer).toBeNull();
  });

  it('налаштування, яких не було в старій копії, беруться за замовчуванням', () => {
    const state = createSeed();
    const { focusMute: _, ...oldSettings } = state.settings;
    const res = parseBackup(JSON.stringify({ ...makeBackup(state), state: { ...state, settings: { ...oldSettings, waterGoal: 10 } } }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.settings.focusMute).toBe(DEFAULT_SETTINGS.focusMute);
    expect(res.state.settings.waterGoal).toBe(10);
  });

  it('назва файлу з датою', () => {
    expect(backupFileName(new Date(2026, 10, 12))).toBe('ritm-backup-2026-11-12.json');
  });
});

describe('захист від поганих файлів', () => {
  const good = () => makeBackup(createSeed());

  it.each([
    ['не JSON', 'привіт', 'не вдалося прочитати JSON'],
    ['чужий JSON', JSON.stringify({ hello: 1 }), 'Це не копія «Ритму»'],
    ['масив замість об\'єкта', '[]', 'Це не копія «Ритму»'],
    ['новіший формат', JSON.stringify({ ...good(), format: 99 }), 'новішою версією'],
    ['без даних', JSON.stringify({ ...good(), state: null }), 'немає даних застосунку'],
    ['без блоків', JSON.stringify({ ...good(), state: { ...good().state, blocks: 'ні' } }), '«blocks»'],
    ['без підсумків', JSON.stringify({ ...good(), state: { ...good().state, reviews: [] } }), '«reviews»'],
  ])('%s', (_, text, message) => {
    const res = parseBackup(text);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain(message);
  });
});
