import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listSiteAssets, readSwAssets } from '../../scripts/update-sw-assets.mjs';

const site = new URL('../../site/', import.meta.url);

test('sw.js кеширует ровно все файлы сайта', async () => {
  const sw = await readFile(new URL('sw.js', site), 'utf8');
  assert.deepEqual(readSwAssets(sw), ['./', ...(await listSiteAssets(site))]);
});

test('sw.js содержит метку версии для деплоя', async () => {
  const sw = await readFile(new URL('sw.js', site), 'utf8');
  assert.match(sw, /const VERSION = '__BUILD__';/);
});
