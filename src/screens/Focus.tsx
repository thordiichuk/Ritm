import { useEffect, useState } from 'react';
import { getState, update, useStore } from '../data/store';
import { blocksOn } from '../data/selectors';
import { toggleBlock } from '../data/actions';
import { advance, ensureTimer, fmtClock, phaseLength, resetPhase, startOrPause, stopTimer, timerRemaining } from '../components/focus/timer';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/Modal';
import { back, navigate, useLocation } from '../lib/router';
import { useNow } from '../lib/hooks';
import { nowMinutes, todayISO } from '../lib/date';

export function FocusScreen() {
  const { params } = useLocation();
  const blockParam = params.get('block');
  const timer = useStore((s) => s.timer);
  const muted = useStore((s) => s.settings.focusMute);
  const [finished, setFinished] = useState<{ blockId?: string; title: string } | null>(null);
  const now = useNow(250);

  // Підготувати таймер: блок з адреси → поточний блок → вільний фокус
  useEffect(() => {
    const s = getState();
    if (s.timer?.running) return;
    let id = blockParam;
    if (!id && !s.timer) {
      const m = nowMinutes();
      id = blocksOn(s, todayISO()).find((b) => b.start <= m && b.end > m && !b.done)?.id ?? null;
    }
    if (id && !s.blocks.some((b) => b.id === id)) id = null;
    if (s.timer && id && s.timer.blockId !== id) stopTimer();
    if (!getState().timer) ensureTimer(id);
  }, [blockParam]);

  // Помітити завершення, коли «пульс» прибрав таймер після останньої сесії
  const [last, setLast] = useState(timer);
  useEffect(() => {
    if (last && !timer && last.phase === 'work' && last.session >= last.total) setFinished({ blockId: last.blockId, title: last.title });
    setLast(timer);
  }, [timer]);

  const remaining = timer ? timerRemaining(timer, now.getTime()) : 0;
  useEffect(() => {
    document.title = timer ? `${fmtClock(remaining)} · ${timer.phase === 'work' ? 'Фокус' : 'Перерва'} · Ритм` : 'Ритм';
    return () => void (document.title = 'Ритм');
  }, [timer, Math.ceil(remaining / 1000)]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); startOrPause(); }
      if (e.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleNotif = () => update((d) => void (d.settings.focusMute = !d.settings.focusMute));
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
          aria-label={`Залишилось ${Number(clock[0])} хвилин ${Number(clock[1])} секунд`}>
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
