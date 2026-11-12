import { ensureDay, ensureReview, getState, uid, update } from './store';
import type { Block, Category, Habit, ISODate, Mood, Task } from './types';
import { addDays, hhmm, nowMinutes, todayISO } from '../lib/date';
import { blocksOn } from './selectors';

// ---------- Блоки ----------
export function addBlock(b: Omit<Block, 'id' | 'done' | 'subtasks'> & Partial<Pick<Block, 'subtasks' | 'done'>>) {
  const nb: Block = { done: false, subtasks: [], ...b, id: uid() };
  update((d) => void d.blocks.push(nb));
  return nb.id;
}

export function saveBlock(b: Block) {
  update((d) => {
    const i = d.blocks.findIndex((x) => x.id === b.id);
    if (i >= 0) d.blocks[i] = b;
    else d.blocks.push(b);
  });
}

export function toggleBlock(id: string) {
  update((d) => {
    const b = d.blocks.find((x) => x.id === id);
    if (b) b.done = !b.done;
  });
}

export function deleteBlock(id: string) {
  update((d) => void (d.blocks = d.blocks.filter((x) => x.id !== id)));
}

export function moveBlock(id: string, date: ISODate, start: number) {
  update((d) => {
    const b = d.blocks.find((x) => x.id === id);
    if (!b) return;
    const len = b.end - b.start;
    b.date = date;
    b.start = start;
    b.end = Math.min(start + len, 24 * 60);
  });
}

/** Перший вільний проміжок тривалістю `minutes` від `from` */
export function findFreeSlot(date: ISODate, minutes: number, from: number): number | null {
  const s = getState();
  const end = s.settings.dayEnd * 60;
  let cur = Math.max(from, s.settings.dayStart * 60);
  cur = Math.ceil(cur / 15) * 15;
  for (const b of blocksOn(s, date)) {
    if (b.end <= cur) continue;
    if (b.start - cur >= minutes) return cur;
    cur = Math.max(cur, b.end);
  }
  return end - cur >= minutes ? cur : null;
}

// ---------- Задачі ----------
export function addTask(title: string, minutes: number, location: Task['location'] = 'inbox') {
  update((d) => void d.tasks.push({ id: uid(), title, minutes, done: false, location, createdAt: Date.now() }));
}

export function deleteTask(id: string) {
  update((d) => void (d.tasks = d.tasks.filter((t) => t.id !== id)));
}

export function scheduleTask(taskId: string, date: ISODate, start: number) {
  const t = getState().tasks.find((x) => x.id === taskId);
  if (!t) return;
  update((d) => {
    d.tasks = d.tasks.filter((x) => x.id !== taskId);
    d.blocks.push({
      id: uid(),
      date,
      start,
      end: Math.min(start + Math.max(15, t.minutes), 24 * 60),
      title: t.title,
      category: 'errands',
      done: false,
      subtasks: [],
    });
  });
}

/** Блок → вхідні (з підсумку дня) */
export function blockToInbox(blockId: string, from: ISODate) {
  update((d) => {
    const b = d.blocks.find((x) => x.id === blockId);
    if (!b) return;
    d.blocks = d.blocks.filter((x) => x.id !== blockId);
    d.tasks.push({ id: uid(), title: b.title, minutes: b.end - b.start, done: false, location: 'inbox', createdAt: Date.now() });
    ensureReview(d, from).handled[blockId] = 'inbox';
  });
}

/** Блок → завтра в той самий час (або в перший вільний проміжок) */
export function blockToTomorrow(blockId: string, from: ISODate) {
  const s = getState();
  const b = s.blocks.find((x) => x.id === blockId);
  if (!b) return;
  const tomorrow = addDays(from, 1);
  const len = b.end - b.start;
  const clash = blocksOn(s, tomorrow).some((x) => x.start < b.end && x.end > b.start);
  const start = clash ? findFreeSlot(tomorrow, len, s.settings.dayStart * 60) ?? b.start : b.start;
  update((d) => {
    const x = d.blocks.find((y) => y.id === blockId)!;
    x.date = tomorrow;
    x.start = start;
    x.end = start + len;
    x.done = false;
    ensureReview(d, from).handled[blockId] = 'tomorrow';
  });
}

// ---------- Шаблон дня ----------
export function saveTemplate(date: ISODate) {
  update((d) => {
    d.template = blocksOn(d, date).map(({ start, end, title, category }) => ({ start, end, title, category }));
  });
}

export function applyTemplate(date: ISODate) {
  update((d) => {
    if (!d.template) return;
    const existing = d.blocks.filter((b) => b.date === date);
    for (const t of d.template) {
      if (existing.some((b) => b.start === t.start && b.title === t.title)) continue;
      d.blocks.push({ ...t, id: uid(), date, done: false, subtasks: [] });
    }
  });
}

// ---------- День ----------
export function setWater(date: ISODate, glasses: number) {
  update((d) => void (ensureDay(d, date).water = Math.max(0, glasses)));
}

export function setEnergy(date: ISODate, level: number) {
  update((d) => {
    const day = ensureDay(d, date);
    const at = hhmm(nowMinutes());
    const hour = at.slice(0, 2);
    day.energy = day.energy.filter((m) => m.at.slice(0, 2) !== hour);
    day.energy.push({ at, level });
  });
}

export function setTop3(date: ISODate, index: number, title: string) {
  update((d) => {
    const day = ensureDay(d, date);
    const t = title.trim();
    if (day.top3[index]) {
      if (t) day.top3[index].title = t;
      else day.top3.splice(index, 1);
    } else if (t) day.top3.push({ id: uid(), title: t, done: false });
  });
}

export function toggleTop3(date: ISODate, id: string) {
  update((d) => {
    const it = ensureDay(d, date).top3.find((x) => x.id === id);
    if (it) it.done = !it.done;
  });
}

export function setNote(date: ISODate, note: string) {
  update((d) => void (ensureDay(d, date).note = note));
}

// ---------- Звички ----------
export function toggleHabit(id: string, date: ISODate = todayISO()) {
  update((d) => {
    const h = d.habits.find((x) => x.id === id);
    if (!h) return;
    const e = h.log[date];
    if (h.kind === 'count') {
      // для лічильника: тап позначає ціль досягнутою / скасовує
      const reached = (e?.value ?? 0) >= (h.target ?? 1) || e?.done;
      h.log[date] = reached ? { done: false, value: 0 } : { done: true, value: h.target, at: hhmm(nowMinutes()) };
      return;
    }
    if (e?.done) delete h.log[date];
    else h.log[date] = { done: true, at: date === todayISO() ? hhmm(nowMinutes()) : undefined };
  });
}

export function setHabitValue(id: string, value: number, date: ISODate = todayISO()) {
  update((d) => {
    const h = d.habits.find((x) => x.id === id);
    if (!h) return;
    const v = Math.max(0, Math.round(value));
    h.log[date] = { done: v >= (h.target ?? 1), value: v, at: hhmm(nowMinutes()) };
  });
}

export function saveHabit(h: Omit<Habit, 'id' | 'log' | 'createdAt'> & { id?: string }) {
  update((d) => {
    const ex = h.id ? d.habits.find((x) => x.id === h.id) : undefined;
    if (ex) Object.assign(ex, h);
    else d.habits.push({ ...h, id: uid(), log: {}, createdAt: todayISO() });
  });
}

export function deleteHabit(id: string) {
  update((d) => void (d.habits = d.habits.filter((x) => x.id !== id)));
}

// ---------- Підсумок ----------
export function setMood(date: ISODate, mood: Mood) {
  update((d) => void (ensureReview(d, date).mood = mood));
}

export function setWin(date: ISODate, win: string) {
  update((d) => void (ensureReview(d, date).win = win));
}

export function closeDay(date: ISODate) {
  update((d) => void (ensureReview(d, date).closedAt = Date.now()));
}

export type { Category };
