import { loadContent } from './content.js';
import { createStore } from './storage.js';
import { matchRoute } from './router.js';
import { routes } from './routes.js';
import { h, notFound } from './ui.js';
import { registerServiceWorker, isIosStandalone } from './pwa.js';

// Класс включает обход ошибки WebKit с таб-баром в приложении на iOS (см. app.css).
document.documentElement.classList.toggle('ios-standalone', isIosStandalone());

const main = document.getElementById('view');
const notice = document.getElementById('notice');
const banner = document.getElementById('banner');

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Длительность подсветки раздела - как у анимации .flash в app.css.
const FLASH_MS = 1800;

// Плашки обновления и предупреждения прилипают к верху экрана. Их высота уходит в
// scroll-margin-top раздела (app.css), чтобы прокрутка не спрятала раздел под ними.
function syncStickyBars() {
  const height = Math.max(0, ...[banner, notice].map((bar) => (bar.hidden ? 0 : bar.getBoundingClientRect().height)));
  document.documentElement.style.setProperty('--sticky-bars', `${Math.ceil(height)}px`);
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
    const { view, params, tab, query } = matchRoute(hash, routes);
    for (const link of document.querySelectorAll('.tabbar a')) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(view ? view({ ...ctx, query }, ...params) : notFound());
    const heading = main.querySelector('h1')?.textContent.trim();
    document.title = heading ? `${heading} - Карманный шкипер` : 'Карманный шкипер';
    const target = main.querySelector('[data-scroll-target]');
    if (target) showTarget(target);
    else {
      window.scrollTo(0, 0);
      if (moveFocus) main.focus({ preventScroll: true });
    }
  }

  // Экран открыт ссылкой на свой раздел: прокрутить к нему, подсветить и перенести фокус на заголовок.
  function showTarget(target) {
    syncStickyBars();
    target.scrollIntoView({ block: 'start' });
    const scrolledTo = window.scrollY;
    target.classList.add('flash');
    // При prefers-reduced-motion анимации нет и animationend не придёт - снимаем подсветку по таймеру.
    const unflash = () => target.classList.remove('flash');
    target.addEventListener('animationend', unflash, { once: true });
    setTimeout(unflash, FLASH_MS);
    (target.querySelector('[tabindex="-1"]') ?? main).focus({ preventScroll: true });
    // Шрифты догружаются и меняют высоту текста выше раздела - поправить прокрутку, если её никто не трогал.
    document.fonts?.ready.then(() => {
      if (target.isConnected && window.scrollY === scrolledTo) target.scrollIntoView({ block: 'start' });
    });
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

registerServiceWorker(banner);
