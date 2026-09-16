import { h, header, sourceFooter, table } from '../ui.js';
import { lightsSVG } from '../diagrams/lights.js';
import { markSVG } from '../diagrams/marks.js';

function rowFigure(kind, row) {
  const svg = kind === 'lights' ? lightsSVG(row.lights) : markSVG(row.mark, row.label);
  return h('div', { class: 'ref-row' },
    h('div', { class: 'figure', html: svg }),
    h('div', {}, h('b', {}, row.label), h('p', {}, row.value)));
}

export function referenceView(ctx) {
  return h('section', { class: 'view' },
    header('Справочник', '#/more'),
    ctx.content.reference.sections.map((s) => h('article', { class: 'card', id: `ref-${s.id}` },
      h('h2', {}, s.title),
      s.kind === 'table'
        ? table(['', ''], s.rows.map((r) => [r.label, r.value]))
        : s.rows.map((r) => rowFigure(s.kind, r)),
      sourceFooter(s))));
}
