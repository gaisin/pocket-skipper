import { readFile } from 'node:fs/promises';
import { CONTENT_FILES } from '../site/js/content.js';
import { validateContent, contentStats, longestCorrectShare } from './lib/validate-content.mjs';

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

const LONGEST_WARN_SHARE = 0.4;
const percent = (x) => `${Math.round(x * 100)}%`;
const lengths = longestCorrectShare(content.questions.questions);
if (lengths.share > LONGEST_WARN_SHARE) {
  console.warn(`Предупреждение: верный ответ - самый длинный в ${lengths.longest} из ${lengths.total} вопросов (${percent(lengths.share)}, порог ${percent(LONGEST_WARN_SHARE)}).`);
  const worst = lengths.topics.slice(0, 3).map((t) => `${t.topic} ${t.longest}/${t.total}`);
  console.warn(`  Хуже всего: ${worst.join(', ')}`);
}
