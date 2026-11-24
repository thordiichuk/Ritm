import { useStore } from '../../data/store';
import { addDays, cap, dayMonth, todayISO, weekdayName } from '../../lib/date';
import { href } from '../../lib/router';
import { NotesSections } from '../../screens/Notes';
import { NotesShell, type ListSpec } from './Shell';
import { DateStamp } from './parts';

/** «Нотатки»: нотатка дня й налаштування — той самий вміст, що й у звичайній темі, на аркуші */
export function NotesNotes() {
  const days = useStore((s) => s.days);
  const today = todayISO();
  const withNotes = Object.keys(days).filter((d) => days[d].note.trim() && d !== today).sort().reverse().slice(0, 12);
  const list: ListSpec = {
    title: 'Нотатки',
    sections: [{
      label: 'Нещодавні',
      items: [
        { key: today, title: `${cap(weekdayName(today))}, ${dayMonth(today)}`, sub: days[today]?.note.trim().split('\n')[0] || 'ще порожньо', on: true, href: href('notes') },
        ...withNotes.map((d) => ({
          key: d, title: `${cap(weekdayName(d))}, ${dayMonth(d)}`,
          sub: `${d === addDays(today, -1) ? 'Вчора · ' : ''}${days[d].note.trim().split('\n')[0]}`,
          href: href('today', { d, s: 'note' }),
        })),
      ],
    }],
  };
  return (
    <NotesShell folder="notes" title="Нотатки" list={list}>
      <DateStamp />
      <h1 className="n-h1">Нотатки</h1>
      <div className="n-sections">
        <NotesSections />
      </div>
    </NotesShell>
  );
}
