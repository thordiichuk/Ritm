import { useEffect, useRef, useState } from 'react';
import { dayOf, getState, replaceState, resetToDemo, resetToEmpty, update, useStore } from '../data/store';
import { setNote } from '../data/actions';
import { dayMonth, plural, todayISO } from '../lib/date';
import { BottomNav, Rail } from '../components/layout/Nav';
import { useIsPhone, useOuterValue } from '../lib/hooks';
import { useLocation } from '../lib/router';
import { Modal, toast } from '../components/ui/Modal';
import { downloadBackup, parseBackup, type BackupSummary } from '../data/backup';
import type { AppState } from '../data/types';
import { BotanicalSpray } from '../components/flora/Botanical';
import { Icon } from '../components/ui/Icon';
import type { Settings } from '../data/types';
import { setTheme, useTheme, type Theme } from '../lib/theme';
import { AccountPanel } from '../components/account/Account';
import { useAccount } from '../sync/account';

export function NotesScreen() {
  const today = todayISO();
  const note = useStore((s) => dayOf(s, today).note);
  const settings = useStore((s) => s.settings);
  const phone = useIsPhone();
  const { params } = useLocation();
  const settingsRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLElement>(null);
  const acc = useAccount();
  // шестерня на телефоні веде сюди з ?s=settings — прокручуємо до налаштувань; ?s=account — до акаунта
  useEffect(() => {
    if (params.get('s') === 'settings') settingsRef.current?.scrollIntoView({ block: 'start' });
    if (params.get('s') === 'account') accountRef.current?.scrollIntoView({ block: 'start' });
  }, [params]);
  const noteRef = useOuterValue<HTMLTextAreaElement>(note);
  const [restored, setRestored] = useState(0); // після відновлення з копії перемальовуємо поле нотатки
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => update((d) => void (d.settings[k] = v));
  const numField = (k: 'waterGoal' | 'focusGoalHours' | 'workMin' | 'breakMin', label: string, min: number, max: number) => (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" min={min} max={max} value={settings[k]}
        onChange={(e) => { const v = Number(e.target.value); if (v >= min && v <= max) set(k, v); }} />
    </label>
  );
  const sections = (
    <>
        <section className="tile">
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Нотатки дня</span>
          <textarea ref={noteRef} className="input" style={{ minHeight: 220 }} key={`${today}-${restored}`} defaultValue={note} placeholder="Думки, ідеї, що не забути…"
            onChange={(e) => setNote(today, e.target.value)} />
        </label>
      </section>
      <section className="tile" ref={settingsRef} style={{ scrollMarginTop: 16 }}>
        <p className="k" style={{ marginBottom: 18 }}>Налаштування</p>
        <ThemePicker />
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
      {acc.configured && (
        <section className="tile" ref={accountRef} style={{ scrollMarginTop: 16 }}>
          <p className="k" style={{ marginBottom: 14 }}>Акаунт і синхронізація</p>
          <AccountPanel />
        </section>
      )}
      <section className="tile">
        <p className="k" style={{ marginBottom: 14 }}>Дані</p>
        <p style={{ margin: '0 0 16px', color: 'var(--c-muted)', fontWeight: 600, lineHeight: 1.5 }}>
          {acc.user
            ? 'Записи зберігаються в цьому браузері й синхронізуються з акаунтом. Копія у файл — додатковий запобіжник.'
            : 'Усе зберігається лише в цьому браузері. Робіть копію, щоб не втратити записи або перенести їх на інший пристрій.'}
        </p>
        <BackupPanel onRestored={() => setRestored((n) => n + 1)} />
        <div className="modal-actions" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--c-surface-2)' }}>
          <button className="pill pill-dark" onClick={() => { if (confirm(acc.user ? 'Замінити все демо-даними — тут, в акаунті й на всіх ваших пристроях?' : 'Замінити все демо-даними?')) { resetToDemo(); toast('Демо-дані відновлено'); } }}>Відновити демо-дані</button>
          <button className="pill danger" onClick={() => { if (confirm(acc.user ? 'Видалити всі дані — тут, в акаунті й на всіх ваших пристроях — і почати з чистого аркуша?' : 'Видалити всі дані й почати з чистого аркуша?')) { resetToEmpty(); toast('Усе очищено'); } }}>Почати з чистого аркуша</button>
        </div>
      </section>
    </>
  );

  if (phone) {
    return (
      <div className="phone st-phone notes-phone">
        <BotanicalSpray className="flora-head-phone" />
        <p className="k">{dayMonth(today)}</p>
        <h1 className="disp st-title" style={{ marginBottom: 16 }}>Нотатки</h1>
        {sections}
        <BottomNav active="notes" />
      </div>
    );
  }

  return (
    <div className="wrap">
      <Rail active="notes" />
      <main>
        <header className="tile page-head">
          <BotanicalSpray className="flora-head" />
          <div>
            <p className="k">{dayMonth(today)}</p>
            <h1 className="disp">Нотатки</h1>
          </div>
        </header>
        {sections}
      </main>
    </div>
  );
}

const THEMES: Array<{ id: Theme; label: string; hint: string }> = [
  { id: 'dark', label: 'Темна', hint: 'лаймова, за замовчуванням' },
  { id: 'bloom', label: 'Блакитна квіткова', hint: 'світла, з ботанічною графікою' },
];

/** Вибір теми. Кожне прев'ю «одягає» свою тему через data-theme і малює її власними змінними. */
function ThemePicker() {
  const theme = useTheme();
  return (
    <div className="field">
      <span id="theme-h">Тема</span>
      <div className="theme-picker" role="radiogroup" aria-labelledby="theme-h">
        {THEMES.map((t) => (
          <button key={t.id} className="theme-opt" role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)}>
            <span className="theme-prev" data-theme={t.id} aria-hidden="true">
              <span className="tp-tile">
                <span className="tp-title">Аа</span>
                <span className="tp-row">
                  <i style={{ background: 'var(--cat-work-bg)' }} />
                  <i style={{ background: 'var(--cat-health-bg)' }} />
                  <i style={{ background: 'var(--cat-study-bg)' }} />
                  <i style={{ background: 'var(--cat-personal-bg)' }} />
                </span>
              </span>
              <span className="tp-accent" />
            </span>
            <span className="theme-label">{t.label}<small>{t.hint}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Резервна копія: зберегти у файл і відновити з файлу (з підтвердженням) */
function BackupPanel({ onRestored }: { onRestored: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ state: AppState; summary: BackupSummary; name: string } | null>(null);

  const pick = async (file: File | undefined) => {
    setError('');
    if (!file) return;
    const res = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = ''; // дозволити вибрати той самий файл ще раз
    if (!res.ok) return setError(res.error);
    setPending({ state: res.state, summary: res.summary, name: file.name });
  };

  const restore = () => {
    if (!pending) return;
    replaceState(pending.state);
    setPending(null);
    onRestored();
    toast('Дані відновлено з копії');
  };

  const when = (d: Date) =>
    Number.isNaN(d.getTime()) ? 'невідомо коли' : d.toLocaleString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="modal-actions">
        <button className="pill pill-lime" onClick={() => { downloadBackup(getState()); toast('Копію збережено у файл'); }}>
          <Icon name="download" size={18} />Зберегти копію
        </button>
        <button className="pill pill-dark" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} />Відновити з копії
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Файл копії" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger-fg)', fontWeight: 700, margin: '12px 0 0' }}>{error}</p>}
      {pending && (
        <Modal title="Відновити з копії?" onClose={() => setPending(null)}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{pending.name}</p>
          <p style={{ margin: '0 0 16px', color: 'var(--c-muted)', fontWeight: 600 }}>зроблено {when(pending.summary.exportedAt)}</p>
          <ul className="backup-sum">
            <li><b>{pending.summary.blocks}</b> {plural(pending.summary.blocks, ['блок', 'блоки', 'блоків'])} за {pending.summary.days} {plural(pending.summary.days, ['день', 'дні', 'днів'])}</li>
            <li><b>{pending.summary.habits}</b> {plural(pending.summary.habits, ['звичка', 'звички', 'звичок'])}</li>
            <li><b>{pending.summary.tasks}</b> {plural(pending.summary.tasks, ['задача', 'задачі', 'задач'])} у вхідних</li>
            <li><b>{pending.summary.sessions}</b> {plural(pending.summary.sessions, ['сесія', 'сесії', 'сесій'])} фокусу</li>
          </ul>
          <p style={{ margin: '16px 0', fontWeight: 600, lineHeight: 1.5 }}>
            Поточні дані на цьому пристрої буде <b>замінено</b> даними з копії. Якщо вони вам потрібні, спершу збережіть їхню копію.
          </p>
          <div className="modal-actions">
            <button className="pill pill-lime grow" onClick={restore}>Замінити дані</button>
            <button className="pill pill-dark" onClick={() => setPending(null)}>Скасувати</button>
          </div>
        </Modal>
      )}
    </>
  );
}
