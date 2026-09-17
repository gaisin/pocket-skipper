import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../../site/css/tokens.css', import.meta.url), 'utf8');

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Три палитры: светлая, тёмная по системной настройке, тёмная по выбору в приложении.
const palettes = [...css.matchAll(/\{([^{}]*--ground[^{}]*)\}/g)].map((m) => m[1]);

function token(block, name) {
  return block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
}

test('tokens.css содержит три палитры', () => {
  assert.equal(palettes.length, 3);
});

for (const name of ['alarm-bg', 'done-bg']) {
  test(`белый текст на --${name} читается во всех палитрах (контраст не ниже 4.5)`, () => {
    palettes.forEach((block, i) => {
      const bg = token(block, name);
      assert.ok(bg, `палитра ${i}: нет --${name}`);
      const ratio = contrast('#FFFFFF', bg);
      assert.ok(ratio >= 4.5, `палитра ${i}: --${name} ${bg} даёт ${ratio.toFixed(2)}`);
    });
  });
}
