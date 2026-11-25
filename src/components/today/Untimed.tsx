import { useState } from 'react';
import type { Block } from '../../data/types';
import { useStore } from '../../data/store';
import { untimedOn } from '../../data/selectors';
import { addBlock, toggleBlock } from '../../data/actions';
import { Icon } from '../ui/Icon';
import { minutesShort } from '../../lib/date';

/** Варіанти тривалості завдання без часу (хвилини) */
export const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

/**
 * Завдання дня без конкретної години: окремий чек-лист над погодинним розкладом.
 * Це звичайні блоки з позначкою untimed — відмітка й редагування ті самі.
 */
export function UntimedList({ date, onEdit }: { date: string; onEdit: (b: Block) => void }) {
  const items = useStore((s) => untimedOn(s, date));
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(0);
  const add = () => {
    const t = title.trim();
    if (!t) return;
    addBlock({ date, start: 9 * 60, end: 10 * 60, title: t, category: 'errands', untimed: true, ...(duration ? { duration } : {}) });
    setTitle('');
    setDuration(0);
  };
  return (
    <section className="untimed" aria-label="Без часу">
      <p className="k">Без часу</p>
      {items.map((b) => (
        <div key={b.id} className={`top3-row untimed-row${b.done ? ' done' : ''}`}>
          <button type="button" className={`chk${b.done ? ' on' : ''}`} aria-pressed={b.done}
            aria-label={`${b.done ? 'Виконано' : 'Відмітити'}: ${b.title}`} onClick={() => toggleBlock(b.id)}>
            {b.done && <Icon name="check" size={14} stroke={4} />}
          </button>
          <button type="button" className={`untimed-tx${b.priority ? ' prio-text' : ''}`} onClick={() => onEdit(b)}>
            {b.priority ? '! ' : ''}{b.title}
          </button>
          {b.duration ? <span className="untimed-dur">{minutesShort(b.duration)}</span> : null}
        </div>
      ))}
      <form className="untimed-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <span className="chk ghost" aria-hidden="true" />
        <input className="input untimed-input" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="+ завдання без часу" aria-label="Нове завдання без часу" />
        <select className="untimed-sel" value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Тривалість завдання">
          <option value={0}>тривалість</option>
          {DURATIONS.map((m) => <option key={m} value={m}>{minutesShort(m)}</option>)}
        </select>
      </form>
    </section>
  );
}
