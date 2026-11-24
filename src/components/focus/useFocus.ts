import { useEffect, useState } from 'react';
import { getState, update, useStore } from '../../data/store';
import { blocksOn } from '../../data/selectors';
import { ensureTimer, fmtClock, startOrPause, stopTimer, timerRemaining } from './timer';
import { back } from '../../lib/router';
import { useNow } from '../../lib/hooks';
import { nowMinutes, todayISO } from '../../lib/date';

export interface Finished {
  blockId?: string;
  title: string;
}

/**
 * Уся поведінка фокус-екрана, спільна для всіх тем: підготувати таймер для блоку з адреси
 * (або поточного блоку), помітити завершення, заголовок вкладки, пробіл — старт/пауза, Esc — назад.
 */
export function useFocus(blockParam: string | null) {
  const timer = useStore((s) => s.timer);
  const muted = useStore((s) => s.settings.focusMute);
  const [finished, setFinished] = useState<Finished | null>(null);
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
  return { timer, muted, finished, setFinished, now, remaining, toggleNotif };
}
