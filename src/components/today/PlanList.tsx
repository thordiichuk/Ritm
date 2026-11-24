import { useSyncExternalStore } from 'react';
import type { Block, Category } from '../../data/types';
import { useStore } from '../../data/store';
import { blocksOn } from '../../data/selectors';
import { toggleBlock } from '../../data/actions';
import { todayISO } from '../../lib/date';
import { useNow } from '../../lib/hooks';
import { isReviewBlock } from '../../screens/Review';

/*
 * План дня списком — у темі «Нотатки»: ті самі блоки розкладу, але як чек-лист без сітки годин.
 * Нових даних немає: відмітка — та сама дія toggleBlock, редагування — той самий редактор блоку.
 */

export type PlanView = 'hours' | 'list';
const KEY = 'ritm:plan-view';
const listeners = new Set<() => void>();

function read(): PlanView {
  try {
    return localStorage.getItem(KEY) === 'list' ? 'list' : 'hours';
  } catch {
    return 'hours';
  }
}
let current: PlanView = read();

export function setPlanView(v: PlanView) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* сховище недоступне — вибір діє до перезавантаження */
  }
  listeners.forEach((l) => l());
}

/** Вигляд розкладу: «по годинах» чи «списком» (запам'ятовується) */
export function usePlanView(): PlanView {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => current,
  );
}

export function PlanViewSwitch() {
  const view = usePlanView();
  return (
    <div className="seg-tabs plan-switch" role="tablist" aria-label="Вигляд розкладу">
      <button type="button" className="pill" role="tab" aria-selected={view === 'hours'} onClick={() => setPlanView('hours')}>По годинах</button>
      <button type="button" className="pill" role="tab" aria-selected={view === 'list'} onClick={() => setPlanView('list')}>Списком</button>
    </div>
  );
}

const TAG: Record<Category, string> = {
  work: '#робота', health: '#здоров’я', study: '#навчання', personal: '#особисте', errands: '#справи',
};

export function PlanList({ date, onEdit, onAdd }: { date: string; onEdit: (b: Block) => void; onAdd: () => void }) {
  const blocks = useStore((s) => blocksOn(s, date));
  const now = useNow(30_000);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = date === todayISO();
  const done = blocks.filter((b) => b.done).length;
  return (
    <div className="plan">
      <p className="plan-sum">{blocks.length ? `${done} з ${blocks.length} виконано` : 'План на день порожній'}</p>
      <ul className="plan-list">
        {blocks.map((b) => {
          const active = isToday && !b.done && b.start <= nowMin && b.end > nowMin;
          return (
            <li key={b.id} className={`plan-li${b.done ? ' done' : ''}`}>
              <button type="button" className={`plan-circ${b.done ? ' on' : ''}`} aria-pressed={b.done}
                aria-label={`${b.done ? 'Виконано' : 'Відмітити'}: ${b.title}`} onClick={() => toggleBlock(b.id)}>
                {b.done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l4 4L19 7" />
                  </svg>
                )}
              </button>
              <button type="button" className="plan-tx" onClick={() => onEdit(b)}>{b.title}</button>
              {!isReviewBlock(b.title) && <span className="plan-tag">{TAG[b.category]}</span>}
              {active && <span className="plan-now">зараз</span>}
            </li>
          );
        })}
      </ul>
      <button type="button" className="plan-add" onClick={onAdd}>+ Додати пункт</button>
    </div>
  );
}
