import { useState } from 'react';
import type { ISODate } from '../../data/types';
import { useStore } from '../../data/store';
import { CATEGORIES, CATEGORY_META, completionSummary, focusMinutesIn, focusMinutesOn, habitDone, lastDays, planRate, timeByCategory } from '../../data/selectors';
import { dayMonth, durationLabel, fromISO, num, todayISO, WEEKDAYS_SHORT } from '../../lib/date';
import { NotesShell, type ListSpec } from './Shell';
import { DateStamp, HandChart, TAG } from './parts';
import { Noticed, SummaryList } from './Habits';

type Period = 7 | 14 | 30;
const PERIODS: Array<[Period, string]> = [[7, 'Тиждень'], [14, '2 тижні'], [30, 'Місяць']];
const MOOD = ['важко', 'так собі', 'норм', 'добре', 'чудово'];

const shortDay = (d: ISODate, period: Period) => (period === 7 ? WEEKDAYS_SHORT[(fromISO(d).getDay() + 6) % 7] : String(fromISO(d).getDate()));

/** Статистика на аркуші: списки й таблиці замість великих плиток */
export function NotesStats() {
  const s = useStore((x) => x);
  const [period, setPeriod] = useState<Period>(14);
  const days = lastDays(period);
  const today = todayISO();
  const focus = days.map((d) => focusMinutesOn(s, d) / 60);
  const plan = planRate(s, days);
  const t = timeByCategory(s, days);
  const totalMin = CATEGORIES.reduce((a, c) => a + t[c], 0);
  const cats = CATEGORIES.filter((c) => t[c] > 0).sort((a, b) => t[b] - t[a]);
  const moods = days.filter((d) => s.reviews[d]?.mood);

  const list: ListSpec = {
    title: 'Статистика',
    sections: [{
      label: 'Періоди',
      items: PERIODS.map(([p, l]) => {
        const ds = lastDays(p);
        return {
          key: String(p), title: l, on: p === period, onClick: () => setPeriod(p),
          sub: `${Math.round(completionSummary(s, ds).rate * 100)}% звичок, ${durationLabel(focusMinutesIn(s, ds))} фокусу`,
        };
      }),
    }],
  };

  return (
    <NotesShell folder="stats" title="Статистика" list={list}>
      <DateStamp />
      <h1 className="n-h1">Статистика</h1>
      <p className="n-sub">
        {dayMonth(days[0])} – {dayMonth(today)}
        {PERIODS.map(([p, l]) => (
          <span key={p}> · <button type="button" className={`n-period${period === p ? ' on' : ''}`} aria-pressed={period === p} onClick={() => setPeriod(p)}>{l}</button></span>
        ))}
      </p>
      <SummaryList days={days} />

      <h2 className="n-h2">Фокус по днях</h2>
      <p className="n-p n-muted">Разом {durationLabel(Math.round(focus.reduce((a, b) => a + b, 0) * 60))}, у середньому {durationLabel(Math.round((focus.reduce((a, b) => a + b, 0) * 60) / days.length))} на день</p>
      <HandChart values={focus} labels={days.map((d) => shortDay(d, period))}
        label={`Малюнок: години фокусу по днях — ${days.map((d, i) => `${dayMonth(d)} ${num(focus[i], 1)}`).join(', ')}`} />

      <h2 className="n-h2">Куди йде час</h2>
      {cats.length ? (
        <table className="n-table n-simple">
          <thead><tr><th scope="col">Тег</th><th scope="col">Годин</th><th scope="col">Частка</th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c}>
                <th scope="row"><span className="n-tag">{TAG[c]}</span> <span className="n-muted">{CATEGORY_META[c].label}</span></th>
                <td>{num(t[c] / 60)}</td>
                <td>{Math.round((t[c] / totalMin) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="n-empty">Поки немає запланованих блоків.</p>}
      <p className="n-p">Закрито блоків: <b>{plan.done} з {plan.total}</b> ({plan.total ? Math.round((plan.done / plan.total) * 100) : 0}%)</p>

      <h2 className="n-h2">Звички за період</h2>
      <table className="n-table n-simple">
        <thead><tr><th scope="col">Звичка</th><th scope="col">Виконано</th></tr></thead>
        <tbody>
          {s.habits.map((h) => {
            const r = days.filter((d) => habitDone(h, d)).length / days.length;
            return <tr key={h.id}><th scope="row">{h.name}</th><td><b>{Math.round(r * 100)}%</b></td></tr>;
          })}
        </tbody>
      </table>

      <h2 className="n-h2">Настрій</h2>
      {moods.length ? (
        <ul className="n-bullets">
          {moods.map((d) => <li key={d}>{dayMonth(d)} — <b>{MOOD[s.reviews[d].mood! - 1]}</b>{s.reviews[d].win ? <span className="n-muted"> · {s.reviews[d].win}</span> : null}</li>)}
        </ul>
      ) : <p className="n-empty">Ще немає оцінок — їх ставлять у вечірньому підсумку.</p>}

      <h2 className="n-h2">Помічено</h2>
      <Noticed />
    </NotesShell>
  );
}
