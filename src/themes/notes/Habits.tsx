import { useState } from 'react';
import type { Habit, ISODate } from '../../data/types';
import { useStore } from '../../data/store';
import {
  bestHabitLift, completionSummary, focusMinutesIn, focusMinutesOn, habitDone, lastDays, longestStreak, planRate, streak, weekDays,
} from '../../data/selectors';
import { toggleHabit } from '../../data/actions';
import { dayMonth, fromISO, MONTHS_SHORT, num, plural, todayISO, WEEKDAYS_SHORT } from '../../lib/date';
import { lastMonths } from '../../screens/Habits';
import { CountEditor, HabitEditor } from '../../components/habits/HabitEditor';
import { enableReminder, periodPrev, reminderTime } from '../../components/stats/StatTiles';
import { NotesShell, type ListSpec } from './Shell';
import { Circle, DateStamp, HandChart } from './parts';

type Period = 14 | 30 | 365;
type Editing = { kind: 'habit'; habit?: Habit } | { kind: 'count'; habit: Habit } | null;
const PERIODS: Array<[Period, string]> = [[14, '2 тижні'], [30, 'Місяць'], [365, 'Рік']];

/** Підсумки звичок і фокусу — спільні для «Звичок» і «Статистики» */
export function SummaryList({ days }: { days: ISODate[] }) {
  const s = useStore((x) => x);
  const { rate, delta } = completionSummary(s, days);
  const best = longestStreak(s);
  const focusH = focusMinutesIn(s, weekDays()) / 60;
  const plan = planRate(s, weekDays());
  return (
    <ul className="n-bullets">
      <li>Виконання звичок: <b>{Math.round(rate * 100)}%</b> <span className="n-muted">({delta >= 0 ? '+' : '−'}{Math.abs(delta)}% до {periodPrev(days.length)})</span></li>
      <li>Найдовша серія: <b>{best?.n ?? 0} {plural(best?.n ?? 0, ['день', 'дні', 'днів'])}</b>{best && best.n > 0 ? ` — ${best.habit.name.toLowerCase()}` : ''}</li>
      <li>Фокус за тиждень: <b>{num(focusH, focusH < 10 ? 1 : 0)} год</b> з {s.settings.focusGoalHours}</li>
      <li>План виконано: <b>{plan.total ? Math.round((plan.done / plan.total) * 100) : 0}%</b> блоків цього тижня</li>
    </ul>
  );
}

/** Фокус по днях цього тижня — «від руки» */
export function WeekFocusChart() {
  const s = useStore((x) => x);
  const today = todayISO();
  const days = weekDays().filter((d) => d <= today);
  const hours = days.map((d) => focusMinutesOn(s, d) / 60);
  const fmt = (v: number) => num(v, 1);
  return (
    <HandChart values={hours} labels={days.map((d) => WEEKDAYS_SHORT[(fromISO(d).getDay() + 6) % 7])} goal={`ціль ${s.settings.focusGoalHours} год ↗`}
      label={`Малюнок: години фокусу ${days.map((d, i) => `${WEEKDAYS_SHORT[(fromISO(d).getDay() + 6) % 7]} ${fmt(hours[i])}`).join(', ')}`} />
  );
}

/** «Помічено»: інсайт про звичку, що найбільше допомагає */
export function Noticed() {
  const s = useStore((x) => x);
  const best = bestHabitLift(s);
  if (!best) return <p className="n-p">Ведіть звички й закривайте блоки ще кілька днів — тут з’явиться, що найбільше впливає на ваш день.</p>;
  const { habit, lift } = best;
  return (
    <>
      <p className="n-p">Коли виконуєте «{habit.name}», наступного дня закриваєте на <b>{Math.round(lift * 100)}% більше</b> блоків.</p>
      <div className="n-li">
        <Circle on={!!habit.reminder} label={`Нагадувати о ${reminderTime(habit)}`} onClick={() => !habit.reminder && void enableReminder(habit)} />
        <span className="n-tx-static">Нагадувати о {reminderTime(habit)}</span>
      </div>
    </>
  );
}

export function NotesHabits() {
  const s = useStore((x) => x);
  const [period, setPeriod] = useState<Period>(14);
  const [editing, setEditing] = useState<Editing>(null);
  const today = todayISO();
  const days = lastDays(period === 365 ? 364 : period);
  const months = period === 365 ? lastMonths(12) : [];

  const list: ListSpec = {
    title: 'Звички',
    sections: [{
      label: 'Нещодавні',
      items: [
        { key: 'overview', title: 'Огляд звичок', sub: `${Math.round(completionSummary(s, lastDays(14)).rate * 100)}% за 2 тижні, найдовша серія ${longestStreak(s)?.n ?? 0}`, on: true, href: '#/habits' },
        ...s.habits.map((h) => ({
          key: h.id, title: h.name,
          sub: `серія ${streak(h)} · ${Math.round((lastDays(14).filter((d) => habitDone(h, d)).length / 14) * 100)}%`,
          onClick: () => setEditing({ kind: 'habit', habit: h }),
        })),
      ],
    }],
  };

  return (
    <NotesShell folder="habits" title="Огляд звичок" list={list}>
      <DateStamp />
      <div className="n-title-row">
        <h1 className="n-h1">Огляд звичок</h1>
        <button type="button" className="n-link-btn" onClick={() => setEditing({ kind: 'habit' })}>+ Нова звичка</button>
      </div>
      <p className="n-sub">
        {dayMonth(days[0])} – {dayMonth(today)}
        {PERIODS.map(([p, l]) => (
          <span key={p}> · <button type="button" className={`n-period${period === p ? ' on' : ''}`} aria-pressed={period === p} onClick={() => setPeriod(p)}>{l}</button></span>
        ))}
      </p>
      <SummaryList days={days} />

      <h2 className="n-h2">Трекер</h2>
      <div className="n-scroll">
        <table className="n-table n-tracker">
          <thead>
            <tr>
              <th scope="col">Звичка</th>
              {period === 365
                ? months.map((m) => <th key={m.key} scope="col">{MONTHS_SHORT[m.month]}</th>)
                : days.map((d) => <th key={d} scope="col" className={d === today ? 'is-today' : undefined}>{fromISO(d).getDate()}</th>)}
              <th scope="col">Серія</th>
            </tr>
          </thead>
          <tbody>
            {s.habits.map((h) => (
              <tr key={h.id}>
                <th scope="row"><button type="button" className="n-tx" onClick={() => setEditing({ kind: 'habit', habit: h })}>{h.name}</button></th>
                {period === 365
                  ? months.map((m) => {
                    const ds = m.days.filter((d) => d <= today);
                    const r = ds.length ? ds.filter((d) => habitDone(h, d)).length / ds.length : 0;
                    return <td key={m.key} className="n-pct">{Math.round(r * 100)}%</td>;
                  })
                  : days.map((d) => {
                    const on = habitDone(h, d);
                    const isToday = d === today;
                    const before = d < h.createdAt;
                    return (
                      <td key={d}>
                        <button type="button" className="n-cell" aria-pressed={on} disabled={before}
                          aria-label={`${h.name}, ${dayMonth(d)}: ${on ? 'виконано' : isToday ? 'сьогодні, не відмічено' : 'пропущено'}`}
                          onClick={() => (h.kind === 'count' && isToday && !on ? setEditing({ kind: 'count', habit: h }) : toggleHabit(h.id, d))}>
                          <span className={on ? 'n-m' : isToday ? 'n-tt' : 'n-x'} />
                        </button>
                      </td>
                    );
                  })}
                <td className="n-streak">{streak(h)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!s.habits.length && <p className="n-empty">Ще немає звичок — додайте першу.</p>}
      {period !== 365 && (
        <p className="n-legend"><span><span className="n-m" /> виконано</span><span><span className="n-x" /> пропущено</span><span><span className="n-tt" /> сьогодні — натисніть, щоб відмітити</span></p>
      )}

      <div className="n-cols">
        <div>
          <h2 className="n-h2">Фокус по днях</h2>
          <WeekFocusChart />
        </div>
        <div>
          <h2 className="n-h2">Помічено</h2>
          <Noticed />
        </div>
      </div>

      {editing?.kind === 'habit' && <HabitEditor habit={editing.habit} onClose={() => setEditing(null)} />}
      {editing?.kind === 'count' && <CountEditor habit={editing.habit} onClose={() => setEditing(null)} onEdit={() => setEditing({ kind: 'habit', habit: editing.habit })} />}
    </NotesShell>
  );
}
