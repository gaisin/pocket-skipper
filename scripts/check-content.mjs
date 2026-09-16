import { readFile } from 'node:fs/promises';
import { CONTENT_FILES } from '../site/js/content.js';
import { validateContent, contentStats } from './lib/validate-content.mjs';

const content = {};
for (const name of CONTENT_FILES) {
  const path = new URL(`../site/content/${name}.json`, import.meta.url);
  try {
    content[name] = JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    console.error(`site/content/${name}.json: ${err.message}`);
    process.exit(1);
  }
}

const errors = validateContent(content);
const { total, unverified } = contentStats(content);
if (errors.length) {
  console.error(`Ошибок в содержании: ${errors.length}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`Содержание в порядке: ${total} записей, не сверено ${unverified.length}.`);
if (unverified.length) console.log(`  Не сверены: ${unverified.join(', ')}`);
