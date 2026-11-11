import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Block } from '../data/types';
import { uid, useStore } from '../data/store';
import { Schedule } from '../components/today/Schedule';
import { BlockEditor } from '../components/today/BlockEditor';
import { EnergyTile, FocusMini, HabitsMini, InboxTile, ProgressTile, Top3Tile, WaterTile } from '../components/today/SideTiles';
import { BottomNav, Rail } from '../components/layout/Nav';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/Modal';
import { addDays, cap, dayMonth, fromISO, isoWeekNumber, nowMinutes, todayISO, weekStart, weekdayName, WEEKDAYS_SHORT, rangeDays } from '../lib/date';
import { href, navigate, useLocation } from '../lib/router';
import { useIsPhone } from '../lib/hooks';
import { applyTemplate, findFreeSlot, saveTemplate } from '../data/actions';
import { isReviewBlock } from './Review';

function useSelectedDate(): string {
  const { params } = useLocation();
  const d = params.get('d');
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();
}

function newBlock(date: string, start: number): Block {
  return { id: '', date, start, end: start + 60, title: '', category: 'work', done: false, subtasks: [] };
}

export function TodayScreen() {
  const phone = useIsPhone();
  const date = useSelectedDate();
  const [editing, setEditing] = useState<{ block: Block; isNew: boolean } | null>(null);
  const goto = (d: string) => navigate('today', d === todayISO() ? undefined : { d });

  const addAt = (start: number) => setEditing({ block: { ...newBlock(date, start), id: uid() }, isNew: true });
  const addNext = () => {
    const from = date === todayISO() ? Math.ceil(nowMinutes() / 30) * 30 : 9 * 60;
    addAt(findFreeSlot(date, 60, from) ?? from);
  };
  const editor = editing && <BlockEditor block={editing.block} isNew={editing.isNew} onClose={() => setEditing(null)} />;
  const edit = (b: Block) =>
    isReviewBlock(b.title) ? navigate('review', date === todayISO() ? undefined : { d: date }) : setEditing({ block: b, isNew: false });

  if (phone) {
    return (
      <div className="phone phone-today">
        <DayStrip date={date} />
        <PhoneScroller date={date}>
          <section aria-label="Розклад по годинах">
            <Schedule date={date} variant="phone" onEdit={edit} onAddAt={addAt} />
          </section>
          <div className="phone-extra">
            <Top3Tile date={date} />
            <WaterTile date={date} />
            <InboxTile date={date} phone />
            <a className="pill pill-dark" style={{ justifyContent: 'center', minHeight: 56 }} href={href('review', date === todayISO() ? undefined : { d: date })}>Вечірній підсумок →</a>
          </div>
        </PhoneScroller>
        <BottomNav active="today" onAdd={addNext} />
        {editor}
      </div>
    );
  }

  return (
    <div className="wrap with-aside">
      <Rail active="today" />
      <main>
        <header className="tile page-head">
          <div>
            <p className="k">{cap(weekdayName(date))} · {isoWeekNumber(date)}-й тиждень</p>
            <h1 className="disp">{dayMonth(date)}</h1>
          </div>
          <div className="actions">
            <div className="day-nav">
              <button className="pill pill-dark" aria-label="Попередній день" onClick={() => goto(addDays(date, -1))}><Icon name="chev-left" size={18} stroke={2.6} /></button>
              <button className="pill pill-dark" aria-label="Наступний день" onClick={() => goto(addDays(date, 1))}><Icon name="chev-right" size={18} stroke={2.6} /></button>
            </div>
            {date !== todayISO() && <a className="pill pill-dark" href={href('today')}>Сьогодні</a>}
            <TemplateMenu date={date} />
            <button className="pill pill-lime" onClick={addNext}><Icon name="plus" size={18} stroke={2.8} />Новий блок</button>
          </div>
        </header>
        <section className="tile" aria-label="Погодинний розклад" style={{ padding: 0 }}>
          <Schedule date={date} variant="desktop" onEdit={edit} onAddAt={addAt} />
        </section>
      </main>
      <aside>
        <ProgressTile date={date} />
        <Top3Tile date={date} />
        <div className="g2">
          <HabitsMini date={date} />
          <FocusMini />
        </div>
        <WaterTile date={date} />
        <InboxTile date={date} />
        <EnergyTile date={date} />
      </aside>
      {editor}
    </div>
  );
}

/** Розклад на телефоні гортається окремо від стрічки днів і відкривається за 2 год до «зараз» */
function PhoneScroller({ date, children }: { date: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = date === todayISO() ? new Date().getHours() - 2 : 8;
    const rows = [...el.querySelectorAll<HTMLElement>('[data-hour]')];
    const row = rows.find((r) => Number(r.dataset.hour) >= target) ?? rows[0];
    el.scrollTop = row ? row.offsetTop - el.offsetTop : 0;
  }, [date]);
  return <div className="phone-scroll" ref={ref}>{children}</div>;
}

function DayStrip({ date }: { date: string }) {
  const days = rangeDays(weekStart(date), 7);
  const today = todayISO();
  return (
    <div className="day-strip" role="tablist" aria-label="Дні">
      {days.map((d, i) => (
        <a key={d} className={`dy${d === today ? ' is-today' : ''}`} role="tab" aria-selected={d === date}
          href={href('today', d === today ? undefined : { d })}>
          <small>{WEEKDAYS_SHORT[i]}</small>
          <b>{fromISO(d).getDate()}</b>
        </a>
      ))}
    </div>
  );
}

function TemplateMenu({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const has = useStore((s) => !!s.template?.length);
  const count = useStore((s) => s.template?.length ?? 0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="pill pill-dark" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>Шаблон дня</button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { saveTemplate(date); setOpen(false); toast('Шаблон збережено'); }}>
            Зберегти цей день як шаблон<small>блоки без відміток «готово»</small>
          </button>
          <button role="menuitem" disabled={!has} onClick={() => { applyTemplate(date); setOpen(false); toast('Шаблон застосовано'); }}>
            Застосувати шаблон{has && <small>{count} блоків до {dayMonth(date)}</small>}
          </button>
        </div>
      )}
    </div>
  );
}
