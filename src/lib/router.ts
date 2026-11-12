import { useSyncExternalStore } from 'react';

export type Route = 'today' | 'week' | 'habits' | 'focus' | 'review' | 'stats' | 'notes' | 'welcome' | 'login';
const ROUTES: Route[] = ['today', 'week', 'habits', 'focus', 'review', 'stats', 'notes', 'welcome', 'login'];

export interface Location {
  route: Route;
  params: URLSearchParams;
}

/** Що показувати за адресою без маршруту (просто …/Ritm/): «Сьогодні» або головну для нового відвідувача */
let home: Route = 'today';

function parse(): Location {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const route = path === '' ? home : (ROUTES as string[]).includes(path) ? (path as Route) : 'today';
  return { route, params: new URLSearchParams(query) };
}

let current = parse();

/** Змінити сторінку для адреси без маршруту (викликається до першого показу) */
export function setHomeRoute(r: Route) {
  home = r;
  current = parse();
  listeners.forEach((l) => l());
}
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
});

export function useLocation(): Location {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function href(route: Route, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params)}` : '';
  return `#/${route}${q}`;
}

export function navigate(route: Route, params?: Record<string, string>) {
  window.location.hash = href(route, params).slice(1);
}

export function back(fallback: Route = 'today') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}
