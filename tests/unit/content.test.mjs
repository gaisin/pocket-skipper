import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatSource, formatSources } from '../../site/js/sources.js';
import { CONTENT_FILES, loadContent } from '../../site/js/content.js';
import { validateContent } from '../../scripts/lib/validate-content.mjs';

async function realContent() {
  const entries = await Promise.all(CONTENT_FILES.map(async (name) =>
    [name, JSON.parse(await readFile(new URL(`../../site/content/${name}.json`, import.meta.url)))]));
  return Object.fromEntries(entries);
}

const src = (extra = {}) => ({ sources: [{ type: 'colregs', rule: 26 }], verified: false, ...extra });

function minimal() {
  return {
    questions: { topics: [{ id: 'lights', title: 'Огни' }], questions: [src({
      id: 'q-1', topic: 'lights', text: 'Вопрос?', explain: 'Потому что.',
      options: [{ text: 'Да', correct: true }, { text: 'Нет' }],
    })] },
    situations: { situations: [src({ id: 's-1', title: 'MOB', severity: 'emergency', summary: 'x', steps: [{ text: 'Крикнуть' }] })] },
    maneuvers: { maneuvers: [src({ id: 'm-1', title: 'Оверштаг', summary: 'x',
      scene: { label: 'схема', wind: 0, elements: [{ type: 'buoy', x: 10, y: 10 }] },
      steps: [{ who: 'Шкипер', command: 'Поворот!', text: 'x', pose: { x: 130, y: 120, rot: -45, boom: 20 } }] })] },
    checklists: { checklists: [src({ id: 'c-1', title: 'Сборы', intro: 'x',
      groups: [{ title: 'Документы', items: [{ id: 'passport', text: 'Паспорт' }] }] })] },
    vhf: { sections: [src({ id: 'v-1', title: 'Каналы', kind: 'channels', rows: [{ ch: '16', use: 'бедствие' }] })] },
    reference: { sections: [src({ id: 'r-1', title: 'Знаки', kind: 'marks', rows: [{ label: 'Северный', value: 'x', mark: 'north' }] })] },
    external: { links: [{ id: 'e-1', title: 'SailQuiz', url: 'https://sailquiz.com/quiz', lang: 'en', note: 'x', accessed: '2026-09-16' }] },
  };
}

test('форматирование источников', () => {
  assert.equal(formatSource({ type: 'iyt', module: 2, section: 8, page: 57 }), 'IYT BBS, модуль 2, секция 8, с. 57');
  assert.equal(formatSource({ type: 'iyt', module: 7, page: 93 }), 'IYT BBS, модуль 7, с. 93');
  assert.equal(formatSource({ type: 'colregs', rule: 26 }), 'МППСС-72, пр. 26');
  assert.equal(formatSource({ type: 'colregs', annex: 'I' }), 'МППСС-72, прил. I');
  assert.equal(formatSource({ type: 'iala', topic: 'cardinal' }), 'IALA, кардинальные знаки');
  assert.equal(formatSource({ type: 'web', title: 'SailQuiz', url: 'https://x', accessed: '2026-09-16' }), 'SailQuiz, 2026-09-16');
  assert.equal(formatSources([{ type: 'colregs', rule: 26 }, { type: 'iala', topic: 'special' }]), 'МППСС-72, пр. 26 · IALA, специальные знаки');
  assert.throws(() => formatSource({ type: 'blog' }), /Неизвестный тип/);
});

test('минимальное корректное содержание проходит проверку', () => {
  assert.deepEqual(validateContent(minimal()), []);
});

test('запись без источника не проходит', () => {
  const c = minimal();
  c.situations.situations[0].sources = [];
  assert.match(validateContent(c).join('\n'), /s-1: нет источников/);
});

test('повтор id не проходит', () => {
  const c = minimal();
  c.situations.situations[0].id = 'q-1';
  assert.match(validateContent(c).join('\n'), /q-1: id повторяется/);
});

test('вопрос с двумя верными ответами не проходит', () => {
  const c = minimal();
  c.questions.questions[0].options[1].correct = true;
  assert.match(validateContent(c).join('\n'), /ровно один верный/);
});

test('неполный источник не проходит', () => {
  const c = minimal();
  c.vhf.sections[0].sources = [{ type: 'iyt', module: 7 }];
  c.reference.sections[0].sources = [{ type: 'web', title: 'x', url: 'http://x', accessed: 'вчера' }];
  const text = validateContent(c).join('\n');
  assert.match(text, /v-1: iyt: нет page/);
  assert.match(text, /r-1: web: url должен начинаться с https/);
  assert.match(text, /r-1: web: accessed/);
});

test('неизвестный элемент схемы и опасный path не проходят', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].scene.elements.push({ type: 'rocket' }, { type: 'path', d: 'M0 0"/><script>' });
  const text = validateContent(c).join('\n');
  assert.match(text, /неизвестный элемент rocket/);
  assert.match(text, /path: недопустимые символы/);
});

test('неизвестный вид знака и неверный verified не проходят', () => {
  const c = minimal();
  c.reference.sections[0].rows[0].mark = 'north-east';
  c.vhf.sections[0].verified = 'yes';
  const text = validateContent(c).join('\n');
  assert.match(text, /неизвестный знак north-east/);
  assert.match(text, /v-1: verified должен быть true или false/);
});

test('loadContent грузит все файлы и сообщает об ошибке', async () => {
  const ok = await loadContent(async (url) => ({ ok: true, json: async () => ({ url }) }));
  assert.equal(ok.vhf.url, 'content/vhf.json');
  await assert.rejects(loadContent(async () => ({ ok: false, status: 404 })), /content\/questions\.json: 404/);
});

test('IALA тема не может быть из прототипа (toString/constructor)', () => {
  assert.throws(() => formatSource({ type: 'iala', topic: 'toString' }), /Неизвестная тема IALA/);
  assert.throws(() => formatSource({ type: 'iala', topic: 'constructor' }), /Неизвестная тема IALA/);
  const c = minimal();
  c.reference.sections[0].sources = [{ type: 'iala', topic: 'toString' }];
  assert.match(validateContent(c).join('\n'), /r-1: iala: неизвестная тема toString/);
});

test('элемент сцены может указать видимые шаги, но они должны быть валидны', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].scene.elements[0].steps = [5];
  assert.match(validateContent(c).join('\n'), /steps должны быть номерами шагов 0\.\.0/);
  c.maneuvers.maneuvers[0].scene.elements[0].steps = [0];
  assert.deepEqual(validateContent(c), []);
});

test('реальное содержание репозитория проходит проверку', async () => {
  assert.deepEqual(validateContent(await realContent()), []);
});
