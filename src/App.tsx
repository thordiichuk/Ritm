import { useLocation } from './lib/router';
import { TodayScreen } from './screens/Today';
import { ToastHost } from './components/ui/Modal';
import { useBackgroundTicker } from './lib/ticker';

export function App() {
  const { route } = useLocation();
  useBackgroundTicker();
  let screen;
  switch (route) {
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
