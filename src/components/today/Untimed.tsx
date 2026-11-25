import type { Block } from '../../data/types';
import { useStore } from '../../data/store';
import { untimedOn } from '../../data/selectors';
import { toggleBlock } from '../../data/actions';
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
  if (!items.length) return null; // з'явиться, щойно додасте перше завдання без часу
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
    </section>
  );
}
