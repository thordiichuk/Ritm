import { useState } from 'react';
import { addBlock, addTask } from '../../data/actions';
import { minutesShort, todayISO, dayMonth } from '../../lib/date';
import { toast } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { DURATIONS } from './Untimed';

/*
 * Поле додавання завдання вгорі «Сьогодні».
 * «На день» — завдання без конкретної години на вибраний день; «У вхідні» — у загальний список справ.
 * Розмір поля не змінюється, коли з ним працюють: усі елементи видно одразу.
 */

type Dest = 'day' | 'inbox';
const KEY = 'ritm:compose-dest';
const readDest = (): Dest => {
  try {
    return localStorage.getItem(KEY) === 'inbox' ? 'inbox' : 'day';
  } catch {
    return 'day';
  }
};

export function TaskComposer({ date }: { date: string }) {
  const [title, setTitle] = useState('');
  const [dest, setDestState] = useState<Dest>(readDest);
  const [prio, setPrio] = useState(false);
  const [duration, setDuration] = useState(0);
  const setDest = (d: Dest) => {
    setDestState(d);
    try {
      localStorage.setItem(KEY, d);
    } catch {
      /* сховище недоступне — вибір діє до перезавантаження */
    }
  };
  const dayLabel = date === todayISO() ? 'Сьогодні' : dayMonth(date);

  const add = () => {
    const t = title.trim();
    if (!t) return;
    if (dest === 'inbox') {
      addTask(t, duration || 15, 'inbox', prio);
      toast(`«${t}» → у вхідні`);
    } else {
      addBlock({ date, start: 9 * 60, end: 10 * 60, title: t, category: 'errands', untimed: true, ...(duration ? { duration } : {}), ...(prio ? { priority: true } : {}) });
    }
    setTitle('');
    setPrio(false);
    setDuration(0);
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); add(); }} aria-label="Додати завдання">
      <div className="composer-row">
        <input className={`composer-input${prio ? ' prio-text' : ''}`} value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Що потрібно зробити?" aria-label="Нове завдання" enterKeyHint="done" />
        <button type="submit" className="composer-add" aria-label="Додати завдання" disabled={!title.trim()}>
          <Icon name="plus" size={20} stroke={2.6} />
        </button>
      </div>
      <div className="composer-opts">
        <div className="composer-seg" role="radiogroup" aria-label="Куди додати">
          <button type="button" role="radio" aria-checked={dest === 'day'} onClick={() => setDest('day')}>{dayLabel}</button>
          <button type="button" role="radio" aria-checked={dest === 'inbox'} onClick={() => setDest('inbox')}>Вхідні</button>
        </div>
        <button type="button" className="composer-chip composer-prio" aria-pressed={prio} aria-label="Важливе" onClick={() => setPrio(!prio)} title="Важливе — назва жирним шрифтом">
          <b aria-hidden="true">!</b><span className="composer-chip-text" aria-hidden="true"> Важливе</span>
        </button>
        <select className="composer-chip composer-sel" value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Тривалість">
          <option value={0}>час</option>
          {DURATIONS.map((m) => <option key={m} value={m}>{minutesShort(m)}</option>)}
        </select>
      </div>
    </form>
  );
}
