import type { Block } from '../../data/types';
import { useStore } from '../../data/store';
import { untimedOn } from '../../data/selectors';
import { toggleBlock, toggleSubtask } from '../../data/actions';
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
        <div key={b.id} className="untimed-item">
        <div className={`top3-row untimed-row${b.done ? ' done' : ''}`}>
          <button type="button" className={`chk${b.done ? ' on' : ''}`} aria-pressed={b.done}
            aria-label={`${b.done ? 'Виконано' : 'Відмітити'}: ${b.title}`} onClick={() => toggleBlock(b.id)}>
            {b.done && <Icon name="check" size={14} stroke={4} />}
          </button>
          <button type="button" className={`untimed-tx${b.priority ? ' prio-text' : ''}`} onClick={() => onEdit(b)}>
            {b.priority ? '! ' : ''}{b.title}
          </button>
          {b.duration ? <span className="untimed-dur">{minutesShort(b.duration)}</span> : null}
        </div>
        {b.subtasks.length > 0 && (
          <ul className="untimed-subs" aria-label={`Підзадачі: ${b.title}`}>
            {b.subtasks.map((st) => (
              <li key={st.id} className={st.done ? 'done' : undefined}>
                <button type="button" className={`chk chk-sm${st.done ? ' on' : ''}`} aria-pressed={st.done}
                  aria-label={`${st.done ? 'Виконано' : 'Відмітити'}: ${st.title}`} onClick={() => toggleSubtask(b.id, st.id)}>
                  {st.done && <Icon name="check" size={11} stroke={4} />}
                </button>
                <span className="untimed-sub-tx">{st.title}</span>
              </li>
            ))}
          </ul>
        )}
        </div>
      ))}
    </section>
  );
}
