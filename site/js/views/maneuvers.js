import { h, header, sourceFooter, notFound } from '../ui.js';
import { renderScene, applyPose } from '../diagrams/scene.js';

export function maneuversIndexView(ctx) {
  return h('section', { class: 'view' },
    header('Манёвры'),
    h('ul', { class: 'list' }, ctx.content.maneuvers.maneuvers.map((m) => h('li', {},
      h('a', { href: `#/maneuvers/${m.id}` },
        h('span', {}, m.title, h('small', {}, m.summary)),
        h('span', { class: 'meta' }, `${m.steps.length} шаг.`))))));
}

export function maneuverView(ctx, id) {
  const m = ctx.content.maneuvers.maneuvers.find((x) => x.id === id);
  if (!m) return notFound();

  const figure = h('div', { class: 'scene', html: renderScene(m.scene, m.steps[0].pose) });
  const svg = figure.firstElementChild;
  const counter = h('p', { class: 'meta' });
  const who = h('div', { class: 'who' });
  const command = h('div', { class: 'cmd' });
  const text = h('p', { class: 'step-text' });
  const prev = h('button', { type: 'button', class: 'button' }, 'Назад');
  const next = h('button', { type: 'button', class: 'button primary' }, 'Дальше');
  let index = 0;

  function show() {
    const step = m.steps[index];
    applyPose(svg, m.scene, step.pose, index);
    counter.textContent = `Шаг ${index + 1} из ${m.steps.length}`;
    who.textContent = step.who;
    command.textContent = step.command ? `«${step.command}»` : '';
    text.textContent = step.text;
    prev.disabled = index === 0;
    next.textContent = index === m.steps.length - 1 ? 'Сначала' : 'Дальше';
  }

  prev.addEventListener('click', () => { index = Math.max(0, index - 1); show(); });
  next.addEventListener('click', () => { index = (index + 1) % m.steps.length; show(); });
  show();

  return h('section', { class: 'view' },
    header(m.title, '#/maneuvers'),
    h('p', { class: 'lead' }, m.summary),
    figure,
    counter,
    h('div', { class: 'step', 'aria-live': 'polite' }, who, command, text),
    h('div', { class: 'ctrl' }, prev, next),
    sourceFooter(m));
}
