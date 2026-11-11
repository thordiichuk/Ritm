import { useStore } from '../data/store';
import { CATEGORY_META, blocksOn, habitsDoneOn, weekDays } from '../data/selectors';
import { addDays, dayMonth, fromISO, hhmm, isoWeekNumber, todayISO, WEEKDAYS_SHORT } from '../lib/date';
import { href, navigate, useLocation } from '../lib/router';
import { Rail } from '../components/layout/Nav';
import { Icon } from '../components/ui/Icon';

export function WeekScreen() {
  const { params } = useLocation();
  const anchor = params.get('d') ?? todayISO();
  const days = weekDays(anchor);
  const s = useStore((x) => x);
  const today = todayISO();
  return (
    <div className="wrap">
      <Rail active="week" />
      <main>
        <header className="tile page-head">
          <div>
            <p className="k">{isoWeekNumber(days[0])}-й тиждень</p>
            <h1 className="disp">{fromISO(days[0]).getMonth() === fromISO(days[6]).getMonth() ? `${fromISO(days[0]).getDate()}–${dayMonth(days[6])}` : `${dayMonth(days[0])} – ${dayMonth(days[6])}`}</h1>
          </div>
          <div className="actions">
            <div className="day-nav">
              <button className="pill pill-dark" aria-label="Попередній тиждень" onClick={() => navigate('week', { d: addDays(days[0], -7) })}><Icon name="chev-left" size={18} stroke={2.6} /></button>
              <button className="pill pill-dark" aria-label="Наступний тиждень" onClick={() => navigate('week', { d: addDays(days[0], 7) })}><Icon name="chev-right" size={18} stroke={2.6} /></button>
            </div>
            {!days.includes(today) && <a className="pill pill-dark" href={href('week')}>Цей тиждень</a>}
          </div>
        </header>
        <div className="week-grid">
          {days.map((d, i) => {
            const bs = blocksOn(s, d);
            const h = habitsDoneOn(s, d);
            return (
              <a key={d} href={href('today', d === today ? undefined : { d })} className={`week-col${d === today ? ' today' : ''}`}>
                <p className="k">{WEEKDAYS_SHORT[i]}</p>
                <p className="disp" style={{ margin: '4px 0 8px', fontSize: 34, lineHeight: 1, color: d === today ? 'var(--c-lime)' : undefined }}>{fromISO(d).getDate()}</p>
                {bs.map((b) => (
                  <div key={b.id} className={`wb${b.done ? ' done' : ''}`} style={{ background: CATEGORY_META[b.category].color, color: b.category === 'errands' ? 'var(--c-text)' : undefined }} title={`${hhmm(b.start)} ${b.title}`}>
                    {hhmm(b.start)} {b.title}
                  </div>
                ))}
                {!bs.length && <span style={{ color: 'var(--c-muted-3)', fontWeight: 700, fontSize: 13 }}>вільний день</span>}
                <span style={{ marginTop: 'auto', paddingTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--c-muted)' }}>
                  {bs.filter((b) => b.done).length}/{bs.length} блоків · {h.done}/{h.total} звичок
                </span>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
