import { formatSource } from './sources.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export function header(title, backHref) {
  return h('header', { class: 'view-head' },
    backHref ? h('a', { class: 'back', href: backHref }, '‹ Назад') : null,
    h('h1', {}, title));
}

export function sourceFooter(record) {
  return h('footer', { class: 'sources' },
    'Источник: ',
    record.sources.map((src, i) => [
      i > 0 ? ' · ' : null,
      src.type === 'web' ? h('a', { href: src.url, target: '_blank', rel: 'noopener' }, formatSource(src)) : formatSource(src),
    ]),
    record.verified ? null : h('span', { class: 'badge-unverified' }, 'не сверено'));
}

export function notFound() {
  return h('section', { class: 'view' },
    header('Не найдено'),
    h('p', {}, 'Такой страницы нет.'),
    h('a', { class: 'button', href: '#/today' }, 'На главную'));
}

export function table(headings, rows) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, headings.map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((cells) => h('tr', {}, cells.map((c) => h('td', {}, c)))))));
}
