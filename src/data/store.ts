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
  state = draft;
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// синхронізація між вкладками
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
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

export function resetToEmpty() {
  const seed = createSeed();
  replaceState({
    ...seed,
    blocks: [],
    tasks: [],
    habits: [],
    sessions: [],
    timer: null,
    days: {},
    reviews: {},
    template: null,
  });
}
