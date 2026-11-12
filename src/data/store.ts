import { useRef, useSyncExternalStore } from 'react';
import type { AppState, DayMeta, DayReview, ISODate } from './types';
import { createSeed } from './seed';

const KEY = 'ritm:v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch {
    /* пошкоджені дані або недоступне сховище — почнемо з демо */
  }
  return createSeed();
}

let state: AppState = load();
const listeners = new Set<() => void>();

/**
 * Звідки зміна: 'local' — людина щось зробила на цьому пристрої (її треба синхронізувати);
 * 'remote' — прийшло з акаунта або службова заміна (синхронізувати не треба); 'tab' — з іншої вкладки.
 */
export type ChangeSource = 'local' | 'remote' | 'tab';
type ChangeListener = (prev: AppState, next: AppState, source: ChangeSource) => void;
const changeListeners = new Set<ChangeListener>();

/** Підписатися на кожну зміну стану (для синхронізації) */
export function onStateChange(l: ChangeListener) {
  changeListeners.add(l);
  return () => void changeListeners.delete(l);
}

function commit(next: AppState, source: ChangeSource, save = true) {
  const prev = state;
  state = next;
  if (save) persist();
  changeListeners.forEach((l) => l(prev, next, source));
  listeners.forEach((l) => l());
}

/** Чи вже щось збережено на цьому пристрої (демо-дані, яких ніхто не чіпав, не зберігаються) */
export function hasSavedState(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* сховище недоступне (приватний режим) — працюємо в пам'яті */
  }
}

export function getState(): AppState {
  return state;
}

/** Змінити стан: recipe мутує копію. */
export function update(recipe: (draft: AppState) => void) {
  const draft = structuredClone(state);
  recipe(draft);
  commit(draft, 'local');
}

export function replaceState(next: AppState, source: ChangeSource = 'local') {
  commit(next, source);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// синхронізація між вкладками
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) commit(load(), 'tab', false);
  });
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Підписка на частину стану; поверхнево однаковий результат повертається тим самим об'єктом */
export function useStore<T>(selector: (s: AppState) => T): T {
  const cache = useRef<{ v: T } | null>(null);
  return useSyncExternalStore(subscribe, () => {
    const v = selector(state);
    if (cache.current && shallowEqual(cache.current.v, v)) return cache.current.v;
    cache.current = { v };
    return v;
  });
}

export const emptyDay = (): DayMeta => ({ top3: [], water: 0, energy: [], note: '' });
export const emptyReview = (): DayReview => ({ win: '', handled: {} });

export function dayOf(s: AppState, date: ISODate): DayMeta {
  return s.days[date] ?? EMPTY_DAY;
}
const EMPTY_DAY: DayMeta = emptyDay();

/** Отримати (створивши за потреби) запис дня в draft */
export function ensureDay(d: AppState, date: ISODate): DayMeta {
  if (!d.days[date]) d.days[date] = emptyDay();
  return d.days[date];
}

export function ensureReview(d: AppState, date: ISODate): DayReview {
  if (!d.reviews[date]) d.reviews[date] = emptyReview();
  return d.reviews[date];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function resetToDemo() {
  replaceState(createSeed());
}

/** Порожній стан: без жодних записів, налаштування за замовчуванням */
export function emptyState(): AppState {
  return { ...createSeed(), blocks: [], tasks: [], habits: [], sessions: [], timer: null, days: {}, reviews: {}, template: null };
}

export function resetToEmpty(source: ChangeSource = 'local') {
  replaceState(emptyState(), source);
}
