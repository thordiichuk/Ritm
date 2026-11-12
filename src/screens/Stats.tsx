import { useState } from 'react';
import { useStore } from '../data/store';
import { focusMinutesOn, habitDone, lastDays, planRate } from '../data/selectors';
import { cap, dayMonth, durationLabel, fromISO, todayISO, weekdayName, WEEKDAYS_SHORT, weekdayIdx } from '../lib/date';
import { useIsPhone } from '../lib/hooks';
import { BottomNav, Rail } from '../components/layout/Nav';
import { CompletionTile, FocusWeekTile, InsightTile, LongestStreakTile, PlanTile, TimeSplitTile } from '../components/stats/StatTiles';
import { BotanicalSpray } from '../components/flora/Botanical';
import type { ISODate } from '../data/types';

type Period = 7 | 14 | 30;
const PERIODS: Array<[Period, string]> = [[7, 'Тиждень'], [14, '2 тижні'], [30, 'Місяць']];

const MOOD_META = [
  { label: 'Важко', color: 'var(--mood-1)' },
  { label: 'Так собі', color: 'var(--mood-2)' },
  { label: 'Норм', color: 'var(--mood-3)' },
  { label: 'Добре', color: 'var(--mood-4)' },
  { label: 'Чудово', color: 'var(--mood-5)' },
];

function dayLabel(d: ISODate, period: Period, i: number) {
  if (period === 7) return WEEKDAYS_SHORT[weekdayIdx(d)];
  if (period === 30 && i % 3 !== 0 && d !== todayISO()) return '';
  return String(fromISO(d).getDate());
}

/** Стовпчики однієї серії: значення 0..max, сьогодні — лаймом */
function Bars({ days, values, format, period, color }: {
  days: ISODate[]; values: number[]; format: (v: number) => string; period: Period; color: string;
}) {
  const max = Math.max(1, ...values);
  const today = todayISO();
  return (
    <>
      <div className="bars" role="img" aria-label={days.map((d, i) => `${dayMonth(d)}: ${format(values[i])}`).join('; ')}>
        {days.map((d, i) => (
          <div key={d} className="bar-col" tabIndex={0} data-tip={`${dayMonth(d)} · ${format(values[i])}`}>
            <div className="bar" style={{ height: `${(values[i] / max) * 100}%`, background: d === today ? 'var(--chart-today)' : color }} />
          </div>
        ))}
      </div>
      <div className="bar-axis" aria-hidden="true">
        {days.map((d, i) => <span key={d} style={d === today ? { color: 'var(--accent)' } : undefined}>{dayLabel(d, period, i)}</span>)}
      </div>
    </>
  );
}

function FocusChart({ days, period }: { days: ISODate[]; period: Period }) {
  const s = useStore((x) => x);
  const mins = days.map((d) => focusMinutesOn(s, d));
  const total = mins.reduce((a, b) => a + b, 0);
  return (
    <section className="tile span2">
      <div className="chart-head">
        <p className="k">Фокус по днях</p>
        <span>{durationLabel(total)} · у середньому {durationLabel(Math.round(total / days.length))}</span>
      </div>
      <Bars days={days} values={mins} format={(v) => (v ? durationLabel(v) : 'без фокусу')} period={period} color="var(--chart-focus)" />
    </section>
  );
}

function PlanChart({ days, period }: { days: ISODate[]; period: Period }) {
  const s = useStore((x) => x);
  const rates = days.map((d) => {
    const p = planRate(s, [d]);
    return p.total ? Math.round((p.done / p.total) * 100) : 0;
  });
  const p = planRate(s, days);
  return (
    <section className="tile span2">
      <div className="chart-head">
        <p className="k">Закриті блоки</p>
        <span>{p.done} з {p.total} · {p.total ? Math.round((p.done / p.total) * 100) : 0}%</span>
      </div>
      <Bars days={days} values={rates} format={(v) => `${v}% блоків`} period={period} color="var(--chart-plan)" />
    </section>
  );
}

function MoodChart({ days, period }: { days: ISODate[]; period: Period }) {
  const reviews = useStore((s) => s.reviews);
  const moods: number[] = days.map((d) => reviews[d]?.mood ?? 0);
  const rated = moods.filter(Boolean);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const today = todayISO();
  return (
    <section className="tile span2">
      <div className="chart-head">
        <p className="k">Настрій</p>
        <span>{avg ? `у середньому «${MOOD_META[Math.round(avg) - 1].label.toLowerCase()}»` : 'ще немає оцінок'}</span>
      </div>
      <div className="bars" role="img" aria-label={days.map((d, i) => `${dayMonth(d)}: ${moods[i] ? MOOD_META[moods[i] - 1].label : 'без оцінки'}`).join('; ')}>
        {days.map((d, i) => (
          <div key={d} className="bar-col" tabIndex={0} data-tip={`${dayMonth(d)} · ${moods[i] ? MOOD_META[moods[i] - 1].label : 'без оцінки'}`}>
            {moods[i] ? (
              <div className="bar mood-bar" style={{ height: `${moods[i] * 20}%`, background: MOOD_META[moods[i] - 1].color }} />
            ) : (
              <div className="bar bar-empty" style={{ height: '20%', outline: d === today ? '2px dashed var(--today-dash)' : undefined }} />
            )}
          </div>
        ))}
      </div>
      <div className="bar-axis" aria-hidden="true">
        {days.map((d, i) => <span key={d}>{dayLabel(d, period, i)}</span>)}
      </div>
      <div className="legend" style={{ marginTop: 14 }}>
        {MOOD_META.map((m) => <span key={m.label}><i style={{ background: m.color }} />{m.label}</span>)}
      </div>
    </section>
  );
}

function HabitRates({ days }: { days: ISODate[] }) {
  const habits = useStore((s) => s.habits);
  return (
    <section className="tile span2">
      <p className="k">Звички за період</p>
      <div className="hr-list">
        {habits.map((h) => {
          const r = days.filter((d) => habitDone(h, d)).length / days.length;
          return (
            <div key={h.id} className="hr-item">
              <span>{h.name}</span>
              <div className="hr-track"><div style={{ width: `${r * 100}%` }} /></div>
              <b>{Math.round(r * 100)}%</b>
            </div>
          );
        })}
        {!habits.length && <p style={{ color: 'var(--c-muted)', fontWeight: 700 }}>Ще немає звичок.</p>}
      </div>
    </section>
  );
}

export function StatsScreen() {
  const phone = useIsPhone();
  const [period, setPeriod] = useState<Period>(14);
  const days = lastDays(period);
  const today = todayISO();

  const tabs = (
    <div className="seg-tabs" role="tablist" aria-label="Період">
      {PERIODS.map(([p, l]) => (
        <button key={p} className="pill" role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>{l}</button>
      ))}
    </div>
  );

  const content = (
    <>
      <div className="bento kpi">
        <CompletionTile days={days} />
        <LongestStreakTile />
        <FocusWeekTile />
        <PlanTile />
      </div>
      <div className="bento">
        <FocusChart days={days} period={period} />
        <PlanChart days={days} period={period} />
        <MoodChart days={days} period={period} />
        <HabitRates days={days} />
        <TimeSplitTile days={days} title={`Куди йде час · ${PERIODS.find((p) => p[0] === period)![1].toLowerCase()}`} />
        <InsightTile />
      </div>
    </>
  );

  if (phone) {
    return (
      <div className="phone st-phone">
        <BotanicalSpray className="flora-head-phone" />
        <p className="k">{cap(weekdayName(today))}, {dayMonth(today)}</p>
        <h1 className="disp st-title">Статистика</h1>
        <div style={{ margin: '16px 0' }}>{tabs}</div>
        {content}
        <BottomNav active="stats" />
      </div>
    );
  }

  return (
    <div className="wrap">
      <Rail active="stats" />
      <main>
        <header className="tile page-head">
          <BotanicalSpray className="flora-head" />
          <div>
            <p className="k">{dayMonth(days[0])} – {dayMonth(today)}</p>
            <h1 className="disp">Статистика</h1>
          </div>
          <div className="actions">{tabs}</div>
        </header>
        {content}
      </main>
    </div>
  );
}

