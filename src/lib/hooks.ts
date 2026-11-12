import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const PHONE_QUERY = '(max-width: 759px)';

export function useIsPhone(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener('change', l);
      return () => mq.removeEventListener('change', l);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
  );
}

/** Поточний час, оновлюється кожні `ms` */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/**
 * Для полів із defaultValue: якщо значення змінилося не тут (прийшло з іншого пристрою чи вкладки),
 * показати нове — але не посеред набору тексту, коли поле у фокусі.
 */
export function useOuterValue<T extends HTMLInputElement | HTMLTextAreaElement>(value: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.value !== value && document.activeElement !== el) el.value = value;
  }, [value]);
  return ref;
}
