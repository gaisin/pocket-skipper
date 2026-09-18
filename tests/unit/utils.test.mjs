import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayISO, addDays, daysBetween } from '../../site/js/dates.js';
import { plural } from '../../site/js/plural.js';
import { shuffle } from '../../site/js/random.js';

test('todayISO форматирует локальную дату', () => {
  assert.equal(todayISO(new Date(2026, 8, 5, 23, 59)), '2026-09-05');
});

test('addDays переходит через границу месяца и года', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 7), '2027-01-07');
  assert.equal(addDays('2026-09-16', 0), '2026-09-16');
});

test('daysBetween считает целые дни', () => {
  assert.equal(daysBetween('2026-09-16', '2026-10-07'), 21);
  assert.equal(daysBetween('2026-10-07', '2026-09-16'), -21);
});

test('plural выбирает форму слова', () => {
  const f = (n) => plural(n, 'день', 'дня', 'дней');
  assert.deepEqual([1, 2, 5, 11, 12, 21, 22, 25, 111].map(f),
    ['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'дней']);
});

test('shuffle возвращает перестановку и не меняет исходный массив', () => {
  const src = [1, 2, 3, 4];
  const out = shuffle(src, () => 0);
  assert.deepEqual(src, [1, 2, 3, 4]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4]);
  assert.deepEqual(out, [2, 3, 4, 1]);
});

test('isStandalone узнаёт приложение с экрана Домой', async () => {
  const { isStandalone } = await import('../../site/js/pwa.js');
  const media = (matches) => () => ({ matches });
  assert.equal(isStandalone({ standalone: true }, media(false)), true);
  assert.equal(isStandalone({}, media(true)), true);
  assert.equal(isStandalone({ standalone: false }, media(false)), false);
  assert.equal(isStandalone({}, undefined), false);
});
