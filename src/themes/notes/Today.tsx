import { useEffect, useState, type DragEvent } from 'react';
import type { AppState, Block, Habit, Task } from '../../data/types';
import { dayOf, uid, useStore } from '../../data/store';
import { blocksOn, completedSessionsForBlock, freeMinutes, habitDone, habitsDoneOn, sessionsInBlock, streak } from '../../data/selectors';
import {
  addTask, deleteTask, findFreeSlot, moveBlock, scheduleTask, setNote, setTop3, setWater, toggleBlock, toggleHabit, toggleTop3,
} from '../../data/actions';
import { addDays, cap, dayMonth, durationLabel, hhmm, nowMinutes, num, pad, todayISO, weekdayName } from '../../lib/date';
import { href, navigate, useLocation } from '../../lib/router';
import { useNow, useOuterValue } from '../../lib/hooks';
import { BlockEditor } from '../../components/today/BlockEditor';
import { CountEditor, HabitEditor } from '../../components/habits/HabitEditor';
import { MINUTE_OPTIONS, minutesLabel, scheduleToFirstFree } from '../../components/today/SideTiles';
import { fmtClock, timerRemaining } from '../../components/focus/timer';
import { newBlock, useSelectedDate } from '../../screens/Today';
import { isReviewBlock } from '../../screens/Review';
import { NotesShell, type ListSpec } from './Shell';
import { Circle, DateStamp, NIcon, TAG, freeLabel, useCompact } from './parts';

type Row = { kind: 'block'; b: Block } | { kind: 'free'; start: number; len: number };

/** Розклад одним списком: блоки й вільні проміжки від 30 хв (сьогодні — лише ті, що ще попереду) */
function scheduleRows(blocks: Block[], date: string, dayStart: number, dayEnd: number): Row[] {
  const rows: Row[] = blocks.map((b) => ({ kind: 'block', b }));
  const isToday = date === todayISO();
  const earliest = isToday ? Math.ceil(nowMinutes() / 15) * 15 : dayStart * 60;
  let cur = dayStart * 60;
  const gaps: Row[] = [];
  const push = (from: number, to: number) => {
    const start = Math.max(from, earliest);
    if (to - start >= 30) gaps.push({ kind: 'free', start, len: to - start });
  };
  for (const b of blocks) {
    if (b.start > cur) push(cur, b.start);
    cur = Math.max(cur, b.end);
  }
  if (dayEnd * 60 > cur) push(cur, dayEnd * 60);
  const at = (r: Row) => (r.kind === 'block' ? r.b.start : r.start);
  return [...rows, ...gaps].sort((a, b) => at(a) - at(b));
}

export function NotesToday() {
  const s = useStore((x) => x);
  const date = useSelectedDate();
  const { params } = useLocation();
  const compact = useCompact();
  const now = useNow(1000);
  const [editing, setEditing] = useState<{ block: Block; isNew: boolean } | null>(null);
  const [habitEdit, setHabitEdit] = useState<{ kind: 'habit' | 'count'; habit: Habit } | null>(null);
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const addAt = (start: number) => setEditing({ block: { ...newBlock(date, start), id: uid() }, isNew: true });
  const addNext = () => {
    const from = isToday ? Math.ceil(nowMinutes() / 30) * 30 : 9 * 60;
    addAt(findFreeSlot(date, 60, from) ?? from);
  };
  const edit = (b: Block) =>
    isReviewBlock(b.title) ? navigate('review', isToday ? undefined : { d: date }) : setEditing({ block: b, isNew: false });

  // «Новий блок» з інших сторінок (#/today?new=1) і переходи до розділів (?s=inbox)
  useEffect(() => {
    if (params.get('new') === '1') {
      addNext();
      location.replace(href('today', isToday ? undefined : { d: date }));
    }
    const sec = params.get('s');
    if (sec) document.getElementById(`n-${sec}`)?.scrollIntoView({ block: 'start' });
  }, [params]);

  const blocks = blocksOn(s, date);
  const done = blocks.filter((b) => b.done);
  const free = freeMinutes(s, date, isToday ? nowMinutes() : s.settings.dayStart * 60);
  const active = isToday ? blocks.find((b) => b.start <= nowMin && b.end > nowMin && !b.done) : undefined;
  const rows = scheduleRows(blocks, date, s.settings.dayStart, s.settings.dayEnd);
  const hasInbox = s.tasks.some((t) => t.location === 'inbox' && !t.done);
  const habits = s.habits.filter((h) => h.createdAt <= date);
  const hd = habitsDoneOn(s, date);

  const blockRow = (b: Block) => (
    <div key={b.id} className={`n-li${b.done ? ' done' : ''}`} draggable={!compact}
      onDragStart={(e) => { e.dataTransfer.setData('text/ritm-block', b.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <Circle on={b.done} label={b.title} onClick={() => toggleBlock(b.id)} />
      <span className="n-tm">{hhmm(b.start)}</span>
      <button type="button" className="n-tx" onClick={() => edit(b)}>{b.title}</button>
      {!isReviewBlock(b.title) && <span className="n-tag">{TAG[b.category]}</span>}
      {b.id === active?.id && <span className="n-nowbadge">зараз</span>}
    </div>
  );

  const rowsToShow = compact ? rows.filter((r) => r.kind !== 'block' || !r.b.done) : rows;

  const list: ListSpec = {
    title: 'Сьогодні',
    sections: [
      {
        label: 'Закріплені',
        items: [
          { key: 'inbox', title: 'Вхідні', sub: s.tasks.filter((t) => t.location === 'inbox' && !t.done).map((t) => t.title).join(' · ') || 'порожньо — усе розплановано', href: href('today', { ...(isToday ? {} : { d: date }), s: 'inbox' }) },
          { key: 'top3', title: 'Топ-3 дня', sub: dayOf(s, date).top3.map((t) => t.title).join(' · ') || 'ще не задано', href: href('today', { ...(isToday ? {} : { d: date }), s: 'top3' }) },
        ],
      },
      { label: 'Нещодавні', items: recentDays(s, date, nowMin) },
    ],
  };

  return (
    <NotesShell folder="today" title={`${cap(weekdayName(date))}, ${dayMonth(date)}`} list={list} onNew={addNext}>
      <DateStamp date={date} />
      <div className="n-title-row">
        <h1 className="n-h1">{cap(weekdayName(date))}, {dayMonth(date)}</h1>
        <div className="n-nav n-day-nav">
          <button type="button" className="n-tbtn bordered" aria-label="Попередній день" onClick={() => navigate('today', { d: addDays(date, -1) })}><NIcon name="prev" size={18} /></button>
          {!isToday && <a className="n-link-btn" href={href('today')}>Сьогодні</a>}
          <button type="button" className="n-tbtn bordered" aria-label="Наступний день" onClick={() => navigate('today', addDays(date, 1) === todayISO() ? undefined : { d: addDays(date, 1) })}><NIcon name="next" size={18} /></button>
        </div>
      </div>
      <p className="n-sub">{done.length} з {blocks.length} блоків · {free ? `вільно ${durationLabel(free)}` : 'вільного часу немає'}</p>
      <div className="n-progress" role="progressbar" aria-label="Виконано блоків" aria-valuemin={0} aria-valuemax={blocks.length || 1} aria-valuenow={done.length}>
        <div style={{ width: `${blocks.length ? (done.length / blocks.length) * 100 : 0}%` }} />
      </div>

      {active && <NowPlate b={active} nowMin={nowMin} now={now} compact={compact} />}

      <h2 className="n-h2">Розклад</h2>
      {compact && done.length > 0 && (
        <details className="n-fold-done">
          <summary>{done.length} виконано · {hhmm(done[0].start)}–{hhmm(done[done.length - 1].end)}</summary>
          {done.map(blockRow)}
        </details>
      )}
      {rowsToShow.map((r) => r.kind === 'block'
        ? blockRow(r.b)
        : <FreeRow key={`free-${r.start}`} date={date} start={r.start} len={r.len} hint={!compact && hasInbox} onAdd={() => addAt(r.start)} />)}
      {!blocks.length && <p className="n-empty">Порожній день. Натисніть на вільний час, щоб додати блок.</p>}

      {/* «Вхідні» одразу під розкладом — щоб задачу було близько тягнути на вільний час */}
      <Inbox date={date} compact={compact} />

      <h2 className="n-h2">Звички · {hd.done} з {hd.total}</h2>
      {habits.map((h) => {
        const on = habitDone(h, date);
        const n = streak(h, date);
        const v = h.log[date]?.value ?? 0;
        const meta = h.kind === 'count' && !on
          ? `${v.toLocaleString('uk-UA')} / ${(h.target ?? 1).toLocaleString('uk-UA')}`
          : !on && h.reminder && !n ? `нагадаю о ${h.reminder}` : `серія ${n}`;
        return (
          <div key={h.id} className={`n-li${on ? ' done' : ''}`}>
            <Circle on={on} label={h.name} onClick={() => toggleHabit(h.id, date)} />
            <button type="button" className="n-tx" onClick={() => setHabitEdit({ kind: h.kind === 'count' && isToday ? 'count' : 'habit', habit: h })}>{h.name}</button>
            <span className="n-meta">{meta}</span>
          </div>
        );
      })}
      {!habits.length && <p className="n-empty">Звичок ще немає — додайте на сторінці <a href={href('habits')}>«Звички»</a>.</p>}

      <Water date={date} />
      <Top3 date={date} />
      <DayNote date={date} />

      <p style={{ marginTop: 28 }}><a className="n-link" href={href('review', isToday ? undefined : { d: date })}>Вечірній підсумок →</a></p>

      {editing && <BlockEditor block={editing.block} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      {habitEdit?.kind === 'habit' && <HabitEditor habit={habitEdit.habit} onClose={() => setHabitEdit(null)} />}
      {habitEdit?.kind === 'count' && <CountEditor habit={habitEdit.habit} onClose={() => setHabitEdit(null)} onEdit={() => setHabitEdit({ kind: 'habit', habit: habitEdit.habit })} />}
    </NotesShell>
  );
}

function recentDays(s: AppState, date: string, nowMin: number) {
  const today = todayISO();
  const days = [0, 1, 2, 3, 4].map((i) => addDays(today, -i));
  if (!days.includes(date)) days.unshift(date);
  return days.map((d) => {
    const bs = blocksOn(s, d);
    const dn = bs.filter((b) => b.done).length;
    let sub: string;
    if (d === today) {
      const act = bs.find((b) => b.start <= nowMin && b.end > nowMin && !b.done);
      sub = `${hhmm(nowMin)} · ${dn} з ${bs.length} блоків${act ? `, зараз ${act.title.split(':')[0].toLowerCase()}` : ''}`;
    } else if (d === addDays(today, -1)) {
      const h = habitsDoneOn(s, d);
      sub = `Вчора · ${dn} з ${bs.length} блоків, ${h.done} з ${h.total} звичок`;
    } else {
      sub = `${cap(weekdayName(d))} · ${dn} з ${bs.length} блоків`;
    }
    return { key: d, title: `${cap(weekdayName(d))}, ${dayMonth(d)}`, sub, href: href('today', d === today ? undefined : { d }), on: d === date };
  });
}

function NowPlate({ b, nowMin, now, compact }: { b: Block; nowMin: number; now: Date; compact: boolean }) {
  const s = useStore((x) => x);
  const total = sessionsInBlock(b, s);
  const timer = s.timer && s.timer.blockId === b.id ? s.timer : null;
  const session = timer ? timer.session : Math.min(total, completedSessionsForBlock(s, b.id, b.date, b.title) + 1);
  const clock = timer ? fmtClock(timerRemaining(timer, now.getTime())) : `${pad(s.settings.workMin)}:00`;
  const open = () => navigate('focus', { block: b.id });
  return (
    <div className="n-now">
      <div className="n-now-main">
        <p className="n-now-k">ЗАРАЗ{compact ? '' : ` · ${hhmm(nowMin)}`} · ще {b.end - nowMin} хв</p>
        <p className="n-now-title">{compact ? b.title.split(':')[0] : b.title} — сесія {session} з {total}</p>
      </div>
      {!compact && <span className="n-now-clock">{clock}</span>}
      <button type="button" className="n-action" onClick={open} aria-label={`Відкрити таймер: ${b.title}`}>
        <NIcon name="play" size={14} strokeWidth={2} />{compact ? clock : 'Таймер'}
      </button>
    </div>
  );
}

/** Вільний час: натиснути — новий блок; кинути сюди задачу з «Вхідних» або блок — запланувати */
function FreeRow({ date, start, len, hint, onAdd }: { date: string; start: number; len: number; hint: boolean; onAdd: () => void }) {
  const [over, setOver] = useState(false);
  const accept = (e: DragEvent) => {
    if ([...e.dataTransfer.types].some((t) => t.startsWith('text/ritm-'))) {
      e.preventDefault();
      setOver(true);
    }
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const task = e.dataTransfer.getData('text/ritm-task');
    const blk = e.dataTransfer.getData('text/ritm-block');
    if (task) scheduleTask(task, date, start);
    else if (blk) moveBlock(blk, date, start);
  };
  return (
    <button type="button" className={`n-li n-free${over ? ' over' : ''}`} onClick={onAdd} onDragOver={accept} onDragEnter={accept}
      onDragLeave={() => setOver(false)} onDrop={drop} data-free-at={hhmm(start)}>
      <span className="n-dash" aria-hidden="true" />
      <span className="n-tm">{hhmm(start)}</span>
      <span>вільно {freeLabel(len)}{hint ? ' — перетягніть сюди задачу з «Вхідних»' : ''}</span>
    </button>
  );
}

function Water({ date }: { date: string }) {
  const water = useStore((s) => dayOf(s, date).water);
  const goal = useStore((s) => s.settings.waterGoal);
  return (
    <>
      <h2 className="n-h2">Вода · {num(water * 0.25, 2)} з {num(goal * 0.25, 2)} л</h2>
      <div className="n-drops">
        {Array.from({ length: goal }, (_, i) => (
          <button key={i} type="button" className={`n-drop${i < water ? ' on' : ''}`} aria-label={`Склянка ${i + 1}`} aria-pressed={i < water}
            onClick={() => setWater(date, water === i + 1 ? i : i + 1)} />
        ))}
      </div>
    </>
  );
}

function Top3({ date }: { date: string }) {
  const top3 = useStore((s) => dayOf(s, date).top3);
  return (
    <>
      <h2 className="n-h2" id="n-top3">Топ-3</h2>
      {[0, 1, 2].map((i) => {
        const it = top3[i];
        if (!it && i > top3.length) return null;
        return (
          <div key={it?.id ?? `new${i}`} className={`n-li${it?.done ? ' done' : ''}`}>
            {it ? <Circle on={it.done} label={it.title} onClick={() => toggleTop3(date, it.id)} /> : <span className="n-dash" aria-hidden="true" />}
            <input key={it?.title ?? ''} className="n-inline-input" defaultValue={it?.title ?? ''} placeholder="Додати пріоритет" aria-label={`Пріоритет ${i + 1}`}
              onBlur={(e) => e.target.value !== (it?.title ?? '') && setTop3(date, i, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
          </div>
        );
      })}
    </>
  );
}

function Inbox({ date, compact }: { date: string; compact: boolean }) {
  const tasks = useStore((s) => s.tasks.filter((t) => t.location === 'inbox' && !t.done));
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(15);
  const add = () => {
    if (!title.trim()) return;
    addTask(title.trim(), mins);
    setTitle('');
  };
  const row = (t: Task) => (
    <div key={t.id} className="n-li n-task" draggable={!compact}
      onDragStart={(e) => { e.dataTransfer.setData('text/ritm-task', t.id); e.dataTransfer.effectAllowed = 'move'; }}>
      <span className="n-dash" aria-hidden="true" />
      <span className="n-tx-static">{t.title}</span>
      <span className="n-meta">{minutesLabel(t.minutes)}</span>
      <button type="button" className="n-link-btn" onClick={() => scheduleToFirstFree(t, date)} aria-label={`У розклад: ${t.title}`}>У розклад</button>
      <button type="button" className="n-tbtn sm" aria-label={`Видалити задачу: ${t.title}`} onClick={() => deleteTask(t.id)}><NIcon name="trash" size={16} /></button>
    </div>
  );
  return (
    <>
      <h2 className="n-h2" id="n-inbox">Вхідні</h2>
      <p className="n-hint">{compact ? 'Натисніть «У розклад» — задача стане в перший вільний проміжок.' : 'Перетягніть задачу на вільний час у розкладі або натисніть «У розклад».'}</p>
      {tasks.map(row)}
      {!tasks.length && <p className="n-empty">Порожньо — усе розплановано.</p>}
      <form className="n-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <span className="n-dash" aria-hidden="true" />
        <input className="n-inline-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Нова задача у вхідні" aria-label="Нова задача" />
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Тривалість">
          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{minutesLabel(m)}</option>)}
        </select>
      </form>
    </>
  );
}

function DayNote({ date }: { date: string }) {
  const note = useStore((s) => dayOf(s, date).note);
  const ref = useOuterValue<HTMLTextAreaElement>(note);
  return (
    <>
      <h2 className="n-h2" id="n-note">Нотатка дня</h2>
      <textarea ref={ref} key={date} className="n-textarea" defaultValue={note} placeholder="Думки, ідеї, що не забути…" aria-label="Нотатка дня"
        onChange={(e) => setNote(date, e.target.value)} />
    </>
  );
}
