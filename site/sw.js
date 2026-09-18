const VERSION = '__BUILD__';
const CACHE = `pocket-skipper-${VERSION}`;

// ASSETS:start
const ASSETS = [
  "./",
  "content/checklists.json",
  "content/external.json",
  "content/guides.json",
  "content/maneuvers.json",
  "content/questions.json",
  "content/reference.json",
  "content/situations.json",
  "content/vhf.json",
  "css/app.css",
  "css/fonts.css",
  "css/tokens.css",
  "fonts/OFL.md",
  "fonts/jetbrains-mono-cyrillic.woff2",
  "fonts/jetbrains-mono-latin.woff2",
  "fonts/onest-cyrillic.woff2",
  "fonts/onest-latin.woff2",
  "fonts/oswald-cyrillic.woff2",
  "fonts/oswald-latin.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "index.html",
  "js/app.js",
  "js/calls.js",
  "js/checks.js",
  "js/content.js",
  "js/dates.js",
  "js/diagrams/boat.js",
  "js/diagrams/encounter.js",
  "js/diagrams/index.js",
  "js/diagrams/lights.js",
  "js/diagrams/marks.js",
  "js/diagrams/scene.js",
  "js/diagrams/svg.js",
  "js/leitner.js",
  "js/plural.js",
  "js/pwa.js",
  "js/quiz/exam.js",
  "js/quiz/question.js",
  "js/quiz/runner.js",
  "js/quiz/summary.js",
  "js/random.js",
  "js/router.js",
  "js/routes.js",
  "js/sources.js",
  "js/storage.js",
  "js/template.js",
  "js/ui.js",
  "js/views/checklist-ui.js",
  "js/views/checklists.js",
  "js/views/external.js",
  "js/views/guides.js",
  "js/views/maneuvers.js",
  "js/views/more.js",
  "js/views/reference.js",
  "js/views/settings.js",
  "js/views/situations.js",
  "js/views/tests.js",
  "js/views/today.js",
  "js/views/vhf.js",
  "manifest.webmanifest"
];
// ASSETS:end

self.addEventListener('install', (event) => {
  // GitHub Pages отдаёт Cache-Control: max-age=600, поэтому простой addAll(ASSETS) может
  // положить в новый кеш устаревшие файлы из HTTP-кеша. Обходим это параметром версии
  // в запросе и { cache: 'reload' }; обработчик fetch ищет с ignoreSearch и всё равно
  // отдаёт эти записи на обычные запросы страниц без параметров.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(
      ASSETS.map((url) => new Request(`${url}${url.includes('?') ? '&' : '?'}v=${VERSION}`, { cache: 'reload' })),
    )),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('pocket-skipper-') && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)),
  );
});
