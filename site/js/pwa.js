import { h } from './ui.js';

export function registerServiceWorker(banner) {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let userRequested = false;

  function offer(worker) {
    banner.replaceChildren(
      'Доступна новая версия. ',
      h('button', {
        type: 'button',
        class: 'button primary small',
        onclick: () => {
          userRequested = true;
          worker.postMessage('skip-waiting');
        },
      }, 'Обновить'));
    banner.hidden = false;
  }

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    if (registration.waiting && hadController) offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      // Без сети проверка обновления падает - это нормально, приложение работает из кеша.
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  }).catch((err) => console.error('Service worker не зарегистрирован', err));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!userRequested || reloading) return;
    reloading = true;
    location.reload();
  });
}
