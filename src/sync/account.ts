import { useSyncExternalStore } from 'react';
import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { emptyState, getState, hasSavedState, onStateChange, replaceState, resetToEmpty } from '../data/store';
import { SUPABASE_KEY, SUPABASE_URL, syncConfigured } from './config';
import { SyncEngine, type SyncStatus } from './engine';
import { supabaseRemote } from './supabase';

/*
 * Обліковий запис і синхронізація для решти застосунку.
 * Бібліотека Supabase завантажується лише тоді, коли вона потрібна (людина входить або вже увійшла),
 * тож без акаунта сайт не стає важчим.
 */

export interface AccountState {
  configured: boolean;
  /** з'ясовуємо, чи людина вже увійшла */
  ready: boolean;
  user: { id: string; email: string } | null;
  sync: SyncStatus | null;
  /** людина прийшла за посиланням «скинути пароль» — треба ввести новий */
  recovery: boolean;
}

let acc: AccountState = { configured: syncConfigured, ready: !syncConfigured, user: null, sync: null, recovery: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<AccountState>) => {
  acc = { ...acc, ...patch };
  listeners.forEach((l) => l());
};

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => acc,
  );
}

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;
let engine: SyncEngine | null = null;

function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true });
      // документація Supabase радить не чекати інших викликів просто в цьому обробнику
      setTimeout(() => void onUser(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null), 0);
    });
    return client;
  });
  return clientPromise;
}

/** Куди повертати людину з листа: та сама сторінка, без маршруту (маршрут живе після #) */
const redirectUrl = () => location.origin + location.pathname;

/** Чи на цьому пристрої вже є сеанс входу Supabase (тоді бібліотеку варто завантажити одразу) */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {
    /* сховище недоступне */
  }
  return false;
}

/** Викликати один раз під час запуску застосунку */
export async function initAccount() {
  if (!syncConfigured) return;
  const params = new URLSearchParams(location.search);
  const fromEmail = params.has('code') || params.has('error_description');
  if (!fromEmail && !hasStoredSession()) {
    set({ ready: true });
    return;
  }
  const c = await getClient();
  const { data } = await c.auth.getSession(); // тут же обробляється ?code= з листа
  if (fromEmail) {
    const err = params.get('error_description');
    if (err) notice(err.includes('expired') ? 'Посилання з листа застаріло. Спробуйте ще раз.' : `Не вдалося увійти за посиланням: ${err}`);
    else if (!data.session) notice('Пошту підтверджено. Тепер увійдіть із паролем.');
    // прибрати ?code=… з адреси (щоб не лишалося в закладках) і показати панель акаунта
    history.replaceState(null, '', location.pathname + '#/notes?s=account');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  set({ ready: true });
}

let noticeText = '';
const noticeListeners = new Set<() => void>();
function notice(t: string) {
  noticeText = t;
  noticeListeners.forEach((l) => l());
}
/** Одноразове повідомлення після повернення з листа */
export function takeNotice(): string {
  const t = noticeText;
  noticeText = '';
  return t;
}
export function onNotice(l: () => void) {
  noticeListeners.add(l);
  return () => void noticeListeners.delete(l);
}

async function onUser(user: AccountState['user']) {
  if (user?.id === acc.user?.id) {
    if (user && user.email !== acc.user?.email) set({ user });
    return;
  }
  engine?.stop();
  engine = null;
  set({ user, sync: null, ready: true });
  if (!user || !client) return;
  const e = new SyncEngine(
    supabaseRemote(client, user.id),
    {
      getState,
      setState: (s) => replaceState(s, 'remote'),
      emptyState,
      hasSavedState,
      storage: localStorage,
      now: () => Date.now(),
    },
    user.id,
    (s) => {
      if (engine === e) set({ sync: s });
    },
  );
  engine = e;
  await e.start();
}

// кожна зміна стану — двигуну синхронізації
onStateChange((_prev, next, source) => engine?.onChange(next, source));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void engine?.sync());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void engine?.sync();
  });
  // про всяк випадок, якщо сповіщення про зміни на сервері не дійшло
  setInterval(() => {
    if (document.visibilityState === 'visible') void engine?.sync();
  }, 5 * 60_000);
}

/* ---------------- дії для інтерфейсу ---------------- */

/** Зрозуміле пояснення помилки входу */
function explain(e: AuthError | Error): string {
  const code = 'code' in e ? (e as AuthError).code : undefined;
  switch (code) {
    case 'invalid_credentials':
      return 'Неправильна пошта або пароль.';
    case 'email_not_confirmed':
      return 'Пошту ще не підтверджено — відкрийте лист від «Ритму» і натисніть посилання.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Акаунт із цією поштою вже є. Увійдіть або скиньте пароль.';
    case 'weak_password':
      return 'Пароль закороткий або надто простий: щонайменше 8 символів.';
    case 'same_password':
      return 'Новий пароль має відрізнятися від старого.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Забагато спроб. Зачекайте кілька хвилин і спробуйте ще раз.';
    case 'validation_failed':
    case 'email_address_invalid':
      return 'Перевірте адресу пошти.';
  }
  if (e instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'Немає зв’язку з інтернетом.';
  return e.message || 'Щось пішло не так. Спробуйте ще раз.';
}

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<Result> {
  try {
    const { error } = await (await getClient()).auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: explain(error) } : { ok: true };
  } catch (e) {
    return { ok: false, error: explain(e as Error) };
  }
}

export async function signUp(email: string, password: string): Promise<Result> {
  try {
    const { data, error } = await (await getClient()).auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUrl() } });
    if (error) return { ok: false, error: explain(error) };
    if (data.session) return { ok: true };
    return { ok: true, message: `Ми надіслали лист на ${email.trim()}. Відкрийте його й натисніть посилання, щоб підтвердити пошту.` };
  } catch (e) {
    return { ok: false, error: explain(e as Error) };
  }
}

export async function sendPasswordReset(email: string): Promise<Result> {
  if (!email.trim()) return { ok: false, error: 'Спершу введіть пошту.' };
  try {
    const { error } = await (await getClient()).auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
    if (error) return { ok: false, error: explain(error) };
    return { ok: true, message: `Якщо акаунт із поштою ${email.trim()} існує, ми надіслали туди посилання для нового пароля. Відкрийте його в цьому ж браузері.` };
  } catch (e) {
    return { ok: false, error: explain(e as Error) };
  }
}

export async function setNewPassword(password: string): Promise<Result> {
  try {
    const { error } = await (await getClient()).auth.updateUser({ password });
    if (error) return { ok: false, error: explain(error) };
    set({ recovery: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: explain(e as Error) };
  }
}

export function cancelRecovery() {
  set({ recovery: false });
}

/** Скільки змін на цьому пристрої ще не дійшло до акаунта */
export const pendingChanges = () => engine?.pending ?? 0;

/**
 * Вийти: дані на цьому пристрої прибираються (в акаунті вони лишаються),
 * щоб наступна людина за цим комп'ютером їх не побачила.
 */
export async function signOut() {
  if (engine && engine.pending > 0) await engine.sync();
  engine?.forget();
  engine = null;
  if (client) await client.auth.signOut({ scope: 'local' });
  resetToEmpty('remote');
  set({ user: null, sync: null });
}

export const syncNow = () => engine?.sync();
export const resolveChoice = (choice: 'merge' | 'remote') => engine?.resolveChoice(choice);
