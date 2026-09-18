import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute } from '../../site/js/router.js';

const a = () => 'a';
const b = () => 'b';
const routes = [[/^#\/tests$/, a], [/^#\/tests\/topic\/([\w-]+)$/, b]];

test('находит маршрут и параметры', () => {
  assert.deepEqual(matchRoute('#/tests/topic/lights', routes), { view: b, params: ['lights'], tab: 'tests' });
  assert.deepEqual(matchRoute('#/tests', routes), { view: a, params: [], tab: 'tests' });
});

test('неизвестный маршрут', () => {
  assert.deepEqual(matchRoute('#/nope', routes), { view: null, params: [], tab: 'nope' });
});

test('раздел УКВ-радио открывается по ссылке на шаблон', async () => {
  const { routes: appRoutes } = await import('../../site/js/routes.js');
  const { vhfView } = await import('../../site/js/views/vhf.js');
  assert.deepEqual(matchRoute('#/more/vhf/vhf-mayday', appRoutes), { view: vhfView, params: ['vhf-mayday'], tab: 'more' });
  assert.deepEqual(matchRoute('#/more/vhf', appRoutes), { view: vhfView, params: [], tab: 'more' });
});
