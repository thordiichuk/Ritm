import { useState } from 'react';
import { dayOf, resetToDemo, resetToEmpty, update, useStore } from '../data/store';
import { setNote } from '../data/actions';
import { dayMonth, todayISO } from '../lib/date';
import { Rail } from '../components/layout/Nav';
import { toast } from '../components/ui/Modal';
import type { Settings } from '../data/types';

export function NotesScreen() {
  const today = todayISO();
  const note = useStore((s) => dayOf(s, today).note);
  const settings = useStore((s) => s.settings);
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => void (d.settings[k] = v));
  const numField = (k: 'waterGoal' | 'focusGoalHours' | 'workMin' | 'breakMin', label: string, min: number, max: number) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" min={min} max={max} value={settings[k]}
        onChange={(e) => { const v = Number(e.target.value); if (v >= min && v <= max) set(k, v); }} />
    </label>
  );
  return (
    <div className="wrap">
      <Rail active="notes" />
      <main>
        <header className="tile page-head">
          <div>
            <p className="k">{dayMonth(today)}</p>
            <h1 className="disp">Нотатки</h1>
          </div>
        </header>
        <section className="tile">
          <label className="field" style={{ marginBottom: 0 }}>
            <span>Нотатки дня</span>
            <textarea className="input" style={{ minHeight: 220 }} key={today} defaultValue={note} placeholder="Думки, ідеї, що не забути…"
              onChange={(e) => setNote(today, e.target.value)} />
          </label>
        </section>
        <section className="tile">
          <p className="k" style={{ marginBottom: 18 }}>Налаштування</p>
          <div className="settings-grid">
            {numField('waterGoal', 'Вода, склянок по 250 мл', 1, 16)}
            {numField('focusGoalHours', 'Ціль фокусу, год/тиждень', 1, 80)}
            {numField('workMin', 'Сесія фокусу, хв', 5, 120)}
            {numField('breakMin', 'Перерва, хв', 1, 60)}
            <label className="field"><span>Початок дня</span>
              <input className="input" type="number" min={0} max={12} value={settings.dayStart} onChange={(e) => { const v = Number(e.target.value); if (v >= 0 && v < settings.dayEnd) set('dayStart', v); }} />
            </label>
            <label className="field"><span>Кінець дня</span>
              <input className="input" type="number" min={12} max={24} value={settings.dayEnd} onChange={(e) => { const v = Number(e.target.value); if (v > settings.dayStart && v <= 24) set('dayEnd', v); }} />
            </label>
            <label className="field"><span>Вечірній підсумок о</span>
              <input className="input" type="time" value={settings.reviewAt} onChange={(e) => e.target.value && set('reviewAt', e.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="pill pill-dark" aria-pressed={settings.notifications} onClick={() => set('notifications', !settings.notifications)}>
              Нагадування: {settings.notifications ? 'увімкнено' : 'вимкнено'}
            </button>
            {perm === 'default' && (
              <button className="pill pill-lime" onClick={async () => setPerm(await Notification.requestPermission())}>Дозволити системні сповіщення</button>
            )}
            {perm === 'denied' && <span style={{ color: 'var(--c-muted)', fontWeight: 700, alignSelf: 'center' }}>Системні сповіщення заблоковано в браузері</span>}
          </div>
        </section>
        <section className="tile">
          <p className="k" style={{ marginBottom: 14 }}>Дані</p>
          <p style={{ margin: '0 0 16px', color: 'var(--c-muted)', fontWeight: 600, lineHeight: 1.5 }}>Усе зберігається лише в цьому браузері (localStorage).</p>
          <div className="modal-actions">
            <button className="pill pill-dark" onClick={() => { if (confirm('Замінити все демо-даними?')) { resetToDemo(); toast('Демо-дані відновлено'); } }}>Відновити демо-дані</button>
            <button className="pill danger" onClick={() => { if (confirm('Видалити всі дані й почати з чистого аркуша?')) { resetToEmpty(); toast('Усе очищено'); } }}>Почати з чистого аркуша</button>
          </div>
        </section>
      </main>
    </div>
  );
}
