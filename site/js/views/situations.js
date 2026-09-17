import { h, header, sourceFooter, notFound } from '../ui.js';
import { checklistBlock } from './checklist-ui.js';
import { SITUATION_TTL_MS } from '../checks.js';

const GROUPS = [
  ['emergency', 'Аварийные'],
  ['problem', 'Нештатные'],
];

export function situationsIndexView(ctx) {
  const all = ctx.content.situations.situations;
  return h('section', { class: 'view' },
    header('Ситуации'),
    GROUPS.map(([severity, title]) => {
      const items = all.filter((s) => s.severity === severity);
      if (!items.length) return null;
      return [h('h2', {}, title), h('ul', { class: 'list' }, items.map((s) => h('li', {},
        h('a', { href: `#/situations/${s.id}`, class: `severity-${s.severity}` },
          h('span', {}, s.title, h('small', {}, s.summary))))))];
    }));
}

export function situationView(ctx, id) {
  const s = ctx.content.situations.situations.find((x) => x.id === id);
  if (!s) return notFound();
  const items = s.steps.map((step, i) => ({ id: String(i), text: step.text, note: step.note }));
  return h('section', { class: 'view' },
    header('', '#/situations'),
    h('div', { class: s.severity === 'emergency' ? 'alarm' : 'card' },
      h('h1', {}, s.title),
      h('p', {}, s.summary)),
    checklistBlock(ctx, `situation:${s.id}`, [{ items }], { numbered: true, ttlMs: SITUATION_TTL_MS, resetOnTop: true }),
    sourceFooter(s));
}
