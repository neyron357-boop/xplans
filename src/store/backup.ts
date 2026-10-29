import type { AppState } from './model';
import { dayKey } from '../lib/dates';

/** Hands the user a file with everything: the share sheet on a phone, a download elsewhere. */
export async function shareBackup(state: AppState): Promise<boolean> {
  const name = `xplans-${dayKey()}.json`;
  const text = JSON.stringify({ app: 'xplans', savedAt: new Date().toISOString(), state }, null, 2);
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'XPlans · копия' });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export async function readBackup(file: File): Promise<unknown> {
  const data: unknown = JSON.parse(await file.text());
  return data && typeof data === 'object' && 'state' in data ? data.state : data;
}
