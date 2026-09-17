import { h } from '../ui.js';
import { toggleCheck, resetChecks, countChecked, activeItems } from '../checks.js';

// ttlMs - срок жизни отметок (для ситуаций); resetOnTop - кнопка сброса ещё и над списком.
export function checklistBlock(ctx, listKey, groups, { numbered = false, ttlMs = null, resetOnTop = false } = {}) {
  const root = h('div', { class: 'checklist' });
  const itemIds = groups.flatMap((g) => g.items.map((i) => i.id));

  function update(fn) {
    ctx.store.update((s) => ({ ...s, checks: fn(s.checks) }));
    render();
  }

  const resetButton = () => h('button', {
    type: 'button',
    class: 'button',
    onclick: () => update((c) => resetChecks(c, listKey)),
  }, 'Сбросить отметки');

  function render() {
    const options = { now: Date.now(), ttlMs };
    const { checks } = ctx.store.state;
    const done = activeItems(checks, listKey, options);
    root.replaceChildren(...[
      h('p', { class: 'meta' }, `Отмечено ${countChecked(checks, listKey, itemIds, options)} из ${itemIds.length}`),
      resetOnTop ? resetButton() : null,
      ...groups.map((group) => h('div', { class: 'group' },
        group.title ? h('h2', {}, group.title) : null,
        h('ul', { class: numbered ? 'steps numbered' : 'steps' }, group.items.map((item) => {
          const isDone = Boolean(done[item.id]);
          return h('li', {}, h('button', {
            type: 'button',
            class: isDone ? 'check done' : 'check',
            'aria-pressed': String(isDone),
            'data-item': item.id,
            onclick: () => update((c) => toggleCheck(c, listKey, item.id, { now: Date.now(), ttlMs })),
          },
          h('span', { class: 'mark', 'aria-hidden': 'true' }),
          h('span', { class: 'body' }, item.text, item.note ? h('small', {}, item.note) : null)));
        })))),
      resetButton(),
    ].filter(Boolean));
  }

  render();
  return root;
}
