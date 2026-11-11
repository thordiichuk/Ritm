import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import type { Habit, HabitColor } from '../../data/types';
import { HABIT_COLOR } from '../../data/selectors';
import { deleteHabit, saveHabit, setHabitValue } from '../../data/actions';
import { todayISO } from '../../lib/date';

const COLORS: HabitColor[] = ['peach', 'mint', 'sky', 'lilac', 'lime'];

export function HabitEditor({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [kind, setKind] = useState<Habit['kind']>(habit?.kind ?? 'check');
  const [target, setTarget] = useState(String(habit?.target ?? 10000));
  const [unit, setUnit] = useState(habit?.unit ?? 'кроків');
  const [color, setColor] = useState<HabitColor>(habit?.color ?? 'mint');
  const [reminder, setReminder] = useState(habit?.reminder ?? '');
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return setError('Назвіть звичку');
    const t = Number(target);
    if (kind === 'count' && !(t > 0)) return setError('Ціль має бути більшою за 0');
    if (reminder && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => undefined);
    }
    saveHabit({
      id: habit?.id,
      name: name.trim(),
      kind,
      color,
      target: kind === 'count' ? t : undefined,
      unit: kind === 'count' ? unit.trim() || undefined : undefined,
      reminder: reminder || undefined,
    });
    onClose();
  };

  return (
    <Modal title={habit ? 'Звичка' : 'Нова звичка'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label className="field">
          <span>Назва</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр. Зарядка 10 хв" />
        </label>
        <div className="field">
          <span>Тип</span>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={kind === 'check'} onClick={() => setKind('check')}>Так / ні</button>
            <button type="button" className="chip" aria-pressed={kind === 'count'} onClick={() => setKind('count')}>Кількість</button>
          </div>
        </div>
        {kind === 'count' && (
          <div className="row2">
            <label className="field"><span>Ціль на день</span><input className="input" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="field"><span>Одиниці</span><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
          </div>
        )}
        <div className="field">
          <span>Колір</span>
          <div className="chips">
            {COLORS.map((c) => (
              <button type="button" key={c} className="swatch" aria-label={c} aria-pressed={color === c} style={{ background: HABIT_COLOR[c] }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <label className="field">
          <span>Нагадування (необов'язково)</span>
          <input className="input" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        </label>
        {error && <p role="alert" style={{ color: '#FF8A8A', fontWeight: 700, margin: '0 0 12px' }}>{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="pill pill-lime grow">{habit ? 'Зберегти' : 'Додати звичку'}</button>
          {habit && (
            <button type="button" className="pill danger" aria-label="Видалити звичку"
              onClick={() => { if (confirm(`Видалити «${habit.name}» разом з історією?`)) { deleteHabit(habit.id); onClose(); } }}>
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function CountEditor({ habit, onClose, onEdit }: { habit: Habit; onClose: () => void; onEdit: () => void }) {
  const today = todayISO();
  const [value, setValue] = useState(String(habit.log[today]?.value ?? 0));
  const v = Number(value) || 0;
  const step = (habit.target ?? 100) >= 1000 ? 1000 : 1;
  return (
    <Modal title={habit.name} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); setHabitValue(habit.id, v); onClose(); }}>
        <label className="field">
          <span>Сьогодні, {habit.unit ?? 'одиниць'}</span>
          <input className="input disp" style={{ fontSize: 32, minHeight: 72 }} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
        </label>
        <div className="chips" style={{ marginBottom: 16 }}>
          <button type="button" className="chip" onClick={() => setValue(String(Math.max(0, v - step)))}>−{step.toLocaleString('uk-UA')}</button>
          <button type="button" className="chip" onClick={() => setValue(String(v + step))}>+{step.toLocaleString('uk-UA')}</button>
          <button type="button" className="chip" onClick={() => setValue(String(habit.target ?? v))}>Ціль досягнуто</button>
        </div>
        <div className="modal-actions">
          <button type="submit" className="pill pill-lime grow">Зберегти</button>
          <button type="button" className="pill pill-dark" onClick={onEdit}>Налаштувати</button>
        </div>
      </form>
    </Modal>
  );
}
