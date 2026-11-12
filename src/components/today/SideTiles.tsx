import { useState, type DragEvent } from 'react';
import { useStore, dayOf } from '../../data/store';
import { blocksOn, energyPeak, freeMinutes, habitsDoneOn, streak, sessionsInBlock, completedSessionsForBlock } from '../../data/selectors';
import { addTask, deleteTask, findFreeSlot, scheduleTask, setEnergy, setTop3, setWater, toggleTop3 } from '../../data/actions';
import { durationLabel, hhmm, nowMinutes, num, parseHHMM, plural, todayISO } from '../../lib/date';
import { href } from '../../lib/router';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/Modal';
import { fmtClock, timerRemaining } from '../focus/timer';
import { useNow } from '../../lib/hooks';
import { BotanicalSpray, BotanicalSprig } from '../flora/Botanical';
import type { Task } from '../../data/types';

export function ProgressTile({ date }: { date: string }) {
  const s = useStore((x) => x);
  useNow(30000);
  const bs = blocksOn(s, date);
  const done = bs.filter((b) => b.done).length;
  const pct = bs.length ? Math.round((done / bs.length) * 100) : 0;
  const isToday = date === todayISO();
  const from = isToday ? nowMinutes() : s.settings.dayStart * 60;
  const free = freeMinutes(s, date, from);
  return (
    <section className="tile flora-host" style={{ background: 'var(--accent-bg)', color: 'var(--on-accent)', boxShadow: 'var(--accent-shadow)' }}>
      <BotanicalSprig inverse className="flora flora-sprig-corner" />
      <p className="k" style={{ color: 'var(--on-accent-k)' }}>Прогрес дня</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
        <span className="disp" style={{ fontSize: 88, lineHeight: 0.9 }}>{pct}<span style={{ fontSize: 40 }}>%</span></span>
        <span style={{ fontSize: 14, fontWeight: 800, textAlign: 'right', lineHeight: 1.4 }}>
          {done} з {bs.length} {plural(bs.length, ['блоку', 'блоків', 'блоків'])}<br />
          {free ? `вільно ${durationLabel(free)}` : 'вільного часу немає'}
        </span>
      </div>
      <div className="seg" aria-hidden="true">
        {bs.map((b, i) => <span key={b.id} className={i < done ? 'on' : ''} />)}
        {!bs.length && <span />}
      </div>
      {(!isToday || nowMinutes() >= parseHHMM(s.settings.reviewAt) - 60) && (
        <a className="pill pill-ink" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} href={href('review', isToday ? undefined : { d: date })}>
          Вечірній підсумок →
        </a>
      )}
    </section>
  );
}

export function Top3Tile({ date }: { date: string }) {
  const top3 = useStore((s) => dayOf(s, date).top3);
  const slots = [0, 1, 2];
  return (
    <section className="tile">
      <p className="k">Топ-3</p>
      <div className="top3">
        {slots.map((i) => {
          const it = top3[i];
          return (
            <div key={it?.id ?? `empty${i}`} className={`top3-row${it?.done ? ' done' : ''}`}>
              {it ? (
                <button className={`chk${it.done ? ' on' : ''}`} aria-label={it.done ? 'Виконано' : 'Позначити'} aria-pressed={it.done} onClick={() => toggleTop3(date, it.id)}>
                  {it.done && <Icon name="check" size={14} stroke={4} />}
                </button>
              ) : (
                <span className="chk ghost" aria-hidden="true" />
              )}
              <input
                key={it?.title ?? ''} // назва змінилася на іншому пристрої — показати нову
                className="top3-text"
                defaultValue={it?.title ?? ''}
                placeholder={i === top3.length ? 'Додати пріоритет' : ''}
                disabled={!it && i > top3.length}
                aria-label={`Пріоритет ${i + 1}`}
                onBlur={(e) => e.target.value !== (it?.title ?? '') && setTop3(date, i, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HabitsMini({ date }: { date: string }) {
  const s = useStore((x) => x);
  const { done, total } = habitsDoneOn(s, date);
  const best = Math.max(0, ...s.habits.map((h) => streak(h, date)));
  return (
    <a className="tile mini" href={href('habits')}>
      <p className="k">Звички</p>
      <p className="disp big">{done}<span style={{ color: 'var(--c-muted-3)' }}>/{total}</span></p>
      <p className="sub" style={{ color: 'var(--streak-text)' }}>{best ? `серія ${best} ${plural(best, ['день', 'дні', 'днів'])}` : 'почніть серію'}</p>
    </a>
  );
}

export function FocusMini() {
  const s = useStore((x) => x);
  const now = useNow(1000);
  const t = s.timer;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const active = blocksOn(s, todayISO()).find((b) => b.start <= nowMin && b.end > nowMin && !b.done);
  let clock = `${String(s.settings.workMin).padStart(2, '0')}:00`;
  let sub = 'почати сесію';
  if (t) {
    clock = fmtClock(timerRemaining(t, now.getTime()));
    sub = t.phase === 'break' ? 'перерва' : `сесія ${t.session} з ${t.total}${t.running ? '' : ' · пауза'}`;
  } else if (active) {
    const total = sessionsInBlock(active, s);
    sub = `сесія ${Math.min(total, completedSessionsForBlock(s, active.id, active.date, active.title) + 1)} з ${total}`;
  }
  return (
    <a className="tile mini flora-host" href={href('focus', t?.blockId ? { block: t.blockId } : active ? { block: active.id } : undefined)}
      style={{ background: 'var(--focus-tile-bg)', color: 'var(--focus-tile-fg)' }}>
      <BotanicalSpray className="flora flora-spray-br" />
      <p className="k" style={{ color: 'var(--focus-tile-k)' }}>Фокус</p>
      <p className="disp big">{clock}</p>
      <p className="sub" style={{ fontWeight: 800 }}>{sub}</p>
    </a>
  );
}

export function WaterTile({ date }: { date: string }) {
  const water = useStore((s) => dayOf(s, date).water);
  const goal = useStore((s) => s.settings.waterGoal);
  return (
    <section className="tile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p className="k">Вода</p>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{num(water * 0.25, 2)} / {num(goal * 0.25, 2)} л</span>
      </div>
      <div className="cups" style={{ gridTemplateColumns: `repeat(${goal}, 1fr)` }}>
        {Array.from({ length: goal }, (_, i) => (
          <button key={i} className={`cup${i < water ? ' on' : ''}`} aria-label={`Склянка ${i + 1}`} aria-pressed={i < water}
            onClick={() => setWater(date, water === i + 1 ? i : i + 1)} />
        ))}
      </div>
    </section>
  );
}

const MINUTE_OPTIONS = [5, 15, 30, 45, 60, 90, 120];
export function taskLabel(t: Task) {
  return `${t.title} · ${t.minutes >= 60 && t.minutes % 60 === 0 ? `${t.minutes / 60} год` : `${t.minutes} хв`}`;
}

export function InboxTile({ date, phone }: { date: string; phone?: boolean }) {
  const tasks = useStore((s) => s.tasks.filter((t) => t.location === 'inbox' && !t.done));
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(15);
  const [open, setOpen] = useState<string | null>(null);

  const add = () => {
    if (!title.trim()) return;
    addTask(title.trim(), mins);
    setTitle('');
  };
  const autoSchedule = (t: Task) => {
    const from = date === todayISO() ? nowMinutes() : 0;
    const slot = findFreeSlot(date, Math.max(15, t.minutes), from);
    if (slot == null) return toast('Немає вільного проміжку на цей день');
    scheduleTask(t.id, date, slot);
    toast(`«${t.title}» → ${hhmm(slot)}`);
    setOpen(null);
  };
  return (
    <section className="tile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <p className="k">Вхідні</p>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-muted)' }}>{phone ? 'торкніться, щоб запланувати' : 'перетягніть у розклад'}</span>
      </div>
      <div className="inbox">
        {tasks.map((t) => (
          <span key={t.id} style={{ display: 'inline-flex', gap: 4 }}>
            <button className="ib" draggable={!phone}
              onDragStart={(e: DragEvent) => { e.dataTransfer.setData('text/ritm-task', t.id); e.dataTransfer.effectAllowed = 'move'; }}
              onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
              {taskLabel(t)}
            </button>
            {open === t.id && (
              <>
                <button className="ib ib-accent" onClick={() => autoSchedule(t)}>У розклад</button>
                <button className="ib" style={{ cursor: 'pointer' }} aria-label="Видалити задачу" onClick={() => deleteTask(t.id)}><Icon name="trash" size={16} /></button>
              </>
            )}
          </span>
        ))}
        {!tasks.length && <span style={{ color: 'var(--c-muted-3)', fontWeight: 700, fontSize: 14 }}>Порожньо — усе розплановано</span>}
      </div>
      <form className="ib-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="+ задача у вхідні" aria-label="Нова задача" />
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label="Тривалість">
          {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} год` : `${m} хв`}</option>)}
        </select>
      </form>
    </section>
  );
}

export function EnergyTile({ date }: { date: string }) {
  const s = useStore((x) => x);
  const marks = dayOf(s, date).energy;
  const current = [...marks].sort((a, b) => parseHHMM(a.at) - parseHHMM(b.at)).at(-1)?.level;
  const peak = energyPeak(s);
  const isToday = date === todayISO();
  return (
    <section className="tile" style={{ border: '1px solid var(--tile-outline)', background: 'transparent', boxShadow: 'none' }}>
      <p className="k">{isToday ? 'Енергія зараз' : 'Енергія'}</p>
      <div className="energy" role="radiogroup" aria-label="Рівень енергії">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={`pill ${current === n ? 'pill-lime' : 'pill-dark'}`} role="radio" aria-checked={current === n}
            disabled={!isToday} onClick={() => setEnergy(date, n)}>{n}</button>
        ))}
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--c-muted)' }}>
        {peak ? (
          <>Ваш пік — <b style={{ color: 'var(--c-text)' }}>{hhmm(peak.from).replace(/^0/, '')}–{hhmm(peak.to).replace(/^0/, '')}</b>. Ставте туди найважче.</>
        ) : 'Відмічайте енергію кілька разів на день — я знайду ваш пік.'}
      </p>
    </section>
  );
}
