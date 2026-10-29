import type { AppState } from './model';

// Everything lives on the phone: IndexedDB first, with a localStorage mirror.
// Each copy is stamped, and the newer one wins on load.

const DB_NAME = 'xplans';
const STORE = 'kv';
const KEY = 'state';
const MIRROR = 'xplans:state';

interface Saved {
  t: number;
  s: unknown;
}

let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = op(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function parse(raw: unknown): Saved | null {
  if (typeof raw !== 'string') return null;
  try {
    const v = JSON.parse(raw) as Saved;
    return v && typeof v.t === 'number' ? v : null;
  } catch {
    return null;
  }
}

export async function loadState(): Promise<unknown> {
  let fromDb: Saved | null = null;
  let fromMirror: Saved | null = null;
  try {
    fromDb = parse(await run('readonly', (s) => s.get(KEY)));
  } catch {
    // IndexedDB unavailable; the mirror still has the data.
  }
  try {
    fromMirror = parse(localStorage.getItem(MIRROR));
  } catch {
    // Storage blocked.
  }
  const newest = (fromDb?.t ?? -1) >= (fromMirror?.t ?? -1) ? fromDb : fromMirror;
  return newest?.s ?? null;
}

export async function saveState(state: AppState): Promise<void> {
  const raw = JSON.stringify({ t: Date.now(), s: state });
  try {
    localStorage.setItem(MIRROR, raw);
  } catch {
    // Quota or private mode; IndexedDB below still saves.
  }
  try {
    await run('readwrite', (s) => s.put(raw, KEY));
  } catch {
    // The mirror above holds this save.
  }
}

/** Asks the browser not to clear the data when the phone runs low on space. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not supported.
  }
}
