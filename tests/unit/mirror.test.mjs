import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSides, stripSidePairs, mirrorPose, mirrorPath, mirrorScene, maneuverFor, SCENE_WIDTH } from '../../site/js/diagrams/mirror.js';

test('ширина сцены - 260', () => {
  assert.equal(SCENE_WIDTH, 260);
});

test('resolveSides выбирает вариант по стороне заброса', () => {
  const text = 'Подойти [[левым|правым]] бортом, корму уводит [[влево|вправо]]';
  assert.equal(resolveSides(text, 'left'), 'Подойти левым бортом, корму уводит влево');
  assert.equal(resolveSides(text, undefined), 'Подойти левым бортом, корму уводит влево');
  assert.equal(resolveSides(text, 'right'), 'Подойти правым бортом, корму уводит вправо');
  assert.equal(resolveSides('Без пар', 'right'), 'Без пар');
});

test('stripSidePairs убирает только правильные пары', () => {
  assert.equal(stripSidePairs('а [[л|п]] б'), 'а  б');
  assert.equal(stripSidePairs('а [[л]] б'), 'а [[л]] б');
  assert.equal(stripSidePairs('а [[л|п|х]] б'), 'а [[л|п|х]] б');
});

test('mirrorPose отражает x, rot и boom', () => {
  assert.deepEqual(mirrorPose({ x: 60, y: 100, rot: 30, boom: 20 }), { x: 200, y: 100, rot: -30, boom: -20 });
  assert.deepEqual(mirrorPose({ x: 130, y: 100, rot: 0 }), { x: 130, y: 100, rot: 0 });
});

test('mirrorPath отражает x во всех парах координат', () => {
  assert.equal(mirrorPath('M20 150 L195 150 Q170 150 166 125 L164 30'), 'M240 150 L65 150 Q90 150 94 125 L96 30');
  assert.equal(mirrorPath('M10,20 C30,40 50,60 70,80 Z'), 'M250,20 C230,40 210,60 190,80 Z');
  assert.equal(mirrorPath('M10.5 20'), 'M249.5 20');
});

test('mirrorScene отражает все виды элементов и ветер', () => {
  const scene = {
    label: 'x', wind: 270, power: true,
    elements: [
      { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
      { type: 'boat-moored', x: 60, y: 50, rot: 10, steps: [1] },
      { type: 'boat-moored', x: 60, y: 150 },
      { type: 'buoy', x: 30, y: 40 },
      { type: 'anchor', x: 30, y: 40 },
      { type: 'person', x: 30, y: 40 },
      { type: 'label', x: 30, y: 40, text: 'ПРИЧАЛ' },
      { type: 'label', x: 30, y: 40, text: 'А', anchor: 'end' },
      { type: 'line', points: [[10, 20], [30, 40]], dashed: true },
      { type: 'path', d: 'M20 150 L40 30' },
      { type: 'arrow', x1: 100, y1: 150, x2: 80, y2: 150, kind: 'walk' },
    ],
  };
  const m = mirrorScene(scene);
  assert.equal(m.mirrored, true);
  assert.equal(m.wind, 90);
  assert.deepEqual(m.elements, [
    { type: 'quay', x: 240, y: 0, w: 20, h: 200 },
    { type: 'boat-moored', x: 200, y: 50, rot: -10, steps: [1] },
    { type: 'boat-moored', x: 200, y: 150, rot: 0 },
    { type: 'buoy', x: 230, y: 40 },
    { type: 'anchor', x: 230, y: 40 },
    { type: 'person', x: 230, y: 40 },
    { type: 'label', x: 230, y: 40, text: 'ПРИЧАЛ', anchor: 'end' },
    { type: 'label', x: 230, y: 40, text: 'А', anchor: 'start' },
    { type: 'line', points: [[250, 20], [230, 40]], dashed: true },
    { type: 'path', d: 'M240 150 L220 30' },
    { type: 'arrow', x1: 160, y1: 150, x2: 180, y2: 150, kind: 'walk' },
  ]);
  assert.equal(mirrorScene({ ...scene, wind: 0 }).wind, 0);
  assert.equal(mirrorScene({ ...scene, wind: 45 }).wind, 315);
  assert.equal(mirrorScene({ label: 'x', elements: [] }).wind, undefined);
});

test('двойное отражение возвращает исходную сцену', () => {
  const scene = {
    label: 'x', wind: 250,
    elements: [
      { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
      { type: 'boat-moored', x: 60.5, y: 50, rot: 10, scale: 0.8, steps: [1] },
      { type: 'boat-moored', x: 60, y: 150, rot: 0 }, // без rot отражение ставит rot: 0 (см. тест выше)
      { type: 'buoy', x: 30, y: 40 },
      { type: 'anchor', x: 31, y: 41 },
      { type: 'person', x: 32, y: 42 },
      { type: 'label', x: 30, y: 40, text: 'ПРИЧАЛ' },
      { type: 'label', x: 30, y: 60, text: 'А', anchor: 'end' },
      { type: 'label', x: 30, y: 80, text: 'Б', anchor: 'start' },
      { type: 'line', points: [[10, 20], [30.25, 40]], dashed: true },
      { type: 'path', d: 'M20 150 L195 150 Q170 150 166 125 C10,20 30,40 50.5,60 Z' },
      { type: 'arrow', x1: 100, y1: 150, x2: 80, y2: 150, kind: 'walk', steps: [0, 2] },
    ],
  };
  const twice = mirrorScene(mirrorScene(scene));
  assert.equal(twice.mirrored, false);
  assert.equal(twice.wind, scene.wind);
  // У подписи без anchor двойное отражение ставит anchor 'start' - это выравнивание SVG по умолчанию,
  // поэтому anchor у подписей не сравниваем; всё остальное должно совпасть до единицы.
  const withoutLabelAnchor = (els) => els.map((el) => {
    if (el.type !== 'label') return el;
    const { anchor, ...rest } = el;
    return rest;
  });
  assert.deepEqual(withoutLabelAnchor(twice.elements), withoutLabelAnchor(scene.elements));
  assert.equal(twice.elements[7].anchor, 'end');
  assert.equal(twice.elements[8].anchor, 'start');
});

test('mirrorScene не знает чужих элементов', () => {
  assert.throws(() => mirrorScene({ label: 'x', elements: [{ type: 'rocket' }] }), /Неизвестный элемент/);
});

const demo = {
  id: 'demo', group: 'alongside', mirror: true,
  title: 'Лагом [[левым|правым]] бортом', summary: 'Причал [[слева|справа]]',
  scene: { label: 'Схема [[слева|справа]]', wind: 270, elements: [
    { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
    { type: 'label', x: 30, y: 20, text: '[[ЛЕВЫЙ|ПРАВЫЙ]]' },
  ] },
  steps: [{ who: 'Рулевой', command: '[[Лево|Право]] руля', text: 'Корму уводит [[влево|вправо]]', pose: { x: 60, y: 100, rot: 10 } }],
  sources: [], verified: false,
};

test('maneuverFor без настройки и с «left» - базовый рисунок и первый вариант текста', () => {
  for (const walk of [undefined, 'left']) {
    const m = maneuverFor(demo, walk);
    assert.equal(m.title, 'Лагом левым бортом');
    assert.equal(m.summary, 'Причал слева');
    assert.equal(m.scene.label, 'Схема слева');
    assert.equal(m.scene.elements[1].text, 'ЛЕВЫЙ');
    assert.equal(m.scene.mirrored, undefined);
    assert.equal(m.steps[0].command, 'Лево руля');
    assert.equal(m.steps[0].text, 'Корму уводит влево');
    assert.deepEqual(m.steps[0].pose, { x: 60, y: 100, rot: 10 });
  }
});

test('maneuverFor с «right» - зеркальная схема и второй вариант текста', () => {
  const m = maneuverFor(demo, 'right');
  assert.equal(m.title, 'Лагом правым бортом');
  assert.equal(m.scene.label, 'Схема справа');
  assert.equal(m.scene.mirrored, true);
  assert.equal(m.scene.wind, 90);
  assert.deepEqual(m.scene.elements[0], { type: 'quay', x: 240, y: 0, w: 20, h: 200 });
  assert.equal(m.scene.elements[1].text, 'ПРАВЫЙ');
  assert.equal(m.steps[0].text, 'Корму уводит вправо');
  assert.deepEqual(m.steps[0].pose, { x: 200, y: 100, rot: -10 });
  assert.equal(demo.steps[0].pose.x, 60, 'исходный манёвр не меняется');
});

test('maneuverFor не трогает манёвр без mirror', () => {
  const plain = { ...demo, mirror: undefined };
  assert.equal(maneuverFor(plain, 'right'), plain);
});
