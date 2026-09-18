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

const { guides } = content('guides');

test('в «Ещё» есть оба гайда, после чек-листов и перед справочником', async ({ page }) => {
  expect(guides.map((g) => g.id)).toEqual(expect.arrayContaining(['fethiye', 'money']));
  await page.goto('./#/more');
  // Меню строится после загрузки содержания - дождаться ссылки на справочник, иначе список может быть пустым.
  await expect(page.locator('.list a[href="#/more/reference"]')).toBeVisible();
  const hrefs = await page.locator('.list a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  const lastChecklist = Math.max(...content('checklists').checklists.map((c) => hrefs.indexOf(`#/more/checklist/${c.id}`)));
  const guideAt = guides.map((g) => hrefs.indexOf(`#/more/guide/${g.id}`));
  expect(guideAt.every((i) => i > lastChecklist), JSON.stringify(hrefs)).toBe(true);
  expect(Math.max(...guideAt)).toBeLessThan(hrefs.indexOf('#/more/reference'));
});

for (const guide of guides) {
  test(`гайд «${guide.title}»: ссылка из меню, разделы, советы и источники`, async ({ page }) => {
    await page.goto('./#/more');
    await page.getByRole('link', { name: new RegExp(`^${guide.title}`) }).click();
    await expect(page).toHaveURL(new RegExp(`#/more/guide/${guide.id}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(guide.title);
    await expect(page.getByText(guide.summary)).toBeVisible();
    await expect(page.getByRole('link', { name: '‹ Назад' })).toHaveAttribute('href', '#/more');

    const sections = page.locator('.guide-section');
    await expect(sections).toHaveCount(guide.sections.length);
    for (const [i, section] of guide.sections.entries()) {
      const block = sections.nth(i);
      await expect(block.getByRole('heading', { level: 2 })).toHaveText(section.title);
      const tips = block.locator('.tip');
      await expect(tips).toHaveCount(section.tips.length);
      for (const [j, tip] of section.tips.entries()) {
        const item = tips.nth(j);
        await expect(item.locator('.tip-text')).toHaveText(tip.text);
        await expect(item.locator('.tip-note')).toHaveCount(tip.note ? 1 : 0);
        const web = tip.sources.filter((s) => s.type === 'web');
        const links = item.locator('.sources a');
        await expect(links).toHaveCount(web.length);
        for (const [k, src] of web.entries()) {
          await expect(links.nth(k)).toHaveAttribute('href', src.url);
          await expect(links.nth(k)).toHaveAttribute('target', '_blank');
          await expect(links.nth(k)).toHaveAttribute('rel', 'noopener');
        }
      }
    }
    await expect(page.locator('.badge-unverified')).toHaveCount(guide.verified ? 0 : 1);
  });
}

test('несверенный гайд помечен, пояснение и не-веб источник показаны', async ({ page }) => {
  const fixture = { guides: [{
    id: 'test-guide', title: 'Проверка', summary: 'Коротко', verified: false,
    sections: [{ title: 'Раздел', tips: [
      { text: 'Совет с пояснением', note: 'Почему так', sources: [{ type: 'colregs', rule: 26 }] },
      { text: 'Совет с веб-источником', sources: [{ type: 'web', title: 'Сайт', url: 'https://example.com/a', accessed: '2026-09-18' }] },
    ] }],
  }] };
  await page.route('**/content/guides.json*', (route) => route.fulfill({ json: fixture }));
  await page.goto('./#/more/guide/test-guide');
  await expect(page.locator('.badge-unverified')).toHaveText('не сверено');
  const tips = page.locator('.tip');
  await expect(tips.nth(0).locator('.tip-note')).toHaveText('Почему так');
  // Разбор сценария («Кто платит / Сразу / Сохранить») пишется с переводами строк - они видны.
  await expect(tips.nth(0).locator('.tip-note')).toHaveCSS('white-space', 'pre-line');
  await expect(tips.nth(0).locator('.sources')).toHaveText('МППСС-72, пр. 26');
  await expect(tips.nth(0).locator('.sources a')).toHaveCount(0);
  await expect(tips.nth(1).locator('.sources a')).toHaveText('Сайт, 2026-09-18');
});

test('неизвестный гайд - «Не найдено»', async ({ page }) => {
  await page.goto('./#/more/guide/nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Не найдено');
});
