import { useState, type DragEvent, type ReactNode } from 'react';
import type { AppState, Block } from '../../data/types';
import { useStore } from '../../data/store';
import { CATEGORY_META, blocksOn, completedSessionsForBlock, sessionsInBlock } from '../../data/selectors';
import { hhmm, pad, shortRange, todayISO } from '../../lib/date';
import { moveBlock, scheduleTask } from '../../data/actions';
import { navigate } from '../../lib/router';
import { useNow } from '../../lib/hooks';
import { timerRemaining, fmtClock } from '../focus/timer';

type Variant = 'phone' | 'desktop';

interface Row {
  hour: number;
  kind: 'blocks' | 'cont' | 'free';
  blocks: Block[];
  cont?: Block;
  /** з якої хвилини починається вільний час у рядку */
  freeFrom?: number;
}

const ROW_MIN = { phone: 58, desktop: 68 };

export function buildRows(s: AppState, date: string): { rows: Row[]; tall: Set<string> } {
  const bs = blocksOn(s, date);
  let first = s.settings.dayStart;
  let last = s.settings.dayEnd - 1;
  for (const b of bs) {
    first = Math.min(first, Math.floor(b.start / 60));
    last = Math.max(last, Math.floor((b.end - 1) / 60));
  }
  const rows: Row[] = [];
  const tall = new Set<string>();
  for (let h = first; h <= last; h++) {
    const hs = h * 60;
    const he = hs + 60;
    const starting = bs.filter((b) => Math.floor(b.start / 60) === h);
    if (starting.length) {
      rows.push({ hour: h, kind: 'blocks', blocks: starting });
      continue;
    }
    const cont = bs.find((b) => b.start < hs && b.end >= he);
    if (cont) {
      rows.push({ hour: h, kind: 'cont', blocks: [], cont });
      continue;
    }
    const partial = bs.find((b) => b.start < hs && b.end > hs);
    if (partial && partial.start % 60 === 0) {
      // блок почався рівно о годині й закінчується посеред наступної — подовжуємо його
      tall.add(partial.id);
      continue;
    }
    // блок, що почався о :30, уже «зсунутий» відступом — решта години лишається вільною
    rows.push({ hour: h, kind: 'free', blocks: [], freeFrom: partial ? partial.end : hs });
  }
  return { rows, tall };
}

export function Schedule({ date, variant, onEdit, onAddAt }: {
  date: string;
  variant: Variant;
  onEdit: (b: Block) => void;
  onAddAt: (start: number) => void;
}) {
  const s = useStore((x) => x);
  const now = useNow(1000);
  const isToday = date === todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowHour = now.getHours();
  const { rows, tall } = buildRows(s, date);
  const active = isToday ? blocksOn(s, date).find((b) => b.start <= nowMin && b.end > nowMin && !b.done) : undefined;
  const firstFreeAfterNow = rows.find((r) => r.kind === 'free' && (!isToday || r.hour > nowHour));
  const rowMin = ROW_MIN[variant];

  return (
    <div className={`sched sched-${variant}`}>
      {rows.map((r) => {
        const isNowRow = isToday && r.hour === nowHour;
        const showNow = isNowRow && active && (r.cont?.id === active.id || r.blocks.some((b) => b.id === active.id));
        let content: ReactNode;
        if (showNow) {
          content = (
            <>
              {r.blocks.filter((b) => b.id !== active!.id).map((b) => (
                <BlockCard key={b.id} b={b} variant={variant} s={s} onEdit={onEdit} tall={tall.has(b.id)} />
              ))}
              <NowCard b={active!} variant={variant} nowMin={nowMin} s={s} now={now} />
            </>
          );
        } else if (r.kind === 'blocks') {
          content = r.blocks.map((b, i) => (
            <BlockCard key={b.id} b={b} variant={variant} s={s} onEdit={onEdit} tall={tall.has(b.id)}
              offset={i === 0 && b.start % 60 ? Math.round(((b.start % 60) / 60) * rowMin) : 0} />
          ));
        } else if (r.kind === 'cont') {
          content = <ContCard b={r.cont!} variant={variant} onEdit={onEdit} />;
        } else {
          content = (
            <FreeSlot date={date} hour={r.hour} variant={variant} onAdd={() => onAddAt(r.freeFrom ?? r.hour * 60)}
              hint={variant === 'desktop' && r === firstFreeAfterNow && s.tasks.some((t) => t.location === 'inbox')} />
          );
        }
        return (
          <div key={r.hour} data-hour={r.hour} className={`hr${isNowRow ? ' now' : ''}`}>
            <span className="h">{variant === 'desktop' ? pad(r.hour) : r.hour}</span>
            <div className="hr-body">{content}</div>
          </div>
        );
      })}
    </div>
  );
}

function blockMeta(b: Block, s: AppState): { text: string; stacked: boolean } {
  const len = b.end - b.start;
  const parts = [len < 15 ? `${hhmm(b.start)} · ${len} хв` : `${hhmm(b.start)} – ${hhmm(b.end)}`];
  const done = completedSessionsForBlock(s, b.id, b.date, b.title);
  if (done > 1) parts.push(`${done} помодоро`);
  if (b.subtasks.length) {
    const left = b.subtasks.filter((x) => !x.done).length;
    parts.push(left ? `${left} ${left === 1 ? 'підзадача' : left < 5 ? 'підзадачі' : 'підзадач'}` : 'підзадачі виконано');
  }
  if (b.done) parts.push('готово');
  return { text: parts.join(' · '), stacked: done > 1 };
}

function onDragStartBlock(e: DragEvent, b: Block) {
  e.dataTransfer.setData('text/ritm-block', b.id);
  e.dataTransfer.effectAllowed = 'move';
}

function BlockCard({ b, variant, s, onEdit, tall, offset = 0 }: {
  b: Block; variant: Variant; s: AppState; onEdit: (b: Block) => void; tall?: boolean; offset?: number;
}) {
  const cls = `blk ${CATEGORY_META[b.category].cls}${b.done ? ' done' : ''}`;
  const style = { marginTop: offset || undefined, minHeight: tall ? (variant === 'desktop' ? 108 : 70) : undefined };
  if (variant === 'phone') {
    return (
      <button className={cls} style={style} onClick={() => onEdit(b)}>
        <b>{b.title}</b>
        <span>{b.done ? 'готово' : b.start % 60 || b.end - b.start < 30 ? hhmm(b.start) : shortRange(b.start, b.end)}</span>
      </button>
    );
  }
  const meta = blockMeta(b, s);
  return (
    <button className={cls} style={style} onClick={() => onEdit(b)} draggable onDragStart={(e) => onDragStartBlock(e, b)}>
      {meta.stacked ? (
        <div>
          <h4>{b.title}</h4>
          <p>{meta.text}</p>
        </div>
      ) : (
        <>
          <h4>{b.title}</h4>
          <p>{meta.text}</p>
        </>
      )}
    </button>
  );
}

function ContCard({ b, variant, onEdit }: { b: Block; variant: Variant; onEdit: (b: Block) => void }) {
  return (
    <button className={`blk ${CATEGORY_META[b.category].cls} cont${b.done ? ' done' : ''}`} onClick={() => onEdit(b)}>
      {variant === 'phone' ? <b>↳ продовження</b> : <h4>↳ продовження</h4>}
    </button>
  );
}

function NowCard({ b, variant, nowMin, s, now }: { b: Block; variant: Variant; nowMin: number; s: AppState; now: Date }) {
  const total = sessionsInBlock(b, s);
  const timer = s.timer && s.timer.blockId === b.id ? s.timer : null;
  const session = timer ? timer.session : Math.min(total, completedSessionsForBlock(s, b.id, b.date, b.title) + 1);
  const left = b.end - nowMin;
  const pct = Math.round(((nowMin - b.start) / (b.end - b.start)) * 100);
  const short = b.title.split(':')[0].trim();
  const remaining = timer ? fmtClock(timerRemaining(timer, now.getTime())) : `${pad(s.settings.workMin)}:00`;
  const open = () => navigate('focus', { block: b.id });

  if (variant === 'phone') {
    return (
      <div className="now-card">
        <div className="now-top"><span className="now-k">Зараз {hhmm(nowMin)}</span><span>ще {left} хв</span></div>
        <p className="now-title">{short} — сесія {session} з {total}</p>
        <button className="now-btn" onClick={open}>Відкрити таймер</button>
      </div>
    );
  }
  return (
    <div className="now-card">
      <div className="now-main">
        <div className="now-top"><span>Зараз {hhmm(nowMin)}</span><span style={{ opacity: 0.6 }}>ще {left} хв</span></div>
        <p className="now-title">{short} — сесія {session} з {total}</p>
        <div className="now-bar"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <span className="disp now-clock">{remaining}</span>
      <button className="pill pill-ink" onClick={open}>Відкрити таймер</button>
    </div>
  );
}

function FreeSlot({ date, hour, variant, hint, onAdd }: { date: string; hour: number; variant: Variant; hint?: boolean; onAdd: () => void }) {
  const [over, setOver] = useState(false);
  const accept = (e: DragEvent) => {
    if ([...e.dataTransfer.types].some((t) => t.startsWith('text/ritm-'))) {
      e.preventDefault();
      setOver(true);
    }
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const task = e.dataTransfer.getData('text/ritm-task');
    const blk = e.dataTransfer.getData('text/ritm-block');
    if (task) scheduleTask(task, date, hour * 60);
    else if (blk) moveBlock(blk, date, hour * 60);
  };
  return (
    <button className={`free${over ? ' over' : ''}`} onClick={onAdd} onDragOver={accept} onDragEnter={accept}
      onDragLeave={() => setOver(false)} onDrop={drop} aria-label={`Додати блок о ${hour}:00`}>
      + вільна година{hint && variant === 'desktop' ? ' · киньте сюди задачу з вхідних' : ''}
    </button>
  );
}
