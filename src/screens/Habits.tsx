import { useRef, useState, type CSSProperties, type ReactNode, type MouseEvent } from 'react';
import { useStore } from '../data/store';
import type { Habit } from '../data/types';
import { HABIT_COLOR, HABIT_FG, HABIT_STRONG, habitDone, habitRate, habitsDoneOn, lastDays, streak } from '../data/selectors';
import { toggleHabit } from '../data/actions';
import { addDays, cap, dayMonth, fromISO, MONTHS_SHORT, plural, todayISO, toISO, weekdayName } from '../lib/date';
import { useIsPhone } from '../lib/hooks';
import { BottomNav, Rail } from '../components/layout/Nav';
import { Icon } from '../components/ui/Icon';
import { CountEditor, HabitEditor } from '../components/habits/HabitEditor';
import { BotanicalSpray } from '../components/flora/Botanical';
import { CompletionTile, FocusWeekTile, InsightTile, LongestStreakTile, PlanTile, TimeSplitTile } from '../components/stats/StatTiles';

type Editing = { kind: 'habit'; habit?: Habit } | { kind: 'count'; habit: Habit } | null;

export function HabitsScreen() {
  const phone = useIsPhone();
  const [editing, setEditing] = useState<Editing>(null);
  const modal =
    editing?.kind === 'habit' ? <HabitEditor habit={editing.habit} onClose={() => setEditing(null)} />
    : editing?.kind === 'count' ? <CountEditor habit={editing.habit} onClose={() => setEditing(null)} onEdit={() => setEditing({ kind: 'habit', habit: editing.habit })} />
    : null;
  return phone ? <PhoneHabits setEditing={setEditing} modal={modal} /> : <DesktopHabits setEditing={setEditing} modal={modal} />;
}

// ======================= Телефон =======================

function heatOpacity(rate: number): number {
  if (rate >= 1) return 1;
  if (rate >= 0.6) return 0.8;
  return 0.6;
}

function PhoneHabits({ setEditing, modal }: { setEditing: (e: Editing) => void; modal: ReactNode }) {
  const s = useStore((x) => x);
  const today = todayISO();
  const days = lastDays(14);
  const { done, total } = habitsDoneOn(s, today);
  const rate = habitRate(s, days);
  return (
    <div className="phone">
      <BotanicalSpray className="flora-head-phone" />
      <p className="k">{cap(weekdayName(today))}, {dayMonth(today)}</p>
      <div className="ph-head">
        <h1 className="disp">Звички</h1>
        <p className="disp" style={{ color: 'var(--accent)' }}>{done}<span style={{ color: 'var(--c-muted-4)' }}>/{total}</span></p>
      </div>

      <div className="ph-heat" role="img" aria-label={`Виконання всіх звичок за 14 днів: ${Math.round(rate * 100)}%`}>
        {days.map((d) => {
          const r = habitsDoneOn(s, d);
          const v = r.total ? r.done / r.total : 0;
          const isToday = d === today;
          const style: CSSProperties = isToday && v < 1
            ? { border: '2px dashed var(--today-dash)', background: v ? `color-mix(in srgb, var(--heat) ${Math.round(v * 35)}%, var(--today-bg))` : 'var(--today-bg)' }
            : v ? { background: 'var(--heat)', opacity: heatOpacity(v) } : { background: 'var(--cell-empty)' };
          return <i key={d} style={style} title={`${dayMonth(d)}: ${r.done}/${r.total}`} />;
        })}
      </div>
      <p className="ph-cap">Останні 14 днів · {Math.round(rate * 100)}% виконано</p>

      <div className="ht-grid">
        {s.habits.map((h) => <HabitTile key={h.id} h={h} setEditing={setEditing} />)}
        <button className="ht ht-add" onClick={() => setEditing({ kind: 'habit' })}>
          <Icon name="plus" stroke={2.6} />Нова звичка
        </button>
      </div>
      {s.habits.length > 0 && <p className="ph-cap" style={{ textAlign: 'center', marginTop: 14 }}>Утримуйте плитку, щоб змінити звичку</p>}

      <BottomNav active="habits" />
      {modal}
    </div>
  );
}

function useLongPress(onLong: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fired = useRef(false);
  return {
    onPointerDown: () => {
      fired.current = false;
      timer.current = setTimeout(() => { fired.current = true; onLong(); }, 550);
    },
    onPointerUp: () => clearTimeout(timer.current),
    onPointerLeave: () => clearTimeout(timer.current),
    onContextMenu: (e: MouseEvent) => { e.preventDefault(); clearTimeout(timer.current); fired.current = true; onLong(); },
    wasLong: () => fired.current,
  };
}

function HabitTile({ h, setEditing }: { h: Habit; setEditing: (e: Editing) => void }) {
  const today = todayISO();
  const done = habitDone(h, today);
  const n = streak(h);
  const entry = h.log[today];
  const lp = useLongPress(() => setEditing({ kind: 'habit', habit: h }));
  const { wasLong, ...handlers } = lp;
  const click = () => {
    if (wasLong()) return;
    if (h.kind === 'count') setEditing({ kind: 'count', habit: h });
    else toggleHabit(h.id);
  };

  if (h.kind === 'count' && !done) {
    const v = entry?.value ?? 0;
    const pct = Math.min(100, (v / (h.target ?? 1)) * 100);
    return (
      <button className="ht off wide" aria-pressed={false} onClick={click} {...handlers}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10 }}>
          <div><div className="n">{h.name}</div><div className="s">торкніться, щоб додати</div></div>
          <span className="big" style={{ fontSize: 30 }}>{v.toLocaleString('uk-UA')}</span>
        </div>
        <div className="bar"><div style={{ width: `${pct}%`, background: HABIT_STRONG[h.color] }} /></div>
      </button>
    );
  }

  if (done) {
    return (
      <button className={`ht${h.kind === 'count' ? ' wide' : ''}`} style={{ background: HABIT_COLOR[h.color], color: HABIT_FG[h.color] }} aria-pressed onClick={click} {...handlers}>
        <div><div className="n">{h.name}</div><div className="s">виконано{entry?.at ? ` · ${entry.at}` : ''}</div></div>
        <div className="ht-foot"><span className="big">{n}</span><span className="lbl">{plural(n, ['день', 'дні', 'днів'])}<br />поспіль</span></div>
      </button>
    );
  }

  const hint = h.reminder ? `нагадаю о ${h.reminder}` : 'торкніться, щоб відмітити';
  return (
    <button className="ht off" aria-pressed={false} onClick={click} {...handlers}>
      <div><div className="n">{h.name}</div><div className="s">{hint}</div></div>
      <div className="ht-foot">
        <span className="big" style={{ color: n ? HABIT_STRONG[h.color] : 'var(--c-muted-4)' }}>{n}</span>
        <span className="lbl" style={{ color: 'var(--c-muted)' }}>{n ? <>серія<br />під загрозою</> : <>почнімо<br />сьогодні</>}</span>
      </div>
    </button>
  );
}

// ======================= Комп'ютер =======================

type Period = 14 | 30 | 365;

function DesktopHabits({ setEditing, modal }: { setEditing: (e: Editing) => void; modal: ReactNode }) {
  const s = useStore((x) => x);
  const [period, setPeriod] = useState<Period>(14);
  const today = todayISO();
  const days = lastDays(period === 365 ? 364 : period);
  const shown = period === 365 ? [] : days;
  const months = period === 365 ? lastMonths(12) : [];
  const cols = period === 365 ? 12 : period;

  return (
    <div className="wrap">
      <Rail active="habits" />
      <main>
        <header className="tile page-head">
          <BotanicalSpray className="flora-head" />
          <div>
            <p className="k">{dayMonth(days[0])} – {dayMonth(today)}</p>
            <h1 className="disp">Звички</h1>
          </div>
          <div className="actions">
            <div className="seg-tabs" role="tablist" aria-label="Період">
              {([[14, '2 тижні'], [30, 'Місяць'], [365, 'Рік']] as const).map(([p, l]) => (
                <button key={p} className="pill" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>{l}</button>
              ))}
            </div>
            <button className="pill pill-lime" onClick={() => setEditing({ kind: 'habit' })}><Icon name="plus" size={18} stroke={2.8} />Нова звичка</button>
          </div>
        </header>

        <div className="bento">
          <CompletionTile days={days} />
          <LongestStreakTile />
          <FocusWeekTile />
          <PlanTile />
        </div>

        <section className="tile">
          <div className="hab hab-head">
            <p className="k">Звичка</p>
            <div className="hm-days" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {period === 365
                ? months.map((m) => <span key={m.key}>{MONTHS_SHORT[m.month]}</span>)
                : shown.map((d, i) => (
                  <span key={d} style={d === today ? { color: 'var(--accent)' } : undefined}>
                    {period === 30 && i % 2 && d !== today ? '' : fromISO(d).getDate()}
                  </span>
                ))}
            </div>
            <p className="k" style={{ textAlign: 'right' }}>Серія</p>
          </div>
          {s.habits.map((h) => {
            const n = streak(h);
            return (
              <div className="hab" key={h.id}>
                <button className="hab-name" onClick={() => setEditing({ kind: 'habit', habit: h })} title="Змінити звичку">{h.name}</button>
                <div className={`hm${period === 30 ? ' dense' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                  {period === 365
                    ? months.map((m) => {
                      const ds = m.days.filter((d) => d <= today);
                      const r = ds.length ? ds.filter((d) => habitDone(h, d)).length / ds.length : 0;
                      return <i key={m.key} className={r ? 'a' : ''} style={r ? { opacity: 0.25 + r * 0.75 } : undefined} title={`${MONTHS_SHORT[m.month]}: ${Math.round(r * 100)}%`} />;
                    })
                    : shown.map((d) => {
                      const on = habitDone(h, d);
                      const cls = on ? 'a' : d === today ? 't' : '';
                      return (
                        <button key={d} className={cls} aria-pressed={on} aria-label={`${h.name}, ${dayMonth(d)}`}
                          title={`${dayMonth(d)} — ${on ? 'виконано' : 'не виконано'}`}
                          onClick={() => (h.kind === 'count' && d === today ? setEditing({ kind: 'count', habit: h }) : toggleHabit(h.id, d))} />
                      );
                    })}
                </div>
                <span className="disp hab-streak" style={{ color: n ? 'var(--streak)' : 'var(--c-muted-3)' }}>{n}</span>
              </div>
            );
          })}
          {!s.habits.length && <p style={{ color: 'var(--c-muted)', fontWeight: 700 }}>Ще немає звичок — додайте першу.</p>}
        </section>

        <div className="bento">
          <TimeSplitTile />
          <InsightTile />
        </div>
      </main>
      {modal}
    </div>
  );
}

function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const first = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const start = toISO(first);
    return { key: start, month: first.getMonth(), days: Array.from({ length: count }, (_, k) => addDays(start, k)) };
  });
}
