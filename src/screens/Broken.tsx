import { dayKey } from '../lib/dates';
import { seed } from '../store/seed';
import { flush, initStore } from '../store/store';

/** Saved data that cannot be read. Nothing is overwritten until the user decides. */
export function Broken({ raw }: { raw: unknown }) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xplans-raw.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const fresh = () => {
    initStore(seed(dayKey()));
    flush();
    location.reload();
  };
  return (
    <div class="app">
      <main class="screen">
        <h1 class="title">Данные не читаются.</h1>
        <p class="muted">Ничего не удалено. Сохрани файл, потом можно начать заново.</p>
        <button type="button" class="btn btn--quiet" onClick={save}>
          Сохранить файл
        </button>
        <button type="button" class="btn" onClick={fresh}>
          Начать заново
        </button>
      </main>
    </div>
  );
}
