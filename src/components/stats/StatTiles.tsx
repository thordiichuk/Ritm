import { useStore } from '../../data/store';
import {
  CATEGORIES, CATEGORY_META, bestHabitLift, focusMinutesIn, habitRate, planRate, streak, timeByCategory, weekDays,
} from '../../data/selectors';
import { addDays, num, plural } from '../../lib/date';
import type { ISODate } from '../../data/types';
import { saveHabit } from '../../data/actions';
import { toast } from '../ui/Modal';

export function CompletionTile({ days }: { days: ISODate[] }) {
  const s = useStore((x) => x);
  const rate = habitRate(s, days);
  const prev = habitRate(s, days.map((d) => addDays(d, -days.length)));
  const delta = Math.round((rate - prev) * 100);
  return (
    <section className="tile stat" style={{ background: 'var(--c-lime)', color: 'var(--c-ink)' }}>
      <p className="k" style={{ color: 'var(--c-lime-ink)' }}>Виконання</p>
      <p className="disp stat-big">{Math.round(rate * 100)}%</p>
      <p className="stat-sub">{delta >= 0 ? '+' : '−'}{Math.abs(delta)}% до {periodPrev(days.length)}</p>
    </section>
  );
}

function periodPrev(n: number) {
  if (n === 14) return 'минулих 2 тижнів';
  if (n === 7) return 'минулого тижня';
  if (n <= 31) return 'минулого місяця';
  return 'минулого року';
}

export function LongestStreakTile() {
  const s = useStore((x) => x);
  const best = s.habits.map((h) => ({ h, n: streak(h) })).sort((a, b) => b.n - a.n)[0];
  return (
    <section className="tile stat" style={{ background: 'var(--c-peach)', color: 'var(--c-ink)' }}>
      <p className="k" style={{ color: 'var(--c-peach-ink)' }}>Найдовша серія</p>
      <p className="disp stat-big">{best?.n ?? 0}</p>
      <p className="stat-sub">{best ? `${plural(best.n, ['день', 'дні', 'днів'])} · ${best.h.name.split(' ')[0].toLowerCase()}` : 'додайте першу звичку'}</p>
    </section>
  );
}

export function FocusWeekTile() {
  const s = useStore((x) => x);
  const hours = focusMinutesIn(s, weekDays()) / 60;
  return (
    <section className="tile stat" style={{ background: 'var(--c-lilac)', color: 'var(--c-ink)' }}>
      <p className="k" style={{ color: 'var(--c-lilac-ink)' }}>Фокус за тиждень</p>
      <p className="disp stat-big">{num(hours, hours < 10 ? 1 : 0)}<span style={{ fontSize: 32 }}> год</span></p>
      <p className="stat-sub">ціль {s.settings.focusGoalHours} год</p>
    </section>
  );
}

export function PlanTile() {
  const s = useStore((x) => x);
  const p = planRate(s, weekDays());
  return (
    <section className="tile stat">
      <p className="k">План виконано</p>
      <p className="disp stat-big">{p.total ? Math.round((p.done / p.total) * 100) : 0}%</p>
      <p className="stat-sub" style={{ fontWeight: 700, color: 'var(--c-muted)' }}>блоків цього тижня</p>
    </section>
  );
}

export function TimeSplitTile({ days = weekDays(), title = 'Куди йде час · цей тиждень' }: { days?: ISODate[]; title?: string }) {
  const s = useStore((x) => x);
  const t = timeByCategory(s, days);
  const cats = CATEGORIES.filter((c) => t[c] > 0).sort((a, b) => t[b] - t[a]);
  const label = cats.map((c, i) => `${CATEGORY_META[c].label} ${num(t[c] / 60)}${i === 0 ? ' год' : ''}`);
  return (
    <section className="tile span2">
      <p className="k">{title}</p>
      {cats.length ? (
        <>
          <div className="split" role="img" aria-label={label.join(', ')}>
            {cats.map((c) => <div key={c} style={{ flex: t[c], background: CATEGORY_META[c].color }} title={`${CATEGORY_META[c].label}: ${num(t[c] / 60)} год`} />)}
          </div>
          <div className="legend">
            {cats.map((c, i) => (
              <span key={c}><i style={{ background: CATEGORY_META[c].color }} />{label[i]}</span>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--c-muted)', fontWeight: 700, marginTop: 18 }}>Поки немає запланованих блоків.</p>
      )}
    </section>
  );
}

export function InsightTile() {
  const s = useStore((x) => x);
  const best = bestHabitLift(s);
  if (!best) {
    return (
      <section className="tile span2 insight">
        <div className="disp insight-num">?</div>
        <p className="insight-text">Ведіть звички й закривайте блоки ще кілька днів — я покажу, що найбільше впливає на ваш день.</p>
      </section>
    );
  }
  const { habit, lift } = best;
  const when = habit.reminder ?? '21:00';
  const enable = async () => {
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    saveHabit({ ...habit, reminder: when });
    toast(`Нагадування о ${when} увімкнено`);
  };
  return (
    <section className="tile span2 insight">
      <div className="disp insight-num">+{Math.round(lift * 100)}%</div>
      <div>
        <p className="insight-text">Стільки більше блоків ви закриваєте після дня, коли виконали «{habit.name}».</p>
        <button className="link" onClick={enable}>Нагадувати о {when} →</button>
      </div>
    </section>
  );
}
