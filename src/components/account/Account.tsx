import { useEffect, useState, type FormEvent } from 'react';
import {
  cancelRecovery, onNotice, pendingChanges, resolveChoice, sendPasswordReset, setNewPassword, signIn, signOut, signUp, syncNow,
  takeNotice, useAccount,
} from '../../sync/account';
import type { Counts, SyncStatus } from '../../sync/engine';
import { plural } from '../../lib/date';
import { Modal, toast } from '../ui/Modal';
import { href } from '../../lib/router';

const MIN_PASSWORD = 8;

const time = (ms: number) => new Date(ms).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

function statusText(s: SyncStatus | null): { text: string; tone: 'ok' | 'muted' | 'bad' } {
  switch (s?.kind) {
    case undefined:
    case 'starting':
      return { text: 'Підключаємось…', tone: 'muted' };
    case 'choice':
      return { text: 'Чекаємо вашого рішення щодо даних на цьому пристрої', tone: 'muted' };
    case 'syncing':
      return { text: 'Синхронізуємо…', tone: 'muted' };
    case 'ok':
      return { text: `Синхронізовано о ${time(s.lastSync)}`, tone: 'ok' };
    case 'offline':
      return { text: 'Немає зв’язку. Зміни збережено на пристрої й буде надіслано, щойно з’явиться інтернет.', tone: 'muted' };
    case 'error':
      return { text: `Не вдалося синхронізувати: ${s.message}. Спробуємо ще раз за пів хвилини.`, tone: 'bad' };
  }
}

/** Панель «Акаунт» у налаштуваннях */
export function AccountPanel() {
  const acc = useAccount();
  const [noticeMsg, setNoticeMsg] = useState(takeNotice);
  useEffect(() => onNotice(() => setNoticeMsg(takeNotice())), []);

  if (!acc.configured) return null;
  return (
    <>
      {noticeMsg && <p className="acc-note" role="status">{noticeMsg}</p>}
      {!acc.ready ? <p className="acc-muted">Перевіряємо вхід…</p> : acc.user ? <SignedIn email={acc.user.email} status={acc.sync} /> : <SignedOut />}
    </>
  );
}

function SignedIn({ email, status }: { email: string; status: SyncStatus | null }) {
  const st = statusText(status);
  const [busy, setBusy] = useState(false);
  const out = async () => {
    const pending = pendingChanges();
    const msg = pending > 0 && !navigator.onLine
      ? `Немає зв’язку, і ${pending} ${plural(pending, ['зміна', 'зміни', 'змін'])} ще не дійшли до акаунта — після виходу вони пропадуть. Усе одно вийти?`
      : 'Вийти з акаунта? Дані з цього пристрою буде прибрано, в акаунті вони лишаться.';
    if (!confirm(msg)) return;
    setBusy(true);
    await signOut();
    setBusy(false);
    toast('Ви вийшли з акаунта');
  };
  return (
    <div>
      <p className="acc-who">Ви увійшли як <b>{email}</b></p>
      <p className={`acc-status acc-${st.tone}`} role="status">
        <span className="acc-dot" aria-hidden="true" />
        {st.text}
      </p>
      <div className="modal-actions">
        <button className="pill pill-dark" onClick={() => void syncNow()} disabled={status?.kind === 'syncing'}>Синхронізувати зараз</button>
        <button className="pill pill-dark" onClick={() => void out()} disabled={busy}>Вийти</button>
      </div>
    </div>
  );
}

function SignedOut() {
  return (
    <div>
      <p className="acc-muted" style={{ marginTop: 0 }}>
        Увійдіть, щоб ваші записи були однакові на телефоні й комп’ютері. Без акаунта все працює як раніше — лише в цьому браузері.
      </p>
      <div className="modal-actions">
        <a className="pill pill-lime" href={href('login')}>Увійти</a>
        <a className="pill pill-dark" href={href('login', { m: 'up' })}>Створити акаунт</a>
      </div>
    </div>
  );
}

/** Форма входу й реєстрації (сторінка «Вхід») */
export function SignInForm({ mode, onModeChange }: { mode: 'in' | 'up'; onModeChange: (m: 'in' | 'up') => void }) {
  const setMode = onModeChange;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'up' && password.length < MIN_PASSWORD) return setError(`Пароль має бути щонайменше ${MIN_PASSWORD} символів.`);
    setBusy(true);
    const res = mode === 'in' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (res.message) setMessage(res.message);
    setPassword('');
  };

  const forgot = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    const res = await sendPasswordReset(email);
    setBusy(false);
    if (res.ok) setMessage(res.message ?? '');
    else setError(res.error);
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <div className="seg-tabs acc-tabs" role="tablist" aria-label="Вхід або реєстрація">
        <button type="button" className="pill" role="tab" aria-selected={mode === 'in'} onClick={() => { setMode('in'); setError(''); setMessage(''); }}>Увійти</button>
        <button type="button" className="pill" role="tab" aria-selected={mode === 'up'} onClick={() => { setMode('up'); setError(''); setMessage(''); }}>Створити акаунт</button>
      </div>
      <div className="login-fields">
        <label className="field">
          <span>Пошта</span>
          <input className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input className="input" type="password" required minLength={mode === 'up' ? MIN_PASSWORD : undefined}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      </div>
      {mode === 'up' && <p className="acc-muted" style={{ marginTop: -6 }}>Щонайменше {MIN_PASSWORD} символів.</p>}
      {error && <p role="alert" className="acc-error">{error}</p>}
      {message && <p role="status" className="acc-note">{message}</p>}
      <div className="modal-actions">
        <button type="submit" className="pill pill-lime" disabled={busy || !email || !password}>
          {mode === 'in' ? 'Увійти' : 'Створити акаунт'}
        </button>
        {mode === 'in' && (
          <button type="button" className="pill pill-dark" onClick={() => void forgot()} disabled={busy}>Забули пароль?</button>
        )}
      </div>
    </form>
  );
}

const countLine = (c: Counts) =>
  `${c.blocks} ${plural(c.blocks, ['блок', 'блоки', 'блоків'])}, ${c.habits} ${plural(c.habits, ['звичка', 'звички', 'звичок'])}, ${c.tasks} ${plural(c.tasks, ['задача', 'задачі', 'задач'])}`;

/** Вікна, які можуть знадобитися будь-де: перший вхід на пристрої з даними і новий пароль */
export function AccountPrompts() {
  const acc = useAccount();
  if (acc.recovery) return <NewPassword />;
  if (acc.sync?.kind === 'choice') {
    const { local, remote } = acc.sync;
    return (
      <Modal title="Що робити з даними?" onClose={() => void signOut().then(() => toast('Вхід скасовано'))}>
        <p style={{ margin: '0 0 14px', fontWeight: 600, lineHeight: 1.5 }}>І на цьому пристрої, і в акаунті вже є записи.</p>
        <ul className="backup-sum">
          <li><span>На цьому пристрої: <b>{countLine(local)}</b></span></li>
          <li><span>В акаунті: <b>{countLine(remote)}</b></span></li>
        </ul>
        <p style={{ margin: '16px 0', fontWeight: 600, lineHeight: 1.5 }}>
          <b>Об’єднати</b> — залишаться записи з обох місць. <b>Взяти з акаунта</b> — записи цього пристрою буде замінено даними акаунта.
        </p>
        <div className="modal-actions">
          <button className="pill pill-lime grow" onClick={() => void resolveChoice('merge')}>Об’єднати</button>
          <button className="pill pill-dark" onClick={() => void resolveChoice('remote')}>Взяти з акаунта</button>
        </div>
      </Modal>
    );
  }
  return null;
}

function NewPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Пароль має бути щонайменше ${MIN_PASSWORD} символів.`);
    setBusy(true);
    const res = await setNewPassword(password);
    setBusy(false);
    if (res.ok) toast('Пароль змінено');
    else setError(res.error);
  };
  return (
    <Modal title="Новий пароль" onClose={cancelRecovery}>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <label className="field">
          <span>Новий пароль</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="acc-error">{error}</p>}
        <div className="modal-actions">
          <button type="submit" className="pill pill-lime grow" disabled={busy || !password}>Зберегти пароль</button>
        </div>
      </form>
    </Modal>
  );
}
