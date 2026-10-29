import { useEffect, useState } from 'preact/hooks';

export type RootsTab = 'tree' | 'ready' | 'aces';

export type Route =
  | { name: 'today' }
  | { name: 'roots'; tab: RootsTab }
  | { name: 'memory' }
  | { name: 'switch'; lineId?: string }
  | { name: 'whatif'; parentId?: string; riskId?: string; activate: boolean }
  | { name: 'low' };

interface Entry {
  /** How many in-app entries sit behind this one. */
  xp?: number;
  overlay?: boolean;
}

const TABS: RootsTab[] = ['tree', 'ready', 'aces'];
const subs = new Set<() => void>();
let lastRootsTab: RootsTab = 'tree';

const entry = (): Entry => (history.state as Entry | null) ?? {};
const depth = () => entry().xp ?? 0;
const notify = () => subs.forEach((f) => f());

export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#\/?/, '').split('?');
  const q = new URLSearchParams(query);
  const [head, sub] = path.split('/');
  const param = (k: string) => q.get(k) ?? undefined;
  switch (head) {
    case 'roots':
      return { name: 'roots', tab: TABS.includes(sub as RootsTab) ? (sub as RootsTab) : lastRootsTab };
    case 'memory':
      return { name: 'memory' };
    case 'switch':
      return { name: 'switch', lineId: param('line') };
    case 'whatif':
      return { name: 'whatif', parentId: param('parent'), riskId: param('risk'), activate: q.has('activate') };
    case 'low':
      return { name: 'low' };
    default:
      return { name: 'today' };
  }
}

/** Tabs replace the current entry; flows push one, so the back gesture leaves them. */
export function go(hash: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState({ xp: depth() }, '', hash);
  else history.pushState({ xp: depth() + 1 }, '', hash);
  notify();
}

export function back(fallback = '#/today') {
  if (depth() > 0) history.back();
  else go(fallback, { replace: true });
}

export const rootsHref = () => `#/roots/${lastRootsTab}`;

export function rememberRootsTab(tab: RootsTab) {
  lastRootsTab = tab;
}

export function initRouter() {
  // A sheet that was open before a reload is gone now.
  if (entry().overlay) history.replaceState({ xp: depth() }, '', location.href);
  addEventListener('popstate', notify);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.hash));
    subs.add(update);
    return () => {
      subs.delete(update);
    };
  }, []);
  return route;
}

/** Adds a history entry for a sheet, so the phone's back gesture closes it instead of the app. */
export function pushOverlay(onBack: () => void) {
  history.pushState({ xp: depth() + 1, overlay: true }, '', location.href);
  let open = true;
  const onPop = () => {
    if (!open) return;
    open = false;
    removeEventListener('popstate', onPop);
    onBack();
  };
  addEventListener('popstate', onPop);
  return {
    /** Resolves once the entry is gone, so a navigation can follow safely. */
    close: () =>
      new Promise<void>((resolve) => {
        if (!open) return resolve();
        const done = () => {
          removeEventListener('popstate', done);
          resolve();
        };
        addEventListener('popstate', done);
        history.back();
      }),
    dispose: () => {
      if (!open) return;
      open = false;
      removeEventListener('popstate', onPop);
    },
  };
}
