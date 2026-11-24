import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

/*
 * Контраст квіткової теми за WCAG: читаємо значення змінних прямо з tokens.css,
 * тож тест «впаде», якщо колір змінять так, що текст стане погано читатися.
 * Норма: 4.5:1 для звичайного тексту, 3:1 для великого (від 24px або 18.7px жирним).
 */

function block(selector: string): Record<string, string> {
  const start = tokens.indexOf(selector);
  const body = tokens.slice(tokens.indexOf('{', start) + 1, tokens.indexOf('\n}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const bloom = block("[data-theme='bloom']");

function hex(name: string): string {
  const v = bloom[name];
  if (!v || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${name} має бути кольором #RRGGBB, а не «${v}»`);
  return v;
}

function luminance(h: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEXT = 4.5;
const LARGE = 3;

// [опис, колір тексту, фон, мінімум]
const PAIRS: Array<[string, string, string, number]> = [
  ['основний текст на картці', '--c-text', '--tile-bg', TEXT],
  ['другорядний текст на картці', '--c-muted', '--tile-bg', TEXT],
  ['другорядний текст на чіпсі', '--c-muted', '--c-surface-2', TEXT],
  ['другорядний текст на фоні сторінки', '--c-muted', '--c-bg', TEXT],
  ['приглушений текст на картці', '--c-muted-3', '--tile-bg', TEXT],
  ['посилання на картці', '--link', '--tile-bg', TEXT],
  ['акцент на картці', '--accent', '--tile-bg', TEXT],
  ['дрібний текст серії', '--streak-text', '--tile-bg', TEXT],
  ['великі числа серії', '--streak', '--tile-bg', LARGE],
  ['великі числа «/5»', '--c-muted-4', '--c-bg', LARGE],
  ['номери годин на картці', '--hour', '--tile-bg', LARGE],
  ['номери годин на телефоні', '--hour-phone', '--c-bg', LARGE],
  ['кнопка всередині синьої картки', '--on-accent-btn-fg', '--on-accent-btn-bg', TEXT],
  ['вибраний чіпс', '--chip-on-fg', '--chip-on-bg', TEXT],
  ['Робота', '--cat-work-fg', '--cat-work-bg', TEXT],
  ["Здоров'я", '--cat-health-fg', '--cat-health-bg', TEXT],
  ['Навчання', '--cat-study-fg', '--cat-study-bg', TEXT],
  ['Особисте', '--cat-personal-fg', '--cat-personal-bg', TEXT],
  ['Справи', '--cat-errands-fg', '--cat-errands-bg', TEXT],
  ['плитка «Найдовша серія»', '--streak-tile-fg', '--streak-tile-bg', TEXT],
  ['небезпечна дія', '--danger-fg', '--tile-bg', TEXT],
];

describe('контраст квіткової теми', () => {
  it.each(PAIRS)('%s', (_, fg, bg, min) => {
    expect(contrast(hex(fg), hex(bg))).toBeGreaterThanOrEqual(min);
  });

  it('білий текст на кожній точці синього градієнта акценту ≥ 4.5:1', () => {
    const stops = [...bloom['--accent-bg'].matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
    expect(stops.length).toBeGreaterThan(1);
    // світлий кінець градієнта — найгірший випадок для дрібного білого тексту біля краю картки
    for (const s of stops.slice(0, -1)) expect(contrast('#FFFFFF', s)).toBeGreaterThanOrEqual(TEXT);
    expect(contrast('#FFFFFF', stops.at(-1)!)).toBeGreaterThanOrEqual(LARGE);
  });
});

/*
 * Тема «Нотатки»: текст ≥ 4.5:1. Жовтий текст — лише темні відтінки (#946A00 / #855F00),
 * яскравий #F2B705 — тільки для заливок (галочки, прогрес), не для тексту.
 */
const notes = block("[data-theme='notes']");
function nhex(name: string): string {
  const v = notes[name] ?? name;
  if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${name} має бути кольором #RRGGBB, а не «${v}»`);
  return v;
}

const NOTES_PAIRS: Array<[string, string, string, number]> = [
  ['основний текст на аркуші', '--c-text', '--tile-bg', TEXT],
  ['другорядний текст на аркуші', '--c-muted', '--tile-bg', TEXT],
  ['третинний текст і штамп дати', '--n-text-3', '--tile-bg', TEXT],
  ['третинний текст у бічній панелі', '--n-text-3', '--n-side-bg', TEXT],
  ['третинний текст у шапці таблиці', '--n-text-3', '--n-table-head', TEXT],
  ['третинний текст у сьогоднішній колонці', '--n-text-3', '--n-today-col', TEXT],
  ['сірий текст на вибраній нотатці', '--n-text-on-hl', '--n-hl-note', TEXT],
  ['сірий текст на вибраній папці', '--n-text-on-hl', '--n-hl-folder', TEXT],
  ['підказка в полі пошуку', '--n-text-on-hl', '--n-hover', TEXT],
  ['жовтий текст (теги, посилання) на аркуші', '--n-yellow-text', '--tile-bg', TEXT],
  ['жовтий текст на плашці «Зараз»', '--n-yellow-text-hl', '--n-hl-now', TEXT],
  ['жовтий текст на вибраній нотатці', '--n-yellow-text-hl', '--n-hl-note', TEXT],
  ['посилання', '--link', '--tile-bg', TEXT],
  ['акцент', '--accent', '--tile-bg', TEXT],
  ['основний текст на плашці «Зараз»', '--c-text', '--n-hl-now', TEXT],
  ['теги в бічній панелі', '--n-tag-fg', '--n-tag-bg', TEXT],
  ['біла «зараз» на червоному', '#FFFFFF', '--n-now-red', TEXT],
  ['кнопка дії', '#FFFFFF', '--n-action', TEXT],
  ['небезпечна дія', '--danger-fg', '--tile-bg', TEXT],
  ['значки-кнопки панелі (не текст)', '--n-tool', '--tile-bg', LARGE],
  ['значки-кнопки при наведенні', '--n-tool', '--n-hover', LARGE],
  ['номери годин (великі)', '--hour', '--tile-bg', LARGE],
];

describe('контраст теми «Нотатки»', () => {
  it.each(NOTES_PAIRS)('%s', (_, fg, bg, min) => {
    expect(contrast(nhex(fg), nhex(bg))).toBeGreaterThanOrEqual(min);
  });

  it('яскравий жовтий не використовується як колір тексту', () => {
    for (const k of ['--c-text', '--c-muted', '--n-text-3', '--accent', '--link', '--n-yellow-text', '--n-yellow-text-hl', '--streak-text']) {
      expect(notes[k].toUpperCase()).not.toBe('#F2B705');
    }
  });
});
