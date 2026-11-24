import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, PHONE, open } from './helpers';

/*
 * Тема «Нотатки»: інша розкладка, ті самі дані й дії.
 * Перевіряємо, що відмітки, вода, перетягування з «Вхідних» і таймер працюють так само, як в інших темах.
 */

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('ritm:v1') ?? 'null'));

test.describe('тема «Нотатки» на комп’ютері', () => {
  test.use({ viewport: DESKTOP });

  test('вмикається в налаштуваннях, змінює розкладку й лишається після перезавантаження', async ({ page }) => {
    await open(page, 'notes');
    await page.getByRole('radio', { name: /Нотатки/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'notes');
    await expect(page.getByRole('navigation', { name: 'Папки' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'notes');
    await expect(page.getByRole('navigation', { name: 'Папки' })).toBeVisible();
    // назад на темну — звичайна розкладка
    await page.getByRole('radio', { name: /Темна/ }).click();
    await expect(page.getByRole('navigation', { name: 'Розділи' })).toBeVisible();
  });

  test('тема стоїть до запуску застосунку — без спалаху темної', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('notes');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  });

  test('блок, звичка й вода відмічаються кружечками й зберігаються', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.getByRole('button', { name: 'Відмітити: Пошта й дрібні справи' }).click();
    await expect(page.getByRole('button', { name: 'Виконано: Пошта й дрібні справи' })).toHaveAttribute('aria-pressed', 'true');
    expect((await stored(page)).blocks.find((b: { title: string }) => b.title === 'Пошта й дрібні справи').done).toBe(true);

    await page.getByRole('button', { name: 'Відмітити: Читання 30 сторінок' }).click();
    await expect(page.getByRole('button', { name: 'Виконано: Читання 30 сторінок' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Звички · 3 з 5' })).toBeVisible();

    await page.getByRole('button', { name: 'Склянка 6' }).click();
    await expect(page.getByRole('heading', { name: 'Вода · 1,5 з 2 л' })).toBeVisible();
  });

  test('клавіатура: Tab до кружечка, пробіл — відмітити', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    const circle = page.getByRole('button', { name: 'Відмітити: Спортзал: ноги + кардіо' });
    await circle.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Виконано: Спортзал: ноги + кардіо' })).toBeFocused();
  });

  test('задачу з «Вхідних» перетягують на вільний час', async ({ page }) => {
    // задача й вільний час мають бути видні одночасно: тест не прокручує сторінку посеред перетягування
    await page.setViewportSize({ width: 1440, height: 1600 });
    await open(page, 'today', { theme: 'notes' });
    const task = page.locator('.n-task', { hasText: 'Стоматолог' });
    await task.dragTo(page.locator('[data-free-at="16:30"]'));
    await expect(page.locator('.n-task', { hasText: 'Стоматолог' })).toHaveCount(0);
    const blk = (await stored(page)).blocks.find((b: { title: string }) => b.title === 'Стоматолог');
    expect(blk).toMatchObject({ start: 16 * 60 + 30, date: '2026-11-11' });
    await expect(page.getByRole('button', { name: 'Відмітити: Стоматолог' })).toBeVisible();
  });

  test('«У розклад» ставить задачу в перший вільний проміжок', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.getByRole('button', { name: 'У розклад: Оплатити інтернет' }).click();
    await expect(page.getByText('«Оплатити інтернет» →')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Відмітити: Оплатити інтернет' })).toBeVisible();
  });

  test('плашка «Зараз» відкриває таймер, старт і пауза працюють', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.getByRole('button', { name: /Відкрити таймер: Англійська/ }).click();
    await expect(page).toHaveURL(/#\/focus\?block=/);
    await expect(page.getByRole('heading', { name: 'Англійська: курс + 20 нових слів' })).toBeVisible();
    await page.getByRole('button', { name: 'Старт' }).click();
    await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
    expect((await stored(page)).timer.running).toBe(true);
    // минає 5 хвилин — на таймері лишається 20:00
    await page.clock.setFixedTime(new Date('2026-11-11T14:25:00+02:00'));
    await expect(page.getByRole('timer')).toHaveText('20:00');
    await page.getByRole('button', { name: 'Пауза' }).click();
    await expect(page.getByRole('button', { name: 'Продовжити' })).toBeVisible();
  });

  test('тиждень — таблиця з міні-чек-листами', async ({ page }) => {
    await open(page, 'week', { theme: 'notes' });
    await expect(page.getByRole('heading', { name: '9–15 листопада' })).toBeVisible();
    const item = page.getByRole('button', { name: 'Відмітити: 15:30 Пошта й дрібні справи, 11 листопада' });
    await item.click();
    await expect(page.getByRole('button', { name: 'Виконано: 15:30 Пошта й дрібні справи, 11 листопада' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('трекер звичок: клітинка — кнопка', async ({ page }) => {
    await open(page, 'habits', { theme: 'notes' });
    const cell = page.getByRole('button', { name: 'Читання 30 сторінок, 11 листопада: сьогодні, не відмічено' });
    await cell.click();
    await expect(page.getByRole('button', { name: 'Читання 30 сторінок, 11 листопада: виконано' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('пошук знаходить блоки', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.getByRole('textbox', { name: 'Пошук' }).fill('спортзал');
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/#\/today/);
  });
});

test.describe('тема «Нотатки» на телефоні', () => {
  test.use({ viewport: PHONE });

  test('одна колонка: меню папок і нижня панель', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await expect(page.getByRole('navigation', { name: 'Папки' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Сьогодні' }).click();
    const drawer = page.getByRole('dialog', { name: 'Папки й нотатки' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: /Тиждень/ }).click();
    await expect(page).toHaveURL(/#\/week/);
    await expect(drawer).toHaveCount(0);
    await page.getByRole('link', { name: 'Звички' }).click();
    await expect(page.getByRole('heading', { name: 'Огляд звичок' })).toBeVisible();
  });

  test('виконані блоки згорнуто, кружечки працюють', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await expect(page.getByText('5 виконано · 07:00–13:00')).toBeVisible();
    await page.getByRole('button', { name: 'Відмітити: Читання: 30 сторінок' }).click();
    await expect(page.getByText('6 виконано · 07:00–21:00')).toBeVisible();
  });
});
