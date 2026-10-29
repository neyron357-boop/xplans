import { useState } from 'preact/hooks';
import { isIos, isStandalone, useInstall } from '../lib/install';

const KEY = 'xplans:install-hint';

function dismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === 'off';
  } catch {
    return false;
  }
}

/** Shown in the browser until the app is on the home screen. */
export function InstallHint() {
  const install = useInstall();
  const [hidden, setHidden] = useState(() => isStandalone() || dismissed());
  if (hidden) return null;

  const hide = () => {
    try {
      localStorage.setItem(KEY, 'off');
    } catch {
      // Private mode; hide for this visit only.
    }
    setHidden(true);
  };
  const how = install
    ? 'Откроется как приложение и работает без сети.'
    : isIos()
      ? 'Safari: «Поделиться» → «На экран Домой».'
      : 'Меню браузера → «Установить приложение».';

  return (
    <div class="card hint">
      <div class="grow stack-4">
        <span>Поставь на главный экран</span>
        <span class="small muted">{how}</span>
      </div>
      {install && (
        <button type="button" class="btn btn--quiet btn--sm" onClick={() => void install()}>
          Установить
        </button>
      )}
      <button type="button" class="icon-btn" aria-label="Скрыть" onClick={hide}>
        ×
      </button>
    </div>
  );
}
