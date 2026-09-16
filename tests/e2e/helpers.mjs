import { readFileSync } from 'node:fs';

export function content(name) {
  return JSON.parse(readFileSync(new URL(`../../site/content/${name}.json`, import.meta.url), 'utf8'));
}
