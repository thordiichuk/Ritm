import { useEffect } from 'react';
import { getState } from '../data/store';
import { advance, chime, notify, timerRemaining } from '../components/focus/timer';
import { toast } from '../components/ui/Modal';
import { habitDone } from '../data/selectors';
import { hhmm, nowMinutes, todayISO } from './date';

const fired = new Set<string>();

/** Глобальний «пульс»: завершення фаз таймера та нагадування звичок */
export function useBackgroundTicker() {
  useEffect(() => {
    const tick = () => {
      const s = getState();
      const t = s.timer;
      if (t?.running && timerRemaining(t) <= 0) {
        const wasWork = t.phase === 'work';
        const res = advance(true);
        chime();
        const msg = res === 'finished' ? 'Усі сесії завершено — гарна робота!' : wasWork ? `Сесія завершена. Перерва ${t.breakMin} хв` : 'Перерва скінчилась — до роботи';
        toast(msg);
        notify('Ритм', msg);
      }
      // нагадування звичок (поза фокусом, якщо сповіщення не вимкнено)
      if (s.settings.notifications && !s.timer?.running) {
        const now = hhmm(nowMinutes());
        const today = todayISO();
        for (const h of s.habits) {
          const key = `${h.id}:${today}`;
          if (h.reminder === now && !habitDone(h, today) && !fired.has(key)) {
            fired.add(key);
            toast(`Нагадування: ${h.name}`);
            notify('Ритм · звичка', h.name);
          }
        }
        const rkey = `review:${today}`;
        if (s.settings.reviewAt === now && !s.reviews[today]?.closedAt && !fired.has(rkey)) {
          fired.add(rkey);
          toast('Час вечірнього підсумку');
          notify('Ритм', 'Час вечірнього підсумку — 5 хвилин');
        }
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);
}
