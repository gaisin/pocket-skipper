import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml } from '../../site/js/diagrams/svg.js';
import { lightsSVG } from '../../site/js/diagrams/lights.js';
import { markSVG, MARK_SPECS } from '../../site/js/diagrams/marks.js';
import { encounterSVG } from '../../site/js/diagrams/encounter.js';
import { renderScene, poseStyle } from '../../site/js/diagrams/scene.js';
import { MARK_KINDS } from '../../scripts/lib/validate-content.mjs';

test('escapeXml экранирует разметку', () => {
  assert.equal(escapeXml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('огни рисуются нужными цветами и с подписью', () => {
  const svg = lightsSVG({ label: 'Зелёный над <белым>', lights: [{ color: 'green', x: 100, y: 40 }, { color: 'white', x: 100, y: 80 }] });
  assert.match(svg, /aria-label="Зелёный над &lt;белым&gt;"/);
  assert.equal((svg.match(/#3BE37A/g) ?? []).length, 2);
  assert.equal((svg.match(/#F4F7F8/g) ?? []).length, 2);
});

test('для каждого вида знака из схемы есть рисунок', () => {
  assert.deepEqual(Object.keys(MARK_SPECS).sort(), [...MARK_KINDS].sort());
  for (const kind of MARK_KINDS) assert.match(markSVG(kind), /^<svg /);
  assert.throws(() => markSVG('nope'), /Неизвестный знак/);
});

test('топовые фигуры кардинальных знаков', () => {
  assert.deepEqual(MARK_SPECS.north.top, ['cone-up', 'cone-up']);
  assert.deepEqual(MARK_SPECS.south.top, ['cone-down', 'cone-down']);
  assert.deepEqual(MARK_SPECS.east.top, ['cone-up', 'cone-down']);
  assert.deepEqual(MARK_SPECS.west.top, ['cone-down', 'cone-up']);
});

test('расхождение: суда и подписи', () => {
  const svg = encounterSVG({ label: 'Две яхты', wind: 0, vessels: [
    { name: 'А', type: 'sail', x: 80, y: 120, rot: -45, boom: 20 },
    { name: 'Б', type: 'power', x: 180, y: 90, rot: 90 },
  ] });
  assert.match(svg, /translate\(80 120\) rotate\(-45\)/);
  assert.match(svg, />А</);
  assert.match(svg, /class="cabin"/);
  assert.match(svg, /class="wind"/);
});

test('сцена манёвра содержит элементы, ветер и лодку в позе', () => {
  const svg = renderScene({ label: 'Швартовка', wind: 90, elements: [
    { type: 'quay', x: 0, y: 0, w: 260, h: 20 },
    { type: 'label', x: 10, y: 190, text: '<b>' },
  ] }, { x: 100, y: 120, rot: 180, boom: 0 });
  assert.match(svg, /class="quay"/);
  assert.match(svg, /&lt;b&gt;/);
  assert.match(svg, /data-el="1"/);
  assert.match(svg, new RegExp(poseStyle({ x: 100, y: 120, rot: 180 }).replace(/[()]/g, '\\$&')));
});

test('для моторной сцены гик не рисуется', () => {
  const svg = renderScene({ label: 'Мотор', power: true, elements: [] }, { x: 1, y: 2, rot: 0 });
  assert.doesNotMatch(svg, /class="boom"/);
  assert.throws(() => renderScene({ label: 'x', elements: [{ type: 'rocket' }] }, { x: 0, y: 0, rot: 0 }), /Неизвестный элемент/);
});

test('знаки рисуются на дневном фоне независимо от темы', () => {
  const svg = markSVG('north');
  assert.ok(svg.includes('fill="#DCEAF2"'), 'нет фиксированного дневного фона');
  assert.ok(!svg.includes('svg-water'), 'фон знака не должен зависеть от темы');
});
