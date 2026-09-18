import { h, header } from '../ui.js';

export function moreView(ctx) {
  const link = (href, title, note) => h('li', {}, h('a', { href }, h('span', {}, title, note ? h('small', {}, note) : null)));
  return h('section', { class: 'view' },
    header('Ещё'),
    h('ul', { class: 'list' },
      link('#/more/vhf', 'УКВ-радио', 'Каналы, Mayday, Pan-Pan, алфавит'),
      ctx.content.checklists.checklists.map((c) => link(`#/more/checklist/${c.id}`, c.title, c.intro)),
      ctx.content.guides.guides.map((g) => link(`#/more/guide/${g.id}`, g.title, g.summary)),
      link('#/more/reference', 'Справочник', 'Огни, знаки, шкала Бофорта'),
      link('#/more/external', 'Внешние тесты', 'Нужен интернет'),
      link('#/more/settings', 'Настройки', 'Дата выхода, яхта, резервная копия')));
}
