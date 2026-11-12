import { useEffect, useState, useSyncExternalStore } from 'react';

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
