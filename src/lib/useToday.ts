import { useEffect, useState } from 'preact/hooks';
import type { DayKey } from '../store/model';
import { dayKey } from './dates';

/** Today's key, refreshed when the app comes back to the foreground or the day turns over. */
export function useToday(): DayKey {
  const [day, setDay] = useState(dayKey);
  useEffect(() => {
    const check = () => setDay(dayKey());
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return day;
}
