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

test('сессия повторяет ошибку в конце очереди и сохраняет прогресс', async ({ page }) => {
  const first = content('questions').questions[0];
  const counter = page.locator('.runner-head p.meta');
  await page.goto('./#/today');
  await page.getByRole('link', { name: /^Повторить/ }).click();
  const size = Number((await counter.textContent()).match(/^Вопрос 1 из (\d+)$/)[1]);
  expect(size).toBeGreaterThan(1);
  await expect(page.locator('.q')).toHaveText(first.text);
  await page.locator('.answer[data-correct="false"]').first().click();
  await answerButton(page).click();
  await expect(page.locator('.answer.bad')).toContainText('Ваш ответ');
  await expect(page.locator('.answer.ok')).toContainText('Верный ответ');
  expect((await storedCards(page))[first.id]).toEqual({ box: 1, due: expect.any(String) });
  await primary(page).click();
  // Ошибка вернулась в очередь: вопросов стало на один больше.
  await expect(counter).toHaveText(`Вопрос 2 из ${size + 1}`);
  for (let i = 2; i <= size; i += 1) {
    await expect(counter).toHaveText(`Вопрос ${i} из ${size + 1}`);
    await expect(page.locator('.q')).not.toHaveText(first.text);
    await page.locator('.answer[data-correct="true"]').click();
    await answerButton(page).click();
    await primary(page).click();
  }
  // Последним идёт тот же вопрос, на который ответили неверно.
  await expect(counter).toHaveText(`Вопрос ${size + 1} из ${size + 1}`);
  await expect(page.locator('.q')).toHaveText(first.text);
  await page.locator('.answer[data-correct="true"]').click();
  await answerButton(page).click();
  await expect(primary(page)).toHaveText('Итоги');
  await primary(page).click();
  await expect(page.locator('.score')).toHaveText(`${size} из ${size + 1}`);
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
  // Экзамен - проверка, а не повторение: карточки Лейтнера он не трогает.
  expect(await storedCards(page)).toEqual({});
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
  // Разбор только для чтения: варианты не выглядят нажимаемыми.
  for (const option of await card.locator('.answer').all()) {
    expect(await option.evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
  }
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


const callButtons = (page) => page.locator('.calls a.call-button');
const CALL_LABELS = { 'vhf-mayday': 'MAYDAY - шаблон вызова', 'vhf-panpan': 'PAN-PAN - шаблон вызова' };

test('кнопки вызова в каждой ситуации - ровно те, что заданы в calls, по порядку', async ({ page }) => {
  const titles = Object.fromEntries(content('vhf').sections.map((s) => [s.id, s.title]));
  for (const s of content('situations').situations) {
    await page.goto(`./#/situations/${s.id}`);
    await expect(page.locator('main h1')).toHaveText(s.title);
    const calls = s.calls ?? [];
    await expect(callButtons(page), s.id).toHaveCount(calls.length);
    for (const [i, id] of calls.entries()) {
      const button = callButtons(page).nth(i);
      await expect(button, s.id).toHaveText(CALL_LABELS[id] ?? `${titles[id]} - шаблон`);
      await expect(button, s.id).toHaveAttribute('href', `#/more/vhf/${id}?from=situations/${s.id}`);
      if (id === 'vhf-mayday') await expect(button, s.id).toHaveClass(/\balarm-button\b/);
      else await expect(button, s.id).not.toHaveClass(/\balarm-button\b/);
    }
  }
});

test('человек за бортом: одна красная кнопка MAYDAY, «Назад» из шаблона возвращает к ситуации', async ({ page }) => {
  await page.goto('./#/situations/mob');
  await expect(callButtons(page)).toHaveCount(1);
  const alarm = page.locator('.alarm');
  const button = page.getByRole('link', { name: 'MAYDAY - шаблон вызова' });
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/\balarm-button\b/);
  const [a, b] = [await alarm.boundingBox(), await button.boundingBox()];
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  expect(b.y - (a.y + a.height)).toBeLessThan(30);
  await button.click();
  await expect(page).toHaveURL(/#\/more\/vhf\/vhf-mayday\?from=situations\/mob$/);
  const section = page.locator('#vhf-vhf-mayday');
  await expect(section).toBeInViewport({ ratio: 0.5 });
  await expect(section.locator('h2')).toBeFocused();
  expect(await section.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await expect(page.locator('.tabbar a[data-tab="more"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: '‹ Назад' })).toHaveAttribute('href', '#/situations/mob');
  await page.getByRole('link', { name: '‹ Назад' }).click();
  await expect(page).toHaveURL(/#\/situations\/mob$/);
  await expect(page.locator('main h1')).toHaveText('Человек за бортом');
});

test('травма или болезнь: MAYDAY и PAN-PAN, PAN-PAN ведёт к шаблону срочности', async ({ page }) => {
  await page.goto('./#/situations/medical');
  await expect(callButtons(page)).toHaveText(['MAYDAY - шаблон вызова', 'PAN-PAN - шаблон вызова']);
  await expect(callButtons(page).nth(0)).toHaveClass(/\balarm-button\b/);
  await expect(callButtons(page).nth(1)).toHaveClass(/\bprimary\b/);
  await expect(callButtons(page).nth(1)).not.toHaveClass(/\balarm-button\b/);
  await page.getByRole('link', { name: 'PAN-PAN - шаблон вызова' }).click();
  await expect(page).toHaveURL(/#\/more\/vhf\/vhf-panpan\?from=situations\/medical$/);
  await expect(page.locator('#vhf-vhf-panpan')).toBeInViewport({ ratio: 0.5 });
  await page.getByRole('link', { name: '‹ Назад' }).click();
  await expect(page).toHaveURL(/#\/situations\/medical$/);
});

test('ситуация, в шагах которой нет радиовызова, без кнопок вызова', async ({ page }) => {
  await page.goto('./#/situations/squall');
  await expect(page.locator('button.check').first()).toBeVisible();
  await expect(page.locator('.calls, .call-button')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /MAYDAY|PAN-PAN/ })).toHaveCount(0);
});

test('«Назад» с экрана УКВ-радио: к ситуации только по явному from, иначе в «Ещё»', async ({ page }) => {
  const back = page.getByRole('link', { name: '‹ Назад' });
  // Открыто сразу по ссылке, без истории переходов.
  await page.goto('./#/more/vhf/vhf-panpan?from=situations/medical');
  await expect(back).toHaveAttribute('href', '#/situations/medical');
  const cases = ['#/more/vhf/vhf-mayday', '#/more/vhf/vhf-mayday?from=situations/nope',
    '#/more/vhf/vhf-mayday?from=https://example.com', '#/more/vhf?from=more'];
  for (const hash of cases) {
    await page.goto(`./${hash}`);
    await expect(page.getByRole('heading', { name: 'УКВ-радио', level: 1 })).toBeVisible();
    await expect(back, hash).toHaveAttribute('href', '#/more');
  }
});

test('неизвестный раздел УКВ, слеш в конце или странный id открывают обычный экран УКВ-радио', async ({ page }) => {
  for (const hash of ['#/more/vhf/nope', '#/more/vhf/', '#/more/vhf/Foo.Bar', '#/more/vhf/a/b']) {
    await page.goto(`./${hash}`);
    await expect(page.getByRole('heading', { name: 'УКВ-радио', level: 1 }), hash).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Не найдено' })).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY), hash).toBe(0);
    await expect(page.locator('.flash')).toHaveCount(0);
    await expect(page.getByRole('link', { name: '‹ Назад' })).toHaveAttribute('href', '#/more');
  }
});

// Плашки обновления и предупреждения прилипают к верху экрана: раздел не должен уехать под них.
test('раздел, открытый ссылкой, не прячется под плашкой сверху', async ({ page }) => {
  const openBelow = async (bar) => {
    await page.evaluate(() => { location.hash = '#/more/vhf/vhf-panpan'; });
    const section = page.locator('#vhf-vhf-panpan');
    await expect(section.locator('h2')).toBeFocused();
    await expect(section).toBeInViewport({ ratio: 0.5 });
    const gap = await page.evaluate((sel) => {
      const top = document.querySelector('#vhf-vhf-panpan').getBoundingClientRect().top;
      return top - document.querySelector(sel).getBoundingClientRect().bottom;
    }, bar);
    expect(gap, bar).toBeGreaterThanOrEqual(8);
  };

  // Повреждённый прогресс - приложение само показывает предупреждение.
  await page.goto('./#/more');
  await page.evaluate(() => localStorage.setItem('pocket-skipper:v1', '{broken'));
  await page.reload();
  await expect(page.locator('#notice')).toBeVisible();
  await openBelow('#notice');

  // Плашка «Доступна новая версия» появляется от service worker; здесь показываем её сами.
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/more');
  await page.reload();
  await expect(page.locator('#notice')).toBeHidden();
  await page.evaluate(() => {
    const banner = document.getElementById('banner');
    banner.textContent = 'Доступна новая версия.';
    banner.hidden = false;
  });
  await openBelow('#banner');
});

test('подсветка раздела снимается и без анимации (prefers-reduced-motion)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/more/vhf/vhf-mayday');
  const section = page.locator('#vhf-vhf-mayday');
  await expect(section).toHaveClass(/\bflash\b/);
  await expect(section).not.toHaveClass(/\bflash\b/, { timeout: 4000 });
});

// Обход ошибки WebKit на iPhone: приложение с экрана Домой и status-bar-style black-translucent.
// Там высота документа (100%) меньше экрана на верхний safe area, и таб-бар (fixed; bottom: 0)
// на короткой странице висит над низом экрана. Chromium эту ошибку не повторяет, поэтому тесты
// ниже проверяют только, что обход включается там и только там, где нужен: iOS в режиме
// приложения (navigator.standalone === true). Сам зазор проверяется лишь на реальном iPhone.
const SAFE_AREA = { top: 47, bottom: 34 };

async function withSafeArea(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: SAFE_AREA });
}

const measure = (page) => page.evaluate(() => {
  const html = document.documentElement;
  return {
    iosStandalone: html.classList.contains('ios-standalone'),
    minHeight: getComputedStyle(html).minHeight,
    viewport: window.innerHeight,
    doc: html.getBoundingClientRect().height,
    scroll: html.scrollHeight,
    tabbar: document.querySelector('.tabbar').getBoundingClientRect().bottom,
  };
});

test('iOS в режиме приложения: документ выше экрана на верхний safe area, таб-бар у низа', async ({ page }) => {
  await withSafeArea(page);
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true }));
  for (const hash of ['#/today', '#/maneuvers', '#/situations']) {
    await page.goto(`./${hash}`);
    await expect(page.locator('main h1')).toBeVisible();
    const m = await measure(page);
    expect(m.iosStandalone, hash).toBe(true);
    expect(m.minHeight, hash).toBe(`calc(100% + ${SAFE_AREA.top}px)`);
    expect(m.doc, hash).toBeGreaterThanOrEqual(m.viewport + SAFE_AREA.top);
    expect(m.tabbar, hash).toBe(m.viewport);
  }
});

test('в обычном браузере обход выключен и короткая страница не прокручивается', async ({ page }) => {
  await withSafeArea(page);
  await page.goto('./#/today');
  await expect(page.locator('main h1')).toBeVisible();
  const m = await measure(page);
  expect(m.iosStandalone).toBe(false);
  expect(m.minHeight).toBe('100%');
  expect(m.doc).toBe(m.viewport);
  expect(m.scroll).toBe(m.viewport);
  expect(m.tabbar).toBe(m.viewport);
});

test('установленное приложение не на iOS (display-mode: standalone) обход не включает', async ({ page }) => {
  await withSafeArea(page);
  // Android и десктоп: navigator.standalone нет, но display-mode: standalone совпадает.
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => (/display-mode:\s*standalone/.test(query)
      ? { matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }
      : original(query));
  });
  await page.goto('./#/today');
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true);
  const m = await measure(page);
  expect(m.iosStandalone).toBe(false);
  expect(m.minHeight).toBe('100%');
  expect(m.scroll).toBe(m.viewport);
});

// CSS-дубль обхода нужен, чтобы на iOS не было скачка до запуска JS. Chromium его условие
// не выполняет, поэтому проверяем только устройство правила: @supports (-webkit-touch-callout)
// есть лишь в WebKit на iOS (media-признака -webkit-touch-callout нет ни в одном браузере).
test('CSS-дубль обхода ограничен iOS в режиме приложения', async ({ page }) => {
  await page.goto('./#/today');
  await expect(page.locator('main h1')).toBeVisible();
  const rule = await page.evaluate(() => {
    const sheet = [...document.styleSheets].find((s) => s.href?.includes('css/app.css'));
    const supports = [...sheet.cssRules].find((r) => r instanceof CSSSupportsRule && r.conditionText === '(-webkit-touch-callout: none)');
    const media = [...(supports?.cssRules ?? [])].find((r) => r instanceof CSSMediaRule);
    const style = [...(media?.cssRules ?? [])].find((r) => r.selectorText === 'html');
    return {
      media: media?.media.mediaText,
      minHeight: style?.style.getPropertyValue('min-height'),
      appliesHere: CSS.supports('-webkit-touch-callout', 'none'),
    };
  });
  expect(rule.media).toBe('(display-mode: standalone)');
  expect(rule.minHeight).toMatch(/calc\(100% \+ env\(safe-area-inset-top/);
  expect(rule.appliesHere).toBe(false);
});
