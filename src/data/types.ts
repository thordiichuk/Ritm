export type ISODate = string; // 'YYYY-MM-DD'

export type Category = 'work' | 'health' | 'study' | 'personal' | 'errands';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Block {
  id: string;
  date: ISODate;
  /** хвилини від початку доби */
  start: number;
  end: number;
  title: string;
  category: Category;
  done: boolean;
  subtasks: Subtask[];
  note?: string;
}

export type TaskLocation = 'inbox' | 'someday';

export interface Task {
  id: string;
  title: string;
  minutes: number;
  done: boolean;
  location: TaskLocation;
  createdAt: number;
}

export type HabitColor = 'peach' | 'mint' | 'sky' | 'lilac' | 'lime';

export interface HabitEntry {
  done: boolean;
  at?: string; // 'HH:MM'
  value?: number;
}

export interface Habit {
  id: string;
  name: string;
  color: HabitColor;
  kind: 'check' | 'count';
  target?: number;
  unit?: string;
  reminder?: string; // 'HH:MM'
  log: Record<ISODate, HabitEntry>;
  createdAt: ISODate;
}

export interface FocusSession {
  id: string;
  date: ISODate;
  blockId?: string;
  title: string;
  startedAt: number;
  minutes: number;
  completed: boolean;
}

export interface FocusTimer {
  blockId?: string;
  title: string;
  /** 1-based номер робочої сесії */
  session: number;
  total: number;
  phase: 'work' | 'break';
  running: boolean;
  /** коли закінчиться поточна фаза (ms epoch), якщо running */
  endsAt?: number;
  /** залишок, якщо на паузі */
  remainingMs: number;
  workMin: number;
  breakMin: number;
  phaseStartedAt?: number;
}

export interface Top3Item {
  id: string;
  title: string;
  done: boolean;
}

export interface EnergyMark {
  at: string; // 'HH:MM'
  level: number; // 1..5
}

export interface DayMeta {
  top3: Top3Item[];
  /** склянки по 250 мл */
  water: number;
  energy: EnergyMark[];
  note: string;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface DayReview {
  mood?: Mood;
  win: string;
  closedAt?: number;
  /** id блоків, з якими вже щось зробили в підсумку */
  handled: Record<string, 'tomorrow' | 'inbox'>;
}

export interface TemplateBlock {
  start: number;
  end: number;
  title: string;
  category: Category;
}

export interface Settings {
  dayStart: number; // година
  dayEnd: number; // година (не включно)
  waterGoal: number; // склянок
  focusGoalHours: number; // на тиждень
  workMin: number;
  breakMin: number;
  notifications: boolean;
  /** глушити нагадування, поки йде фокус-сесія */
  focusMute: boolean;
  reviewAt: string; // 'HH:MM'
}

export interface AppState {
  version: 1;
  blocks: Block[];
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  timer: FocusTimer | null;
  days: Record<ISODate, DayMeta>;
  reviews: Record<ISODate, DayReview>;
  template: TemplateBlock[] | null;
  settings: Settings;
}
