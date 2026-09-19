// Скриншоты всех шагов манёвров для ревью схем.
// Запуск: сначала `npm run serve`, затем `npm run shots -- [id ...] [--out папка]` (по умолчанию .local/shots).
// Для манёвра с mirror: true снимает обе стороны заброса: <id>-left-01.png, <id>-right-01.png...
// Порт сервера - переменная PORT (по умолчанию 4173), одна и та же для serve и shots.
import { chromium, devices } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const BASE = `http://127.0.0.1:${process.env.PORT ?? 4173}/`;
const STORAGE_KEY = 'pocket-skipper:v1';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const outDir = outAt >= 0 ? args[outAt + 1] : '.local/shots';
const ids = outAt >= 0 ? args.filter((_, i) => i !== outAt && i !== outAt + 1) : args;

const data = JSON.parse(await readFile(new URL('../site/content/maneuvers.json', import.meta.url), 'utf8'));
const missing = ids.filter((id) => !data.maneuvers.some((m) => m.id === id));
if (missing.length) throw new Error(`Нет таких манёвров: ${missing.join(', ')}`);
const chosen = ids.length ? data.maneuvers.filter((m) => ids.includes(m.id)) : data.maneuvers;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const m of chosen) {
    for (const walk of m.mirror ? ['left', 'right'] : [undefined]) {
      const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce', serviceWorkers: 'block' });
      if (walk) {
        const state = JSON.stringify({ version: 1, cards: {}, checks: {}, settings: { propWalk: walk } });
        await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, state]);
      }
      const page = await context.newPage();
      await page.goto(`${BASE}#/maneuvers/${m.id}`);
      for (let i = 0; i < m.steps.length; i += 1) {
        await page.getByText(`Шаг ${i + 1} из ${m.steps.length}`).waitFor();
        const name = `${m.id}${walk ? `-${walk}` : ''}-${String(i + 1).padStart(2, '0')}.png`;
        await page.locator('.view').screenshot({ path: `${outDir}/${name}` });
        if (i < m.steps.length - 1) await page.getByRole('button', { name: 'Дальше' }).click();
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`Скриншоты: ${outDir}`);
