import { useEffect, useState } from 'preact/hooks';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// Chrome offers installation once, early; keep the event until the user asks.
let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  notify();
});
addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Returns a function that shows the install dialog, when the browser offers one. */
export function useInstall(): (() => Promise<void>) | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  const e = deferred;
  if (!e) return null;
  return async () => {
    await e.prompt();
    await e.userChoice;
    deferred = null;
    notify();
  };
}
