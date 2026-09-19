import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, parseState, STORAGE_KEY } from '../../site/js/storage.js';
import { toggleCheck, resetChecks, countChecked, activeItems, SITUATION_TTL_MS } from '../../site/js/checks.js';
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

test('при загрузке отбрасываются карточки с неверными box или due', () => {
  const raw = JSON.stringify({
    version: 1,
    checks: {},
    settings: {},
    cards: {
      ok: { box: 5, due: '2026-09-18' },
      zero: { box: 0, due: '2026-09-18' },
      six: { box: 6, due: '2026-09-18' },
      frac: { box: 2.5, due: '2026-09-18' },
      text: { box: '2', due: '2026-09-18' },
      baddate: { box: 2, due: '18.09.2026' },
      nodate: { box: 2 },
      notobj: 3,
      arr: [1, 2],
    },
  });
  assert.deepEqual(parseState(raw).cards, { ok: { box: 5, due: '2026-09-18' } });
});

test('при загрузке отбрасываются поля настроек неверного типа', () => {
  const raw = JSON.stringify({
    version: 1,
    cards: {},
    checks: {},
    settings: { tripDate: 'завтра', boatName: 42, callsign: 'TC1234', mmsi: '271000000', persons: '4', extra: { x: 1 } },
  });
  assert.deepEqual(parseState(raw).settings, { callsign: 'TC1234', mmsi: '271000000', persons: '4' });
  const good = JSON.stringify({ version: 1, cards: {}, checks: {}, settings: { tripDate: '2026-10-08', boatName: 'Aurora' } });
  assert.deepEqual(parseState(good).settings, { tripDate: '2026-10-08', boatName: 'Aurora' });
});

test('propWalk: только left или right, остальное отбрасывается', () => {
  const raw = (v) => JSON.stringify({ version: 1, cards: {}, checks: {}, settings: { propWalk: v } });
  assert.equal(parseState(raw('left')).settings.propWalk, 'left');
  assert.equal(parseState(raw('right')).settings.propWalk, 'right');
  assert.equal(parseState(raw('up')).settings.propWalk, undefined);
  assert.equal(parseState(raw('')).settings.propWalk, undefined);
});

test('испорченные вложенные данные в хранилище не ломают запуск', () => {
  const backend = memoryBackend({ [STORAGE_KEY]: JSON.stringify({
    version: 1, cards: { q1: { box: 'x' }, q2: { box: 1, due: '2026-09-17' } }, checks: {}, settings: { tripDate: 5 },
  }) });
  const store = createStore(backend);
  assert.equal(store.recovered, false);
  assert.deepEqual(store.state.cards, { q2: { box: 1, due: '2026-09-17' } });
  assert.deepEqual(store.state.settings, {});
});

test('отметки чек-листа', () => {
  let checks = toggleCheck({}, 'prep', 'docs', { now: 1000 });
  checks = toggleCheck(checks, 'prep', 'apps', { now: 2000 });
  assert.equal(countChecked(checks, 'prep', ['docs', 'apps', 'food']), 2);
  checks = toggleCheck(checks, 'prep', 'docs', { now: 3000 });
  assert.deepEqual(checks, { prep: { items: { apps: true }, updatedAt: 3000 } });
  assert.deepEqual(resetChecks({ prep: { items: { apps: true }, updatedAt: 1 }, other: { x: true } }, 'prep'), { other: { x: true } });
  assert.equal(countChecked({ prep: { items: { removed: true }, updatedAt: 1 } }, 'prep', ['docs']), 0);
});

test('старый формат отметок без времени читается', () => {
  const legacy = { prep: { apps: true } };
  assert.deepEqual(activeItems(legacy, 'prep'), { apps: true });
  assert.equal(countChecked(legacy, 'prep', ['apps', 'docs']), 1);
  assert.deepEqual(toggleCheck(legacy, 'prep', 'docs', { now: 5 }),
    { prep: { items: { apps: true, docs: true }, updatedAt: 5 } });
});

test('чек-лист без срока не истекает', () => {
  const checks = toggleCheck({}, 'checklist:prep', 'docs', { now: 0 });
  assert.deepEqual(activeItems(checks, 'checklist:prep', { now: 365 * 24 * 3600 * 1000 }), { docs: true });
});

test('отметки ситуации истекают через 12 часов', () => {
  const opts = { ttlMs: SITUATION_TTL_MS };
  assert.equal(SITUATION_TTL_MS, 12 * 60 * 60 * 1000);
  const checks = toggleCheck({}, 'situation:mob', '0', { ...opts, now: 0 });
  assert.deepEqual(activeItems(checks, 'situation:mob', { ...opts, now: SITUATION_TTL_MS }), { 0: true });
  assert.equal(countChecked(checks, 'situation:mob', ['0'], { ...opts, now: SITUATION_TTL_MS }), 1);
  assert.deepEqual(activeItems(checks, 'situation:mob', { ...opts, now: SITUATION_TTL_MS + 1 }), {});
  assert.equal(countChecked(checks, 'situation:mob', ['0'], { ...opts, now: SITUATION_TTL_MS + 1 }), 0);
  // Следующее изменение истёкшего списка начинает его с нуля.
  const later = SITUATION_TTL_MS + 5;
  assert.deepEqual(toggleCheck(checks, 'situation:mob', '1', { ...opts, now: later }),
    { 'situation:mob': { items: { 1: true }, updatedAt: later } });
  // Нажатие на истёкшую отметку ставит её заново, а не снимает.
  assert.deepEqual(toggleCheck(checks, 'situation:mob', '0', { ...opts, now: later }),
    { 'situation:mob': { items: { 0: true }, updatedAt: later } });
});

test('отметки ситуации без времени (старый формат) считаются истёкшими', () => {
  const legacy = { 'situation:mob': { 0: true } };
  assert.deepEqual(activeItems(legacy, 'situation:mob', { ttlMs: SITUATION_TTL_MS, now: 1 }), {});
});

test('шаблон радиовызова', () => {
  const values = callValues({ boatName: 'Aurora', mmsi: '271000000', callsign: '' });
  assert.equal(fillTemplate('This is {boat} {boat} {boat}, MMSI {mmsi}', values),
    'This is Aurora Aurora Aurora, MMSI 271000000');
  assert.equal(fillTemplate('Call sign {callsign}, position {position}', values),
    'Call sign ‹позывной›, position ‹координаты›');
});
