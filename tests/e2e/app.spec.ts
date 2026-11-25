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
    // задача й вільна година мають бути видні одночасно: тест не прокручує сторінку посеред перетягування
    await page.setViewportSize({ width: 1440, height: 1600 });
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

  test('на «Сьогодні» немає «Топ-3» і води; вода — на сторінці звичок', async ({ page }) => {
    await open(page, 'today');
    await expect(page.getByText('Топ-3')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Склянка 8' })).toHaveCount(0);
    await page.goto('/#/habits');
    await page.getByRole('button', { name: 'Склянка 8' }).click();
    await expect(page.getByText('2 / 2 л')).toBeVisible();
  });

  test('важлива задача — жирним; лишається важливою й у розкладі', async ({ page }) => {
    await open(page, 'today');
    await page.getByLabel('Нова задача').fill('Дзвінок лікарю');
    await page.getByRole('button', { name: 'Важливе', exact: true }).click();
    await page.getByLabel('Нова задача').press('Enter');
    const chip = page.getByRole('button', { name: /Дзвінок лікарю/ });
    await expect(chip).toHaveClass(/prio/);
    expect(await chip.evaluate((e) => getComputedStyle(e).fontWeight)).toBe('800');
    await chip.click();
    await page.getByRole('button', { name: 'У розклад' }).click();
    const h4 = page.locator('.sched h4', { hasText: 'Дзвінок лікарю' });
    await expect(h4).toHaveClass(/prio-text/);
  });

  test('редактор блоку: категорії з емодзі й позначка «Важливе»', async ({ page }) => {
    await open(page, 'today');
    await page.locator('.sched h4', { hasText: 'Спортзал' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: /Здоров'я/ })).toContainText('🏃');
    await dialog.getByRole('button', { name: 'Важливе' }).click();
    await dialog.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.locator('.sched h4', { hasText: 'Спортзал' })).toHaveClass(/prio-text/);
  });

  test('шаблон дня', async ({ page }) => {
    await open(page, 'today');
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

test.describe('Телефон: вікна вміщаються в екран', () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true });

  test('«Новий блок» не ширший за екран навіть з полями дати й часу, як у Safari на iPhone', async ({ page }) => {
    await open(page, 'today');
    // у Safari поля дати й часу мають власну мінімальну ширину — імітуємо її
    await page.addStyleTag({ content: 'input[type=date], input[type=time] { min-width: 250px; }' });
    await page.getByRole('button', { name: 'Додати', exact: true }).click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    const { scroll, client, page: pageW } = await modal.evaluate((m) => ({ scroll: m.scrollWidth, client: m.clientWidth, page: document.documentElement.scrollWidth }));
    expect(scroll).toBeLessThanOrEqual(client + 1);
    expect(pageW).toBeLessThanOrEqual(390);
    // шрифт полів ≥ 16px — інакше iPhone збільшує сторінку під час введення
    const sizes = await modal.locator('input, select, textarea').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
  });
});

test.describe('Завдання без часу', () => {
  test.use({ viewport: DESKTOP });

  test('додаються рядком над розкладом, відмічаються й лишаються після перезавантаження', async ({ page }) => {
    await open(page, 'today');
    const list = page.getByRole('region', { name: 'Без часу' });
    await list.getByLabel('Нове завдання без часу').fill('Купити подарунок мамі');
    await list.getByLabel('Нове завдання без часу').press('Enter');
    await expect(list.getByRole('button', { name: 'Відмітити: Купити подарунок мамі' })).toBeVisible();
    await expect(page.getByText('5 з 11 блоків')).toBeVisible(); // рахується в прогресі дня
    await list.getByRole('button', { name: 'Відмітити: Купити подарунок мамі' }).click();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Без часу' }).getByRole('button', { name: 'Виконано: Купити подарунок мамі' })).toBeVisible();
    await expect(page.getByText('6 з 11 блоків')).toBeVisible();
    // не потрапляє в погодинну сітку
    await expect(page.locator('.sched h4', { hasText: 'Купити подарунок мамі' })).toHaveCount(0);
  });

  test('у редакторі: «Без конкретного часу» ховає поля часу', async ({ page }) => {
    await open(page, 'today');
    await page.getByRole('button', { name: 'Новий блок' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Назва').fill('Записатися до лікаря');
    await expect(dialog.getByText('Початок')).toBeVisible();
    await dialog.getByRole('button', { name: 'Без конкретного часу' }).click();
    await expect(dialog.getByText('Початок')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Додати блок' }).click();
    await expect(page.getByRole('region', { name: 'Без часу' }).getByText('Записатися до лікаря')).toBeVisible();
    await page.goto('/#/week');
    await expect(page.locator('.week-col.today .wb', { hasText: 'Записатися до лікаря' })).toHaveText('Записатися до лікаря'); // без години
  });
});
