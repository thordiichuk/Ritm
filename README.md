# Ритм

Планувальник дня: погодинний розклад, звички, фокус-таймер, вечірній підсумок і статистика.
React + Vite + TypeScript, дані зберігаються в `localStorage` браузера.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # збірка в dist/
```

## Тести

```bash
npm test                  # юніт-тести (Vitest): підрахунки, дати, контраст квіткової теми
npm run test:e2e          # наскрізні тести (Playwright) у справжньому браузері + знімки екрана
npm run check             # усе разом: типи, юніт- і наскрізні тести
```

Перед першим запуском наскрізних тестів установіть браузер: `npx playwright install chromium`.

Знімки екрана (`tests/e2e/visual.spec.ts-snapshots/`) зроблені в Linux, як у CI. На Windows чи macOS
шрифти згладжуються інакше, тому локально знімки можуть «падати» — орієнтуйтеся на результат CI.
Якщо вигляд змінено навмисно, оновіть знімки: `npm run test:e2e:update`.

## CI і деплой

`.github/workflows/ci.yml` на кожен pull request перевіряє типи, запускає юніт- і наскрізні тести.
Після злиття в `main` той самий workflow публікує сайт на GitHub Pages:
https://thordiichuk.github.io/Ritm/

Одноразове налаштування: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

- Макети: `mockups/` (телефон — `phone-*.html`, комп'ютер — `desktop-*.html`)
- План, структура й модель даних: `docs/PLAN.md`
- Дизайн-токени: `src/styles/tokens.css`

Під 760px застосунок показує телефонні екрани з нижньою навігацією, ширше — комп'ютерні з рейкою.
Під час першого запуску створюються демо-дані; очистити їх можна в «Нотатки → Дані».

## Теми

- **Темна** (за замовчуванням) і **блакитна квіткова** — перемикач у «Нотатки → Налаштування → Тема».
- Усі кольори, шрифти, радіуси й тіні — CSS-змінні в `src/styles/tokens.css`: блок `:root, [data-theme='dark']` і блок `[data-theme='bloom']`.
- Вибір зберігається в `localStorage` (ключ `ritm:theme`) і застосовується скриптом в `index.html` ще до запуску React.
- Ботанічна графіка — `src/components/flora/Botanical.tsx`, рендериться лише в темі «bloom».
