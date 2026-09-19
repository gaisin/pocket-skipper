import { test, expect } from '@playwright/test';
import { content } from './helpers.mjs';

// Тестовый зеркальный манёвр подставляется в maneuvers.json, чтобы тесты не зависели от содержания.
function withMirrorDemo() {
  const data = content('maneuvers');
  const demo = {
    id: 'mirror-demo', group: data.groups[0].id, mirror: true,
    title: 'Лагом [[левым|правым]] бортом', summary: 'Причал [[слева|справа]]',
    scene: { label: 'Причал [[слева|справа]]', wind: 270, power: true, elements: [
      { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
      { type: 'arrow', x1: 130, y1: 150, x2: 110, y2: 150, kind: 'walk' },
    ] },
    steps: [
      { who: 'Рулевой', text: 'Подойти [[левым|правым]] бортом', pose: { x: 60, y: 100, rot: 0 } },
      { who: 'Рулевой', text: 'Шаг два', pose: { x: 50, y: 100, rot: 10 } },
    ],
    sources: [{ type: 'iyt', module: 2, section: 7, page: 53 }], verified: false,
  };
  return { ...data, maneuvers: [demo, ...data.maneuvers] };
}

test.beforeEach(async ({ page }) => {
  const data = withMirrorDemo();
  await page.route('**/content/maneuvers.json*', (route) => route.fulfill({ json: data }));
});

test('список манёвров разбит на группы', async ({ page }) => {
  const data = withMirrorDemo();
  await page.goto('./#/maneuvers');
  for (const g of data.groups.filter((x) => data.maneuvers.some((m) => m.group === x.id))) {
    await expect(page.getByRole('heading', { name: g.title, level: 2 })).toBeVisible();
  }
});

test('без настройки - схема для заброса влево и заметка о проверке', async ({ page }) => {
  await page.goto('./#/maneuvers/mirror-demo');
  await expect(page.getByRole('heading', { name: 'Лагом левым бортом', level: 1 })).toBeVisible();
  await expect(page.locator('.walk-note')).toBeVisible();
  await expect(page.locator('.step-text')).toHaveText('Подойти левым бортом');
  await expect(page.locator('.scene .boat')).toHaveAttribute('style', /translate\(60px, 100px\) rotate\(0deg\)/);
});

test('переключатель зеркалит схему, меняет текст, сохраняет шаг и запоминается', async ({ page }) => {
  await page.goto('./#/maneuvers/mirror-demo');
  await page.getByRole('button', { name: 'Дальше' }).click();
  await page.getByRole('button', { name: 'Вправо' }).click();
  await expect(page.getByText('Шаг 2 из 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Лагом правым бортом', level: 1 })).toBeVisible();
  await expect(page.locator('.scene .boat')).toHaveAttribute('style', /translate\(210px, 100px\) rotate\(-10deg\)/);
  await expect(page.locator('.scene .quay')).toHaveAttribute('x', '240');
  await expect(page.locator('.walk-note')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Вправо' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('./#/more/settings');
  await expect(page.locator('#propWalk')).toHaveValue('right');
  await page.goto('./#/maneuvers');
  await expect(page.locator('a[href="#/maneuvers/mirror-demo"]')).toContainText('Лагом правым бортом');
});

test('в настройках сторону можно вернуть в «не проверено»', async ({ page }) => {
  await page.goto('./#/more/settings');
  await page.selectOption('#propWalk', 'right');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.selectOption('#propWalk', '');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.goto('./#/maneuvers/mirror-demo');
  await expect(page.locator('.walk-note')).toBeVisible();
});

test('у манёвра со стрелкой заброса видна легенда, про снос речи нет', async ({ page }) => {
  await page.goto('./#/maneuvers/mirror-demo');
  const legend = page.locator('.scene-legend');
  await expect(legend).toBeVisible();
  await expect(legend).toContainText('заброс кормы на заднем ходу');
  await expect(legend).not.toContainText('снос ветром');
});

test('у манёвра без стрелок на схеме легенды нет', async ({ page }) => {
  await page.goto('./#/maneuvers/tack');
  await expect(page.locator('.scene-legend')).toHaveCount(0);
});

test('кнопки «Влево» и «Вправо» стоят в одной строке на iPhone 13', async ({ page }) => {
  await page.goto('./#/maneuvers/mirror-demo');
  const left = page.getByRole('button', { name: 'Влево' });
  const right = page.getByRole('button', { name: 'Вправо' });
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()]);
  expect(leftBox.y).toBe(rightBox.y);
});

test('контейнер переключателя стороны имеет класс walk-control, а не walk', async ({ page }) => {
  await page.goto('./#/maneuvers/mirror-demo');
  const control = page.locator('.walk-control');
  await expect(control).toHaveCount(1);
  const classes = (await control.getAttribute('class')).split(' ');
  expect(classes).not.toContain('walk');
});
