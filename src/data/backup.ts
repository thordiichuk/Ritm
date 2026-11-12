import type { AppState } from './types';
import { DEFAULT_SETTINGS } from './seed';

/*
 * Резервна копія: увесь стан застосунку в одному JSON-файлі.
 * Формат має власний номер (`format`), щоб майбутні версії «Ритму» могли читати старі копії.
 */

export const BACKUP_APP = 'ritm';
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string; // ISO
  state: AppState;
}

export interface BackupSummary {
  exportedAt: Date;
  blocks: number;
  tasks: number;
  habits: number;
  days: number;
  sessions: number;
}

export type ParseResult =
  | { ok: true; state: AppState; summary: BackupSummary }
  | { ok: false; error: string };

export function makeBackup(state: AppState, now = new Date()): BackupFile {
  // запущений таймер не має сенсу переносити: на іншому пристрої чи пізніше він уже «прострочений»
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), state: { ...state, timer: null } };
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  // лише латиниця: Chromium відкидає назви з кирилицею й зберігає файл як «download»
  return `ritm-backup-${d}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Перевірити й прочитати файл копії. Ніколи не кидає винятків — повертає зрозумілу помилку. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Це не файл копії: не вдалося прочитати JSON.' };
  }
  if (!isObj(data) || data.app !== BACKUP_APP) {
    return { ok: false, error: 'Це не копія «Ритму».' };
  }
  if (typeof data.format !== 'number' || data.format > BACKUP_FORMAT) {
    return { ok: false, error: 'Копію зроблено новішою версією «Ритму». Оновіть сторінку й спробуйте ще раз.' };
  }
  const s = data.state;
  if (!isObj(s) || s.version !== 1) {
    return { ok: false, error: 'Файл пошкоджено: немає даних застосунку.' };
  }
  const arrays = ['blocks', 'tasks', 'habits', 'sessions'] as const;
  const objects = ['days', 'reviews'] as const;
  for (const k of arrays) if (!Array.isArray(s[k])) return { ok: false, error: `Файл пошкоджено: бракує розділу «${k}».` };
  for (const k of objects) if (!isObj(s[k])) return { ok: false, error: `Файл пошкоджено: бракує розділу «${k}».` };

  const state: AppState = {
    version: 1,
    blocks: s.blocks as AppState['blocks'],
    tasks: s.tasks as AppState['tasks'],
    habits: s.habits as AppState['habits'],
    sessions: s.sessions as AppState['sessions'],
    days: s.days as AppState['days'],
    reviews: s.reviews as AppState['reviews'],
    template: Array.isArray(s.template) ? (s.template as AppState['template']) : null,
    timer: null,
    // нові налаштування, яких ще не було в старій копії, беруться за замовчуванням
    settings: { ...DEFAULT_SETTINGS, ...(isObj(s.settings) ? (s.settings as Partial<AppState['settings']>) : {}) },
  };
  const exportedAt = new Date(typeof data.exportedAt === 'string' ? data.exportedAt : NaN);
  return {
    ok: true,
    state,
    summary: {
      exportedAt,
      blocks: state.blocks.length,
      tasks: state.tasks.length,
      habits: state.habits.length,
      days: new Set(state.blocks.map((b) => b.date)).size,
      sessions: state.sessions.length,
    },
  };
}

/** Запропонувати браузеру зберегти файл копії */
export function downloadBackup(state: AppState) {
  const now = new Date();
  const blob = new Blob([JSON.stringify(makeBackup(state, now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(now);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
