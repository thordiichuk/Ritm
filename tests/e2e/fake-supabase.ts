import type { BrowserContext, Page, Route } from '@playwright/test';
import { MOCKUP_TIME } from './helpers';

/*
 * Несправжній Supabase для тестів: відповідає на ті самі адреси, що й справжній,
 * але все тримає в пам'яті тесту. Кілька вкладок/контекстів із тим самим сервером — це «кілька пристроїв».
 */

export const FAKE_URL = 'https://ritm-test.supabase.co';

interface Row {
  key: string;
  data: unknown;
  deleted: boolean;
  updated_at: number;
  modified_at: string;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-expose-headers': '*',
  'x-supabase-api-version': '2024-01-01',
};

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export class FakeSupabase {
  users = new Map<string, { id: string; password: string }>();
  rows = new Map<string, Row>();
  private tick = 0;
  /** скільки разів зверталися до бази (щоб чекати синхронізацію) */
  pushes = 0;

  addUser(email: string, password: string) {
    const id = `00000000-0000-4000-8000-${String(this.users.size + 1).padStart(12, '0')}`;
    this.users.set(email, { id, password });
    return id;
  }

  private user(email: string) {
    const u = this.users.get(email)!;
    return { id: u.id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: MOCKUP_TIME, identities: [{ id: u.id, provider: 'email' }], app_metadata: {}, user_metadata: {}, created_at: MOCKUP_TIME };
  }

  private session(email: string) {
    const u = this.users.get(email)!;
    // годинник у браузері заморожено на MOCKUP_TIME — термін дії рахуємо від нього
    const now = Math.floor(Date.parse(MOCKUP_TIME) / 1000);
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email, role: 'authenticated', aud: 'authenticated', exp: now + 36000, iat: now })}.sig`;
    return { access_token: token, token_type: 'bearer', expires_in: 36000, expires_at: now + 36000, refresh_token: `refresh-${u.id}`, user: this.user(email) };
  }

  push(rows: Array<Omit<Row, 'modified_at'>>) {
    for (const r of rows) {
      const old = this.rows.get(r.key);
      if (!old || old.updated_at < r.updated_at) {
        this.rows.set(r.key, { ...r, modified_at: new Date(Date.UTC(2026, 0, 1) + ++this.tick * 1000).toISOString() });
      }
    }
  }

  /** живі (не видалені) записи певного типу */
  live(prefix: string) {
    return [...this.rows.values()].filter((r) => !r.deleted && r.key.startsWith(prefix));
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const json = (status: number, body: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? {};

    switch (url.pathname) {
      case '/auth/v1/signup': {
        if (this.users.has(body.email)) return json(422, { code: 'user_already_exists', error_code: 'user_already_exists', msg: 'User already registered' });
        this.addUser(body.email, body.password);
        return json(200, { ...this.user(body.email), email_confirmed_at: null, confirmation_sent_at: MOCKUP_TIME });
      }
      case '/auth/v1/token': {
        const u = this.users.get(body.email);
        if (!u || u.password !== body.password) return json(400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        return json(200, this.session(body.email));
      }
      case '/auth/v1/logout':
        return route.fulfill({ status: 204, headers: CORS });
      case '/rest/v1/records': {
        const offset = Number(url.searchParams.get('offset') ?? 0);
        const gte = url.searchParams.get('modified_at')?.replace(/^gte\./, '');
        const all = [...this.rows.values()]
          .filter((r) => !gte || r.modified_at >= gte)
          .sort((a, b) => a.modified_at.localeCompare(b.modified_at) || a.key.localeCompare(b.key));
        return json(200, offset ? [] : all);
      }
      case '/rest/v1/rpc/push_records':
        this.pushes++;
        this.push(body.rows);
        return route.fulfill({ status: 204, headers: CORS });
    }
    return json(404, { message: `fake supabase: немає ${url.pathname}` });
  }

  /** Підключити до вкладки або цілого контексту (усі його вкладки) */
  async attach(target: Page | BrowserContext) {
    await target.route(`${FAKE_URL}/**`, (route) => this.handle(route));
    // миттєві сповіщення (websocket) у тестах не потрібні — просто мовчимо
    await target.routeWebSocket(/realtime/, () => {});
  }
}
