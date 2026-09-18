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

const answerButton = (page) => page.getByRole('button', { name: 'Ответить' });
const primary = (page) => page.locator('.runner .button.primary');
const storedCards = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pocket-skipper:v1') ?? '{}').cards ?? {});

test('тема: ответ показывает разбор и источник', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  await page.locator('.answer[data-correct="true"]').click();
  await answerButton(page).click();
  await expect(page.locator('.answer.ok')).toBeVisible();
  await expect(page.locator('.explain')).toBeVisible();
  await expect(page.locator('.explain .sources')).toContainText('Источник:');
});

test('выбор варианта можно поменять, пока не нажата «Ответить»', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  const wrong = page.locator('.answer[data-correct="false"]').first();
  const right = page.locator('.answer[data-correct="true"]');
  await expect(answerButton(page)).toBeDisabled();
  await wrong.click();
  await expect(wrong).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.answer.ok, .answer.bad')).toHaveCount(0);
  await expect(page.locator('.explain')).toBeHidden();
  expect(await storedCards(page)).toEqual({});
  await right.click();
  await expect(right).toHaveAttribute('aria-pressed', 'true');
  await expect(wrong).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.answer[aria-pressed="true"]')).toHaveCount(1);
  await answerButton(page).click();
  await expect(right).toHaveClass(/\bok\b/);
  await expect(page.locator('.answer.bad')).toHaveCount(0);
  await expect(page.locator('.explain')).toBeVisible();
  for (const b of await page.locator('.answer').all()) await expect(b).toBeDisabled();
  expect(Object.keys(await storedCards(page))).toHaveLength(1);
  await expect(primary(page)).toHaveText(/^(Дальше|Итоги)$/);
  await expect(primary(page)).toBeFocused();
});

test('выбор с клавиатуры: пробел выбирает вариант, Enter подтверждает', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  await expect(page.locator('.answers')).toHaveAttribute('role', 'group');
  await page.locator('.answer[data-correct="false"]').first().focus();
  await page.keyboard.press('Space');
  await page.locator('.answer[data-correct="true"]').focus();
  await page.keyboard.press('Space');
  await answerButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.answer.ok')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.answer.bad')).toHaveCount(0);
});

test('кнопка под вариантами и под разбором не прилипает к ним', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  const gap = (above) => page.evaluate((sel) => {
    const a = document.querySelector(sel).getBoundingClientRect();
    const b = document.querySelector('.runner .button.primary').getBoundingClientRect();
    return b.top - a.bottom;
  }, above);
  await page.locator('.answer').first().click();
  await expect(primary(page)).toBeVisible();
  expect(await gap('.answers')).toBeGreaterThanOrEqual(12);
  await answerButton(page).click();
  await expect(page.locator('.explain')).toBeVisible();
  expect(await gap('.explain')).toBeGreaterThanOrEqual(12);
});

test('сессия повторяет ошибку и сохраняет прогресс', async ({ page }) => {
  const first = content('questions').questions[0];
  await page.goto('./#/today');
  await page.getByRole('link', { name: /^Повторить/ }).click();
  await page.locator('.answer[data-correct="false"]').first().click();
  await answerButton(page).click();
  await expect(page.locator('.answer.bad')).toContainText('Ваш ответ');
  await expect(page.locator('.answer.ok')).toContainText('Верный ответ');
  expect((await storedCards(page))[first.id]).toEqual({ box: 1, due: expect.any(String) });
  await primary(page).click();
  await expect(page.locator('p.meta').first()).toContainText('Вопрос 2 из');
});

test('экзамен не показывает разбор до итогов, выбор можно поменять', async ({ page }) => {
  await page.goto('./#/tests/exam');
  const counter = await page.locator('p.meta').first().textContent();
  const count = Number(counter.match(/из (\d+)/)[1]);
  for (let i = 0; i < count; i += 1) {
    await expect(primary(page)).toBeDisabled();
    await expect(primary(page)).toHaveText(i === count - 1 ? 'Итоги' : 'Дальше');
    await page.locator('.answer[data-correct="false"]').first().click();
    await page.locator('.answer[data-correct="true"]').click();
    await expect(page.locator('.answer[data-correct="true"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.answer.ok, .answer.bad')).toHaveCount(0);
    await expect(page.locator('.explain')).toBeHidden();
    await primary(page).click();
  }
  await expect(page.locator('.score')).toHaveText(`${count} из ${count}`);
  await expect(page.getByText('Экзамен сдан')).toBeVisible();
});

test('разбор ошибок показывает вопрос целиком: картинку, все варианты, ответ и разбор', async ({ page }) => {
  const { questions } = content('questions');
  const withImage = questions.find((q) => q.image);
  const topicQuestions = questions.filter((q) => q.topic === withImage.topic);
  await page.goto(`./#/tests/topic/${withImage.topic}`);
  for (let i = 0; i < topicQuestions.length; i += 1) {
    await page.locator('.answer[data-correct="false"]').first().click();
    await answerButton(page).click();
    await primary(page).click();
  }
  await expect(page.locator('.score')).toHaveText(`0 из ${topicQuestions.length}`);
  const cards = page.locator('.summary .review');
  await expect(cards).toHaveCount(topicQuestions.length);
  const card = cards.filter({ hasText: withImage.text });
  await expect(card.locator('.figure svg')).toBeVisible();
  await expect(card.locator('.answer')).toHaveCount(withImage.options.length);
  await expect(card.locator('.answer.bad')).toHaveCount(1);
  await expect(card.locator('.answer.bad')).toContainText('Ваш ответ');
  await expect(card.locator('.answer.ok')).toHaveCount(1);
  await expect(card.locator('.answer.ok')).toContainText(withImage.options.find((o) => o.correct).text);
  await expect(card.locator('.answer.ok')).toContainText('Верный ответ');
  await expect(card.locator('.explain')).toBeVisible();
  await expect(card.locator('.explain')).toContainText(withImage.explain);
  await expect(card.locator('.sources')).toContainText('Источник:');
  await expect(card.locator('button')).toHaveCount(0);
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

test('ошибка загрузки прогресса показана красным, успех - без пометки ошибки', async ({ page }) => {
  await page.goto('./#/more/settings');
  const status = page.locator('.status');
  await page.setInputFiles('#importFile', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"foo": 1}') });
  await expect(status).toContainText('Не удалось загрузить файл');
  await expect(status).toHaveClass(/\bfail\b/);
  const color = (loc) => loc.evaluate((el) => getComputedStyle(el).color);
  const failColor = await color(status);
  const good = JSON.stringify({ version: 1, cards: {}, checks: {}, settings: { boatName: 'Aurora' } });
  await page.setInputFiles('#importFile', { name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(good) });
  await expect(page.locator('.status')).toHaveText('Прогресс загружен.');
  await expect(page.locator('.status')).not.toHaveClass(/\bfail\b/);
  expect(await color(page.locator('.status'))).not.toBe(failColor);
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

test('кнопка MAYDAY в аварийной ситуации ведёт к шаблону вызова', async ({ page }) => {
  await page.goto('./#/situations/mob');
  const alarm = page.locator('.alarm');
  const button = page.getByRole('link', { name: 'MAYDAY - шаблон вызова' });
  await expect(button).toBeVisible();
  const [a, b] = [await alarm.boundingBox(), await button.boundingBox()];
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  expect(b.y - (a.y + a.height)).toBeLessThan(30);
  await button.click();
  await expect(page).toHaveURL(/#\/more\/vhf\/vhf-mayday$/);
  const section = page.locator('#vhf-vhf-mayday');
  await expect(section).toBeInViewport({ ratio: 0.5 });
  await expect(section.locator('h2')).toBeFocused();
  expect(await section.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await expect(page.locator('.tabbar a[data-tab="more"]')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: '‹ Назад' }).click();
  await expect(page).toHaveURL(/#\/situations\/mob$/);
});

test('кнопка PAN-PAN в нештатной ситуации ведёт к шаблону срочности', async ({ page }) => {
  const problem = content('situations').situations.find((s) => s.severity === 'problem');
  await page.goto(`./#/situations/${problem.id}`);
  await expect(page.getByRole('link', { name: /MAYDAY/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'PAN-PAN - шаблон вызова' }).click();
  await expect(page).toHaveURL(/#\/more\/vhf\/vhf-panpan$/);
  await expect(page.locator('#vhf-vhf-panpan')).toBeInViewport({ ratio: 0.5 });
});

test('неизвестный раздел УКВ открывает обычный экран УКВ-радио', async ({ page }) => {
  await page.goto('./#/more/vhf/nope');
  await expect(page.getByRole('heading', { name: 'УКВ-радио', level: 1 })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('link', { name: '‹ Назад' })).toHaveAttribute('href', '#/more');
});

// На iPhone в режиме «на экране Домой» со status-bar-style black-translucent WebKit считает
// высоту документа как экран минус верхний safe area, и position: fixed; bottom: 0 на
// коротких страницах висит над низом экрана. Chromium эту ошибку WebKit не повторяет,
// поэтому проверяем условие, которое её обходит: документ не короче экрана плюс верхний
// safe area, а таб-бар стоит ровно у нижнего края окна.
test('таб-бар прижат к низу на коротких и длинных страницах в режиме приложения', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34 } });
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
  for (const hash of ['#/today', '#/maneuvers', '#/situations']) {
    await page.goto(`./${hash}`);
    await expect(page.locator('main h1')).toBeVisible();
    const m = await page.evaluate(() => ({
      viewport: window.innerHeight,
      doc: document.documentElement.getBoundingClientRect().height,
      tabbar: document.querySelector('.tabbar').getBoundingClientRect().bottom,
    }));
    expect(m.tabbar, hash).toBe(m.viewport);
    expect(m.doc, hash).toBeGreaterThanOrEqual(m.viewport + 47);
  }
});

test('в обычном браузере короткая страница не прокручивается', async ({ page }) => {
  await page.goto('./#/today');
  await expect(page.locator('main h1')).toBeVisible();
  const m = await page.evaluate(() => ({ viewport: window.innerHeight, scroll: document.documentElement.scrollHeight }));
  expect(m.scroll).toBe(m.viewport);
});
