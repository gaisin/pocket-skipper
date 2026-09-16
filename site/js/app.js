import { loadContent } from './content.js';
import { createStore } from './storage.js';
import { matchRoute } from './router.js';
import { routes } from './routes.js';
import { h, notFound } from './ui.js';

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

  function render() {
    const hash = location.hash || '#/today';
    const { view, params, tab } = matchRoute(hash, routes);
    for (const link of document.querySelectorAll('.tabbar a')) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(view ? view(ctx, ...params) : notFound());
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
}

start().catch((err) => {
  console.error(err);
  main.replaceChildren(h('section', { class: 'view' },
    h('h1', {}, 'Приложение не запустилось'),
    h('p', {}, err.message),
    h('p', { class: 'lead' }, 'Откройте приложение при подключении к интернету, чтобы оно загрузилось заново.')));
});
