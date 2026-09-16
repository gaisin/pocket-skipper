import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, grade, readiness, INTERVALS, SESSION_LIMIT } from '../../site/js/leitner.js';

const today = '2026-09-16';

test('интервалы соответствуют спецификации', () => {
  assert.deepEqual(INTERVALS, [0, 1, 2, 4, 7]);
  assert.equal(SESSION_LIMIT, 15);
});

test('новая карточка при верном ответе попадает в коробку 2 на завтра', () => {
  const cards = grade({}, 'q1', true, today);
  assert.deepEqual(cards.q1, { box: 2, due: '2026-09-17' });
});

test('неверный ответ возвращает в коробку 1 на сегодня', () => {
  const cards = grade({ q1: { box: 4, due: today } }, 'q1', false, today);
  assert.deepEqual(cards.q1, { box: 1, due: today });
});

test('коробка не превышает 5, интервал 7 дней', () => {
  const cards = grade({ q1: { box: 5, due: today } }, 'q1', true, today);
  assert.deepEqual(cards.q1, { box: 5, due: '2026-09-23' });
});

test('grade не мутирует исходный объект', () => {
  const src = { q1: { box: 1, due: today } };
  grade(src, 'q1', true, today);
  assert.deepEqual(src, { q1: { box: 1, due: today } });
});

test('сессия: сначала просроченные по коробке, потом новые, с лимитом', () => {
  const cards = {
    a: { box: 3, due: '2026-09-15' },
    b: { box: 1, due: '2026-09-16' },
    c: { box: 2, due: '2026-09-20' },
  };
  assert.deepEqual(buildSession(cards, ['a', 'b', 'c', 'd', 'e'], today), ['b', 'a', 'd', 'e']);
  assert.deepEqual(buildSession(cards, ['a', 'b', 'c', 'd', 'e'], today, 3), ['b', 'a', 'd']);
});

test('сессия игнорирует карточки удалённых вопросов', () => {
  assert.deepEqual(buildSession({ gone: { box: 1, due: today } }, ['x'], today), ['x']);
});

test('готовность - доля коробок 4-5', () => {
  const cards = { a: { box: 4, due: today }, b: { box: 5, due: today }, c: { box: 3, due: today } };
  assert.equal(readiness(cards, ['a', 'b', 'c', 'd']), 0.5);
  assert.equal(readiness({}, []), 0);
});
