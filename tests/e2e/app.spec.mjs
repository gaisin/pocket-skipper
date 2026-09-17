import { test, expect } from '@playwright/test';
import { content } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  page.errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.errors, 'ошибки JavaScript на странице').toEqual([]);
});

test('тема: ответ показывает разбор и источник', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  await page.locator('.answer[data-correct="true"]').click();
  await expect(page.locator('.answer.ok')).toBeVisible();
  await expect(page.locator('.explain')).toBeVisible();
  await expect(page.locator('.explain .sources')).toContainText('Источник:');
});

test('сессия повторяет ошибку и сохраняет прогресс', async ({ page }) => {
  const first = content('questions').questions[0];
  await page.goto('./#/today');
  await page.getByRole('link', { name: /^Повторить/ }).click();
  await page.locator('.answer[data-correct="false"]').first().click();
  await expect(page.locator('.answer.bad')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pocket-skipper:v1')));
  expect(stored.cards[first.id]).toEqual({ box: 1, due: expect.any(String) });
  await page.locator('.runner .button.primary').click();
  await expect(page.locator('p.meta').first()).toContainText('Вопрос 2 из');
});

test('экзамен не показывает разбор до итогов', async ({ page }) => {
  await page.goto('./#/tests/exam');
  const counter = await page.locator('p.meta').first().textContent();
  const count = Number(counter.match(/из (\d+)/)[1]);
  for (let i = 0; i < count; i += 1) {
    await page.locator('.answer').first().click();
    await expect(page.locator('.explain')).toBeHidden();
    await page.locator('.runner .button.primary').click();
  }
  await expect(page.locator('.score')).toContainText(`из ${count}`);
  await expect(page.getByText(/Экзамен сдан|Не сдан/)).toBeVisible();
});

test('отметки ситуации сохраняются и сбрасываются', async ({ page }) => {
  const situation = content('situations').situations[0];
  await page.goto(`./#/situations/${situation.id}`);
  await page.locator('button.check[data-item="0"]').click();
  await expect(page.locator('.checklist p.meta')).toHaveText(`Отмечено 1 из ${situation.steps.length}`);
  await page.reload();
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Сбросить отметки' }).last().click();
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'false');
});

test('отметки ситуации старше 12 часов не показываются', async ({ page }) => {
  const situation = content('situations').situations[0];
  await page.goto(`./#/situations/${situation.id}`);
  const seed = (hoursAgo) => page.evaluate(({ id, ageMs }) => {
    localStorage.setItem('pocket-skipper:v1', JSON.stringify({
      version: 1,
      cards: {},
      settings: {},
      checks: { [`situation:${id}`]: { items: { 0: true, 1: true }, updatedAt: Date.now() - ageMs } },
    }));
  }, { id: situation.id, ageMs: hoursAgo * 60 * 60 * 1000 });
  await seed(11);
  await page.reload();
  await expect(page.locator('.checklist p.meta')).toHaveText(`Отмечено 2 из ${situation.steps.length}`);
  await seed(13);
  await page.reload();
  await expect(page.locator('.checklist p.meta')).toHaveText(`Отмечено 0 из ${situation.steps.length}`);
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('button.check[data-item="1"]').click();
  await expect(page.locator('button.check[data-item="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.checklist p.meta')).toHaveText(`Отмечено 1 из ${situation.steps.length}`);
});

test('кнопка сброса есть сверху и снизу карточки ситуации', async ({ page }) => {
  const situation = content('situations').situations[0];
  await page.goto(`./#/situations/${situation.id}`);
  await page.locator('button.check[data-item="0"]').click();
  const reset = page.getByRole('button', { name: 'Сбросить отметки' });
  await expect(reset).toHaveCount(2);
  await reset.first().click();
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'false');
});

test('у чек-листа поездки одна кнопка сброса', async ({ page }) => {
  const list = content('checklists').checklists[0];
  await page.goto(`./#/more/checklist/${list.id}`);
  await expect(page.locator('button.check').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сбросить отметки' })).toHaveCount(1);
});

test('манёвр листается по шагам', async ({ page }) => {
  const maneuver = content('maneuvers').maneuvers[0];
  await page.goto(`./#/maneuvers/${maneuver.id}`);
  await expect(page.getByText(`Шаг 1 из ${maneuver.steps.length}`)).toBeVisible();
  await page.getByRole('button', { name: 'Дальше' }).click();
  await expect(page.getByText(`Шаг 2 из ${maneuver.steps.length}`)).toBeVisible();
  await expect(page.locator('.step-text')).toHaveText(maneuver.steps[1].text);
});

test('название яхты попадает в радиошаблоны', async ({ page }) => {
  await page.goto('./#/more/settings');
  await page.fill('#boatName', 'Aurora');
  await page.fill('#mmsi', '271000000');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('.status')).toHaveText('Сохранено.');
  await page.goto('./#/more/vhf');
  await expect(page.getByRole('link', { name: /Вписать название яхты/ })).toHaveCount(0);
  const call = content('vhf').sections.find((s) => s.kind === 'call' && s.lines.some((l) => l.includes('{boat}')));
  if (call) await expect(page.locator(`#vhf-${call.id}`)).toContainText('Aurora');
});

test('работает без сети после первой загрузки', async ({ page, context }) => {
  await page.goto('./#/today');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();
  await page.getByRole('link', { name: 'Манёвры' }).click();
  await expect(page.getByRole('heading', { name: 'Манёвры' })).toBeVisible();
});
