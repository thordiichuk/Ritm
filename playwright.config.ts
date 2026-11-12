import { defineConfig } from '@playwright/test';

/**
 * Наскрізні тести: відкривають зібраний застосунок у справжньому браузері й клацають, як людина.
 * Перед запуском Playwright сам збирає проєкт і піднімає `vite preview` на порту 4173.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // час і пояс фіксуються в кожному тесті — результати не залежать від дня запуску
    timezoneId: 'Europe/Kyiv',
    locale: 'uk-UA',
    trace: 'off',
  },
  expect: {
    // знімки екрана: допускаємо крихітну різницю згладжування між машинами
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // окрема папка dist-e2e: тестова збірка (з підміненою адресою Supabase) ніколи не потрапить у dist і на сайт
    command: 'npx tsc -b && npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // тести не ходять у справжній Supabase: адресу підмінено, а відповіді дає несправжній сервер (tests/e2e/fake-supabase.ts)
    env: { VITE_SUPABASE_URL: 'https://ritm-test.supabase.co', VITE_SUPABASE_KEY: 'test-publishable-key' },
  },
});
