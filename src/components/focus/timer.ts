import { getState, uid, update } from '../../data/store';
import type { FocusTimer } from '../../data/types';
import { pad, todayISO } from '../../lib/date';
import { sessionsInBlock, completedSessionsForBlock } from '../../data/selectors';

export function timerRemaining(t: FocusTimer, now = Date.now()): number {
  return t.running && t.endsAt ? Math.max(0, t.endsAt - now) : t.remainingMs;
}

export function phaseLength(t: FocusTimer): number {
  return (t.phase === 'work' ? t.workMin : t.breakMin) * 60000;
}

export function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Підготувати таймер для блоку (або вільний фокус), не запускаючи */
export function ensureTimer(blockId?: string | null): FocusTimer {
  const s = getState();
  if (s.timer && (!blockId || s.timer.blockId === blockId)) return s.timer;
  const b = blockId ? s.blocks.find((x) => x.id === blockId) : undefined;
  const total = b ? sessionsInBlock(b, s) : 4;
  const doneCount = b ? completedSessionsForBlock(s, b.id, b.date, b.title) : 0;
  const t: FocusTimer = {
    blockId: b?.id,
    title: b?.title ?? 'Вільний фокус',
    session: Math.min(total, doneCount + 1),
    total,
    phase: 'work',
    running: false,
    remainingMs: s.settings.workMin * 60000,
    workMin: s.settings.workMin,
    breakMin: s.settings.breakMin,
  };
  update((d) => void (d.timer = t));
  return t;
}

export function startOrPause() {
  update((d) => {
    const t = d.timer;
    if (!t) return;
    const now = Date.now();
    if (t.running) {
      t.remainingMs = timerRemaining(t, now);
      t.running = false;
      t.endsAt = undefined;
    } else {
      t.running = true;
      t.endsAt = now + t.remainingMs;
      if (t.remainingMs === phaseLength(t)) t.phaseStartedAt = now;
    }
  });
}

export function resetPhase() {
  update((d) => {
    const t = d.timer;
    if (!t) return;
    t.running = false;
    t.endsAt = undefined;
    t.remainingMs = phaseLength(t);
    t.phaseStartedAt = undefined;
  });
}

export function stopTimer() {
  update((d) => void (d.timer = null));
}

/** Перейти до наступної фази. completed=false — пропуск. */
export function advance(completed: boolean): 'break' | 'work' | 'finished' {
  let result: 'break' | 'work' | 'finished' = 'break';
  update((d) => {
    const t = d.timer;
    if (!t) return;
    const now = Date.now();
    if (t.phase === 'work') {
      const elapsedMs = phaseLength(t) - timerRemaining(t, now);
      const minutes = completed ? t.workMin : Math.round(elapsedMs / 60000);
      if (minutes > 0) {
        d.sessions.push({
          id: uid(),
          date: todayISO(),
          blockId: t.blockId,
          title: t.title,
          startedAt: t.phaseStartedAt ?? now - elapsedMs,
          minutes,
          completed,
        });
      }
      if (t.session >= t.total) {
        d.timer = null;
        result = 'finished';
        return;
      }
      t.phase = 'break';
      t.remainingMs = t.breakMin * 60000;
      // перерва стартує одразу, якщо таймер ішов
      t.endsAt = t.running ? now + t.remainingMs : undefined;
      t.phaseStartedAt = t.running ? now : undefined;
      result = 'break';
    } else {
      t.phase = 'work';
      t.session += 1;
      t.remainingMs = t.workMin * 60000;
      t.running = false;
      t.endsAt = undefined;
      t.phaseStartedAt = undefined;
      result = 'work';
    }
  });
  return result;
}

// ---------- Сигнал ----------
let audio: AudioContext | null = null;
export function chime() {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    [0, 0.22, 0.44].forEach((delay, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [660, 880, 990][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.4);
    });
  } catch {
    /* звук недоступний */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: undefined, tag: 'ritm' });
  } catch {
    /* напр. Android Chrome без service worker */
  }
}
