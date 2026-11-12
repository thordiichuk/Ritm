import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, open, PHONE } from './helpers';
import { FakeSupabase } from './fake-supabase';

test.use({ viewport: DESKTOP });

const EMAIL = 'tania@example.com';
const PASSWORD = 'dobryi-parol';

/** Увійти зі сторінки входу; після входу «Ритм» сам відкриває «Сьогодні» — повертаємось у нотатки */
async function signIn(page: Page, email = EMAIL, password = PASSWORD, expectSuccess = true) {
  await page.goto('/#/login');
  await page.getByLabel('Пошта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Увійти', exact: true }).click();
  if (!expectSuccess) return;
  await expect(page).toHaveURL(/#\/today$/);
  await page.goto('/#/notes?s=account');
}

const synced = (page: Page) => expect(page.getByText(/Синхронізовано о/)).toBeVisible();
/** нотатка за «сьогодні» (11 листопада) так, як її бачить сервер */
const serverNote = (server: FakeSupabase) => (server.rows.get('day:2026-11-11')?.data as { note?: string } | undefined)?.note;
const note = (page: Page) => page.getByPlaceholder('Думки, ідеї, що не забути…');

test('реєстрація → вхід → дані доходять на другий пристрій і назад → вихід', async ({ browser }) => {
  const server = new FakeSupabase();

  // ---- «телефон»: реєстрація
  const phone = await browser.newPage({ viewport: PHONE });
  await server.attach(phone);
  await open(phone, 'notes');
  await phone.getByRole('link', { name: 'Створити акаунт' }).click();
  await expect(phone.getByRole('heading', { name: 'Новий акаунт' })).toBeVisible();
  await phone.getByLabel('Пошта').fill(EMAIL);
  await phone.getByLabel('Пароль').fill('коротк');
  await phone.getByRole('button', { name: 'Створити акаунт', exact: true }).click();
  await expect(phone.getByRole('alert')).toHaveText('Пароль має бути щонайменше 8 символів.');
  await phone.getByLabel('Пароль').fill(PASSWORD);
  await phone.getByRole('button', { name: 'Створити акаунт', exact: true }).click();
  await expect(phone.getByText(`Ми надіслали лист на ${EMAIL}`)).toBeVisible();

  // ---- вхід: акаунт порожній, тож усе з телефона вивантажується
  await signIn(phone);
  await expect(phone.getByText(`Ви увійшли як ${EMAIL}`)).toBeVisible();
  await synced(phone);
  expect(server.live('habit:')).toHaveLength(5);

  await note(phone).fill('Привіт з телефона');
  await expect.poll(() => serverNote(server), { timeout: 5000 }).toBe('Привіт з телефона');

  // ---- «ноутбук»: вхід, на ньому нічого свого — бере дані з акаунта без питань
  const laptop = await browser.newPage({ viewport: DESKTOP });
  await server.attach(laptop);
  await open(laptop, 'notes');
  await signIn(laptop);
  await synced(laptop);
  await expect(note(laptop)).toHaveValue('Привіт з телефона');

  await note(laptop).fill('Привіт з ноутбука');
  await expect.poll(() => serverNote(server), { timeout: 5000 }).toBe('Привіт з ноутбука');

  // ---- телефон підтягує зміну (поле не у фокусі — текст оновлюється на місці)
  await phone.getByRole('button', { name: 'Синхронізувати зараз' }).click();
  await expect(note(phone)).toHaveValue('Привіт з ноутбука');

  // ---- вихід прибирає дані з пристрою, але не з акаунта
  phone.once('dialog', (d) => d.accept());
  await phone.getByRole('button', { name: 'Вийти' }).click();
  await expect(phone.getByRole('link', { name: 'Увійти' })).toBeVisible();
  await expect(note(phone)).toHaveValue('');
  expect(server.live('habit:')).toHaveLength(5);
});

test('неправильний пароль — зрозуміла помилка', async ({ page }) => {
  const server = new FakeSupabase();
  server.addUser(EMAIL, PASSWORD);
  await server.attach(page);
  await open(page, 'notes');
  await signIn(page, EMAIL, 'не той пароль', false);
  await expect(page.getByRole('alert')).toHaveText('Неправильна пошта або пароль.');
});

test('перший вхід на пристрої зі своїми даними — питаємо й об’єднуємо', async ({ page }) => {
  const server = new FakeSupabase();
  server.addUser(EMAIL, PASSWORD);
  server.push([
    { key: 'habit:srv', data: { id: 'srv', name: 'Йога з акаунта', color: 'mint', kind: 'check', createdAt: '2026-11-01' }, deleted: false, updated_at: 1 },
  ]);
  await server.attach(page);
  await open(page, 'notes');
  await note(page).fill('мої місцеві нотатки'); // тепер на пристрої є свої дані

  await page.goto('/#/login');
  await page.getByLabel('Пошта').fill(EMAIL);
  await page.getByLabel('Пароль').fill(PASSWORD);
  await page.getByRole('button', { name: 'Увійти', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Що робити з даними?' });
  await expect(dialog).toContainText('5 звичок, 4 задачі');
  await expect(dialog).toContainText('В акаунті: 0 блоків, 1 звичка, 0 задач');
  await dialog.getByRole('button', { name: 'Об’єднати' }).click();
  await page.goto('/#/notes?s=account');
  await synced(page);

  await page.goto('/#/habits');
  await expect(page.getByText('Йога з акаунта').first()).toBeVisible();
  await expect(page.locator('.hab')).toHaveCount(7); // заголовок + 5 місцевих + 1 з акаунта
  expect(server.live('habit:')).toHaveLength(6);
  expect(serverNote(server)).toBe('мої місцеві нотатки');
});
