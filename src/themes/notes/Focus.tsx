import { getState, useStore } from '../../data/store';
import { blocksOn } from '../../data/selectors';
import { toggleBlock } from '../../data/actions';
import { advance, ensureTimer, fmtClock, phaseLength, resetPhase, startOrPause } from '../../components/focus/timer';
import { useFocus } from '../../components/focus/useFocus';
import { toast } from '../../components/ui/Modal';
import { hhmm, plural, todayISO } from '../../lib/date';
import { href, navigate, useLocation } from '../../lib/router';
import { NotesShell, type ListSpec } from './Shell';
import { Circle, DateStamp, NIcon } from './parts';
import { WeekFocusChart } from './Habits';

/** Фокус-таймер на аркуші. Поведінка — та сама, що й у звичайній темі (useFocus). */
export function NotesFocus() {
  const { params } = useLocation();
  const { timer, muted, finished, setFinished, remaining, toggleNotif } = useFocus(params.get('block'));
  const s = useStore((x) => x);
  const today = todayISO();
  const sessions = s.sessions.filter((x) => x.date === today).sort((a, b) => a.startedAt - b.startedAt);
  const todo = blocksOn(s, today).filter((b) => !b.done);

  const list: ListSpec = {
    title: 'Фокус',
    sections: [{
      label: 'Блоки сьогодні',
      items: todo.map((b) => ({
        key: b.id, title: b.title, sub: `${hhmm(b.start)} – ${hhmm(b.end)}`,
        href: href('focus', { block: b.id }), on: timer?.blockId === b.id,
      })),
    }],
  };

  let body;
  if (finished || !timer) {
    const block = finished?.blockId ? getState().blocks.find((b) => b.id === finished.blockId) : undefined;
    body = (
      <>
        <h1 className="n-h1">{finished ? 'Фокус завершено' : 'Готові до наступної сесії?'}</h1>
        {finished && <p className="n-sub">{finished.title}</p>}
        <div className="n-ctl">
          {block && !block.done && (
            <button type="button" className="n-action" onClick={() => { toggleBlock(block.id); toast('Блок позначено готовим'); navigate('today'); }}>Позначити блок готовим</button>
          )}
          <button type="button" className={block && !block.done ? 'n-btn' : 'n-action'} onClick={() => { setFinished(null); ensureTimer(null); }}>Нова сесія</button>
        </div>
      </>
    );
  } else {
    const len = phaseLength(timer);
    const elapsed = len - remaining;
    const isBreak = timer.phase === 'break';
    const nextLabel = isBreak
      ? `далі сесія ${timer.session + 1} з ${timer.total}`
      : timer.session >= timer.total ? 'далі — кінець блоку' : `далі перерва ${timer.breakMin} хв`;
    const playLabel = timer.running ? 'Пауза' : elapsed > 0 ? 'Продовжити' : isBreak ? 'Почати перерву' : 'Старт';
    const [mm, ss] = fmtClock(remaining).split(':');
    body = (
      <>
        <h1 className="n-h1">{isBreak ? 'Перерва' : timer.title}</h1>
        <p className="n-sub">{isBreak ? `Після сесії ${timer.session} з ${timer.total} · встаньте, розімніться, попийте води` : `Фокус · сесія ${timer.session} з ${timer.total}`}</p>
        <div className="n-clock" role="timer" aria-live="off"
          aria-label={`Залишилось ${Number(mm)} ${plural(Number(mm), ['хвилина', 'хвилини', 'хвилин'])} ${Number(ss)} ${plural(Number(ss), ['секунда', 'секунди', 'секунд'])}`}>
          {mm}:{ss}
        </div>
        <div className="n-progress" aria-hidden="true"><div style={{ width: `${Math.min(100, (elapsed / len) * 100)}%` }} /></div>
        <p className="n-sub">{Math.floor(elapsed / 60000)} хв {Math.floor((elapsed % 60000) / 1000)} с минуло · {nextLabel}</p>
        <div className="n-sessions" aria-label={`Сесії: ${timer.session - (isBreak ? 0 : 1)} з ${timer.total} завершено`}>
          {Array.from({ length: timer.total }, (_, i) => {
            const n = i + 1;
            const doneS = n < timer.session || (n === timer.session && isBreak);
            return <span key={i} className={`n-dot${doneS ? ' on' : n === timer.session ? ' now' : ''}`} />;
          })}
        </div>
        <div className="n-ctl">
          <button type="button" className="n-action" onClick={startOrPause}><NIcon name={timer.running ? 'pause' : 'play'} size={14} strokeWidth={2} />{playLabel}</button>
          <button type="button" className="n-btn" onClick={resetPhase}><NIcon name="reset" size={16} />Скинути</button>
          <button type="button" className="n-btn" onClick={() => { if (advance(false) === 'finished') setFinished({ blockId: timer.blockId, title: timer.title }); }}>
            <NIcon name="skip" size={16} />{isBreak ? 'Пропустити перерву' : 'До перерви'}
          </button>
        </div>
      </>
    );
  }

  return (
    <NotesShell folder="focus" title="Фокус" list={list}>
      <DateStamp />
      {body}
      <div className="n-li" style={{ marginTop: 18 }}>
        <Circle on={muted} label="Не турбувати нагадуваннями звичок під час фокусу" onClick={toggleNotif} />
        <span className="n-tx-static">Не турбувати нагадуваннями звичок під час фокусу</span>
      </div>
      <h2 className="n-h2">Сесії сьогодні</h2>
      {sessions.map((x) => (
        <div key={x.id} className={`n-li${x.completed ? ' done' : ''}`}>
          <span className={`n-mark${x.completed ? ' on' : ''}`} aria-hidden="true" />
          <span className="n-tm">{hhmm(new Date(x.startedAt).getHours() * 60 + new Date(x.startedAt).getMinutes())}</span>
          <span className="n-tx-static">{x.title}</span>
          <span className="n-meta">{x.minutes} хв{x.completed ? '' : ' · перервано'}</span>
        </div>
      ))}
      {!sessions.length && <p className="n-empty">Сьогодні ще не було сесій.</p>}
      <h2 className="n-h2">Фокус по днях</h2>
      <WeekFocusChart />
    </NotesShell>
  );
}
