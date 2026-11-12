/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // юніт-тести; наскрізні (Playwright) лежать у tests/e2e і запускаються окремо
  test: { include: ['tests/unit/**/*.test.ts'] },
});
