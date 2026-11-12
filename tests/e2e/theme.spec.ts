import { expect, test } from '@playwright/test';
import { DESKTOP, PHONE, open } from './helpers';

const theme = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.dataset.theme);

test.describe('Теми', () => {
  test.use({ viewport: DESKTOP });

  test('за замовчуванням темна, без квітів', async ({ page }) => {
    await open(page, 'today');
    expect(await theme(page)).toBe('dark');
    await expect(page.locator('.flora-clip')).toHaveCount(0);
  });

  test('перемикання туди й назад кілька разів', async ({ page }) => {
    await open(page, 'notes');
    for (let i = 0; i < 3; i++) {
      await page.getByRole('radio', { name: /Блакитна квіткова/ }).click();
      expect(await theme(page)).toBe('bloom');
      await page.getByRole('radio', { name: /Темна/ }).click();
      expect(await theme(page)).toBe('dark');
    }
  });

  test('квіткова тема: квіти й шрифт Golos Text', async ({ page }) => {
    await open(page, 'today', { theme: 'bloom' });
    await expect(page.locator('.flora-clip').first()).toBeAttached();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Golos Text');
  });

  test('вибір зберігається після перезавантаження', async ({ page }) => {
    await open(page, 'notes');
    await page.getByRole('radio', { name: /Блакитна квіткова/ }).click();
    await page.reload();
    expect(await theme(page)).toBe('bloom');
  });

  test('тема стоїть ще до запуску React — без спалаху', async ({ page }) => {
    await open(page, 'today', { theme: 'bloom' });
    // блокуємо всі скрипти застосунку: лишається тільки вбудований скрипт теми в index.html
    await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
    await page.reload();
    expect(await theme(page)).toBe('bloom');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(243, 237, 227)');
  });

  test('без доступу до localStorage перемикач працює без помилок', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/#/notes');
    await page.getByRole('radio', { name: /Блакитна квіткова/ }).click();
    expect(await theme(page)).toBe('bloom');
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('телефон: шестерня веде до налаштувань, сторінка вміщається в екран', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'habits');
    await page.getByRole('link', { name: 'Налаштування' }).click();
    await expect(page).toHaveURL(/#\/notes\?s=settings/);
    await expect(page.getByRole('radio', { name: /Блакитна квіткова/ })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(PHONE.width);
  });
});
