import { expect, test } from '@playwright/test';
import { MOCKUP_TIME, PHONE } from './helpers';

test.use({ viewport: PHONE });
test.beforeEach(async ({ page }) => page.clock.setFixedTime(new Date(MOCKUP_TIME)));

test('уперше на сайті — головна сторінка, звідти в застосунок', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Живіть у своєму ритмі' })).toBeVisible();

  await page.getByRole('link', { name: 'Спробувати без реєстрації' }).click();
  await expect(page).toHaveURL(/#\/today$/);

  // наступного разу головна вже не заважає
  await page.goto('/');
  await expect(page).not.toHaveURL(/welcome/);
});

test('хто вже має дані — одразу в застосунок', async ({ page }) => {
  await page.goto('/#/today');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ritm:v1', JSON.stringify({ version: 1, blocks: [], tasks: [], habits: [], sessions: [], timer: null, days: {}, reviews: {}, template: null, settings: {} }));
  });
  await page.goto('/');
  await expect(page).not.toHaveURL(/welcome/);
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
  await page.getByRole('button', { name: 'Увімкнути квіткову тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'bloom');
});
