import { h, header, sourceFooter, table } from '../ui.js';
import { fillTemplate, callValues } from '../template.js';

function body(section, values) {
  switch (section.kind) {
    case 'channels':
      return table(section.columns ?? ['Канал', 'Назначение'], section.rows.map((r) => [r.ch, r.use]));
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

// «Назад» из раздела, открытого кнопкой в ситуации, возвращает к этой ситуации, а не в «Ещё».
function backToPrevious(event) {
  if (history.length < 2) return;
  event.preventDefault();
  history.back();
}

// sectionId - раздел, к которому прокрутить экран (ссылка вида #/more/vhf/vhf-mayday).
export function vhfView(ctx, sectionId) {
  const values = callValues(ctx.store.state.settings);
  const missing = !values.boat || !values.mmsi;
  const { sections } = ctx.content.vhf;
  const target = sections.some((s) => s.id === sectionId) ? sectionId : null;
  const head = header('УКВ-радио', '#/more');
  if (target) head.querySelector('.back').addEventListener('click', backToPrevious);
  return h('section', { class: 'view' },
    head,
    missing ? h('a', { class: 'button', href: '#/more/settings' }, 'Вписать название яхты и MMSI в шаблоны') : null,
    sections.map((s) => h('article', { class: 'card', id: `vhf-${s.id}`, 'data-scroll-target': s.id === target },
      h('h2', { tabindex: s.id === target ? '-1' : null }, s.title),
      body(s, values),
      sourceFooter(s))));
}
