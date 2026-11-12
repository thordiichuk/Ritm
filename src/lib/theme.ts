import { useSyncExternalStore } from 'react';

/**
 * Тема оформлення. Живе окремо від даних застосунку: її потрібно знати ще до першого рендеру,
 * тому index.html читає той самий ключ вбудованим скриптом і ставить data-theme на <html>.
 */
export type Theme = 'dark' | 'bloom';
export const THEME_KEY = 'ritm:theme';

function read(): Theme {
  return document.documentElement.dataset.theme === 'bloom' ? 'bloom' : 'dark';
}

let current: Theme = read();
const listeners = new Set<() => void>();

export function setTheme(t: Theme) {
  current = t;
  document.documentElement.dataset.theme = t;
  // колір рядка браузера на телефоні — з токена --c-bg щойно ввімкненої теми
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* сховище недоступне — тема діятиме до перезавантаження */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

// інша вкладка змінила тему
window.addEventListener('storage', (e) => {
  if (e.key === THEME_KEY) {
    current = e.newValue === 'bloom' ? 'bloom' : 'dark';
    document.documentElement.dataset.theme = current;
    listeners.forEach((l) => l());
  }
});
