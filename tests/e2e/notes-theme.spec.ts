import { expect, test } from '@playwright/test';
import { DESKTOP, PHONE, open } from './helpers';

/*
 * Тема «Нотатки»: будова сторінок — як у темній темі, вигляд — нотатника.
 * Дії ті самі, що й в інших темах (їх перевіряє app.spec.ts); тут — що тема вмикається, тримається
 * і що на місці її ознаки: білий аркуш, жовтий акцент, теги категорій, кружечки чек-листа.
 */

const pseudo = (sel: string, which: '::before' | '::after', prop: string) =>
  `(() => getComputedStyle(document.querySelector(${JSON.stringify(sel)}), '${which}').getPropertyValue('${prop}'))()`;

test.describe('тема «Нотатки»', () => {
  test.use({ viewport: DESKTOP });

  test('вмикається в налаштуваннях і лишається після перезавантаження', async ({ page }) => {
    await open(page, 'notes');
    await page.getByRole('radio', { name: /Нотатки/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'notes');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'notes');
  });

  test('тема стоїть до запуску застосунку — без спалаху темної', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.route('**/*', (r) => (r.request().resourceType() === 'script' ? r.abort() : r.continue()));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('notes');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  });

  test('будова як у темній темі: рейка, розклад, плитки', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await expect(page.getByRole('navigation', { name: 'Розділи' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Погодинний розклад' })).toBeVisible();
    await expect(page.getByText('Прогрес дня')).toBeVisible();
  });

  test('вигляд нотаток: тег категорії й кружечок чек-листа у блоці', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    const blk = page.locator('.sched .blk', { hasText: 'Спортзал' });
    await expect(blk).toBeVisible();
    const tag = await page.evaluate(pseudo('.sched .blk.mint h4', '::after', 'content'));
    expect(tag).toContain('#здоров’я');
    // невиконаний — порожній кружечок; після позначки «готово» — жовтий з галочкою
    const done = await page.evaluate(pseudo('.sched .blk.done h4', '::before', 'background-color'));
    expect(done).toBe('rgb(242, 183, 5)');
    expect(await page.evaluate(pseudo('.sched .blk.done h4', '::before', 'content'))).toContain('✓');
  });

  test('дії працюють так само: вода на сторінці звичок', async ({ page }) => {
    await open(page, 'habits', { theme: 'notes' });
    await page.getByRole('button', { name: 'Склянка 6' }).click();
    await expect(page.getByText('1,5 / 2 л')).toBeVisible();
  });

  test('на телефоні — та сама нижня панель', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'today', { theme: 'notes' });
    await expect(page.getByRole('navigation', { name: 'Навігація' })).toBeVisible();
    await page.getByRole('link', { name: 'Звички' }).click();
    await expect(page.getByRole('heading', { name: 'Звички' })).toBeVisible();
  });

  test('план на день списком: пункти без годин, відмітка, вибір запам’ятовується', async ({ page }) => {
    await open(page, 'today', { theme: 'notes' });
    await page.getByRole('tab', { name: 'Списком' }).click();
    const plan = page.getByRole('region', { name: 'План на день' });
    await expect(plan).toBeVisible();
    await expect(plan.getByText('5 з 10 виконано')).toBeVisible();
    await expect(plan.getByText(/\d{2}:\d{2}/)).toHaveCount(0); // жодних годин
    await plan.getByRole('button', { name: 'Відмітити: Спортзал: ноги + кардіо' }).click();
    await expect(plan.getByText('6 з 10 виконано')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('region', { name: 'План на день' })).toBeVisible();
    await page.getByRole('button', { name: '+ Додати пункт' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'По годинах' }).click();
    await expect(page.getByRole('region', { name: 'Погодинний розклад' })).toBeVisible();
  });

  test('у темній темі перемикача немає — розклад як і був', async ({ page }) => {
    await open(page, 'today');
    await expect(page.getByRole('tablist', { name: 'Вигляд розкладу' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Погодинний розклад' })).toBeVisible();
  });
});
