import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

const PUBLIC_FILES = [
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

const swSource = (version: string, files: string[]) => `const CACHE = 'xplans-${version}';
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// The previous version's files stay one update longer: a page opened just before the update
// may still ask for them after this worker takes over.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => keys.filter((k) => k.startsWith('xplans-') && k !== CACHE).slice(0, -1))
      .then((old) => Promise.all(old.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const mine = caches.open(CACHE);
  if (req.mode === 'navigate') {
    // The page always comes from this version.
    const page = new URL('./', self.location.href).href;
    e.respondWith(mine.then((c) => c.match(page)).then((hit) => hit || fetch(req)));
    return;
  }
  // This version first; hashed files from the previous one are still right for an older page.
  // Vary is ignored: a module script asks with an Origin header the stored copy never had.
  const opts = { ignoreVary: true };
  e.respondWith(
    mine
      .then((c) => c.match(req, opts))
      .then((hit) => hit || caches.match(req, opts))
      .then((hit) => hit || fetch(req)),
  );
});
`;

/** Writes sw.js that precaches the whole build, so the app opens without a network. */
function serviceWorker(): Plugin {
  return {
    name: 'xplans-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => f !== 'index.html' && !f.endsWith('.map') && !f.endsWith('.woff'))
        .filter((f) => !f.endsWith('.woff2') || /-(cyrillic|latin)/.test(f))
        .sort();
      const html = bundle['index.html'];
      const page = html && html.type === 'asset' ? String(html.source) : '';
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: swSource(hash(files.join('|') + page), ['./', ...files, ...PUBLIC_FILES]),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [preact(), serviceWorker()],
  build: { target: 'es2022' },
});
