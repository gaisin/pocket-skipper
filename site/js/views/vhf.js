import { h, header, sourceFooter, table } from '../ui.js';
import { fillTemplate, callValues } from '../template.js';

function body(section, values) {
  switch (section.kind) {
    case 'channels':
      return table(['Канал', 'Назначение'], section.rows.map((r) => [r.ch, r.use]));
    case 'call':
      return [
        h('p', { class: 'lead' }, section.when),
        h('ol', { class: 'script' }, section.lines.map((line) => h('li', {}, fillTemplate(line, values)))),
      ];
    case 'phonetic':
      return h('div', { class: 'phonetic' }, section.letters.map(([letter, word]) => h('span', {}, h('b', {}, letter), ` ${word}`)));
    case 'steps':
      return h('ol', { class: 'script' }, section.steps.map((s) => h('li', {}, s.text, s.note ? h('small', {}, ` - ${s.note}`) : null)));
    default:
      throw new Error(`Неизвестный раздел УКВ: ${section.kind}`);
  }
}

export function vhfView(ctx) {
  const values = callValues(ctx.store.state.settings);
  const missing = !values.boat || !values.mmsi;
  return h('section', { class: 'view' },
    header('УКВ-радио', '#/more'),
    missing ? h('a', { class: 'button', href: '#/more/settings' }, 'Вписать название яхты и MMSI в шаблоны') : null,
    ctx.content.vhf.sections.map((s) => h('article', { class: 'card', id: `vhf-${s.id}` },
      h('h2', {}, s.title),
      body(s, values),
      sourceFooter(s))));
}
