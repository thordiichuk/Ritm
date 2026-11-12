import { describe, expect, it } from 'vitest';
import { SyncEngine, type Host, type Remote } from '../../src/sync/engine';
import { applyRecords, diffKeys, explode, type RemoteRecord } from '../../src/sync/records';
import { createSeed, DEFAULT_SETTINGS } from '../../src/data/seed';
import type { AppState, Block } from '../../src/data/types';

/* ---------- несправжній сервер: поводиться як функція push_records у базі ---------- */
class FakeServer {
  rows = new Map<string, RemoteRecord & { seq: number }>();
  seq = 0;
  offline = false;
  remote(): Remote {
    return {
      pull: async (since) => {
        if (this.offline) throw new TypeError('Failed to fetch');
        const from = since ? Number(since) : 0;
        const records = [...this.rows.values()].filter((r) => r.seq > from).map(({ seq: _, ...r }) => r);
        return { records, cursor: String(this.seq) };
      },
      push: async (recs) => {
        if (this.offline) throw new TypeError('Failed to fetch');
        for (const r of recs) {
          const old = this.rows.get(r.key);
          if (!old || old.updated_at < r.updated_at) this.rows.set(r.key, { ...structuredClone(r), seq: ++this.seq });
        }
      },
    };
  }
}

const empty = (): AppState => ({ ...createSeed(), blocks: [], tasks: [], habits: [], sessions: [], timer: null, days: {}, reviews: {}, template: null });

/* ---------- несправжній пристрій: власне «localStorage», годинник і стан ---------- */
class Device {
  state: AppState;
  saved: boolean;
  store = new Map<string, string>();
  clock: { t: number };
  engine!: SyncEngine;
  constructor(server: FakeServer, clock: { t: number }, initial: AppState, saved = true) {
    this.state = initial;
    this.saved = saved;
    this.clock = clock;
    const host: Host = {
      getState: () => this.state,
      setState: (s) => (this.state = s),
      emptyState: empty,
      hasSavedState: () => this.saved,
      storage: {
        getItem: (k) => this.store.get(k) ?? null,
        setItem: (k, v) => void this.store.set(k, v),
        removeItem: (k) => void this.store.delete(k),
      },
      now: () => this.clock.t,
    };
    this.engine = new SyncEngine(server.remote(), host, 'user-1');
  }
  /** зміна, яку зробила людина */
  edit(fn: (s: AppState) => void) {
    const next = structuredClone(this.state);
    fn(next);
    this.state = next;
    this.saved = true;
    this.clock.t += 1000;
    this.engine.onChange(next, 'local');
  }
}

const block = (id: string, title: string): Block => ({ id, date: '2026-11-12', start: 600, end: 660, title, category: 'work', done: false, subtasks: [] });

describe('записи', () => {
  it('розкласти й скласти назад — той самий стан', () => {
    const s = createSeed();
    const recs: RemoteRecord[] = [...explode(s)].map(([key, v]) => ({ key, data: JSON.parse(v), deleted: false, updated_at: 1 }));
    const back = applyRecords(empty(), recs);
    expect(back.blocks).toEqual(s.blocks);
    expect(back.habits).toEqual(s.habits);
    expect(back.days).toEqual(s.days);
    expect(back.reviews).toEqual(s.reviews);
    expect(back.settings).toEqual(s.settings);
  });

  it('позначка звички — окремий запис, тож зміна однієї позначки не чіпає інших', () => {
    const s = createSeed();
    const n = structuredClone(s);
    const h = n.habits[0];
    h.log['2026-11-12'] = { done: true };
    expect(diffKeys(explode(s), explode(n))).toEqual([`hlog:${h.id}:2026-11-12`]);
  });

  it('видалення блоку — це видалений запис', () => {
    const s = createSeed();
    const n = structuredClone(s);
    const [gone] = n.blocks.splice(0, 1);
    expect(diffKeys(explode(s), explode(n))).toEqual([`block:${gone.id}`]);
  });

  it('невідомий тип запису з новішої версії пропускається', () => {
    const s = empty();
    expect(applyRecords(s, [{ key: 'future:1', data: { x: 1 }, deleted: false, updated_at: 1 }])).toEqual(s);
  });
});

describe('синхронізація двох пристроїв', () => {
  async function pair() {
    const server = new FakeServer();
    const clock = { t: 1_000_000 };
    const phone = new Device(server, clock, empty());
    const laptop = new Device(server, clock, empty());
    phone.edit((s) => s.blocks.push(block('b1', 'Пробіжка')));
    await phone.engine.start();
    await laptop.engine.start();
    return { server, clock, phone, laptop };
  }

  it('перший вхід: порожній акаунт отримує дані з пристрою, другий пристрій — з акаунта', async () => {
    const { phone, laptop } = await pair();
    expect(phone.engine.status.kind).toBe('ok');
    expect(laptop.state.blocks.map((b) => b.title)).toEqual(['Пробіжка']);
  });

  it('зміни різних записів на обох пристроях без інтернету — після з\'єднання є обидві', async () => {
    const { server, phone, laptop } = await pair();
    server.offline = true;
    phone.edit((s) => s.blocks.push(block('b2', 'Читання')));
    laptop.edit((s) => s.tasks.push({ id: 't1', title: 'Купити хліб', minutes: 10, done: false, location: 'inbox', createdAt: 1 }));
    await phone.engine.sync();
    expect(phone.engine.status.kind).toBe('offline');
    expect(phone.engine.pending).toBe(1);

    server.offline = false;
    await phone.engine.sync();
    await laptop.engine.sync();
    await phone.engine.sync();
    for (const d of [phone, laptop]) {
      expect(d.state.blocks.map((b) => b.title).sort()).toEqual(['Пробіжка', 'Читання']);
      expect(d.state.tasks.map((t) => t.title)).toEqual(['Купити хліб']);
    }
  });

  it('той самий запис змінено на обох — перемагає пізніша зміна', async () => {
    const { server, phone, laptop } = await pair();
    server.offline = true;
    phone.edit((s) => void (s.blocks[0].title = 'Пробіжка 5 км'));
    laptop.edit((s) => void (s.blocks[0].title = 'Пробіжка 3 км')); // на секунду пізніше
    server.offline = false;
    await phone.engine.sync();
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(phone.state.blocks[0].title).toBe('Пробіжка 3 км');
    expect(laptop.state.blocks[0].title).toBe('Пробіжка 3 км');
  });

  it('видалення доходить до іншого пристрою', async () => {
    const { phone, laptop } = await pair();
    laptop.edit((s) => void s.blocks.splice(0, 1));
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(phone.state.blocks).toEqual([]);
  });

  it('позначки однієї звички в різні дні з різних пристроїв не затирають одна одну', async () => {
    const { phone, laptop } = await pair();
    phone.edit((s) => s.habits.push({ id: 'h1', name: 'Вода', color: 'sky', kind: 'check', log: {}, createdAt: '2026-11-01' }));
    await phone.engine.sync();
    await laptop.engine.sync();
    phone.edit((s) => void (s.habits[0].log['2026-11-11'] = { done: true }));
    laptop.edit((s) => void (s.habits[0].log['2026-11-12'] = { done: true }));
    await phone.engine.sync();
    await laptop.engine.sync();
    await phone.engine.sync();
    expect(Object.keys(phone.state.habits[0].log).sort()).toEqual(['2026-11-11', '2026-11-12']);
    expect(Object.keys(laptop.state.habits[0].log).sort()).toEqual(['2026-11-11', '2026-11-12']);
  });

  it('запущений таймер лишається на своєму пристрої', async () => {
    const { phone, laptop } = await pair();
    phone.edit((s) => void (s.timer = { title: 'X', session: 1, total: 4, phase: 'work', running: true, endsAt: 5, remainingMs: 0, workMin: 25, breakMin: 5 }));
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(laptop.state.timer).toBeNull();
  });

  it('налаштування синхронізуються', async () => {
    const { phone, laptop } = await pair();
    phone.edit((s) => void (s.settings.waterGoal = 11));
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(laptop.state.settings.waterGoal).toBe(11);
  });
});

describe('перший вхід на пристрої, де вже є дані', () => {
  async function setup(saved: boolean) {
    const server = new FakeServer();
    const clock = { t: 1_000_000 };
    const a = new Device(server, clock, empty());
    a.edit((s) => s.blocks.push(block('b1', 'З акаунта')));
    await a.engine.start();
    const local = empty();
    local.blocks.push(block('b9', 'Місцевий'));
    const b = new Device(server, clock, local, saved);
    await b.engine.start();
    return { server, a, b };
  }

  it('демо-дані, яких ніхто не чіпав, просто замінюються даними акаунта', async () => {
    const { b } = await setup(false);
    expect(b.engine.status.kind).toBe('ok');
    expect(b.state.blocks.map((x) => x.title)).toEqual(['З акаунта']);
  });

  it('свої дані — спершу питаємо', async () => {
    const { b } = await setup(true);
    expect(b.engine.status).toMatchObject({ kind: 'choice', local: { blocks: 1 }, remote: { blocks: 1 } });
    expect(b.state.blocks.map((x) => x.title)).toEqual(['Місцевий']); // поки нічого не змінено
  });

  it('«об\'єднати» — дані з обох місць, і місцеві потрапляють в акаунт', async () => {
    const { a, b } = await setup(true);
    b.engine.resolveChoice('merge');
    await b.engine.sync();
    await a.engine.sync();
    expect(b.state.blocks.map((x) => x.title).sort()).toEqual(['З акаунта', 'Місцевий']);
    expect(a.state.blocks.map((x) => x.title).sort()).toEqual(['З акаунта', 'Місцевий']);
  });

  it('«взяти з акаунта» — місцеві дані замінюються й не потрапляють в акаунт', async () => {
    const { a, b } = await setup(true);
    b.engine.resolveChoice('remote');
    await b.engine.sync();
    await a.engine.sync();
    expect(b.state.blocks.map((x) => x.title)).toEqual(['З акаунта']);
    expect(a.state.blocks.map((x) => x.title)).toEqual(['З акаунта']);
  });

  it('налаштування, яких не було в акаунті, беруться за замовчуванням', async () => {
    const server = new FakeServer();
    const { focusMute: _, ...old } = DEFAULT_SETTINGS;
    await server.remote().push([
      { key: 'settings', data: { ...old, waterGoal: 9 }, deleted: false, updated_at: 5 },
      { key: 'block:b1', data: block('b1', 'X'), deleted: false, updated_at: 5 },
    ]);
    const d = new Device(server, { t: 10 }, empty(), false);
    await d.engine.start();
    expect(d.state.settings).toEqual({ ...DEFAULT_SETTINGS, waterGoal: 9 });
  });
});
