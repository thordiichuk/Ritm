import { expect, test } from '@playwright/test';
import { MOCKUP_TIME, PHONE } from './helpers';

test.use({ viewport: PHONE });
test.beforeEach(async ({ page }) => page.clock.setFixedTime(new Date(MOCKUP_TIME)));

test('уперше на сайті — головна сторінка, звідти в застосунок', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Живіть у своєму ритмі' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(''); // головна — просто за адресою сайту, без #/welcome

  await page.getByRole('link', { name: 'Спробувати без реєстрації' }).click();
  await expect(page).toHaveURL(/#\/today$/);

  // наступного разу головна вже не заважає: за адресою сайту одразу застосунок
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Навігація' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Живіть у своєму ритмі' })).toHaveCount(0);
});

test('хто вже має дані — одразу в застосунок', async ({ page }) => {
  await page.goto('/#/today');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ritm:v1', JSON.stringify({ version: 1, blocks: [], tasks: [], habits: [], sessions: [], timer: null, days: {}, reviews: {}, template: null, settings: {} }));
  });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Навігація' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Живіть у своєму ритмі' })).toHaveCount(0);
});

test('головна відкривається й за прямим посиланням #/welcome', async ({ page }) => {
  await page.goto('/#/today');
  await page.goto('/#/welcome');
  await expect(page.getByRole('heading', { name: 'Живіть у своєму ритмі' })).toBeVisible();
});

test('посилання на конкретну сторінку відкриває її, а не головну', async ({ page }) => {
  await page.goto('/#/habits');
  await expect(page).toHaveURL(/#\/habits$/);
});

test('з головної — на вхід і реєстрацію', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Увійти' }).click();
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();
  await page.getByRole('tab', { name: 'Створити акаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Новий акаунт' })).toBeVisible();
  await expect(page).toHaveURL(/#\/login\?m=up$/);
  await page.getByRole('link', { name: 'Про «Ритм»' }).click();
  await expect(page).toHaveURL(/#\/welcome$/);
});

test('перемикач теми на головній', async ({ page }) => {
  await page.goto('/');
  const sw = page.getByRole('switch', { name: 'Квіткова тема' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'bloom');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('блоки з’являються під час прокручування', async ({ page }) => {
  await page.goto('/');
  const last = page.locator('.wl-final');
  await expect(last).not.toHaveClass(/\bin\b/); // ще не докрутили
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveClass(/\bin\b/);
  await expect(last).toHaveCSS('opacity', '1');
});
