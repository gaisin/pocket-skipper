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

test('манёвр с видео показывает ссылки на YouTube во внешней вкладке', async ({ page }) => {
  const maneuver = content('maneuvers').maneuvers.find((m) => m.videos?.length);
  expect(maneuver, 'хотя бы у одного манёвра есть видео').toBeTruthy();
  await page.goto(`./#/maneuvers/${maneuver.id}`);

  const block = page.locator('.videos');
  await expect(block.getByRole('heading', { name: 'Видео' })).toBeVisible();
  const links = block.getByRole('link');
  await expect(links).toHaveCount(maneuver.videos.length);
  for (const [i, video] of maneuver.videos.entries()) {
    const link = links.nth(i);
    await expect(link).toContainText(video.title);
    await expect(link).toContainText('нужен интернет');
    await expect(link).toHaveAttribute('href', video.url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener');
    // Экранный диктор предупреждает, что ссылка уводит из приложения; на экране пометки не видно.
    await expect(link).toHaveAccessibleName(new RegExp(`${video.title}.*\\(откроется во внешнем приложении\\)`));
    const hint = link.getByText('(откроется во внешнем приложении)');
    await expect(hint).toHaveCount(1);
    expect(await hint.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  }

  // Видео стоят под шагами и над подписью источников.
  const order = await page.evaluate(() => {
    const kids = [...document.querySelector('.view').children];
    return ['ctrl', 'videos', 'sources'].map((c) => kids.findIndex((el) => el.classList.contains(c)));
  });
  expect(order[0]).toBeLessThan(order[1]);
  expect(order[1]).toBeLessThan(order[2]);
});

test('манёвр без видео не показывает пустой блок', async ({ page }) => {
  // Сейчас видео есть у всех манёвров, поэтому у одного их убираем в ответе сервера.
  const data = content('maneuvers');
  const without = data.maneuvers[0];
  delete without.videos;
  await page.route('**/content/maneuvers.json*', (route) => route.fulfill({ json: data }));
  await page.goto(`./#/maneuvers/${without.id}`);
  await expect(page.locator('.step-text')).toBeVisible();
  await expect(page.locator('.videos')).toHaveCount(0);
});
