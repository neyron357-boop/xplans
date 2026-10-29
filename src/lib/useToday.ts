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

const minuteOfDay = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutes since midnight, ticking once a minute. */
export function useMinute(): number {
  const [m, setM] = useState(minuteOfDay);
  useEffect(() => {
    const check = () => setM(minuteOfDay());
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return m;
}

/** Counts from 0 up to `value` once, then follows it. */
export function useCountUp(value: number | null, ms = 700): number | null {
  const [shown, setShown] = useState<number | null>(value === null ? null : 0);
  useEffect(() => {
    if (value === null) {
      setShown(null);
      return;
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const from = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - (1 - k) ** 3;
      setShown(Math.round(from + (value - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
