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

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('xplans-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? new URL('./', self.location.href).href : req;
  e.respondWith(caches.match(key).then((hit) => hit || fetch(req)));
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
