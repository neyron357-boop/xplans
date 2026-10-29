import { useEffect, useState } from 'preact/hooks';
import type { AppState } from './model';
import { saveState } from './db';

let state: AppState;
let timer: number | undefined;
const subs = new Set<() => void>();

export function initStore(s: AppState) {
  state = s;
}

export function getState(): AppState {
  return state;
}

export function useStore(): AppState {
  const [, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return state;
}

/** Changes the state through a draft copy, then saves shortly after. */
export function commit(mutate: (draft: AppState) => void) {
  const draft = structuredClone(state);
  mutate(draft);
  state = draft;
  subs.forEach((f) => f());
  clearTimeout(timer);
  timer = window.setTimeout(flush, 300);
}

export function replaceState(next: AppState) {
  state = next;
  subs.forEach((f) => f());
  flush();
}

export function flush() {
  clearTimeout(timer);
  timer = undefined;
  void saveState(state);
}

const flushPending = () => {
  if (timer !== undefined) flush();
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPending();
});
addEventListener('pagehide', flushPending);
