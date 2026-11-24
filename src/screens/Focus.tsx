import { getState } from '../data/store';
import { toggleBlock } from '../data/actions';
import { advance, ensureTimer, fmtClock, phaseLength, resetPhase, startOrPause } from '../components/focus/timer';
import { useFocus } from '../components/focus/useFocus';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/Modal';
import { back, navigate, useLocation } from '../lib/router';
import { plural } from '../lib/date';

export function FocusScreen() {
  const { params } = useLocation();
  const { timer, muted, finished, setFinished, remaining, toggleNotif } = useFocus(params.get('block'));

  const header = (
    <header className="fx-head">
      <button className="fx-round" aria-label="Згорнути" onClick={() => back()}><Icon name="chev-down" size={20} stroke={2.6} /></button>
      <button className={`fx-badge${muted ? '' : ' off'}`} onClick={toggleNotif} aria-pressed={muted}
        title={muted ? 'Нагадування звичок не турбуватимуть під час фокусу' : 'Нагадування приходитимуть і під час фокусу'}>
        {muted ? 'Сповіщення вимкнено' : 'Сповіщення увімкнено'}
      </button>
    </header>
  );

  if (finished || !timer) {
    const block = finished?.blockId ? getState().blocks.find((b) => b.id === finished.blockId) : undefined;
    return (
      <div className="fx">
        <div className="fx-inner">
          {header}
          <p className="fx-k">Фокус завершено</p>
          <h1 className="fx-title">{finished?.title ?? 'Готові до наступної сесії?'}</h1>
          <div className="disp fx-clock" style={{ fontSize: 120 }}>✓</div>
          <div className="fx-ctl">
            {block && !block.done && (
              <button className="fx-main" onClick={() => { toggleBlock(block.id); toast('Блок позначено готовим'); navigate('today'); }}>Позначити блок готовим</button>
            )}
            <button className={block && !block.done ? 'fx-round fx-lg' : 'fx-main'} aria-label="Нова сесія"
              onClick={() => { setFinished(null); ensureTimer(null); }}>
              {block && !block.done ? <Icon name="reset" stroke={2.4} /> : 'Нова сесія'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const len = phaseLength(timer);
  const elapsed = len - remaining;
  const progress = Math.min(1, elapsed / len);
  const clock = fmtClock(remaining).split(':');
  const isBreak = timer.phase === 'break';
  const elapsedLabel = `${Math.floor(elapsed / 60000)} хв ${Math.floor((elapsed % 60000) / 1000)} с минуло`;
  const nextLabel = isBreak
    ? `далі сесія ${timer.session + 1} з ${timer.total}`
    : timer.session >= timer.total ? 'далі — кінець блоку' : `далі перерва ${timer.breakMin} хв`;
  const playLabel = timer.running ? 'Пауза' : elapsed > 0 ? 'Продовжити' : isBreak ? 'Почати перерву' : 'Старт';

  return (
    <div className={`fx${isBreak ? ' break' : ''}`}>
      <div className="fx-inner">
        {header}
        <p className="fx-k">{isBreak ? `Перерва · після сесії ${timer.session} з ${timer.total}` : `Фокус · сесія ${timer.session} з ${timer.total}`}</p>
        <h1 className="fx-title">{isBreak ? 'Встаньте, розімніться, попийте води' : timer.title}</h1>

        <div className="disp fx-clock" role="timer" aria-live="off"
          aria-label={`Залишилось ${Number(clock[0])} ${plural(Number(clock[0]), ['хвилина', 'хвилини', 'хвилин'])} ${Number(clock[1])} ${plural(Number(clock[1]), ['секунда', 'секунди', 'секунд'])}`}>
          {clock[0]}<br />{clock[1]}
        </div>

        <div className="fx-seg" aria-hidden="true">
          {Array.from({ length: timer.total }, (_, i) => {
            const n = i + 1;
            const fill = n < timer.session || (n === timer.session && isBreak) ? 1 : n === timer.session ? progress : 0;
            const pct = `${Math.round(fill * 100)}%`;
            return <span key={i} style={{ background: `linear-gradient(90deg, var(--fx-fg) ${pct}, var(--fx-track) ${pct})` }} />;
          })}
        </div>
        <p className="fx-meta">{elapsedLabel} · {nextLabel}</p>

        <div className="fx-ctl">
          <button className="fx-round fx-lg" aria-label="Скинути" title="Почати фазу заново" onClick={resetPhase}><Icon name="reset" stroke={2.4} /></button>
          <button className="fx-main" onClick={startOrPause}>
            <Icon name={timer.running ? 'pause' : 'play'} size={20} />{playLabel}
          </button>
          <button className="fx-round fx-lg" aria-label={isBreak ? 'Пропустити перерву' : 'Пропустити до перерви'}
            onClick={() => {
              const r = advance(false);
              if (r === 'finished') setFinished({ blockId: timer.blockId, title: timer.title });
            }}>
            <Icon name="skip" stroke={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
