import type { AppState } from '../data/types';
import { applyRecords, diffKeys, explode, hasUserData, recordValue, type RecordMap, type RemoteRecord } from './records';

/*
 * Двигун синхронізації.
 *
 * Дані завжди живуть у localStorage — застосунок працює і без інтернету.
 * Для кожного запису пам'ятаємо «версію» — момент його останньої зміни (мс).
 * Локальна зміна: запис отримує нову версію й потрапляє в чергу на відправку.
 * Відправка: сервер приймає запис, лише якщо його версія новіша за ту, що вже є.
 * Отримання: беремо з сервера все, що змінилось після останнього разу, і застосовуємо записи,
 * новіші за наші. Тож для кожного запису перемагає остання зміна, а різні записи не заважають одне одному.
 */

/** Те, що двигун вимагає від сервера. Справжня реалізація — supabase.ts, у тестах — несправжній сервер. */
export interface Remote {
  /** Записи, змінені на сервері після `since` (з невеликим запасом), і нова позначка для наступного разу */
  pull(since: string | null): Promise<{ records: RemoteRecord[]; cursor: string | null }>;
  /** Зберегти записи; сервер лишає собі новішу версію */
  push(records: RemoteRecord[]): Promise<void>;
  /** Повідомляти, що на сервері щось змінилось (необов'язково) */
  subscribe?(onChange: () => void): () => void;
}

/** Доступ двигуна до сховища застосунку */
export interface Host {
  getState(): AppState;
  /** Записати стан, отриманий із сервера (без повторної синхронізації) */
  setState(next: AppState): void;
  emptyState(): AppState;
  /** Чи людина вже щось зберігала на цьому пристрої */
  hasSavedState(): boolean;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  now(): number;
}

export type SyncStatus =
  | { kind: 'starting' }
  | { kind: 'choice'; local: Counts; remote: Counts }
  | { kind: 'syncing'; lastSync?: number }
  | { kind: 'ok'; lastSync: number }
  | { kind: 'offline'; lastSync?: number }
  | { kind: 'error'; message: string; lastSync?: number };

export interface Counts {
  blocks: number;
  habits: number;
  tasks: number;
  days: number;
}

interface Meta {
  cursor: string | null;
  ver: Record<string, number>;
  dirty: string[];
}

const META_PREFIX = 'ritm:sync:';
const PUSH_CHUNK = 500;

export function countsOf(s: AppState): Counts {
  return { blocks: s.blocks.length, habits: s.habits.length, tasks: s.tasks.length, days: new Set(s.blocks.map((b) => b.date)).size };
}

export class SyncEngine {
  status: SyncStatus = { kind: 'starting' };
  private meta: Meta | null = null;
  private dirty = new Set<string>();
  private cache: RecordMap;
  private running: Promise<void> | null = null;
  private again = false;
  private pushTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private unsub: (() => void) | undefined;
  private stopped = false;
  private firstRemote: RemoteRecord[] | null = null;
  private lastSync: number | undefined;
  private pendingCursor: string | null = null;

  constructor(
    private remote: Remote,
    private host: Host,
    readonly userId: string,
    private onStatus: (s: SyncStatus) => void = () => {},
  ) {
    this.cache = explode(host.getState());
  }

  private get metaKey() {
    return META_PREFIX + this.userId;
  }

  private loadMeta(): Meta | null {
    try {
      const raw = this.host.storage.getItem(this.metaKey);
      return raw ? (JSON.parse(raw) as Meta) : null;
    } catch {
      return null;
    }
  }

  private saveMeta() {
    if (!this.meta) return;
    this.meta.dirty = [...this.dirty];
    try {
      this.host.storage.setItem(this.metaKey, JSON.stringify(this.meta));
    } catch {
      /* сховище переповнене — спробуємо наступного разу */
    }
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** Запустити: уперше на цьому пристрої для цього акаунта — з'ясувати, чиї дані брати */
  async start(): Promise<void> {
    this.meta = this.loadMeta();
    if (this.meta) {
      this.dirty = new Set(this.meta.dirty);
      this.unsub = this.remote.subscribe?.(() => this.schedule(300));
      await this.sync();
      return;
    }
    this.setStatus({ kind: 'syncing' });
    let pulled: { records: RemoteRecord[]; cursor: string | null };
    try {
      pulled = await this.remote.pull(null);
    } catch (e) {
      this.fail(e);
      this.retryTimer = setTimeout(() => void this.start(), 30_000);
      return;
    }
    if (this.stopped) return;
    const live = pulled.records.filter((r) => !r.deleted);
    const localHas = this.host.hasSavedState() && hasUserData(this.cache);

    if (live.length === 0) {
      // акаунт порожній — вивантажуємо все, що є на пристрої
      this.meta = { cursor: pulled.cursor, ver: {}, dirty: [] };
      this.markAll(this.cache.keys());
      await this.finishFirst();
    } else if (!localHas) {
      // на пристрої нічого свого — просто беремо дані з акаунта
      this.adopt(pulled.records, pulled.cursor, 'remote');
      await this.finishFirst();
    } else {
      // дані є і тут, і там — питаємо людину
      this.firstRemote = pulled.records;
      this.meta = null;
      this.pendingCursor = pulled.cursor;
      const remoteState = applyRecords(this.host.emptyState(), live);
      this.setStatus({ kind: 'choice', local: countsOf(this.host.getState()), remote: countsOf(remoteState) });
    }
  }

  /** Відповідь на питання «що робити з даними на цьому пристрої» */
  resolveChoice(choice: 'merge' | 'remote'): Promise<void> {
    if (!this.firstRemote) return Promise.resolve();
    this.adopt(this.firstRemote, this.pendingCursor, choice);
    this.firstRemote = null;
    return this.finishFirst();
  }

  private finishFirst(): Promise<void> {
    this.saveMeta();
    this.unsub = this.remote.subscribe?.(() => this.schedule(300));
    return this.sync();
  }

  /** Прийняти дані з акаунта: 'remote' — замість місцевих, 'merge' — разом із ними */
  private adopt(records: RemoteRecord[], cursor: string | null, mode: 'remote' | 'merge') {
    const base = mode === 'remote' ? this.host.emptyState() : this.host.getState();
    const next = applyRecords(base, records);
    this.meta = { cursor, ver: {}, dirty: [] };
    for (const r of records) this.meta.ver[r.key] = r.updated_at;
    this.host.setState(next);
    this.cache = explode(next);
    if (mode === 'merge') {
      // те, чого в акаунті ще не було, вивантажуємо
      const remoteKeys = new Set(records.filter((r) => !r.deleted).map((r) => r.key));
      this.markAll([...this.cache.keys()].filter((k) => !remoteKeys.has(k)));
    } else {
      this.dirty.clear();
    }
  }

  private markAll(keys: Iterable<string>) {
    if (!this.meta) return;
    const now = this.host.now();
    for (const k of keys) {
      this.meta.ver[k] = Math.max(now, (this.meta.ver[k] ?? 0) + 1);
      this.dirty.add(k);
    }
  }

  /** Стан змінився. Викликати для кожної зміни зі сховища. */
  onChange(next: AppState, source: 'local' | 'remote' | 'tab') {
    const map = explode(next);
    if (source === 'local' && this.meta) {
      this.markAll(diffKeys(this.cache, map));
      this.cache = map;
      this.saveMeta();
      this.schedule(1000);
      return;
    }
    this.cache = map;
    if (source === 'tab') {
      // інша вкладка могла вже щось відправити — беремо її облік
      const m = this.loadMeta();
      if (m && this.meta) {
        this.meta = m;
        this.dirty = new Set(m.dirty);
      }
    }
  }

  /** Синхронізувати трохи згодом (щоб не смикати сервер на кожну літеру) */
  schedule(ms = 1000) {
    if (this.stopped || !this.meta) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.sync(), ms);
  }

  /** Відправити свої зміни й забрати чужі. Паралельні виклики об'єднуються. */
  sync(): Promise<void> {
    if (this.stopped || !this.meta) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    clearTimeout(this.retryTimer);
    this.running = (async () => {
      do {
        this.again = false;
        this.setStatus({ kind: 'syncing', lastSync: this.lastSync });
        try {
          await this.push();
          await this.pull();
          this.lastSync = this.host.now();
          if (!this.stopped) this.setStatus({ kind: 'ok', lastSync: this.lastSync });
        } catch (e) {
          this.fail(e);
          this.retryTimer = setTimeout(() => void this.sync(), 30_000);
          break;
        }
      } while (this.again && !this.stopped);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private fail(e: unknown) {
    if (this.stopped) return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const network = e instanceof TypeError; // fetch кидає TypeError, коли немає зв'язку
    if (offline || network) this.setStatus({ kind: 'offline', lastSync: this.lastSync });
    else this.setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e), lastSync: this.lastSync });
  }

  private async push() {
    const meta = this.meta!;
    const keys = [...this.dirty];
    for (let i = 0; i < keys.length; i += PUSH_CHUNK) {
      const batch: RemoteRecord[] = keys.slice(i, i + PUSH_CHUNK).map((key) => {
        const data = recordValue(this.cache, key);
        return { key, data: data ?? null, deleted: data === undefined, updated_at: meta.ver[key] ?? this.host.now() };
      });
      await this.remote.push(batch);
      // поки відправляли, запис могли змінити ще раз — тоді він лишається в черзі
      for (const r of batch) if (meta.ver[r.key] === r.updated_at) this.dirty.delete(r.key);
      this.saveMeta();
    }
  }

  private async pull() {
    const meta = this.meta!;
    const { records, cursor } = await this.remote.pull(meta.cursor);
    if (this.stopped) return;
    const accepted = records.filter((r) => r.updated_at > (meta.ver[r.key] ?? 0));
    if (accepted.length) {
      for (const r of accepted) {
        meta.ver[r.key] = r.updated_at;
        this.dirty.delete(r.key); // новіша зміна з іншого пристрою перемагає нашу
      }
      const next = applyRecords(this.host.getState(), accepted);
      this.host.setState(next);
      this.cache = explode(next);
    }
    if (cursor) meta.cursor = cursor;
    this.saveMeta();
  }

  /** Скільки змін ще не відправлено */
  get pending() {
    return this.dirty.size;
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.pushTimer);
    clearTimeout(this.retryTimer);
    this.unsub?.();
  }

  /** Забути облік синхронізації на цьому пристрої (під час виходу з акаунта) */
  forget() {
    this.stop();
    try {
      this.host.storage.removeItem(this.metaKey);
    } catch {
      /* немає доступу до сховища */
    }
  }
}
