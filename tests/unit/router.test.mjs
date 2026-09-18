import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute } from '../../site/js/router.js';

const a = () => 'a';
const b = () => 'b';
const routes = [[/^#\/tests$/, a], [/^#\/tests\/topic\/([\w-]+)$/, b]];

test('находит маршрут и параметры', () => {
  assert.deepEqual(matchRoute('#/tests/topic/lights', routes), { view: b, params: ['lights'], tab: 'tests', query: {} });
  assert.deepEqual(matchRoute('#/tests', routes), { view: a, params: [], tab: 'tests', query: {} });
});

test('неизвестный маршрут', () => {
  assert.deepEqual(matchRoute('#/nope', routes), { view: null, params: [], tab: 'nope', query: {} });
});

test('параметры после ? не мешают маршруту и вкладке', () => {
  assert.deepEqual(matchRoute('#/tests/topic/lights?from=situations/mob&x=1', routes),
    { view: b, params: ['lights'], tab: 'tests', query: { from: 'situations/mob', x: '1' } });
  assert.deepEqual(matchRoute('#/tests?', routes), { view: a, params: [], tab: 'tests', query: {} });
});

test('раздел УКВ-радио открывается по ссылке на шаблон', async () => {
  const { routes: appRoutes } = await import('../../site/js/routes.js');
  const { vhfView } = await import('../../site/js/views/vhf.js');
  assert.deepEqual(matchRoute('#/more/vhf/vhf-mayday', appRoutes), { view: vhfView, params: ['vhf-mayday'], tab: 'more', query: {} });
  assert.deepEqual(matchRoute('#/more/vhf/vhf-mayday?from=situations/mob', appRoutes),
    { view: vhfView, params: ['vhf-mayday'], tab: 'more', query: { from: 'situations/mob' } });
  assert.deepEqual(matchRoute('#/more/vhf', appRoutes), { view: vhfView, params: [], tab: 'more', query: {} });
});

test('УКВ-радио со слешем в конце или странным id - обычный экран, а не «Не найдено»', async () => {
  const { routes: appRoutes } = await import('../../site/js/routes.js');
  const { vhfView } = await import('../../site/js/views/vhf.js');
  for (const hash of ['#/more/vhf/', '#/more/vhf/Foo.Bar', '#/more/vhf/a/b', '#/more/vhf/%D0%B0', '#/more/vhf//']) {
    assert.equal(matchRoute(hash, appRoutes).view, vhfView, hash);
  }
});
