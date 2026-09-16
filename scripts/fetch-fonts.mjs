import { mkdir, writeFile } from 'node:fs/promises';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500..600&family=Onest:wght@400..600&family=JetBrains+Mono:wght@400..600&display=swap';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const SUBSETS = new Set(['cyrillic', 'latin']);

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();
const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*(@font-face \{[^}]+\})/g)];
await mkdir(new URL('../site/fonts/', import.meta.url), { recursive: true });

const out = [];
for (const [, subset, block] of blocks) {
  if (!SUBSETS.has(subset)) continue;
  const family = /font-family: '([^']+)'/.exec(block)[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(block)[1];
  const file = `${family.toLowerCase().replace(/\s+/g, '-')}-${subset}.woff2`;
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(new URL(`../site/fonts/${file}`, import.meta.url), bytes);
  out.push(block.replace(/src: url\([^)]+\)/, `src: url(../fonts/${file})`));
  console.log(`${file}: ${bytes.length} байт`);
}
if (out.length !== 6) throw new Error(`Ожидалось 6 файлов шрифтов, получено ${out.length}`);
await writeFile(new URL('../site/css/fonts.css', import.meta.url), `${out.join('\n')}\n`);
