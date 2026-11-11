import { useEffect } from 'react';
import { getState, update, useStore } from '../data/store';
import { blocksOn, focusMinutesOn, habitsDoneOn } from '../data/selectors';
import { blockToInbox, blockToTomorrow, closeDay, setMood, setWin } from '../data/actions';
import type { Mood } from '../data/types';
import { addDays, dayMonth, hhmm, nowMinutes, num, todayISO, weekdayName } from '../lib/date';
import { navigate, useLocation } from '../lib/router';
import { useIsPhone } from '../lib/hooks';
import { Rail } from '../components/layout/Nav';
import { toast } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';

const MOODS: Array<{ v: Mood; label: string; bg: string; fg?: string; h: number }> = [
  { v: 1, label: 'Важко', bg: 'var(--c-outline)', fg: 'var(--c-text)', h: 64 },
  { v: 2, label: 'Так собі', bg: 'var(--c-peach)', h: 72 },
  { v: 3, label: 'Норм', bg: 'var(--c-sky)', h: 80 },
  { v: 4, label: 'Добре', bg: 'var(--c-mint)', h: 84 },
  { v: 5, label: 'Чудово', bg: 'var(--c-lime)', h: 88 },
];

export const isReviewBlock = (title: string) => /^вечірній підсумок/i.test(title.trim());

function focusLabel(min: number) {
  if (min < 60) return `${min}хв`;
  return `${num(min / 60, min % 60 ? 1 : 0)}г`;
}

export function ReviewScreen() {
  const phone = useIsPhone();
  const { params } = useLocation();
  const date = params.get('d') ?? todayISO();
  const s = useStore((x) => x);
  const review = s.reviews[date];
  const blocks = blocksOn(s, date);
  const doneBlocks = blocks.filter((b) => b.done).length;
  const habits = habitsDoneOn(s, date);
  const focus = focusMinutesOn(s, date);
  const left = blocks.filter((b) => !b.done && !isReviewBlock(b.title));

  // Відкрити підсумок = закрити день: відмічаємо час і блок «Вечірній підсумок»
  useEffect(() => {
    if (!getState().reviews[date]?.closedAt) closeDay(date);
    const rb = blocksOn(getState(), date).find((b) => isReviewBlock(b.title) && !b.done);
    if (rb) update((d) => void (d.blocks.find((b) => b.id === rb.id)!.done = true));
  }, [date]);

  const isToday = date === todayISO();
  const when = isToday ? `${hhmm(nowMinutes())} · ${weekdayName(date)}` : `${weekdayName(date)}, ${dayMonth(date)}`;

  const body = (
    <div className="rv">
      <p className="k">{when}</p>
      <h1 className="disp rv-title">День<br />закрито</h1>

      <div className="rv-stats">
        <div><p className="disp" style={{ color: 'var(--c-lime)' }}>{doneBlocks}/{blocks.length}</p><p>блоків</p></div>
        <div><p className="disp" style={{ color: 'var(--c-peach)' }}>{habits.done}/{habits.total}</p><p>звичок</p></div>
        <div><p className="disp" style={{ color: 'var(--c-lilac)' }}>{focusLabel(focus)}</p><p>фокусу</p></div>
      </div>

      <section className="rv-sec">
        <h2 className="k rv-k" id="mood-h">Як пройшов день?</h2>
        <div className="moods" role="radiogroup" aria-labelledby="mood-h">
          {MOODS.map((m) => {
            const on = review?.mood === m.v;
            return (
              <button key={m.v} className="mood" role="radio" aria-checked={on} onClick={() => setMood(date, m.v)}
                style={{ background: m.bg, color: m.fg ?? 'var(--c-ink)', minHeight: on ? 104 : m.h, boxShadow: on ? `0 0 0 3px var(--c-bg), 0 0 0 5px ${m.bg}` : undefined }}>
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rv-sec">
        <h2 className="k rv-k">Незроблене</h2>
        <div className="left-list">
          {left.map((b) => (
            <div className="left" key={b.id}>
              <span className="left-t">{b.title}</span>
              <button className="sw" style={{ background: 'var(--c-lime)', color: 'var(--c-ink)' }}
                onClick={() => { blockToTomorrow(b.id, date); toast(`«${b.title}» → завтра`); }}>→ завтра</button>
              <button className="sw sw-dark"
                onClick={() => { blockToInbox(b.id, date); toast(`«${b.title}» → у вхідні`); }}>у вхідні</button>
            </div>
          ))}
          {!left.length && <div className="left" style={{ color: 'var(--c-muted)' }}><Icon name="check" size={18} stroke={3} />Усе зроблено або розплановано</div>}
        </div>
      </section>

      <section className="rv-sec">
        <label htmlFor="win" className="k rv-k" style={{ display: 'block' }}>Одна перемога дня</label>
        <input id="win" className="input rv-win" key={date} defaultValue={review?.win ?? ''} placeholder="Що вийшло найкраще?"
          onChange={(e) => setWin(date, e.target.value)} />
      </section>

      <button className="rv-cta" onClick={() => navigate('today', { d: addDays(date, 1) })}>Спланувати завтра →</button>
    </div>
  );

  if (phone) return <div className="phone rv-phone">{body}</div>;
  return (
    <div className="wrap">
      <Rail active="today" />
      <main style={{ alignItems: 'center' }}>
        <div className="tile rv-desk">{body}</div>
      </main>
    </div>
  );
}
