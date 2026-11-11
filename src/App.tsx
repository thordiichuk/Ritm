import { useLocation } from './lib/router';
import { TodayScreen } from './screens/Today';
import { HabitsScreen } from './screens/Habits';
import { FocusScreen } from './screens/Focus';
import { ReviewScreen } from './screens/Review';
import { ToastHost } from './components/ui/Modal';
import { useBackgroundTicker } from './lib/ticker';

export function App() {
  const { route } = useLocation();
  useBackgroundTicker();
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
    default:
      screen = <TodayScreen />;
  }
  return (
    <>
      {screen}
      <ToastHost />
    </>
  );
}
