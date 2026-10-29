import { render } from 'preact';
import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';
import { App } from './app';
import { dayKey } from './lib/dates';
import { initRouter } from './lib/router';
import { Broken } from './screens/Broken';
import { loadState, requestPersistence } from './store/db';
import { normalize } from './store/normalize';
import { seed } from './store/seed';
import { flush, initStore } from './store/store';

async function boot() {
  const root = document.getElementById('app')!;
  const raw = await loadState();
  if (raw) {
    try {
      initStore(normalize(raw));
    } catch {
      render(<Broken raw={raw} />, root);
      return;
    }
  } else {
    initStore(seed(dayKey()));
    flush();
  }
  initRouter();
  render(<App />, root);
  void requestPersistence();
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

void boot();
