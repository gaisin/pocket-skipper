import { loadContent } from './content.js';
import { createStore } from './storage.js';
import { matchRoute } from './router.js';
import { routes } from './routes.js';
import { h, notFound } from './ui.js';
import { registerServiceWorker } from './pwa.js';

const main = document.getElementById('view');
const notice = document.getElementById('notice');

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function showNotice(text) {
  notice.replaceChildren(text);
  notice.hidden = false;
}

async function start() {
  const store = createStore(safeLocalStorage());
  if (!store.persistent) showNotice('Браузер не даёт сохранять прогресс: он пропадёт после закрытия приложения.');
  else if (store.recovered) showNotice('Сохранённый прогресс оказался повреждён, начали заново. Можно загрузить копию из файла в настройках.');

  const content = await loadContent();
  const ctx = { content, store, rerender: render };

  function render({ moveFocus = false } = {}) {
    const hash = location.hash || '#/today';
    const { view, params, tab } = matchRoute(hash, routes);
    for (const link of document.querySelectorAll('.tabbar a')) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(view ? view(ctx, ...params) : notFound());
    const heading = main.querySelector('h1')?.textContent.trim();
    document.title = heading ? `${heading} - Карманный шкипер` : 'Карманный шкипер';
    window.scrollTo(0, 0);
    if (moveFocus) main.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', () => render({ moveFocus: true }));
  render();
}

start().catch((err) => {
  console.error(err);
  main.replaceChildren(h('section', { class: 'view' },
    h('h1', {}, 'Приложение не запустилось'),
    h('p', {}, err.message),
    h('p', { class: 'lead' }, 'Проверьте интернет и нажмите любую вкладку, чтобы попробовать снова.')));
  window.addEventListener('hashchange', () => location.reload(), { once: true });
});

registerServiceWorker(document.getElementById('banner'));
