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

export function App() {
  const { route } = useLocation();
  useBackgroundTicker();
  useEffect(() => {
    if (route !== 'welcome' && route !== 'login') markWelcomed();
  }, [route]);
  let screen;
  switch (route) {
    case 'habits':
      screen = <HabitsScreen />;
      break;
    case 'focus':
      screen = <FocusScreen />;
      break;
    case 'review':
      screen = <ReviewScreen />;
      break;
    case 'stats':
      screen = <StatsScreen />;
      break;
    case 'week':
      screen = <WeekScreen />;
      break;
    case 'notes':
      screen = <NotesScreen />;
      break;
    case 'welcome':
      screen = <WelcomeScreen />;
      break;
    case 'login':
      screen = <LoginScreen />;
      break;
    default:
      screen = <TodayScreen />;
  }
  return (
    <>
      {screen}
      <AccountPrompts />
      <ToastHost />
    </>
  );
}
