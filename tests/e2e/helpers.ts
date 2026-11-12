import type { Page } from '@playwright/test';

export const DESKTOP = { width: 1440, height: 1000 };
export const PHONE = { width: 390, height: 844 };

/** Середа, 11 листопада 2026, 14:20 за Києвом — момент з макетів */
export const MOCKUP_TIME = '2026-11-11T14:20:00+02:00';
export const EVENING = '2026-11-11T21:00:00+02:00';

/**
 * Відкрити сторінку із замороженим годинником. Демо-дані створюються відносно «сьогодні»,
 * тому з фіксованим часом застосунок щоразу виглядає однаково.
 */
export async function open(page: Page, route: string, opts: { time?: string; theme?: 'dark' | 'bloom' } = {}) {
  await page.clock.setFixedTime(new Date(opts.time ?? MOCKUP_TIME));
  if (opts.theme) {
    await page.addInitScript((t) => {
      try { localStorage.setItem('ritm:theme', t); } catch { /* немає сховища */ }
    }, opts.theme);
  }
  await page.goto(`/#/${route}`);
  await page.evaluate(() => document.fonts.ready);
}
