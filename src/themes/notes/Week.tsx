import { useStore } from '../../data/store';
import { blocksOn, habitsDoneOn, weekDays } from '../../data/selectors';
import { toggleBlock } from '../../data/actions';
import { addDays, dayMonth, fromISO, hhmm, isoWeekNumber, todayISO, WEEKDAYS_SHORT } from '../../lib/date';
import { href, navigate, useLocation } from '../../lib/router';
import { NotesShell } from './Shell';
import { DateStamp, NIcon } from './parts';

/** Тиждень — таблиця на 7 колонок з міні-чек-листами і рядком підсумків */
export function NotesWeek() {
  const { params } = useLocation();
  const days = weekDays(params.get('d') ?? todayISO());
  const s = useStore((x) => x);
  const today = todayISO();
  const all = days.flatMap((d) => blocksOn(s, d));
  const habitSum = days.map((d) => habitsDoneOn(s, d)).reduce((a, h) => ({ done: a.done + h.done, total: a.total + h.total }), { done: 0, total: 0 });
  const range = fromISO(days[0]).getMonth() === fromISO(days[6]).getMonth()
    ? `${fromISO(days[0]).getDate()}–${dayMonth(days[6])}`
    : `${dayMonth(days[0])} – ${dayMonth(days[6])}`;

  return (
    <NotesShell folder="week" title={range} list={null} wide>
      <DateStamp />
      <div className="n-title-row">
        <div>
          <h1 className="n-h1">{range}</h1>
          <p className="n-sub">{isoWeekNumber(days[0])}-й тиждень · {all.filter((b) => b.done).length} з {all.length} блоків · {habitSum.done} з {habitSum.total} звичок</p>
        </div>
        <div className="n-nav">
          <button type="button" className="n-tbtn bordered" aria-label="Попередній тиждень" onClick={() => navigate('week', { d: addDays(days[0], -7) })}><NIcon name="prev" size={18} /></button>
          {!days.includes(today) && <a className="n-link-btn" href={href('week')}>Цей тиждень</a>}
          <button type="button" className="n-tbtn bordered" aria-label="Наступний тиждень" onClick={() => navigate('week', { d: addDays(days[0], 7) })}><NIcon name="next" size={18} /></button>
        </div>
      </div>
      <div className="n-scroll" style={{ marginTop: 22 }}>
        <table className="n-table n-week">
          <thead>
            <tr>
              {days.map((d, i) => (
                <th key={d} scope="col" className={d === today ? 'is-today' : undefined}>
                  <a href={href('today', d === today ? undefined : { d })}>{WEEKDAYS_SHORT[i]}<b>{fromISO(d).getDate()}</b></a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {days.map((d) => {
                const bs = blocksOn(s, d);
                return (
                  <td key={d} className={d === today ? 'is-today' : undefined}>
                    {bs.map((b) => (
                      <button key={b.id} type="button" className={`n-s${b.done ? ' d' : ''}`} aria-pressed={b.done}
                        aria-label={`${b.done ? 'Виконано' : 'Відмітити'}: ${hhmm(b.start)} ${b.title}, ${dayMonth(d)}`} onClick={() => toggleBlock(b.id)}>
                        <i aria-hidden="true" /><span>{hhmm(b.start)} {b.title}</span>
                      </button>
                    ))}
                    {!bs.length && <p className="n-free-day">вільний день</p>}
                  </td>
                );
              })}
            </tr>
            <tr className="n-ft">
              {days.map((d, i) => {
                const bs = blocksOn(s, d);
                const h = habitsDoneOn(s, d);
                const dn = bs.filter((b) => b.done).length;
                return <td key={d}>{i === 0 ? `${dn}/${bs.length} блоків · ${h.done}/${h.total} звичок` : `${dn}/${bs.length} · ${h.done}/${h.total}`}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </NotesShell>
  );
}
