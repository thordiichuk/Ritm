import { expect, test } from '@playwright/test';
import { DESKTOP, PHONE, open } from './helpers';

test.describe('Сьогодні (комп\'ютер)', () => {
  test.use({ viewport: DESKTOP });

  test('новий блок через вільну годину', async ({ page }) => {
    await open(page, 'today');
    await page.getByRole('button', { name: 'Додати блок о 17:00' }).click();
    await page.getByPlaceholder('Напр. Глибока робота: звіт').fill('Дзвінок клієнту');
    await page.getByRole('button', { name: 'Додати блок', exact: true }).click();
    await expect(page.locator('.sched h4', { hasText: 'Дзвінок клієнту' })).toBeVisible();
  });

  test('задача з вхідних перетягується в розклад', async ({ page }) => {
    await open(page, 'today');
    await page.getByRole('button', { name: 'Стоматолог · 15 хв' }).dragTo(page.locator('.hr[data-hour="16"] .free'));
    await expect(page.locator('.sched h4', { hasText: 'Стоматолог' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Стоматолог · 15 хв' })).toHaveCount(0);
  });

  test('позначка «готово» оновлює прогрес дня', async ({ page }) => {
    await open(page, 'today');
    await expect(page.getByText('5 з 10 блоків')).toBeVisible();
    await page.locator('.sched h4', { hasText: 'Спортзал' }).click();
    await page.getByRole('button', { name: 'Готово', exact: true }).click();
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.getByText('6 з 10 блоків')).toBeVisible();
  });

  test('вода, топ-3 і шаблон дня', async ({ page }) => {
    await open(page, 'today');
    await page.getByRole('button', { name: 'Склянка 8' }).click();
    await expect(page.getByText('2 / 2 л')).toBeVisible();
    await page.getByRole('button', { name: 'Позначити' }).first().click();
    await expect(page.getByRole('button', { name: 'Виконано' })).toHaveCount(2);

    await page.getByRole('button', { name: 'Шаблон дня' }).click();
    await page.getByRole('menuitem', { name: /Зберегти/ }).click();
    await page.getByRole('button', { name: 'Наступний день' }).click();
    await page.getByRole('button', { name: 'Шаблон дня' }).click();
    await page.getByRole('menuitem', { name: /Застосувати/ }).click();
    await expect(page.locator('.sched .blk:not(.cont)')).toHaveCount(10);
  });

  test('дані зберігаються після перезавантаження', async ({ page }) => {
    await open(page, 'today');
    await page.getByRole('button', { name: 'Додати блок о 17:00' }).click();
    await page.getByPlaceholder('Напр. Глибока робота: звіт').fill('Зберегти мене');
    await page.getByRole('button', { name: 'Додати блок', exact: true }).click();
    await page.reload();
    await expect(page.locator('.sched h4', { hasText: 'Зберегти мене' })).toBeVisible();
  });
});

test.describe('Звички', () => {
  test('таблиця: відмітка дня й нова звичка', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'habits');
    const cell = page.getByRole('button', { name: 'Читання 30 сторінок, 11 листопада' });
    await cell.click();
    await expect(cell).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hab').nth(4).locator('.hab-streak')).toHaveText('13');

    await page.getByRole('button', { name: 'Нова звичка' }).click();
    await page.getByPlaceholder('Напр. Зарядка 10 хв').fill('Медитація');
    await page.getByRole('button', { name: 'Додати звичку' }).click();
    await expect(page.getByRole('button', { name: 'Медитація', exact: true })).toBeVisible();
  });

  test('телефон: тап по плитці й кроки до цілі', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'habits');
    const sleep = page.locator('.ht', { hasText: 'Сон до 23:30' });
    await sleep.click();
    await expect(sleep).toHaveAttribute('aria-pressed', 'true');

    await page.locator('.ht', { hasText: '10 000 кроків' }).click();
    await page.locator('.modal input').fill('10500');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.locator('.ht', { hasText: '10 000 кроків' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Фокус', () => {
  test.use({ viewport: PHONE });

  test('таймер іде, перерва записує сесію', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-11T14:20:00+02:00') });
    await page.goto('/#/today');
    await page.getByRole('button', { name: 'Відкрити таймер' }).click();
    await expect(page.locator('.fx-k')).toHaveText('Фокус · сесія 2 з 4');
    // зупиняємо годинник: далі час іде лише тоді, коли тест його перемотує
    await page.clock.pauseAt(new Date('2026-11-11T14:20:05+02:00'));
    await page.getByRole('button', { name: /Старт/ }).click();
    await page.clock.runFor(378_000); // 6 хв 18 с
    await expect(page.locator('.fx-meta')).toHaveText('6 хв 18 с минуло · далі перерва 5 хв');
    await expect(page.getByRole('timer')).toHaveAttribute('aria-label', 'Залишилось 18 хвилин 42 секунди');

    await page.getByRole('button', { name: 'Пропустити до перерви' }).click();
    await expect(page.locator('.fx-k')).toHaveText('Перерва · після сесії 2 з 4');
    const last = await page.evaluate(() => JSON.parse(localStorage.getItem('ritm:v1')!).sessions.at(-1));
    expect(last).toMatchObject({ minutes: 6, completed: false, date: '2026-11-11' });
  });
});

test.describe('Вечірній підсумок', () => {
  test.use({ viewport: PHONE });

  test('настрій, перенесення і план на завтра', async ({ page }) => {
    await open(page, 'review', { time: '2026-11-11T21:00:00+02:00' });
    await page.getByRole('radio', { name: 'Добре' }).click();
    await expect(page.getByRole('radio', { name: 'Добре' })).toHaveAttribute('aria-checked', 'true');
    await page.locator('#win').fill('Здала звіт');

    const before = await page.locator('.left').count();
    await page.getByRole('button', { name: '→ завтра' }).first().click();
    await page.getByRole('button', { name: 'у вхідні' }).first().click();
    await expect(page.locator('.left')).toHaveCount(before - 2);

    await page.getByRole('button', { name: 'Спланувати завтра →' }).click();
    await expect(page).toHaveURL(/#\/today\?d=2026-11-12/);
    const review = await page.evaluate(() => JSON.parse(localStorage.getItem('ritm:v1')!).reviews['2026-11-11']);
    expect(review).toMatchObject({ mood: 4, win: 'Здала звіт' });
  });
});
