# Ритм — план реалізації

> `DESIGN_BRIEF.md` і папки `mockups/` у репозиторії немає — макети лежать у корені
> (`phone-*.html`, `desktop-*.html`). Токени нижче зняті безпосередньо з макетів.

## Стек
React 19 + Vite + TypeScript. Без роутера-залежності: hash-маршрути (`#/today`, `#/habits`…).
Стилі — звичайний CSS на CSS-змінних (`src/styles/tokens.css`). Дані — `localStorage` (ключ `ritm:v1`).

## Адаптивність
- `< 760px` — **телефон**: макети `phone-*.html`, плаваюча нижня навігація-«пігулка».
- `≥ 760px` — **комп'ютер**: макети `desktop-*.html`, ліва «рейка» (88px) + бенто-плитки.
  Під 1100px, як у макеті, рейка лягає горизонтально, колонки складаються.

## Сторінки
| Маршрут | Телефон | Комп'ютер |
|---|---|---|
| `#/today` | `phone-today` — стрічка тижня, погодинний розклад, «Зараз»-картка | `desktop-today` — шапка з датою, розклад, права колонка (прогрес, топ-3, звички, фокус, вода, вхідні, енергія) |
| `#/habits` | `phone-habits` — 14-денна теплокарта, плитки звичок | `desktop-habits` — бенто-метрики, таблиця звичок × днів, «куди йде час», інсайт |
| `#/focus` | `phone-focus` — лаймовий повноекранний таймер | той самий екран, центрований |
| `#/review` | `phone-review` — підсумок, настрій, незроблене, перемога | центрована колонка |
| `#/stats` | плитки статистики в стовпчик | бенто: метрики, фокус по днях, настрій, час за категоріями |
| `#/week`, `#/notes` | — (пункти рейки на комп'ютері) | простий огляд тижня, нотатки дня + налаштування |

## Компоненти
- `layout/` — `AppShell` (вибір телефон/комп'ютер), `Rail`, `BottomNav`, `Tile`
- `today/` — `DayStrip`, `Schedule` (`HourRow`, `BlockCard`, `NowCard`, `FreeSlot`), `ProgressTile`, `Top3`, `WaterTile`, `InboxTile`, `EnergyTile`, `BlockEditor` (модальне вікно)
- `habits/` — `HabitHeatmap`, `HabitTile`, `HabitTable`, `HabitEditor`
- `focus/` — `FocusScreen`, `useFocusTimer`
- `review/` — `ReviewScreen`, `MoodPicker`
- `stats/` — `StatTiles`, `TimeSplit`, `Insight`, `BarChart`
- `ui/` — `Modal`, `Icon`

## Модель даних (`src/data/types.ts`)
```ts
type Category = 'work' | 'health' | 'study' | 'personal' | 'errands'; // sky, mint, lilac, peach, ash
interface Block   { id; date: 'YYYY-MM-DD'; start: number; end: number /* хв від 00:00 */;
                    title; category; done; subtasks: Subtask[]; note? }
interface Task    { id; title; minutes; done; location: 'inbox' | 'someday' | { date } ; createdAt }
interface Habit   { id; name; color; kind: 'check' | 'count'; target?; unit?; reminder?: 'HH:MM';
                    log: Record<date, { done; at?: 'HH:MM'; value? }>; createdAt; archived? }
interface FocusSession { id; date; blockId?; title; startedAt; minutes; completed }
interface FocusTimer   { blockId?; title; session; total; phase: 'work'|'break';
                         running; endsAt?; remainingMs; workMin; breakMin }
interface DayMeta  { date; top3: {id,title,done}[]; water: number /*склянки по 250 мл*/;
                     energy: { at: 'HH:MM'; level: 1..5 }[] ; note }
interface DayReview { date; mood?: 1..5; win; closedAt?; snapshot { blocksDone, blocksTotal,
                     habitsDone, habitsTotal, focusMin } }
interface DayTemplate { blocks: Omit<Block,'id'|'date'|'done'>[] }
```

## Порядок робіт
1. Екран «Сьогодні» (телефон + комп'ютер) + сховище, токени, оболонка
2. Звички
3. Фокус-таймер
4. Вечірній підсумок
5. Статистика (+ тиждень/нотатки)

Після кожного кроку — `vite` dev-сервер + скриншоти Playwright поруч із макетом (час заморожено на 11.11.2026 14:20).
