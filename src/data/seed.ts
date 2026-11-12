import type { AppState, Block, Category, DayReview, FocusSession, Habit, Mood, Settings } from './types';
import { addDays, todayISO, weekdayIdx } from '../lib/date';

/** Детермінований генератор — демо-дані однакові при кожному скиданні */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

let n = 0;
const id = (p: string) => `${p}${++n}`;

const h = (hh: number, mm = 0) => hh * 60 + mm;

function block(date: string, start: number, end: number, title: string, category: Category, done = false, subtasks: string[] = []): Block {
  return {
    id: id('b'),
    date,
    start,
    end,
    title,
    category,
    done,
    subtasks: subtasks.map((t) => ({ id: id('s'), title: t, done: false })),
  };
}

/** Рядки теплокарти з макету desktop-habits: 14 днів, останній — сьогодні */
const PATTERNS: Record<string, string> = {
  warmup: 'aaaaaaaaaaaaaa',
  nophone: 'aa_aa_a_aaaaaa',
  steps: 'a_aa_aa__aa_a_',
  reading: '_aaaaaaaaaaaa_',
  sleep: 'a__aa_aaa_aa__',
};

export function createSeed(): AppState {
  n = 0;
  const today = todayISO();
  const rand = rng(46);

  // ---------- Звички ----------
  const habitDefs: Array<Pick<Habit, 'name' | 'color' | 'kind' | 'target' | 'unit' | 'reminder'> & { key: string; extra: number }> = [
    { key: 'warmup', name: 'Зарядка 10 хв', color: 'peach', kind: 'check', extra: 7 },
    { key: 'nophone', name: 'Без телефона до 9:00', color: 'mint', kind: 'check', extra: 0 },
    { key: 'steps', name: '10 000 кроків', color: 'sky', kind: 'count', target: 10000, unit: 'кроків', extra: 0 },
    { key: 'reading', name: 'Читання 30 сторінок', color: 'lilac', kind: 'check', extra: 0 },
    { key: 'sleep', name: 'Сон до 23:30', color: 'lime', kind: 'check', reminder: '22:45', extra: 0 },
  ];

  const habits: Habit[] = habitDefs.map((def) => {
    const log: Habit['log'] = {};
    const pattern = PATTERNS[def.key];
    // 30 днів історії до 14-денного вікна: ~72% виконання
    for (let i = 41; i >= 14; i--) {
      const date = addDays(today, -i);
      const forced = def.extra > 0 && i < 14 + def.extra;
      const broken = def.extra > 0 && i === 14 + def.extra; // тут серія почалась
      const r = rand();
      if (!broken && (forced || r < 0.72)) log[date] = entry(def, rand);
    }
    [...pattern].forEach((ch, idx) => {
      const date = addDays(today, idx - 13);
      if (ch === 'a') log[date] = entry(def, rand);
      else delete log[date];
    });
    if (def.key === 'warmup') log[today] = { done: true, at: '07:10' };
    if (def.key === 'nophone') log[today] = { done: true };
    if (def.key === 'steps') log[today] = { done: false, value: 6240 };
    return {
      id: id('h'),
      name: def.name,
      color: def.color,
      kind: def.kind,
      target: def.target,
      unit: def.unit,
      reminder: def.reminder,
      log,
      createdAt: addDays(today, -60),
    };
  });

  // ---------- Блоки: сьогодні — як у макеті ----------
  const blocks: Block[] = [
    block(today, h(7), h(7, 30), 'Ранкова зарядка', 'health', true),
    block(today, h(7, 30), h(8), 'Сніданок і план дня', 'personal', true),
    block(today, h(9), h(11), 'Глибока робота: квартальний звіт', 'work', true),
    block(today, h(11), h(11, 30), 'Стендап з командою', 'work', true),
    block(today, h(12), h(13), 'Обід і прогулянка', 'health', true),
    block(today, h(13), h(15), 'Англійська: курс + 20 нових слів', 'study'),
    block(today, h(15, 30), h(16, 30), 'Пошта й дрібні справи', 'errands', false, ['Розібрати пошту', 'Відповісти бухгалтерії', 'Оновити календар']),
    block(today, h(18), h(19, 30), 'Спортзал: ноги + кардіо', 'health'),
    block(today, h(20), h(21), 'Читання: 30 сторінок', 'personal'),
    block(today, h(21), h(21, 5), 'Вечірній підсумок', 'errands'),
  ];

  // Минулі 20 днів — типовий розклад, щоб статистика мала з чого рахувати
  const typical: Array<[number, number, string, Category]> = [
    [h(7), h(7, 30), 'Ранкова зарядка', 'health'],
    [h(9), h(11), 'Глибока робота', 'work'],
    [h(11), h(11, 30), 'Стендап з командою', 'work'],
    [h(12), h(13), 'Обід і прогулянка', 'health'],
    [h(13), h(14, 30), 'Англійська', 'study'],
    [h(14, 30), h(17), 'Проєктна робота', 'work'],
    [h(17), h(17, 30), 'Пошта й дрібні справи', 'errands'],
    [h(18), h(19), 'Спортзал', 'health'],
    [h(20), h(21), 'Читання', 'personal'],
  ];
  const sleepHabit = habits[4];
  for (let i = 1; i <= 20; i++) {
    const date = addDays(today, -i);
    const weekend = weekdayIdx(date) >= 5;
    const sleptWell = !!sleepHabit.log[addDays(date, -1)]?.done;
    const rate = sleptWell ? 0.82 : 0.58;
    for (const [s, e, t, c] of typical) {
      if (weekend && c === 'work') continue;
      blocks.push(block(date, s, e, t, c, rand() < rate));
    }
    if (weekend) blocks.push(block(date, h(10), h(13), 'Час з родиною', 'personal', rand() < 0.9));
  }

  // ---------- Сесії фокусу ----------
  const sessions: FocusSession[] = [];
  const addSession = (date: string, startMin: number, title: string, minutes = 25) => {
    const t = new Date(`${date}T00:00:00`).getTime() + startMin * 60000;
    sessions.push({ id: id('f'), date, title, startedAt: t, minutes, completed: true });
  };
  for (let k = 0; k < 4; k++) addSession(today, h(9) + k * 30, 'Глибока робота: квартальний звіт');
  addSession(today, h(13), 'Англійська: курс + 20 нових слів');
  for (let i = 1; i <= 20; i++) {
    const date = addDays(today, -i);
    if (weekdayIdx(date) >= 5) continue;
    const count = 2 + Math.floor(rand() * 4);
    for (let k = 0; k < count; k++) addSession(date, h(9) + k * 30, 'Глибока робота');
  }

  // ---------- Підсумки минулих днів ----------
  const reviews: Record<string, DayReview> = {};
  const wins = ['Закрила всі листи до обіду', 'Пробігла 5 км', 'Дочитала розділ', 'Не відкладала складне', 'Лягла вчасно', 'Провела класну зустріч'];
  for (let i = 1; i <= 20; i++) {
    const date = addDays(today, -i);
    reviews[date] = {
      mood: (2 + Math.floor(rand() * 4)) as Mood,
      win: wins[Math.floor(rand() * wins.length)],
      closedAt: new Date(`${date}T21:05:00`).getTime(),
      handled: {},
    };
  }

  // ---------- Метадані днів ----------
  const days: AppState['days'] = {};
  for (let i = 1; i <= 20; i++) {
    const date = addDays(today, -i);
    days[date] = {
      top3: [],
      water: 4 + Math.floor(rand() * 5),
      energy: [
        { at: '09:30', level: 4 + Math.round(rand()) },
        { at: '10:30', level: 4 + Math.round(rand()) },
        { at: '14:00', level: 2 + Math.round(rand()) },
        { at: '17:00', level: 3 },
      ],
      note: '',
    };
  }
  days[today] = {
    top3: [
      { id: id('t'), title: 'Здати квартальний звіт', done: true },
      { id: id('t'), title: 'Урок англійської', done: false },
      { id: id('t'), title: 'Тренування', done: false },
    ],
    water: 5,
    energy: [{ at: '14:00', level: 4 }],
    note: '',
  };

  return {
    version: 1,
    blocks,
    tasks: [
      { id: id('k'), title: 'Стоматолог', minutes: 15, done: false, location: 'inbox', createdAt: Date.now() },
      { id: id('k'), title: 'Подарунок мамі', minutes: 60, done: false, location: 'inbox', createdAt: Date.now() },
      { id: id('k'), title: 'Оплатити інтернет', minutes: 5, done: false, location: 'inbox', createdAt: Date.now() },
      { id: id('k'), title: 'Фото з поїздки', minutes: 45, done: false, location: 'inbox', createdAt: Date.now() },
    ],
    habits,
    sessions,
    timer: null,
    days,
    reviews,
    template: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const DEFAULT_SETTINGS: Settings = {
  dayStart: 7,
  dayEnd: 22,
  waterGoal: 8,
  focusGoalHours: 12,
  workMin: 25,
  breakMin: 5,
  notifications: true,
  focusMute: true,
  reviewAt: '21:00',
};

function entry(def: { kind: string; target?: number }, rand: () => number) {
  return def.kind === 'count' ? { done: true, value: (def.target ?? 0) + Math.floor(rand() * 2500) } : { done: true };
}
