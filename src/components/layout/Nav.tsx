import { Icon } from '../ui/Icon';
import { href, type Route } from '../../lib/router';
import { useStore } from '../../data/store';
import { BotanicalBlossom, BotanicalSprig } from '../flora/Botanical';

const RAIL: Array<{ route: Route; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { route: 'today', label: 'Сьогодні', icon: 'clock' },
  { route: 'week', label: 'Тиждень', icon: 'calendar' },
  { route: 'habits', label: 'Звички', icon: 'flame' },
  { route: 'focus', label: 'Фокус', icon: 'target' },
  { route: 'stats', label: 'Статистика', icon: 'stats-axis' },
];

export function Rail({ active }: { active: Route }) {
  const timerOn = useStore((s) => !!s.timer?.running);
  return (
    <nav className="rail" aria-label="Розділи">
      <a className="rail-logo" href={href('today')} aria-label="Ритм — на головну"><i /><BotanicalBlossom className="flora-logo" /></a>
      {RAIL.map((r) => (
        <a key={r.route} className={`ri${active === r.route ? ' on' : ''}`} href={href(r.route)} aria-label={r.label} title={r.label} aria-current={active === r.route ? 'page' : undefined}>
          <Icon name={r.icon} />
          {r.route === 'focus' && timerOn && active !== 'focus' && <span className="dot" />}
        </a>
      ))}
      <BotanicalSprig className="flora-rail" />
      <a className={`ri rail-bottom${active === 'notes' ? ' on' : ''}`} href={href('notes')} aria-label="Нотатки" title="Нотатки" style={{ marginTop: 'auto' }}>
        <Icon name="note" />
      </a>
    </nav>
  );
}

export function BottomNav({ active, onAdd }: { active: Route; onAdd?: () => void }) {
  const timerOn = useStore((s) => !!s.timer?.running);
  const item = (route: Route, label: string, icon: Parameters<typeof Icon>[0]['name']) => (
    <a className={`nb${active === route ? ' on' : ''}`} href={href(route)} aria-label={label} aria-current={active === route ? 'page' : undefined}>
      <Icon name={icon} />
      {route === 'focus' && timerOn && <span className="dot" />}
    </a>
  );
  return (
    <nav className="bnav" aria-label="Навігація">
      {item('today', 'Сьогодні', 'clock')}
      {item('habits', 'Звички', 'flame')}
      {onAdd ? (
        <button className="nb" aria-label="Додати" onClick={onAdd}>
          <Icon name="plus" stroke={2.4} />
        </button>
      ) : (
        item('focus', 'Фокус', 'target')
      )}
      {item('stats', 'Статистика', 'stats')}
    </nav>
  );
}
