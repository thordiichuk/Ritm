import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, EVENING, PHONE, open } from './helpers';

/*
 * Знімки екрана — «фото» кожної сторінки в обох темах. Тест порівнює новий знімок зі збереженим
 * у tests/e2e/visual.spec.ts-snapshots/ і падає, якщо щось зрушило чи змінило колір.
 * Головне призначення — гарантувати, що темна тема не змінюється непомітно.
 * Якщо зміна навмисна, оновіть знімки: npm run test:e2e:update
 */

const DESKTOP_ROUTES = ['today', 'week', 'habits', 'focus', 'review', 'stats', 'notes', 'welcome', 'login'];
const PHONE_ROUTES = ['today', 'habits', 'focus', 'review', 'stats', 'notes', 'welcome', 'login'];

// картинки (знімки застосунку на головній) мають бути завантажені й розкодовані до знімка — інакше він щоразу трохи інший
async function imagesReady(page: Page) {
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => undefined))));
}

// анімації появи вимкнено (як у людини з вимкненим рухом у системі) — знімок має бути однаковим щоразу
test.use({ reducedMotion: 'reduce' });

for (const t of ['dark', 'bloom', 'notes'] as const) {
  test.describe(`знімки: ${t}`, () => {
    for (const route of DESKTOP_ROUTES) {
      test(`комп'ютер / ${route}`, async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        await open(page, route, { theme: t, time: route === 'review' ? EVENING : undefined });
        await imagesReady(page);
        await expect(page).toHaveScreenshot(`${t}-desktop-${route}.png`, { fullPage: true });
      });
    }
    for (const route of PHONE_ROUTES) {
      test(`телефон / ${route}`, async ({ page }) => {
        await page.setViewportSize(PHONE);
        await open(page, route, { theme: t, time: route === 'review' ? EVENING : undefined });
        await imagesReady(page);
        await expect(page).toHaveScreenshot(`${t}-phone-${route}.png`);
      });
    }
  });
}
