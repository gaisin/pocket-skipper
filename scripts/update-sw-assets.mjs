import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, join } from 'node:path';

const IGNORED = new Set(['sw.js', '.DS_Store']);
const START = '// ASSETS:start';
const END = '// ASSETS:end';

export async function listSiteAssets(siteDir) {
  const root = fileURLToPath(siteDir);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && !IGNORED.has(e.name))
    .map((e) => relative(root, join(e.parentPath, e.name)).split('\\').join('/'))
    .sort();
}

export function readSwAssets(source) {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < start) throw new Error('В sw.js нет меток ASSETS:start/ASSETS:end');
  const body = source.slice(start + START.length, end).trim().replace(/^const ASSETS = /, '').replace(/;$/, '');
  return JSON.parse(body);
}

async function main() {
  const site = new URL('../site/', import.meta.url);
  const swUrl = new URL('sw.js', site);
  const source = await readFile(swUrl, 'utf8');
  const assets = ['./', ...(await listSiteAssets(site))];
  const block = `${START}\nconst ASSETS = ${JSON.stringify(assets, null, 2)};\n${END}`;
  const next = source.slice(0, source.indexOf(START)) + block + source.slice(source.indexOf(END) + END.length);
  await writeFile(swUrl, next);
  console.log(`sw.js: ${assets.length} файлов в кеше`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
