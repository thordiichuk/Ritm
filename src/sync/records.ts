import type { AppState, Block, DayMeta, DayReview, FocusSession, Habit, HabitEntry, Settings, Task, TemplateBlock } from '../data/types';

/*
 * Синхронізація працює не з усім станом одразу, а з окремими «записами».
 * Кожен блок, задача, звичка, позначка звички за день, сесія фокусу, день і підсумок — окремий запис
 * зі своїм ключем. Тоді зміни різних записів на різних пристроях не затирають одна одну:
 * конфлікт можливий лише тоді, коли той самий запис змінили в двох місцях.
 *
 * Ключі:
 *   block:<id>   task:<id>   session:<id>   habit:<id> (без журналу)
 *   hlog:<habitId>:<YYYY-MM-DD>   — позначка звички за день
 *   day:<YYYY-MM-DD>   review:<YYYY-MM-DD>   template   settings
 * Запущений таймер не синхронізується: він має сенс лише на пристрої, де його запустили.
 */

export type RecordMap = Map<string, string>; // ключ → JSON запису

export interface RemoteRecord {
  key: string;
  data: unknown;
  deleted: boolean;
  updated_at: number; // мс, час зміни на пристрої
}

const enc = (v: unknown) => JSON.stringify(v);

/** Розкласти стан на записи. Значення — JSON, щоб швидко порівнювати «чи змінилось». */
export function explode(s: AppState): RecordMap {
  const m: RecordMap = new Map();
  for (const b of s.blocks) m.set(`block:${b.id}`, enc(b));
  for (const t of s.tasks) m.set(`task:${t.id}`, enc(t));
  for (const x of s.sessions) m.set(`session:${x.id}`, enc(x));
  for (const h of s.habits) {
    const { log, ...rest } = h;
    m.set(`habit:${h.id}`, enc(rest));
    for (const [date, entry] of Object.entries(log)) m.set(`hlog:${h.id}:${date}`, enc(entry));
  }
  for (const [date, d] of Object.entries(s.days)) m.set(`day:${date}`, enc(d));
  for (const [date, r] of Object.entries(s.reviews)) m.set(`review:${date}`, enc(r));
  m.set('template', enc(s.template));
  m.set('settings', enc(s.settings));
  return m;
}

/** Ключі, що змінились між двома розкладами (додані, змінені й видалені) */
export function diffKeys(prev: RecordMap, next: RecordMap): string[] {
  const out: string[] = [];
  for (const [k, v] of next) if (prev.get(k) !== v) out.push(k);
  for (const k of prev.keys()) if (!next.has(k)) out.push(k);
  return out;
}

/** Чи є на пристрої хоч якісь власні записи (крім налаштувань і шаблону) */
export function hasUserData(m: RecordMap): boolean {
  for (const k of m.keys()) if (k !== 'settings' && k !== 'template') return true;
  return false;
}

// порядок: спершу звички, потім їхні позначки — щоб позначці було куди лягти
const rank = (k: string) => (k.startsWith('habit:') ? 0 : k.startsWith('hlog:') ? 2 : 1);

/**
 * Застосувати записи з сервера до стану (повертає новий стан, старий не змінює).
 * Нові елементи масивів додаються в кінець, змінені — лишаються на своєму місці.
 */
export function applyRecords(s: AppState, recs: RemoteRecord[]): AppState {
  const next: AppState = {
    ...s,
    blocks: [...s.blocks],
    tasks: [...s.tasks],
    sessions: [...s.sessions],
    habits: s.habits.map((h) => ({ ...h, log: { ...h.log } })),
    days: { ...s.days },
    reviews: { ...s.reviews },
  };
  const upsert = <T extends { id: string }>(arr: T[], id: string, rec: RemoteRecord, make: (v: T | undefined) => T) => {
    const i = arr.findIndex((x) => x.id === id);
    if (rec.deleted) {
      if (i >= 0) arr.splice(i, 1);
    } else if (i >= 0) arr[i] = make(arr[i]);
    else arr.push(make(undefined));
  };

  for (const rec of [...recs].sort((a, b) => rank(a.key) - rank(b.key))) {
    const [kind, ...rest] = rec.key.split(':');
    const id = rest.join(':');
    switch (kind) {
      case 'block':
        upsert(next.blocks, id, rec, () => rec.data as Block);
        break;
      case 'task':
        upsert(next.tasks, id, rec, () => rec.data as Task);
        break;
      case 'session':
        upsert(next.sessions, id, rec, () => rec.data as FocusSession);
        break;
      case 'habit':
        upsert(next.habits, id, rec, (old) => ({ ...(rec.data as Omit<Habit, 'log'>), log: old?.log ?? {} }));
        break;
      case 'hlog': {
        const [habitId, date] = rest;
        const h = next.habits.find((x) => x.id === habitId);
        if (!h) break; // звичку видалено — її позначки вже не потрібні
        if (rec.deleted) delete h.log[date];
        else h.log[date] = rec.data as HabitEntry;
        break;
      }
      case 'day':
        if (rec.deleted) delete next.days[id];
        else next.days[id] = rec.data as DayMeta;
        break;
      case 'review':
        if (rec.deleted) delete next.reviews[id];
        else next.reviews[id] = rec.data as DayReview;
        break;
      case 'template':
        next.template = rec.deleted ? null : (rec.data as TemplateBlock[] | null);
        break;
      case 'settings':
        if (!rec.deleted && rec.data) next.settings = { ...next.settings, ...(rec.data as Partial<Settings>) };
        break;
      default:
      // невідомий тип запису (з новішої версії «Ритму») — пропускаємо
    }
  }
  return next;
}

/** Взяти поточне значення запису зі стану (для відправки на сервер). undefined — запису вже немає. */
export function recordValue(m: RecordMap, key: string): unknown {
  const v = m.get(key);
  return v === undefined ? undefined : JSON.parse(v);
}
