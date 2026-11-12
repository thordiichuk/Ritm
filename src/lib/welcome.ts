import { hasSavedState } from '../data/store';
import { hasStoredSession } from '../sync/account';

/*
 * Головна сторінка-представлення показується тому, хто відкрив сайт уперше:
 * без маршруту в адресі, без власних даних і без входу в акаунт.
 * Щойно людина зайшла в сам застосунок, більше не показуємо.
 */
const KEY = 'ritm:welcomed';

export function markWelcomed() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* сховище недоступне */
  }
}

export function shouldShowWelcome(): boolean {
  if (location.hash.replace(/^#\/?/, '') !== '') return false; // відкрили конкретну сторінку
  if (new URLSearchParams(location.search).has('code')) return false; // повернення з листа
  try {
    if (localStorage.getItem(KEY)) return false;
  } catch {
    /* немає сховища — покажемо */
  }
  return !hasSavedState() && !hasStoredSession();
}
