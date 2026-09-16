import { h } from '../ui.js';
import { toggleCheck, resetChecks, countChecked } from '../checks.js';

export function checklistBlock(ctx, listKey, groups, { numbered = false } = {}) {
  const root = h('div', { class: 'checklist' });
  const itemIds = groups.flatMap((g) => g.items.map((i) => i.id));

  function update(fn) {
    ctx.store.update((s) => ({ ...s, checks: fn(s.checks) }));
    render();
  }

  function render() {
    const checks = ctx.store.state.checks[listKey] ?? {};
    root.replaceChildren(
      h('p', { class: 'meta' }, `Отмечено ${countChecked(ctx.store.state.checks, listKey, itemIds)} из ${itemIds.length}`),
      ...groups.map((group) => h('div', { class: 'group' },
        group.title ? h('h2', {}, group.title) : null,
        h('ul', { class: numbered ? 'steps numbered' : 'steps' }, group.items.map((item) => {
          const done = Boolean(checks[item.id]);
          return h('li', {}, h('button', {
            type: 'button',
            class: done ? 'check done' : 'check',
            'aria-pressed': String(done),
            'data-item': item.id,
            onclick: () => update((c) => toggleCheck(c, listKey, item.id)),
          },
          h('span', { class: 'mark', 'aria-hidden': 'true' }),
          h('span', { class: 'body' }, item.text, item.note ? h('small', {}, item.note) : null)));
        })))),
      h('button', { type: 'button', class: 'button', onclick: () => update((c) => resetChecks(c, listKey)) }, 'Сбросить отметки'));
  }

  render();
  return root;
}
