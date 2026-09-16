import { h, header, sourceFooter, notFound } from '../ui.js';
import { checklistBlock } from './checklist-ui.js';

export function checklistView(ctx, id) {
  const list = ctx.content.checklists.checklists.find((x) => x.id === id);
  if (!list) return notFound();
  return h('section', { class: 'view' },
    header(list.title, '#/more'),
    h('p', { class: 'lead' }, list.intro),
    checklistBlock(ctx, `checklist:${list.id}`, list.groups),
    sourceFooter(list));
}
