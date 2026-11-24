import { useSyncExternalStore, type ReactElement, type SVGProps } from 'react';
import type { Category } from '../../data/types';
import { dayMonth, fromISO, hhmm, nowMinutes, todayISO } from '../../lib/date';
import { useNow } from '../../lib/hooks';

/*
 * Дрібні деталі теми «Нотатки». Уся логіка — у спільних діях і селекторах (src/data),
 * тут лише вигляд.
 */

// ---------- Розмір екрана: до 1100px — одна колонка, як у макеті ----------
const COMPACT = '(max-width: 1099px)';
export function useCompact(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia(COMPACT);
      mq.addEventListener('change', l);
      return () => mq.removeEventListener('change', l);
    },
    () => window.matchMedia(COMPACT).matches,
  );
}

// ---------- Теги категорій ----------
export const TAG: Record<Category, string> = {
  work: '#робота',
  health: '#здоров’я',
  study: '#навчання',
  personal: '#особисте',
  errands: '#справи',
};

// ---------- Штамп дати над заголовком ----------
export function DateStamp({ date }: { date?: string }) {
  useNow(30_000);
  const d = date ?? todayISO();
  const year = fromISO(d).getFullYear();
  const time = d === todayISO() ? ` о ${hhmm(nowMinutes())}` : '';
  return <p className="n-stamp">{dayMonth(d)} {year} р.{time}</p>;
}

// ---------- Кружечок чек-листа: справжня кнопка ----------
export function Circle({ on, label, onClick, small }: { on: boolean; label: string; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" className={`n-circ${on ? ' on' : ''}${small ? ' sm' : ''}`} aria-pressed={on}
      aria-label={`${on ? 'Виконано' : 'Відмітити'}: ${label}`} onClick={onClick}>
      {on && (
        <svg width={small ? 9 : 13} height={small ? 9 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// ---------- Значки (тонка лінія, як у макеті) ----------
export type NIconName =
  | 'folder' | 'sidebar' | 'format' | 'checklist' | 'table' | 'draw' | 'search' | 'share' | 'compose'
  | 'more' | 'back' | 'prev' | 'next' | 'play' | 'pause' | 'reset' | 'skip' | 'timer' | 'close' | 'trash';

const PATHS: Record<NIconName, ReactElement> = {
  folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  format: <path d="M4 19l5-14 5 14M6 14h6M15 19l3-8 3 8M16 16.5h4" />,
  checklist: <><circle cx="5" cy="7" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="5" cy="17" r="1.6" /><path d="M10 7h10M10 12h10M10 17h10" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16M15 4v16" /></>,
  draw: <path d="M3 21c3 0 4-2 6-4l9-9-3-3-9 9c-2 2-4 3-4 6z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  share: <path d="M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />,
  compose: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  more: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="12" r=".8" fill="currentColor" /><circle cx="12" cy="12" r=".8" fill="currentColor" /><circle cx="16" cy="12" r=".8" fill="currentColor" /></>,
  back: <path d="M15 18l-6-6 6-6" />,
  prev: <path d="M15 18l-6-6 6-6" />,
  next: <path d="M9 18l6-6-6-6" />,
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  reset: <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" />,
  skip: <path d="M5 5l10 7-10 7zM19 5v14" />,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M10 2h4" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
};

export function NIcon({ name, size = 20, ...rest }: { name: NIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}

// ---------- Графік, «намальований від руки» ----------
/**
 * Стовпчики з ледь кривими лініями й штрихуванням, підписи рукописним шрифтом.
 * values — у годинах. Порожні дні — коротка риска на базовій лінії.
 */
export function HandChart({ values, labels, goal, label }: { values: number[]; labels: string[]; goal?: string; label: string }) {
  const n = Math.max(1, values.length);
  const W = Math.max(340, n * 46);
  const H = 205;
  const base = 170;
  const top = 50;
  // праворуч — місце для підпису цілі, щоб він не налазив на стовпчики
  const step = (W - 40 - (goal ? 120 : 0)) / n;
  const bw = Math.min(40, step * 0.58);
  const max = Math.max(...values, 0.5);
  const fs = n > 10 ? 15 : 20;
  const every = n > 16 ? 3 : n > 10 ? 2 : 1;
  const fmt = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
  return (
    <svg className="n-hand" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={label}>
      <path d={`M14 ${base + 1} Q${W / 2} ${base - 2} ${W - 14} ${base + 2}`} className="n-hand-line" />
      {values.map((v, i) => {
        const x0 = 22 + i * step + (step - bw) / 2;
        const x1 = x0 + bw;
        const h = v > 0 ? Math.max(8, ((base - top) * v) / max) : 0;
        const y = base - h;
        const cx = (x0 + x1) / 2;
        return (
          <g key={i}>
            {h > 0 ? (
              <>
                <path d={`M${x0} ${base} L${x0 + 1} ${y + 2} Q${cx} ${y - 3} ${x1} ${y + 1} L${x1 + 1} ${base}`} className="n-hand-line" />
                {h > 34 && <path d={`M${x0 + 6} ${y + 10} L${x1 - 6} ${y + 28} M${x0 + 6} ${y + 24} L${x1 - 6} ${y + 42}`} className="n-hand-hatch" />}
                <text x={cx} y={y - 8} textAnchor="middle" fontSize={fs}>{fmt(v)}</text>
              </>
            ) : (
              <path d={`M${x0 + 4} ${base - 3} L${x1 - 4} ${base - 4}`} className="n-hand-line" />
            )}
            {(i % every === 0 || i === n - 1) && <text x={cx} y={base + 22} textAnchor="middle" fontSize={fs}>{labels[i]}</text>}
          </g>
        );
      })}
      {goal && <text x={W - 20} y={34} textAnchor="end" fontSize={22}>{goal}</text>}
    </svg>
  );
}

/** «вільно 1,5 год», «вільно 40 хв» */
export function freeLabel(min: number) {
  if (min < 60) return `${min} хв`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : (Math.round(h * 10) / 10).toString().replace('.', ',')} год`;
}
