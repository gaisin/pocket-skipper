import { h, header } from '../ui.js';

export function externalView(ctx) {
  return h('section', { class: 'view' },
    header('Внешние тесты', '#/more'),
    h('p', { class: 'lead' }, 'Сторонние сайты: открываются только при подключении к интернету. Мы не отвечаем за их содержание.'),
    h('ul', { class: 'list' }, ctx.content.external.links.map((l) => h('li', {},
      h('a', { href: l.url, target: '_blank', rel: 'noopener' },
        h('span', {}, l.title, h('small', {}, l.note)),
        h('span', { class: 'meta' }, l.lang.toUpperCase()))))));
}
