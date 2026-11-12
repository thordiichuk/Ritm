import type { ReactElement, SVGProps } from 'react';

type Name =
  | 'clock' | 'flame' | 'plus' | 'stats' | 'stats-axis' | 'calendar' | 'target' | 'note'
  | 'chev-left' | 'chev-right' | 'chev-down' | 'check' | 'pause' | 'play' | 'reset' | 'skip' | 'close' | 'trash' | 'gear' | 'download' | 'upload';

const PATHS: Record<Name, ReactElement> = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-6 2 1 3 2 3 4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  stats: <path d="M4 20V10M10 20V4M16 20v-7" />,
  'stats-axis': <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></>,
  note: <><path d="M5 3h10l4 4v14H5z" /><path d="M9 12h6M9 16h6" /></>,
  'chev-left': <path d="M15 18l-6-6 6-6" />,
  'chev-right': <path d="M9 18l6-6-6-6" />,
  'chev-down': <path d="M6 9l6 6 6-6" />,
  check: <path d="M4 12l5 5L20 6" />,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1.5" stroke="none" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1.5" stroke="none" fill="currentColor" /></>,
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  reset: <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" />,
  skip: <path d="M5 5l10 7-10 7zM19 5v14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
};

export function Icon({ name, size = 22, stroke = 2.2, ...rest }: { name: Name; size?: number; stroke?: number } & Omit<SVGProps<SVGSVGElement>, 'stroke'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
