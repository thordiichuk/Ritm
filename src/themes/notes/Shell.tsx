import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../data/store';
import { blocksOn, weekDays } from '../../data/selectors';
import { dayMonth, hhmm, plural, todayISO } from '../../lib/date';
import { href, navigate, useLocation } from '../../lib/router';
import { toast } from '../../components/ui/Modal';
import { NIcon, TAG, useCompact, type NIconName } from './parts';

/*
 * Оболонка теми «Нотатки»:
 * комп'ютер — бічна панель-«папки» → колонка-список нотаток → аркуш із панеллю інструментів;
 * до 1100px — одна колонка, зверху «‹ Папка», знизу панель інструментів.
 */

export type Folder = 'today' | 'week' | 'habits' | 'focus' | 'stats' | 'inbox' | 'notes';

export interface ListItem {
  key: string;
  title: string;
  sub: string;
  href?: string;
  onClick?: () => void;
  on?: boolean;
}
export interface ListSpec {
  title: string;
  sections: Array<{ label?: string; items: ListItem[] }>;
}

const FOLDER_LABEL: Record<Folder, string> = {
  today: 'Сьогодні', week: 'Тиждень', habits: 'Звички', focus: 'Фокус', stats: 'Статистика', inbox: 'Вхідні', notes: 'Нотатки',
};

const FOLDER_HREF: Record<Folder, string> = {
  today: href('today'), week: href('week'), habits: href('habits'), focus: href('focus'), stats: href('stats'),
  inbox: href('today', { s: 'inbox' }), notes: href('notes'),
};

const SIDE_KEY = 'ritm:notes-side';
const BIG_KEY = 'ritm:notes-big';
const readFlag = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const writeFlag = (k: string, v: boolean) => {
  try {
    localStorage.setItem(k, v ? '1' : '0');
  } catch {
    /* сховище недоступне — налаштування діє до перезавантаження */
  }
};

/** Поділитися текстом аркуша або скопіювати його */
async function shareSheet(title: string) {
  const text = (document.querySelector('.n-note') as HTMLElement | null)?.innerText ?? '';
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
    } catch {
      /* людина закрила вікно «Поділитися» */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Текст нотатки скопійовано');
  } catch {
    toast('Не вдалося скопіювати');
  }
}

export function NotesShell({ folder, title, list, onNew, wide, children }: {
  folder: Folder;
  /** назва аркуша — для «Поділитися» */
  title: string;
  /** колонка-список; null — без неї (як на «Тижні») */
  list: ListSpec | null;
  /** «Новий блок»: на «Сьогодні» відкриває редактор, на інших сторінках веде туди */
  onNew?: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const compact = useCompact();
  const [big, setBig] = useState(() => readFlag(BIG_KEY));
  const newBlock = onNew ?? (() => navigate('today', { new: '1' }));
  const article = <article className={`n-note${wide ? ' wide' : ''}${big ? ' big' : ''}`}>{children}</article>;

  if (compact) return <PhoneShell folder={folder} title={title} list={list} onNew={newBlock}>{article}</PhoneShell>;
  return (
    <DesktopShell folder={folder} title={title} list={list} onNew={newBlock} big={big}
      setBig={(v) => { setBig(v); writeFlag(BIG_KEY, v); }}>
      {article}
    </DesktopShell>
  );
}

function DesktopShell({ folder, title, list, onNew, big, setBig, children }: {
  folder: Folder; title: string; list: ListSpec | null; onNew: () => void; big: boolean; setBig: (v: boolean) => void; children: ReactNode;
}) {
  const [sideOff, setSideOff] = useState(() => readFlag(SIDE_KEY));
  const toggleSide = (v: boolean) => { setSideOff(v); writeFlag(SIDE_KEY, v); };
  return (
    <div className={`n-app n-wrap${list ? '' : ' no-list'}${sideOff ? ' side-off' : ''}`}>
      {!sideOff && <Sidebar folder={folder} onHide={() => toggleSide(true)} />}
      {list && <NoteList spec={list} />}
      <main className="n-main">
        <div className="n-toolbar" role="toolbar" aria-label="Інструменти">
          {sideOff && <ToolBtn icon="sidebar" label="Показати папки" onClick={() => toggleSide(false)} />}
          <ToolBtn icon="format" label="Великий текст" pressed={big} onClick={() => setBig(!big)} />
          <ToolBtn icon="checklist" label="Новий блок" onClick={onNew} />
          <ToolBtn icon="table" label="Тиждень" href={href('week')} />
          <ToolBtn icon="draw" label="Статистика" href={href('stats')} />
          <span style={{ flex: 1 }} />
          <Search />
          <ToolBtn icon="share" label="Поділитися" onClick={() => void shareSheet(title)} />
          <ToolBtn icon="compose" label="Нова нотатка" href={href('notes', { s: 'note' })} />
        </div>
        {children}
      </main>
    </div>
  );
}

function ToolBtn({ icon, label, onClick, href: to, pressed }: { icon: NIconName; label: string; onClick?: () => void; href?: string; pressed?: boolean }) {
  if (to) return <a className="n-tbtn" href={to} aria-label={label} title={label}><NIcon name={icon} /></a>;
  return <button type="button" className="n-tbtn" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}><NIcon name={icon} /></button>;
}

// ---------- Бічна панель-«папки» ----------
function useFolderCounts(): Record<Folder, string> {
  const s = useStore((x) => x);
  const today = todayISO();
  const week = new Set(weekDays());
  return {
    today: String(blocksOn(s, today).length),
    week: String(s.blocks.filter((b) => week.has(b.date)).length),
    habits: String(s.habits.length),
    focus: String(s.sessions.filter((x) => x.date === today && x.completed).length),
    stats: '',
    inbox: String(s.tasks.filter((t) => t.location === 'inbox' && !t.done).length),
    notes: String(Object.values(s.days).filter((d) => d.note.trim()).length),
  };
}

const FOLDERS: Folder[] = ['today', 'week', 'habits', 'focus', 'stats', 'inbox', 'notes'];

function FolderLinks({ folder, className }: { folder: Folder; className: string }) {
  const counts = useFolderCounts();
  return (
    <nav className={className} aria-label="Папки">
      {FOLDERS.map((f) => (
        <a key={f} href={FOLDER_HREF[f]} className={`n-fold${f === folder ? ' on' : ''}`} aria-current={f === folder ? 'page' : undefined}>
          <span className="n-fold-ic"><NIcon name="folder" size={19} /></span>
          {FOLDER_LABEL[f]}
          <span className="n">{counts[f]}</span>
        </a>
      ))}
    </nav>
  );
}

function Sidebar({ folder, onHide }: { folder: Folder; onHide?: () => void }) {
  return (
    <aside className="n-side">
      <div className="n-side-in">
      <div className="n-side-head">
        <span>Ритм</span>
        {onHide && <button type="button" className="n-tbtn" aria-label="Сховати бічну панель" title="Сховати бічну панель" onClick={onHide}><NIcon name="sidebar" size={19} /></button>}
      </div>
      <p className="n-side-k">Мій день</p>
      <FolderLinks folder={folder} className="n-folders" />
      <p className="n-side-k" style={{ marginTop: 18 }}>Теги</p>
      <ul className="n-tags" aria-label="Теги категорій">
        {Object.values(TAG).map((t) => <li key={t}>{t}</li>)}
      </ul>
      <a className="n-side-link" href={href('review')}>Вечірній підсумок</a>
      <a className="n-side-link" href={href('notes', { s: 'settings' })}>Налаштування</a>
      </div>
    </aside>
  );
}

// ---------- Колонка-список нотаток ----------
function NoteList({ spec }: { spec: ListSpec }) {
  const total = spec.sections.reduce((a, s) => a + s.items.length, 0);
  return (
    <section className="n-list" aria-label={`Нотатки: ${spec.title}`}>
      <div className="n-list-in">
      <div className="n-list-head">
        <h2>{spec.title}</h2>
        <p>{total} {plural(total, ['нотатка', 'нотатки', 'нотаток'])}</p>
      </div>
      {spec.sections.map((sec, i) => (
        <div key={sec.label ?? i}>
          {sec.label && <p className="n-sec">{sec.label}</p>}
          <div className="n-nls">
            {sec.items.map((it) => <NoteItem key={it.key} it={it} />)}
          </div>
        </div>
      ))}
      </div>
    </section>
  );
}

function NoteItem({ it }: { it: ListItem }) {
  const body = <><b>{it.title}</b><span>{it.sub}</span></>;
  return it.href
    ? <a href={it.href} className={`n-nl${it.on ? ' on' : ''}`} aria-current={it.on ? 'page' : undefined}>{body}</a>
    : <button type="button" className={`n-nl${it.on ? ' on' : ''}`} onClick={it.onClick}>{body}</button>;
}

// ---------- Пошук по блоках, задачах і звичках ----------
function Search({ autoFocus }: { autoFocus?: boolean }) {
  const s = useStore((x) => x);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const query = q.trim().toLowerCase();
  const results: Array<{ key: string; title: string; sub: string; to: string }> = [];
  if (query.length >= 2) {
    const today = todayISO();
    for (const b of [...s.blocks].filter((b) => b.title.toLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date) || a.start - b.start).slice(0, 6)) {
      results.push({ key: b.id, title: b.title, sub: `${dayMonth(b.date)} · ${hhmm(b.start)}`, to: href('today', b.date === today ? undefined : { d: b.date }) });
    }
    for (const t of s.tasks.filter((t) => t.location === 'inbox' && !t.done && t.title.toLowerCase().includes(query)).slice(0, 3)) {
      results.push({ key: t.id, title: t.title, sub: 'Вхідні', to: href('today', { s: 'inbox' }) });
    }
    for (const h of s.habits.filter((h) => h.name.toLowerCase().includes(query)).slice(0, 3)) {
      results.push({ key: h.id, title: h.name, sub: 'Звичка', to: href('habits') });
    }
  }
  return (
    <div className="n-search-wrap" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <label className="n-search">
        <NIcon name="search" size={15} />
        <input aria-label="Пошук" placeholder="Пошук" value={q} autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setOpen(false); } }} />
      </label>
      {open && query.length >= 2 && (
        <div className="n-results" role="listbox" aria-label="Знайдено">
          {results.map((r) => (
            <a key={r.key} href={r.to} role="option" aria-selected={false} onClick={() => { setOpen(false); setQ(''); }}>
              <b>{r.title}</b><span>{r.sub}</span>
            </a>
          ))}
          {!results.length && <p>Нічого не знайдено</p>}
        </div>
      )}
    </div>
  );
}

// ---------- Телефон ----------
function PhoneShell({ folder, title, list, onNew, children }: { folder: Folder; title: string; list: ListSpec | null; onNew: () => void; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const { route } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  // перехід на іншу сторінку закриває висувну панель і меню
  useEffect(() => {
    const close = () => { setDrawer(false); setMenu(false); };
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);
  useEffect(() => {
    if (!drawer && !menu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setDrawer(false), setMenu(false));
    const onDown = (e: MouseEvent) => menu && !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [drawer, menu]);

  const bar: Array<{ icon: NIconName; label: string; to?: string; on?: boolean; onClick?: () => void }> = [
    { icon: 'checklist', label: 'Сьогодні', to: href('today'), on: route === 'today' },
    { icon: 'table', label: 'Звички', to: href('habits'), on: route === 'habits' },
    { icon: 'timer', label: 'Фокус', to: href('focus'), on: route === 'focus' },
    { icon: 'draw', label: 'Статистика', to: href('stats'), on: route === 'stats' },
    { icon: 'compose', label: 'Новий блок', onClick: onNew },
  ];

  return (
    <div className="n-app n-phone">
      <header className="n-ph-head">
        <button type="button" className="n-ph-back" aria-expanded={drawer} aria-haspopup="dialog" onClick={() => setDrawer(true)}>
          <NIcon name="back" size={24} strokeWidth={2} />{FOLDER_LABEL[folder]}
        </button>
        <div className="n-ph-actions" ref={menuRef}>
          <button type="button" className="n-tbtn lg" aria-label="Поділитися" onClick={() => void shareSheet(title)}><NIcon name="share" size={22} /></button>
          <button type="button" className="n-tbtn lg" aria-label="Ще" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}><NIcon name="more" size={22} /></button>
          {menu && (
            <div className="n-menu" role="menu">
              <a role="menuitem" href={href('week')}>Тиждень</a>
              <a role="menuitem" href={href('today', { s: 'inbox' })}>Вхідні</a>
              <a role="menuitem" href={href('review')}>Вечірній підсумок</a>
              <a role="menuitem" href={href('notes', { s: 'note' })}>Нова нотатка</a>
              <a role="menuitem" href={href('notes', { s: 'settings' })}>Налаштування</a>
            </div>
          )}
        </div>
      </header>
      {children}
      <nav className="n-ph-bar" aria-label="Інструменти">
        {bar.map((b) => b.to ? (
          <a key={b.label} className={`n-tbtn lg${b.on ? ' on' : ''}`} href={b.to} aria-label={b.label} aria-current={b.on ? 'page' : undefined}><NIcon name={b.icon} size={24} /></a>
        ) : (
          <button key={b.label} type="button" className="n-tbtn lg" aria-label={b.label} onClick={b.onClick}><NIcon name={b.icon} size={24} /></button>
        ))}
      </nav>
      {drawer && (
        <div className="n-drawer-back" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="n-drawer" role="dialog" aria-modal="true" aria-label="Папки й нотатки">
            <div className="n-dr-head">
              <span>Ритм</span>
              <button type="button" className="n-tbtn lg" aria-label="Закрити" onClick={() => setDrawer(false)}><NIcon name="close" size={22} /></button>
            </div>
            <div className="n-dr-search"><Search /></div>
            <section className="n-dr-group">
              <h3 className="n-dr-k">Папки</h3>
              <FolderLinks folder={folder} className="n-dr-card n-dr-folders" />
            </section>
            {list?.sections.map((sec, i) => (
              <section key={sec.label ?? i} className="n-dr-group" aria-label={`${list.title}: ${sec.label ?? 'нотатки'}`}>
                <h3 className="n-dr-k">{list.title}{sec.label ? ` · ${sec.label.toLowerCase()}` : ''}</h3>
                <div className="n-dr-notes">{sec.items.map((it) => <NoteItem key={it.key} it={it} />)}</div>
              </section>
            ))}
            <section className="n-dr-group">
              <h3 className="n-dr-k">Теги</h3>
              <ul className="n-tags n-dr-tags" aria-label="Теги категорій">{Object.values(TAG).map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
            <section className="n-dr-group">
              <div className="n-dr-card n-dr-links">
                <a href={href('review')}>Вечірній підсумок</a>
                <a href={href('notes', { s: 'settings' })}>Налаштування</a>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
