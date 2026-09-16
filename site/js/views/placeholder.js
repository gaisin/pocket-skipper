import { h, header } from '../ui.js';

export function placeholder(title, backHref) {
  return () => h('section', { class: 'view' }, header(title, backHref), h('p', { class: 'lead' }, 'Раздел в работе.'));
}
