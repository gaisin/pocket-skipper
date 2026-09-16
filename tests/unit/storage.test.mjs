import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, parseState, STORAGE_KEY } from '../../site/js/storage.js';
import { toggleCheck, resetChecks, countChecked } from '../../site/js/checks.js';
import { fillTemplate, callValues } from '../../site/js/template.js';

function memoryBackend(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

test('пустое хранилище даёт пустое состояние', () => {
  const store = createStore(memoryBackend());
  assert.equal(store.persistent, true);
  assert.equal(store.recovered, false);
  assert.deepEqual(store.state, { version: 1, cards: {}, checks: {}, settings: {} });
});

test('update сохраняет состояние в backend', () => {
  const backend = memoryBackend();
  const store = createStore(backend);
  store.update((s) => ({ ...s, settings: { boatName: 'Aurora' } }));
  assert.equal(JSON.parse(backend.data[STORAGE_KEY]).settings.boatName, 'Aurora');
  assert.equal(createStore(backend).state.settings.boatName, 'Aurora');
});

test('повреждённые данные сохраняются в копию, старт с нуля', () => {
  const backend = memoryBackend({ [STORAGE_KEY]: '{broken' });
  const store = createStore(backend);
  assert.equal(store.recovered, true);
  assert.equal(backend.data[`${STORAGE_KEY}:corrupt`], '{broken');
  assert.deepEqual(store.state.cards, {});
});

test('без backend работает в памяти', () => {
  const store = createStore(null);
  assert.equal(store.persistent, false);
  store.update((s) => ({ ...s, settings: { mmsi: '123456789' } }));
  assert.equal(store.state.settings.mmsi, '123456789');
});

test('экспорт и импорт', () => {
  const a = createStore(memoryBackend());
  a.update((s) => ({ ...s, cards: { q1: { box: 3, due: '2026-09-18' } } }));
  const b = createStore(memoryBackend());
  b.importJSON(a.exportJSON());
  assert.deepEqual(b.state.cards, { q1: { box: 3, due: '2026-09-18' } });
});

test('импорт чужого файла отклоняется и не портит состояние', () => {
  const store = createStore(memoryBackend());
  store.update((s) => ({ ...s, settings: { boatName: 'Aurora' } }));
  assert.throws(() => store.importJSON('{"foo": 1}'), /Карманного шкипера/);
  assert.throws(() => parseState('not json'));
  assert.equal(store.state.settings.boatName, 'Aurora');
});

test('отметки чек-листа', () => {
  let checks = toggleCheck({}, 'prep', 'docs');
  checks = toggleCheck(checks, 'prep', 'apps');
  assert.equal(countChecked(checks, 'prep', ['docs', 'apps', 'food']), 2);
  checks = toggleCheck(checks, 'prep', 'docs');
  assert.deepEqual(checks, { prep: { apps: true } });
  assert.deepEqual(resetChecks({ prep: { apps: true }, other: { x: true } }, 'prep'), { other: { x: true } });
  assert.equal(countChecked({ prep: { removed: true } }, 'prep', ['docs']), 0);
});

test('шаблон радиовызова', () => {
  const values = callValues({ boatName: 'Aurora', mmsi: '271000000', callsign: '' });
  assert.equal(fillTemplate('This is {boat} {boat} {boat}, MMSI {mmsi}', values),
    'This is Aurora Aurora Aurora, MMSI 271000000');
  assert.equal(fillTemplate('Call sign {callsign}, position {position}', values),
    'Call sign ‹позывной›, position ‹координаты›');
});
