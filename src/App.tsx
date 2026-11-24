import { useEffect } from 'react';
import { useLocation } from './lib/router';
import { markWelcomed } from './lib/welcome';
import { TodayScreen } from './screens/Today';
import { HabitsScreen } from './screens/Habits';
import { FocusScreen } from './screens/Focus';
import { ReviewScreen } from './screens/Review';
import { StatsScreen } from './screens/Stats';
import { WeekScreen } from './screens/Week';
import { NotesScreen } from './screens/Notes';
import { WelcomeScreen } from './screens/Welcome';
import { LoginScreen } from './screens/Login';
import { ToastHost } from './components/ui/Modal';
import { useBackgroundTicker } from './lib/ticker';
import { AccountPrompts } from './components/account/Account';
import { useTheme } from './lib/theme';
import { NotesFocus, NotesHabits, NotesNotes, NotesStats, NotesToday, NotesWeek } from './themes/notes';

export function App() {
  const { route } = useLocation();
  // тема «Нотатки» має власну розкладку: ті самі дані й дії, інші презентаційні компоненти
  const notes = useTheme() === 'notes';
  useBackgroundTicker();
  useEffect(() => {
    if (route !== 'welcome' && route !== 'login') markWelcomed();
  }, [route]);
  let screen;
  switch (route) {
    case 'habits':
      screen = notes ? <NotesHabits /> : <HabitsScreen />;
      break;
    case 'focus':
      screen = notes ? <NotesFocus /> : <FocusScreen />;
      break;
    case 'review':
      screen = <ReviewScreen />;
      break;
    case 'stats':
      screen = notes ? <NotesStats /> : <StatsScreen />;
      break;
    case 'week':
      screen = notes ? <NotesWeek /> : <WeekScreen />;
      break;
    case 'notes':
      screen = notes ? <NotesNotes /> : <NotesScreen />;
      break;
    case 'welcome':
      screen = <WelcomeScreen />;
      break;
    case 'login':
      screen = <LoginScreen />;
      break;
    default:
      screen = notes ? <NotesToday /> : <TodayScreen />;
  }
  return (
    <>
      {screen}
      <AccountPrompts />
      <ToastHost />
    </>
  );
}
