import { h, header, notFound, sourceLinks } from '../ui.js';

// Гайд: разделы с короткими советами; под каждым советом - его собственные источники.
export function guideView(ctx, id) {
  const guide = ctx.content.guides.guides.find((g) => g.id === id);
  if (!guide) return notFound();
  return h('section', { class: 'view' },
    header(guide.title, '#/more'),
    h('p', { class: 'lead' }, guide.summary,
      guide.verified ? null : h('span', { class: 'badge-unverified' }, 'не сверено')),
    guide.sections.map((section) => h('section', { class: 'guide-section' },
      h('h2', {}, section.title),
      h('ul', { class: 'tips' }, section.tips.map((tip) => h('li', { class: 'tip' },
        h('p', { class: 'tip-text' }, tip.text),
        tip.note ? h('p', { class: 'tip-note' }, tip.note) : null,
        h('p', { class: 'sources' }, sourceLinks(tip.sources))))))));
}
