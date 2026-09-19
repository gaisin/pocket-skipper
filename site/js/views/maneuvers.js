import { h, header, sourceFooter, notFound } from '../ui.js';
import { renderScene, applyPose, legendArrowSVG } from '../diagrams/scene.js';
import { maneuverFor } from '../diagrams/mirror.js';

const WALK_TEST_ID = 'prop-walk-test';

// Подписи легенды для видов стрелок на схеме - порядок фиксированный, показываем только те виды,
// что реально есть в манёвре; от стороны заброса (зеркалирования) виды стрелок не зависят.
const ARROW_LEGEND = [
  ['walk', 'заброс кормы на заднем ходу'],
  ['drift', 'снос ветром'],
];

function sceneLegend(scene) {
  const kinds = new Set(scene.elements.filter((el) => el.type === 'arrow').map((el) => el.kind));
  const items = ARROW_LEGEND.filter(([kind]) => kinds.has(kind));
  if (!items.length) return null;
  return h('ul', { class: 'scene-legend' }, items.map(([kind, label]) =>
    h('li', {}, h('span', { class: 'legend-arrow', html: legendArrowSVG(kind) }), label)));
}

function groupedManeuvers(data) {
  return data.groups
    .map((g) => ({ ...g, items: data.maneuvers.filter((m) => m.group === g.id) }))
    .filter((g) => g.items.length > 0);
}

export function maneuversIndexView(ctx) {
  const walk = ctx.store.state.settings.propWalk;
  return h('section', { class: 'view' },
    header('Манёвры'),
    groupedManeuvers(ctx.content.maneuvers).map((g) => [
      h('h2', {}, g.title),
      h('ul', { class: 'list' }, g.items.map((raw) => {
        const m = maneuverFor(raw, walk);
        return h('li', {},
          h('a', { href: `#/maneuvers/${m.id}` },
            h('span', {}, m.title, h('small', {}, m.summary)),
            h('span', { class: 'meta' }, `${m.steps.length} шаг.`)));
      })),
    ]));
}

// Переключатель «куда уводит корму на заднем ходу»; значение общее с настройками.
function propWalkControl(ctx, currentId, onChange) {
  const hasTest = currentId !== WALK_TEST_ID && ctx.content.maneuvers.maneuvers.some((x) => x.id === WALK_TEST_ID);
  const note = h('p', { class: 'walk-note' },
    'Сторона не проверена - схема для случая, когда корму уводит влево. Проверьте на приёмке',
    hasTest ? [': ', h('a', { href: `#/maneuvers/${WALK_TEST_ID}` }, 'как проверить заброс')] : null,
    '.');
  const buttons = [['left', 'Влево'], ['right', 'Вправо']].map(([side, label]) =>
    h('button', { type: 'button', class: 'button small seg', 'data-side': side }, label));
  function sync() {
    const walk = ctx.store.state.settings.propWalk;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.side === walk));
    note.hidden = walk !== undefined;
  }
  for (const b of buttons) {
    b.addEventListener('click', () => {
      ctx.store.update((st) => ({ ...st, settings: { ...st.settings, propWalk: b.dataset.side } }));
      sync();
      onChange(b.dataset.side);
    });
  }
  sync();
  return h('div', { class: 'walk-control' },
    h('div', { class: 'walk-switch', role: 'group', 'aria-label': 'Куда уводит корму на заднем ходу' },
      h('span', { class: 'walk-switch-label' }, 'Корму на заднем ходу уводит:'),
      h('div', { class: 'walk-switch-buttons' }, buttons)),
    note);
}

export function maneuverView(ctx, id) {
  const raw = ctx.content.maneuvers.maneuvers.find((x) => x.id === id);
  if (!raw) return notFound();

  let m = maneuverFor(raw, ctx.store.state.settings.propWalk);
  const head = header(m.title, '#/maneuvers');
  const lead = h('p', { class: 'lead' }, m.summary);
  const figure = h('div', { class: 'scene' });
  const counter = h('p', { class: 'meta' });
  const who = h('div', { class: 'who' });
  const command = h('div', { class: 'cmd' });
  const text = h('p', { class: 'step-text' });
  const prev = h('button', { type: 'button', class: 'button' }, 'Назад');
  const next = h('button', { type: 'button', class: 'button primary' }, 'Дальше');
  let index = 0;
  let svg;

  // Перерисовать схему целиком (при смене стороны) - без анимации, сразу в положении текущего шага.
  function draw() {
    figure.innerHTML = renderScene(m.scene, m.steps[index].pose);
    svg = figure.firstElementChild;
    head.querySelector('h1').textContent = m.title;
    // Тот же формат, что у заголовка вкладки в app.js: при смене стороны меняется и название манёвра.
    document.title = `${m.title} - Карманный шкипер`;
    lead.textContent = m.summary;
  }

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
  draw();
  show();

  const walkControl = raw.mirror
    ? propWalkControl(ctx, raw.id, (walk) => { m = maneuverFor(raw, walk); draw(); show(); })
    : null;
  // Легенда зависит только от видов стрелок на схеме, не от стороны заброса и не от шага - считаем один раз.
  const legend = sceneLegend(raw.scene);

  return h('section', { class: 'view' },
    head,
    lead,
    walkControl,
    figure,
    legend,
    counter,
    h('div', { class: 'step', 'aria-live': 'polite' }, who, command, text),
    h('div', { class: 'ctrl' }, prev, next),
    videoLinks(m.videos),
    sourceFooter(m));
}

// Видео - дополнительный просмотр, не источник; открывается во внешней вкладке.
function videoLinks(videos) {
  if (!videos?.length) return null;
  return h('div', { class: 'videos' },
    h('h2', {}, 'Видео'),
    h('ul', { class: 'list' }, videos.map((v) => h('li', {},
      h('a', { href: v.url, target: '_blank', rel: 'noopener' },
        h('span', {}, v.title, h('span', { class: 'visually-hidden' }, ' (откроется во внешнем приложении)'), h('small', {}, 'нужен интернет')),
        h('span', { class: 'meta' }, 'YouTube'))))));
}
