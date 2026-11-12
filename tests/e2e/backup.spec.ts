import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DESKTOP, open } from './helpers';

test.use({ viewport: DESKTOP });

test('зберегти копію → змінити дані → відновити', async ({ page }) => {
  await open(page, 'notes');

  // 1. зберегти копію
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Зберегти копію' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('ritm-backup-2026-11-11.json');
  const path = await download.path();
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup).toMatchObject({ app: 'ritm', format: 1 });
  expect(backup.state.habits).toHaveLength(5);

  // 2. стерти все
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Почати з чистого аркуша' }).click();
  await page.goto('/#/habits');
  await expect(page.locator('.hab')).toHaveCount(1); // лише рядок заголовка

  // 3. відновити з копії
  await page.goto('/#/notes');
  await page.getByLabel('Файл копії').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'Відновити з копії?' });
  await expect(dialog).toContainText('5 звичок');
  await dialog.getByRole('button', { name: 'Замінити дані' }).click();
  await expect(page.getByText('Дані відновлено з копії')).toBeVisible();

  await page.goto('/#/habits');
  await expect(page.locator('.hab')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Зарядка 10 хв', exact: true })).toBeVisible();
});

test('скасування не змінює дані', async ({ page }) => {
  await open(page, 'notes');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Зберегти копію' }).click()]);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Почати з чистого аркуша' }).click();

  await page.getByLabel('Файл копії').setInputFiles(await download.path());
  await page.getByRole('button', { name: 'Скасувати' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ritm:v1')!).habits.length)).toBe(0);
});

test('чужий файл — зрозуміла помилка, дані не зачеплено', async ({ page }) => {
  await open(page, 'notes');
  await page.getByLabel('Файл копії').setInputFiles({ name: 'photo.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByRole('alert')).toHaveText('Це не копія «Ритму».');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/#/habits');
  await expect(page.locator('.hab')).toHaveCount(6); // заголовок + 5 звичок, як і було
});
