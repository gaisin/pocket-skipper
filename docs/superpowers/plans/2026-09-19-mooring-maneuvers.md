# Швартовки и отходы - план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 15 новых манёвров швартовки и отхода со схемами, которые зеркалятся по стороне заброса кормы, справка «Швартовка и отход», 12-15 вопросов и правки чек-листа приёмки.

**Architecture:** статический сайт `site/` без сборки (HTML, CSS, ES-модули).
Зеркалирование - чистый модуль `site/js/diagrams/mirror.js`: берёт манёвр и сторону заброса, возвращает манёвр с подставленными сторонами в тексте и отражённой схемой; экран манёвра рисует результат существующим `renderScene`.
Содержание - `site/content/*.json`, проверка `npm run check`.

**Tech Stack:** JavaScript (ES2022, ES-модули), Node 22 `node:test`, Playwright (уже установлен), Python `http.server` для локального сервера.

**Spec:** `docs/superpowers/specs/2026-09-19-mooring-maneuvers-design.md`

## Global Constraints

- Ничего не устанавливать (`npm install`, `brew`, `pip`, плагины); уже есть `@playwright/test` и `chromium_headless_shell` в кеше Playwright.
- Полный Chrome for Testing на этой машине зависает; для скриншотов - только headless (`chromium.launch()` без `headless: false`).
- Коммиты - от локального конфига репозитория (gaisin), без строк Co-Authored-By; глобальный git-конфиг не трогать; не пушить.
- Русский текст, обычный дефис «-» вместо длинного тире; в длинных Markdown-файлах каждое предложение с новой строки.
- Каждый факт - из источника, который реально открыт в этой сессии; из памяти не писать; неподтверждённое не писать.
- Пересказ своими словами; текст и картинки учебника IYT и руководства Dufour не копировать (репозиторий публичный).
- Номер страницы учебника IYT - печатный: печатная = страница PDF минус 1; текст учебника - `.local/iyt_bbs.txt` (маркеры `=== PAGE N ===` - это номера PDF).
- При чтении текста учебника не удалять повторяющиеся строки (`awk '!seen[$0]++'` теряет законные повторы).
- Руководство Dufour 430 GL - `.local/dufour/dufour430gl-manual.txt` и PDF рядом; там номер PDF-страницы совпадает с печатным; отрисовать страницу в PNG: `osascript -l JavaScript .local/dufour/render-page.js <pdf> <папка> <номер...>`.
- Веб-источник - `{ "type": "web", "title", "url", "accessed": "2026-09-19" }` (дата фактического обращения).
- Видео Sailing Time - только в поле `videos`, не источник.
- `verified: true` ставится только вместе со строкой в `docs/content-log.md` (id, источник, что сверено, дата).
- Не править `CHANGELOG.md` и авто-генерируемые файлы вручную; список файлов в `site/sw.js` обновлять только через `npm run assets`.
- Перед коммитом: `npm run check`, `npm test`; перед сдачей задачи ещё и `npm run e2e`.

---

### Task 1: Группы манёвров, сторона заброса и зеркальные схемы (код)

**Files:**
- Create: `site/js/diagrams/mirror.js`, `tests/unit/mirror.test.mjs`, `tests/e2e/maneuvers.spec.mjs`, `scripts/shoot-maneuvers.mjs`
- Modify: `site/js/diagrams/scene.js`, `site/js/diagrams/svg.js`, `site/js/views/maneuvers.js`, `site/js/views/settings.js`, `site/js/storage.js`, `scripts/lib/validate-content.mjs`, `site/css/app.css`, `site/content/maneuvers.json` (только `groups` и `group`), `tests/unit/content.test.mjs`, `tests/unit/diagrams.test.mjs`, `tests/unit/storage.test.mjs`, `tests/e2e/app.spec.mjs:234-241`, `package.json` (скрипт `shots`), `site/sw.js` (через `npm run assets`)

**Interfaces:**
- Produces (для задач 2-4):
  - `maneuvers.json`: верхний уровень `groups: [{ id, title }]`; у манёвра обязательное `group`, необязательное `mirror: true`.
  - Пары сторон в тексте зеркального манёвра: `[[вариант для «влево»|вариант для «вправо»]]`.
  - Элемент схемы `{ "type": "arrow", "x1", "y1", "x2", "y2", "kind": "walk" | "drift" }`, необязательное `steps`.
  - У `label` необязательное `"anchor": "start" | "end"`.
  - В зеркальном манёвре `path.d` - только `M L Q C Z` (заглавные, абсолютные).
  - Настройка `settings.propWalk`: `'left' | 'right'`, нет ключа - «не проверено».
  - `mirror.js`: `SCENE_WIDTH`, `resolveSides(text, walk)`, `stripSidePairs(text)`, `mirrorPose(pose)`, `mirrorPath(d)`, `mirrorScene(scene)`, `maneuverFor(maneuver, walk)`.
  - Скрипт `npm run shots -- <id ...> [--out <папка>]` - PNG каждого шага; для `mirror: true` - обе стороны.

- [ ] **Step 1: Тесты модуля зеркалирования**

Создать `tests/unit/mirror.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSides, stripSidePairs, mirrorPose, mirrorPath, mirrorScene, maneuverFor, SCENE_WIDTH } from '../../site/js/diagrams/mirror.js';

test('ширина сцены - 260', () => {
  assert.equal(SCENE_WIDTH, 260);
});

test('resolveSides выбирает вариант по стороне заброса', () => {
  const text = 'Подойти [[левым|правым]] бортом, корму уводит [[влево|вправо]]';
  assert.equal(resolveSides(text, 'left'), 'Подойти левым бортом, корму уводит влево');
  assert.equal(resolveSides(text, undefined), 'Подойти левым бортом, корму уводит влево');
  assert.equal(resolveSides(text, 'right'), 'Подойти правым бортом, корму уводит вправо');
  assert.equal(resolveSides('Без пар', 'right'), 'Без пар');
});

test('stripSidePairs убирает только правильные пары', () => {
  assert.equal(stripSidePairs('а [[л|п]] б'), 'а  б');
  assert.equal(stripSidePairs('а [[л]] б'), 'а [[л]] б');
  assert.equal(stripSidePairs('а [[л|п|х]] б'), 'а [[л|п|х]] б');
});

test('mirrorPose отражает x, rot и boom', () => {
  assert.deepEqual(mirrorPose({ x: 60, y: 100, rot: 30, boom: 20 }), { x: 200, y: 100, rot: -30, boom: -20 });
  assert.deepEqual(mirrorPose({ x: 130, y: 100, rot: 0 }), { x: 130, y: 100, rot: 0 });
});

test('mirrorPath отражает x во всех парах координат', () => {
  assert.equal(mirrorPath('M20 150 L195 150 Q170 150 166 125 L164 30'), 'M240 150 L65 150 Q90 150 94 125 L96 30');
  assert.equal(mirrorPath('M10,20 C30,40 50,60 70,80 Z'), 'M250,20 C230,40 210,60 190,80 Z');
  assert.equal(mirrorPath('M10.5 20'), 'M249.5 20');
});

test('mirrorScene отражает все виды элементов и ветер', () => {
  const scene = {
    label: 'x', wind: 270, power: true,
    elements: [
      { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
      { type: 'boat-moored', x: 60, y: 50, rot: 10, steps: [1] },
      { type: 'boat-moored', x: 60, y: 150 },
      { type: 'buoy', x: 30, y: 40 },
      { type: 'anchor', x: 30, y: 40 },
      { type: 'person', x: 30, y: 40 },
      { type: 'label', x: 30, y: 40, text: 'ПРИЧАЛ' },
      { type: 'label', x: 30, y: 40, text: 'А', anchor: 'end' },
      { type: 'line', points: [[10, 20], [30, 40]], dashed: true },
      { type: 'path', d: 'M20 150 L40 30' },
      { type: 'arrow', x1: 100, y1: 150, x2: 80, y2: 150, kind: 'walk' },
    ],
  };
  const m = mirrorScene(scene);
  assert.equal(m.mirrored, true);
  assert.equal(m.wind, 90);
  assert.deepEqual(m.elements, [
    { type: 'quay', x: 240, y: 0, w: 20, h: 200 },
    { type: 'boat-moored', x: 200, y: 50, rot: -10, steps: [1] },
    { type: 'boat-moored', x: 200, y: 150, rot: 0 },
    { type: 'buoy', x: 230, y: 40 },
    { type: 'anchor', x: 230, y: 40 },
    { type: 'person', x: 230, y: 40 },
    { type: 'label', x: 230, y: 40, text: 'ПРИЧАЛ', anchor: 'end' },
    { type: 'label', x: 230, y: 40, text: 'А', anchor: 'start' },
    { type: 'line', points: [[250, 20], [230, 40]], dashed: true },
    { type: 'path', d: 'M240 150 L220 30' },
    { type: 'arrow', x1: 160, y1: 150, x2: 180, y2: 150, kind: 'walk' },
  ]);
  assert.equal(mirrorScene({ ...scene, wind: 0 }).wind, 0);
  assert.equal(mirrorScene({ ...scene, wind: 45 }).wind, 315);
  assert.equal(mirrorScene({ label: 'x', elements: [] }).wind, undefined);
  assert.deepEqual(mirrorScene(mirrorScene(scene)).elements.slice(0, 2), [
    { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
    { type: 'boat-moored', x: 60, y: 50, rot: 10, steps: [1] },
  ]);
});

test('mirrorScene не знает чужих элементов', () => {
  assert.throws(() => mirrorScene({ label: 'x', elements: [{ type: 'rocket' }] }), /Неизвестный элемент/);
});

const demo = {
  id: 'demo', group: 'alongside', mirror: true,
  title: 'Лагом [[левым|правым]] бортом', summary: 'Причал [[слева|справа]]',
  scene: { label: 'Схема [[слева|справа]]', wind: 270, elements: [
    { type: 'quay', x: 0, y: 0, w: 20, h: 200 },
    { type: 'label', x: 30, y: 20, text: '[[ЛЕВЫЙ|ПРАВЫЙ]]' },
  ] },
  steps: [{ who: 'Рулевой', command: '[[Лево|Право]] руля', text: 'Корму уводит [[влево|вправо]]', pose: { x: 60, y: 100, rot: 10 } }],
  sources: [], verified: false,
};

test('maneuverFor без настройки и с «left» - базовый рисунок и первый вариант текста', () => {
  for (const walk of [undefined, 'left']) {
    const m = maneuverFor(demo, walk);
    assert.equal(m.title, 'Лагом левым бортом');
    assert.equal(m.summary, 'Причал слева');
    assert.equal(m.scene.label, 'Схема слева');
    assert.equal(m.scene.elements[1].text, 'ЛЕВЫЙ');
    assert.equal(m.scene.mirrored, undefined);
    assert.equal(m.steps[0].command, 'Лево руля');
    assert.equal(m.steps[0].text, 'Корму уводит влево');
    assert.deepEqual(m.steps[0].pose, { x: 60, y: 100, rot: 10 });
  }
});

test('maneuverFor с «right» - зеркальная схема и второй вариант текста', () => {
  const m = maneuverFor(demo, 'right');
  assert.equal(m.title, 'Лагом правым бортом');
  assert.equal(m.scene.label, 'Схема справа');
  assert.equal(m.scene.mirrored, true);
  assert.equal(m.scene.wind, 90);
  assert.deepEqual(m.scene.elements[0], { type: 'quay', x: 240, y: 0, w: 20, h: 200 });
  assert.equal(m.scene.elements[1].text, 'ПРАВЫЙ');
  assert.equal(m.steps[0].text, 'Корму уводит вправо');
  assert.deepEqual(m.steps[0].pose, { x: 200, y: 100, rot: -10 });
  assert.equal(demo.steps[0].pose.x, 60, 'исходный манёвр не меняется');
});

test('maneuverFor не трогает манёвр без mirror', () => {
  const plain = { ...demo, mirror: undefined };
  assert.equal(maneuverFor(plain, 'right'), plain);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `node --test tests/unit/mirror.test.mjs`
Expected: FAIL - `Cannot find module '.../site/js/diagrams/mirror.js'`.

- [ ] **Step 3: Модуль зеркалирования**

Создать `site/js/diagrams/mirror.js`:

```js
// Зеркалирование схем манёвров по стороне заброса кормы на заднем ходу.
// Базовый рисунок и текст - для случая «корму уводит влево»; для «вправо» - зеркальная копия.
export const SCENE_WIDTH = 260;

const SIDE_PAIR = /\[\[([^[\]|]+)\|([^[\]|]+)\]\]/g;

// «[[левым|правым]] бортом»: первый вариант - для «влево» и пока сторона не выбрана, второй - для «вправо».
export function resolveSides(text, walk) {
  return text.replace(SIDE_PAIR, (_, left, right) => (walk === 'right' ? right : left));
}

export function stripSidePairs(text) {
  return text.replace(SIDE_PAIR, '');
}

const round = (v) => Math.round(v * 1000) / 1000;
const flipX = (x) => round(SCENE_WIDTH - x);

export function mirrorPose(pose) {
  const out = { ...pose, x: flipX(pose.x), rot: 0 - pose.rot };
  if (pose.boom !== undefined) out.boom = 0 - pose.boom;
  return out;
}

// Только абсолютные команды M, L, Q, C, Z: у них все координаты - пары (x, y).
export function mirrorPath(d) {
  let isX = true;
  return d.replace(/[MLQCZ]|-?\d*\.?\d+/g, (token) => {
    if (/[MLQCZ]/.test(token)) {
      isX = true;
      return token;
    }
    const out = isX ? String(flipX(Number(token))) : token;
    isX = !isX;
    return out;
  });
}

function mirrorElement(el) {
  switch (el.type) {
    case 'quay': return { ...el, x: flipX(el.x + el.w) };
    case 'boat-moored': return { ...el, x: flipX(el.x), rot: 0 - (el.rot ?? 0) };
    case 'buoy':
    case 'anchor':
    case 'person': return { ...el, x: flipX(el.x) };
    case 'label': return { ...el, x: flipX(el.x), anchor: el.anchor === 'end' ? 'start' : 'end' };
    case 'line': return { ...el, points: el.points.map(([x, y]) => [flipX(x), y]) };
    case 'path': return { ...el, d: mirrorPath(el.d) };
    case 'arrow': return { ...el, x1: flipX(el.x1), x2: flipX(el.x2) };
    default: throw new Error(`Неизвестный элемент схемы: ${el.type}`);
  }
}

export function mirrorScene(scene) {
  return {
    ...scene,
    mirrored: !scene.mirrored,
    wind: scene.wind === undefined ? undefined : (360 - scene.wind) % 360,
    elements: scene.elements.map(mirrorElement),
  };
}

// Манёвр для выбранной стороны заброса: стороны в тексте подставлены, при «вправо» схема отражена.
export function maneuverFor(maneuver, walk) {
  if (!maneuver.mirror) return maneuver;
  const side = (text) => (text === undefined ? undefined : resolveSides(text, walk));
  const flip = walk === 'right';
  const scene = flip ? mirrorScene(maneuver.scene) : maneuver.scene;
  return {
    ...maneuver,
    title: side(maneuver.title),
    summary: side(maneuver.summary),
    scene: {
      ...scene,
      label: side(scene.label),
      elements: scene.elements.map((el) => (el.type === 'label' ? { ...el, text: side(el.text) } : el)),
    },
    steps: maneuver.steps.map((s) => ({
      ...s,
      who: side(s.who),
      command: side(s.command),
      text: side(s.text),
      pose: flip ? mirrorPose(s.pose) : s.pose,
    })),
  };
}
```

- [ ] **Step 4: Тесты модуля проходят**

Run: `node --test tests/unit/mirror.test.mjs`
Expected: PASS, все 10 тестов.

- [ ] **Step 5: Тесты отрисовки стрелки, выравнивания подписи и ветра в отражённой сцене**

Добавить в конец `tests/unit/diagrams.test.mjs`:

```js
test('стрелка силы рисуется с наконечником и классом вида', () => {
  const svg = renderScene({ label: 'x', power: true, elements: [{ type: 'arrow', x1: 100, y1: 150, x2: 80, y2: 150, kind: 'walk' }] }, { x: 130, y: 100, rot: 0 });
  assert.match(svg, /<g class="force walk"><line x1="100" y1="150" x2="80" y2="150"\/><polygon points="80,150 /);
});

test('подпись с anchor получает text-anchor', () => {
  const svg = renderScene({ label: 'x', power: true, elements: [{ type: 'label', x: 30, y: 40, text: 'А', anchor: 'end' }] }, { x: 130, y: 100, rot: 0 });
  assert.match(svg, /<text class="svg-label" x="30" y="40" text-anchor="end">А<\/text>/);
});

test('в отражённой сцене стрелка ветра стоит справа, подпись слева от неё', () => {
  const base = renderScene({ label: 'x', wind: 90, power: true, elements: [] }, { x: 130, y: 100, rot: 0 });
  assert.match(base, /translate\(36 30\) rotate\(90\)/);
  const mirrored = renderScene({ label: 'x', wind: 270, power: true, mirrored: true, elements: [] }, { x: 130, y: 100, rot: 0 });
  assert.match(mirrored, /translate\(224 30\) rotate\(270\)/);
  assert.match(mirrored, /<text class="svg-label" x="210" y="24" text-anchor="end">ВЕТЕР<\/text>/);
});
```

Run: `node --test tests/unit/diagrams.test.mjs`
Expected: FAIL - `Неизвестный элемент схемы: arrow` и несовпадения регулярных выражений.

- [ ] **Step 6: Отрисовка**

В `site/js/diagrams/svg.js` заменить `windArrowSVG`:

```js
// fromDeg - откуда дует ветер: 0 - сверху, 90 - справа. Стрелка показывает, куда дует.
// labelSide - с какой стороны от стрелки подпись: справа (обычно) или слева (в отражённой сцене).
export function windArrowSVG(fromDeg, x, y, labelSide = 'right') {
  const label = labelSide === 'left'
    ? `<text class="svg-label" x="${x - 14}" y="${y - 6}" text-anchor="end">ВЕТЕР</text>`
    : `<text class="svg-label" x="${x + 14}" y="${y - 6}">ВЕТЕР</text>`;
  return `<g class="wind" transform="translate(${x} ${y}) rotate(${fromDeg})">`
    + '<line x1="0" y1="-16" x2="0" y2="8"/><path d="M-6 4 L0 16 L6 4 Z"/></g>'
    + label;
}
```

В `site/js/diagrams/scene.js`:

```js
import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG, boomStyle } from './boat.js';
import { SCENE_WIDTH } from './mirror.js';

const WIND_X = 36;
const WIND_Y = 30;
const r1 = (v) => Math.round(v * 10) / 10;

// Стрелка силы: walk - заброс кормы, drift - снос ветром; наконечник в (x2, y2).
function arrowSVG({ x1, y1, x2, y2, kind }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const barb = (da) => `${r1(x2 - 8 * Math.cos(a + da))},${r1(y2 - 8 * Math.sin(a + da))}`;
  return `<g class="force ${kind}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
    + `<polygon points="${x2},${y2} ${barb(0.45)} ${barb(-0.45)}"/></g>`;
}

function elementSVG(el) {
  switch (el.type) {
    // ...существующие case без изменений, кроме label:
    case 'label': return `<text class="svg-label" x="${el.x}" y="${el.y}"${el.anchor ? ` text-anchor="${el.anchor}"` : ''}>${escapeXml(el.text)}</text>`;
    case 'arrow': return arrowSVG(el);
    default: throw new Error(`Неизвестный элемент схемы: ${el.type}`);
  }
}
```

В `renderScene` ветер ставить с учётом отражения:

```js
    + (scene.wind === undefined ? ''
      : scene.mirrored ? windArrowSVG(scene.wind, SCENE_WIDTH - WIND_X, WIND_Y, 'left') : windArrowSVG(scene.wind, WIND_X, WIND_Y))
```

В `site/css/app.css` рядом с `.rope`:

```css
.force line { stroke-width: 2.5; stroke-linecap: round; }
.force.walk line { stroke: var(--port); }
.force.walk polygon { fill: var(--port); }
.force.drift line { stroke: var(--sea); stroke-dasharray: 4 3; }
.force.drift polygon { fill: var(--sea); }
```

Run: `node --test tests/unit/diagrams.test.mjs tests/unit/mirror.test.mjs`
Expected: PASS.

- [ ] **Step 7: Тесты проверки содержания**

В `tests/unit/content.test.mjs` в `minimal()` у манёвров добавить группу:

```js
    maneuvers: { groups: [{ id: 'sail', title: 'Под парусом' }], maneuvers: [src({ id: 'm-1', group: 'sail', title: 'Оверштаг', summary: 'x',
```

И добавить тесты:

```js
test('манёвр: группа обязательна и должна быть в списке groups', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].group = 'nope';
  assert.match(validateContent(c).join('\n'), /m-1: неизвестная группа nope/);
  const d = minimal();
  delete d.maneuvers.groups;
  assert.match(validateContent(d).join('\n'), /maneuvers\.json: нет списка groups/);
  const e = minimal();
  e.maneuvers.groups.push({ id: 'sail', title: 'Повтор' }, { id: 'x' });
  const text = validateContent(e).join('\n');
  assert.match(text, /groups: плохой или повторный id "sail"/);
  assert.match(text, /groups: x: нет title/);
});

test('пары сторон - только при mirror: true и только правильной формы', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].title = 'Лагом [[левым|правым]] бортом';
  assert.match(validateContent(c).join('\n'), /m-1: пары сторон \[\[левый\|правый\]\] допустимы только при mirror: true/);
  const d = minimal();
  d.maneuvers.maneuvers[0].mirror = true;
  d.maneuvers.maneuvers[0].steps[0].text = 'Корму уводит [[влево]]';
  assert.match(validateContent(d).join('\n'), /m-1: неверная пара сторон/);
  const e = minimal();
  e.maneuvers.maneuvers[0].mirror = true;
  e.maneuvers.maneuvers[0].steps[0].text = 'Корму уводит [[влево|вправо]]';
  assert.deepEqual(validateContent(e), []);
  const f = minimal();
  f.maneuvers.maneuvers[0].mirror = 'yes';
  assert.match(validateContent(f).join('\n'), /m-1: mirror: true или false/);
});

test('зеркальный манёвр: path только из абсолютных M L Q C Z', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].mirror = true;
  c.maneuvers.maneuvers[0].scene.elements.push({ type: 'path', d: 'M10 10 l20 0' });
  assert.match(validateContent(c).join('\n'), /m-1: path в зеркальном манёвре: только абсолютные M L Q C Z/);
});

test('стрелка силы и выравнивание подписи проверяются', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].scene.elements.push(
    { type: 'arrow', x1: 0, y1: 0, x2: 10, kind: 'push' },
    { type: 'label', x: 1, y: 1, text: 'А', anchor: 'middle' },
  );
  const text = validateContent(c).join('\n');
  assert.match(text, /arrow: нужны x1, y1, x2, y2/);
  assert.match(text, /arrow: kind - walk или drift/);
  assert.match(text, /label: anchor - start или end/);
});
```

Run: `node --test tests/unit/content.test.mjs`
Expected: FAIL на новых тестах; `минимальное корректное содержание проходит проверку` тоже может падать до правки проверки - это ожидаемо.

- [ ] **Step 8: Проверка содержания**

В `scripts/lib/validate-content.mjs`:

```js
import { IALA_TOPICS } from '../../site/js/sources.js';
import { stripSidePairs } from '../../site/js/diagrams/mirror.js';

export const ELEMENT_TYPES = ['quay', 'boat-moored', 'buoy', 'anchor', 'line', 'person', 'label', 'path', 'arrow'];
export const ARROW_KINDS = ['walk', 'drift'];
// ...
const ABS_PATH_D = /^[MLQCZ0-9 .,-]+$/;
```

В `checkElement` перед блоком `if (el.steps !== undefined)`:

```js
  if (el.type === 'arrow') {
    if (![el.x1, el.y1, el.x2, el.y2].every(num)) err('arrow: нужны x1, y1, x2, y2');
    if (!ARROW_KINDS.includes(el.kind)) err(`arrow: kind - ${ARROW_KINDS.join(' или ')}`);
  }
  if (el.type === 'label' && el.anchor !== undefined && !['start', 'end'].includes(el.anchor)) err('label: anchor - start или end');
```

Перед `const checkers` (или рядом с `checkElement`):

```js
// Тексты манёвра, где допустимы пары сторон [[левым|правым]].
function maneuverTexts(r) {
  return [r.title, r.summary, r.scene?.label,
    ...(r.scene?.elements ?? []).filter((el) => el?.type === 'label').map((el) => el.text),
    ...(r.steps ?? []).flatMap((s) => [s?.who, s?.command, s?.text]),
  ].filter((t) => typeof t === 'string');
}

function checkSidePairs(r, err) {
  for (const t of maneuverTexts(r)) {
    const rest = stripSidePairs(t);
    if (rest.includes('[[') || rest.includes(']]')) err(`неверная пара сторон в «${t}»`);
    else if (!r.mirror && rest !== t) err('пары сторон [[левый|правый]] допустимы только при mirror: true');
  }
  if (r.mirror === true) {
    for (const el of r.scene?.elements ?? []) {
      if (el?.type === 'path' && !ABS_PATH_D.test(el.d ?? '')) err('path в зеркальном манёвре: только абсолютные M L Q C Z');
    }
  }
}
```

В `checkers.maneuvers` сигнатуру поменять на `maneuvers(r, err, content)` и добавить в начало:

```js
    const groups = new Set((content.maneuvers?.groups ?? []).map((g) => g.id));
    if (!groups.has(r.group)) err(`неизвестная группа ${r.group}`);
    if (r.mirror !== undefined && typeof r.mirror !== 'boolean') err('mirror: true или false');
    checkSidePairs(r, err);
```

В `validateContent` после строки с `questions.json: topics`:

```js
  const groups = content.maneuvers?.groups;
  if (!list(groups)) errors.push('maneuvers.json: нет списка groups');
  const groupIds = new Set();
  for (const g of groups ?? []) {
    if (!ID.test(g?.id ?? '') || groupIds.has(g.id)) errors.push(`maneuvers.json: groups: плохой или повторный id ${JSON.stringify(g?.id)}`);
    else if (!text(g.title)) errors.push(`maneuvers.json: groups: ${g.id}: нет title`);
    groupIds.add(g?.id);
  }
```

Run: `node --test tests/unit/content.test.mjs`
Expected: PASS.

- [ ] **Step 9: Группы в содержании**

В `site/content/maneuvers.json` на верхнем уровне перед `"maneuvers"`:

```json
  "groups": [
    { "id": "intro", "title": "Знакомство с яхтой" },
    { "id": "stern-to", "title": "Кормой к причалу" },
    { "id": "alongside", "title": "Лагом" },
    { "id": "anchor", "title": "Якорь и бочка" },
    { "id": "sail", "title": "Под парусом" }
  ],
```

И поле `"group"` сразу после `"id"`: `med-mooring`, `leave-berth` - `stern-to`; `anchoring`, `buoy-pickup` - `anchor`; `mob-return`, `tack`, `gybe`, `reefing` - `sail`.
Остальное в файле не трогать (перевод `med-mooring` и `leave-berth` на `mirror` - задача 2).

Run: `npm run check`
Expected: без ошибок, «не сверено 0».

- [ ] **Step 10: Настройка propWalk в хранилище**

Тест в `tests/unit/storage.test.mjs`:

```js
test('propWalk: только left или right, остальное отбрасывается', () => {
  const raw = (v) => JSON.stringify({ version: 1, cards: {}, checks: {}, settings: { propWalk: v } });
  assert.equal(parseState(raw('left')).settings.propWalk, 'left');
  assert.equal(parseState(raw('right')).settings.propWalk, 'right');
  assert.equal(parseState(raw('up')).settings.propWalk, undefined);
  assert.equal(parseState(raw('')).settings.propWalk, undefined);
});
```

Run: `node --test tests/unit/storage.test.mjs` - FAIL (`propWalk` отбрасывается).
В `site/js/storage.js` в `SETTINGS_FIELDS` добавить `propWalk: (v) => v === 'left' || v === 'right',`.
Run снова - PASS.

- [ ] **Step 11: Экраны манёвров и настроек**

`site/js/views/maneuvers.js` - список по группам, переключатель стороны, отрисовка через `maneuverFor`:

```js
import { h, header, sourceFooter, notFound } from '../ui.js';
import { renderScene, applyPose } from '../diagrams/scene.js';
import { maneuverFor } from '../diagrams/mirror.js';

const WALK_TEST_ID = 'prop-walk-test';

function groupedManeuvers(data) {
  return data.groups
    .map((g) => ({ ...g, items: data.maneuvers.filter((m) => m.group === g.id) }))
    .filter((g) => g.items.length > 0);
}

export function maneuversIndexView(ctx) {
  const walk = ctx.store.state.settings.propWalk;
  return h('section', { class: 'view' },
    header('Манёвры'),
    groupedManeuvers(ctx.content.maneuvers).map((g) => [
      h('h2', {}, g.title),
      h('ul', { class: 'list' }, g.items.map((raw) => {
        const m = maneuverFor(raw, walk);
        return h('li', {},
          h('a', { href: `#/maneuvers/${m.id}` },
            h('span', {}, m.title, h('small', {}, m.summary)),
            h('span', { class: 'meta' }, `${m.steps.length} шаг.`)));
      })),
    ]));
}

// Переключатель «куда уводит корму на заднем ходу»; значение общее с настройками.
function propWalkControl(ctx, currentId, onChange) {
  const hasTest = currentId !== WALK_TEST_ID && ctx.content.maneuvers.maneuvers.some((x) => x.id === WALK_TEST_ID);
  const note = h('p', { class: 'walk-note' },
    'Сторона не проверена - схема для случая, когда корму уводит влево. Проверьте на приёмке',
    hasTest ? [': ', h('a', { href: `#/maneuvers/${WALK_TEST_ID}` }, 'как проверить заброс')] : null,
    '.');
  const buttons = [['left', 'Влево'], ['right', 'Вправо']].map(([side, label]) =>
    h('button', { type: 'button', class: 'button small seg', 'data-side': side }, label));
  function sync() {
    const walk = ctx.store.state.settings.propWalk;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.side === walk));
    note.hidden = walk !== undefined;
  }
  for (const b of buttons) {
    b.addEventListener('click', () => {
      ctx.store.update((st) => ({ ...st, settings: { ...st.settings, propWalk: b.dataset.side } }));
      sync();
      onChange(b.dataset.side);
    });
  }
  sync();
  return h('div', { class: 'walk' },
    h('div', { class: 'walk-switch', role: 'group', 'aria-label': 'Куда уводит корму на заднем ходу' },
      h('span', {}, 'Корму на заднем ходу уводит:'), buttons),
    note);
}

export function maneuverView(ctx, id) {
  const raw = ctx.content.maneuvers.maneuvers.find((x) => x.id === id);
  if (!raw) return notFound();

  let m = maneuverFor(raw, ctx.store.state.settings.propWalk);
  const head = header(m.title, '#/maneuvers');
  const lead = h('p', { class: 'lead' }, m.summary);
  const figure = h('div', { class: 'scene' });
  const counter = h('p', { class: 'meta' });
  const who = h('div', { class: 'who' });
  const command = h('div', { class: 'cmd' });
  const text = h('p', { class: 'step-text' });
  const prev = h('button', { type: 'button', class: 'button' }, 'Назад');
  const next = h('button', { type: 'button', class: 'button primary' }, 'Дальше');
  let index = 0;
  let svg;

  // Перерисовать схему целиком (при смене стороны) - без анимации, сразу в положении текущего шага.
  function draw() {
    figure.innerHTML = renderScene(m.scene, m.steps[index].pose);
    svg = figure.firstElementChild;
    head.querySelector('h1').textContent = m.title;
    lead.textContent = m.summary;
  }

  function show() {
    const step = m.steps[index];
    applyPose(svg, m.scene, step.pose, index);
    counter.textContent = `Шаг ${index + 1} из ${m.steps.length}`;
    who.textContent = step.who;
    command.textContent = step.command ? `«${step.command}»` : '';
    text.textContent = step.text;
    prev.disabled = index === 0;
    next.textContent = index === m.steps.length - 1 ? 'Сначала' : 'Дальше';
  }

  prev.addEventListener('click', () => { index = Math.max(0, index - 1); show(); });
  next.addEventListener('click', () => { index = (index + 1) % m.steps.length; show(); });
  draw();
  show();

  const walkControl = raw.mirror
    ? propWalkControl(ctx, raw.id, (walk) => { m = maneuverFor(raw, walk); draw(); show(); })
    : null;

  return h('section', { class: 'view' },
    head,
    lead,
    walkControl,
    figure,
    counter,
    h('div', { class: 'step', 'aria-live': 'polite' }, who, command, text),
    h('div', { class: 'ctrl' }, prev, next),
    videoLinks(m.videos),
    sourceFooter(m));
}
```

`videoLinks` оставить как есть.

`site/js/views/settings.js` - поле выбора и сброс пустого значения:

```js
function select(id, label, options, value) {
  return h('label', { class: 'field', for: id }, h('span', {}, label),
    h('select', { id, name: id }, options.map(([v, text]) => h('option', { value: v, selected: v === value }, text))));
}
```

В форму после поля `persons`:

```js
    select('propWalk', 'Корму на заднем ходу уводит', [['', 'не проверено'], ['left', 'влево'], ['right', 'вправо']], s.propWalk ?? ''),
```

Обработчик `submit`:

```js
    const data = Object.fromEntries(new FormData(form));
    ctx.store.update((st) => {
      const settings = { ...st.settings, ...data };
      if (!settings.propWalk) delete settings.propWalk;
      return { ...st, settings };
    });
```

`site/css/app.css`:

```css
.field input, .field select { min-height: 44px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); }
.walk { display: grid; gap: 6px; }
.walk-switch { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font: .8rem var(--mono); color: var(--muted); }
.walk-switch .seg[aria-pressed="true"] { background: var(--sea); color: var(--on-accent); border-color: var(--sea); }
.walk-note { font-size: .85rem; color: var(--muted); }
```

Существующее правило `.field input { ... }` заменить первой строкой, а не дублировать.
Проверить в тёмной теме, что выбранная кнопка и заметка читаются.

- [ ] **Step 12: E2E**

Создать `tests/e2e/maneuvers.spec.mjs`:

```js
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
  await expect(page.getByRole('link', { name: /Лагом правым бортом/ })).toBeVisible();
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
```

В `tests/e2e/app.spec.mjs` в тесте «манёвр листается по шагам» брать манёвр без пар сторон:

```js
  const maneuver = content('maneuvers').maneuvers.find((m) => !m.mirror);
```

Run: `npm run e2e`
Expected: все тесты проходят, включая 4 новых.

- [ ] **Step 13: Скрипт скриншотов для ревью схем**

Создать `scripts/shoot-maneuvers.mjs`:

```js
// Скриншоты всех шагов манёвров для ревью схем.
// Запуск: сначала `npm run serve`, затем `npm run shots -- [id ...] [--out папка]` (по умолчанию .local/shots).
// Для манёвра с mirror: true снимает обе стороны заброса: <id>-left-01.png, <id>-right-01.png...
import { chromium, devices } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173/';
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
```

В `package.json` в `scripts` добавить `"shots": "node scripts/shoot-maneuvers.mjs"`.

Проверка: в фоне `npm run serve`, затем `npm run shots -- med-mooring tack --out .local/shots-smoke`.
Expected: `med-mooring-01.png` ... `med-mooring-06.png`, `tack-01.png` ... `tack-05.png`; открыть два-три PNG и убедиться, что на них схема и текст шага. Сервер после проверки остановить.

- [ ] **Step 14: Список файлов офлайна и полный прогон**

Run: `npm run assets && npm run check && npm test && npm run e2e`
Expected: `site/sw.js` содержит `js/diagrams/mirror.js`; проверка содержания без ошибок; все модульные и e2e-тесты зелёные.

- [ ] **Step 15: Commit**

```bash
git add site/js/diagrams/mirror.js site/js/diagrams/scene.js site/js/diagrams/svg.js site/js/views/maneuvers.js site/js/views/settings.js site/js/storage.js site/css/app.css site/content/maneuvers.json site/sw.js scripts/lib/validate-content.mjs scripts/shoot-maneuvers.mjs package.json tests/unit/mirror.test.mjs tests/unit/diagrams.test.mjs tests/unit/content.test.mjs tests/unit/storage.test.mjs tests/e2e/maneuvers.spec.mjs tests/e2e/app.spec.mjs
git commit -m "Group maneuvers and mirror diagrams by prop walk side"
```

---

## Общий порядок для задач содержания (2, 3, 4)

Исполнитель работает в своём git worktree, созданном от `feature/pocket-skipper` после слияния задачи 1.
Перед началом прочитать: спецификацию, раздел «Global Constraints» этого плана, `docs/HANDOFF.md` (разделы «Правила работы с содержанием» и «Устройство»), `scripts/lib/validate-content.mjs`, манёвры `med-mooring` и `buoy-pickup` как образец формата.

Для каждой записи:
1. Найти и открыть источники: учебник (`grep -n` по `.local/iyt_bbs.txt`, затем чтение страниц целиком), руководство Dufour (`.local/dufour/`), веб-страницы (WebFetch; если сайт не отдаёт страницу - другой источник).
   Подсказки в брифах ниже говорят, что раскрыть, но сами источником не являются: утверждение из подсказки, которое не подтвердилось, не писать.
2. Написать запись; тексты шагов - коротко и по делу, как в существующих манёврах; `who` - «Шкипер», «Рулевой», «Носовой», «Кормовой», «Экипаж» или «С кранцем»; `command` - короткая команда вслух или `""`.
3. `npm run check`.
4. Схема: в фоне `npm run serve`, затем `npm run shots -- <id> --out .local/shots-<поток>`; открыть каждый PNG (Read) и проверить правила схем ниже; исправить и переснять.
5. Строка в `docs/content-log.md`, затем `verified: true`.
6. Коммит на каждые 2-3 записи; сообщение по-английски в стиле истории репозитория.

Правила схем:
- Сцена 260×200; лодка носом вверх, `rot` по часовой; `wind` - откуда дует (0 - сверху, 90 - справа); стрелка ветра стоит в левом верхнем углу (около x 36, y 30) - не ставить туда элементы.
- Корпус 70 единиц в длину и 32 в ширину, центр вращения в центре корпуса; соседние яхты `boat-moored` того же размера (`scale` не менять без причины).
- Базовый рисунок - для случая «корму на заднем ходу уводит влево»; стрелка `walk` у кормы показывает заброс, `drift` - снос ветром.
- Лодка не пересекается с причалом и соседями ни на одном шаге (борт к борту через кранец - можно); в конце швартовки кормой корма примерно в 5 единицах (около 1 м) от стенки.
- Между шагами лодка едет по прямой: для дуги или разворота на месте - промежуточные шаги (поворот не больше 45-60° за шаг).
- Текст шага, положение лодки, концы, стрелки и ветер не противоречат друг другу; ветер в тексте совпадает со стрелкой.
- Зеркальный манёвр (`mirror: true`) - если сторона заброса влияет на текст или схему; тогда все «лево/право», «левый/правый», «влево/вправо» в тексте - только парами `[[...|...]]`, а `path` - только из `M L Q C Z`.
- Скриншоты - обе стороны; на «вправо» подписи не должны вылезать за край и налезать на стрелку ветра (она справа сверху).

Проверенные факты о яхте - таблица в спецификации; ссылаться на руководство как на веб-источник с тем же URL и `accessed`, что уже стоят в `maneuvers.json`, указывая страницу в тексте журнала сверки.

Ревью каждой задачи содержания (отдельный агент, старшая модель):
- открыть каждый источник записи и сверить каждое утверждение;
- просмотреть скриншоты всех шагов в обеих сторонах и проверить физику и правила схем;
- проверить текст: русский, дефис, пересказ, нет противоречий с существующими записями;
- отчёт в `.local/review/<задача>-report.md`: список замечаний с id записи и шагом, серьёзность, что исправить.
Затем исполнитель исправляет, ревьюер проверяет исправления; раунды до «замечаний нет».

---

### Task 2: Поток A - знакомство с яхтой и кормой к причалу (содержание)

**Files:**
- Modify: `site/content/maneuvers.json`, `docs/content-log.md`

**Interfaces:**
- Consumes: формат из задачи 1 (`group`, `mirror`, пары сторон, `arrow`, `label.anchor`, `npm run shots`).
- Produces: манёвры `prop-walk-test` (на него ссылается заметка «Сторона не проверена»), `turn-in-fairway`, `stern-to-onshore`, `stern-to-offshore`, `stern-to-own-anchor`, `leave-stern-to-onshore`, `leave-own-anchor`; обновлённые `med-mooring`, `leave-berth`.

Порядок в файле: новые записи группы `intro` - перед `med-mooring`; новые записи `stern-to` - сразу после `leave-berth` в порядке брифа.

- [ ] **Step 1: `prop-walk-test` «Проверка заброса кормы и инерции»** (`group: intro`, `mirror: true`)
  Раскрыть: проверка у причала - включить задний ход на малых оборотах и посмотреть, с какого борта у корпуса выходит струя, и что это значит для заброса; на чистой воде - задний ход с места с прямым рулём (куда пошла корма), через сколько метров заднего хода руль начинает слушаться, тормозной путь с малого хода, циркуляция вправо и влево, минимальный управляемый ход; проверка подруливающего, если есть (обе стороны, короткими включениями); в конце - выбрать сторону в приложении.
  Упомянуть факты яхты: saildrive, складной ли винт (от этого может зависеть тяга на заднем ходу - только если подтверждено источником), у какого штурвала газ.
- [ ] **Step 2: `turn-in-fairway` «Разворот в узком проходе»** (`group: intro`, `mirror: true`)
  Раскрыть: в какую сторону разворачиваться, чтобы заброс помогал; руль на борт, короткий импульс вперёд, нейтраль, импульс назад, повтор; что делает руль на заднем ходу без хода; как ветер сдувает нос и как это учесть; промежуточные шаги, чтобы поворот был виден по этапам.
- [ ] **Step 3: `stern-to-onshore` «Кормой при ветре с моря»** (`group: stern-to`, `mirror: true`, с соседями, лейзи-линии)
  Раскрыть: ветер помогает идти назад и разгоняет к причалу - самые малые обороты, заранее тормозить передним ходом; кормовые готовы; лейзи-линию выбрать и натянуть быстро, чтобы корма не легла на стенку; двигатель вперёд, пока натягивают.
- [ ] **Step 4: `stern-to-offshore` «Кормой при ветре с берега, в пустой причал»** (`group: stern-to`, `mirror: true`)
  Раскрыть: ветер навстречу заднему ходу и сдувает нос - больше оборотов и решительнее; в пустом причале нет соседей, на которых можно опереться, и нет ориентиров - как выбрать место; первым - наветренный кормовой; экипаж не прыгает на берег; опущенная кормовая платформа Dufour не считается безопасной зоной (руководство, с. 25).
- [ ] **Step 5: `stern-to-own-anchor` «Кормой на свой якорь»** (`group: stern-to`, `mirror: true`)
  Раскрыть: где отдать якорь (сколько корпусов от причала, с учётом глубины и длины цепи), не класть цепь поперёк чужих; травить цепь на заднем ходу без рывков; при боковом ветре отдавать якорь с наветренной стороны от места; кормовые, затем выбрать цепь брашпилем; при работе брашпиля - двигатель на слегка повышенных оборотах (руководство, с. 13).
- [ ] **Step 6: `leave-stern-to-onshore` «Отход, когда ветер прижимает к причалу»** (`group: stern-to`; `mirror` - если сторона заброса влияет)
  Раскрыть: порядок отдачи концов при прижимном ветре, кормовые на слипе, когда отдавать лейзи-линию и как не дать корме лечь на причал, как не намотать лейзи-линию на винт; не повторять то, что уже есть в `leave-berth`, а показать отличия.
- [ ] **Step 7: `leave-own-anchor` «Отход со своего якоря»** (`group: stern-to`)
  Раскрыть: кормовые на слип, выбирать цепь брашпилем, помогая двигателем малым ходом, не наезжать на цепь; якорь зацепил чужую цепь - поднять к поверхности, завести конец под чужую цепь, закрепить, опустить свой якорь, отдать конец.
- [ ] **Step 8: Перевод `med-mooring` и `leave-berth` на `mirror: true`**
  Сверить заново с их источниками; «лево/право» в тексте - парами; фразу «при винте правого вращения - влево» заменить формулировкой через выбранную сторону; добавить стрелку `walk`, где заброс важен; `videos` и источники сохранить; строки журнала сверки обновить (новая дата).
- [ ] **Step 9: Прогон и сдача**
  Run: `npm run check && npm test && npm run e2e`; скриншоты всех 9 манёвров в `.local/shots-a/`; коммит; отчёт: список записей, источники, сомнения.

### Task 3: Поток B - лагом (содержание)

**Files:**
- Modify: `site/content/maneuvers.json`, `docs/content-log.md`

**Interfaces:**
- Consumes: формат из задачи 1.
- Produces: манёвры `alongside-walk-side`, `alongside-other-side`, `alongside-offshore`, `alongside-onshore`, `alongside-wind-astern`, `alongside-between-boats`, `spring-off-bow-out`, `spring-off-stern-out` (все `group: alongside`, `mirror: true`), добавленные в конец списка `maneuvers`.

Общее для всех: причал или понтон рисуется вертикальным `quay` у края сцены; в базовом рисунке («уводит влево») борт заброса - левый, значит у `alongside-walk-side` причал слева от лодки.
Везде раскрыть: подготовку (кранцы на нужный борт и на какой высоте, концы: носовой, кормовой, шпринги - заведены снаружи всего, свёрнуты), кто где стоит, какой конец первым и почему, куда смотреть рулевому, работу мидельными утками для шпринга (руководство, с. 28 и 38-39).

- [ ] **Step 1: `alongside-walk-side` «Лагом [[левым|правым]] бортом: корму тянет к причалу»**
  Ветер в нос вдоль причала или штиль; подход под углом, нейтраль, короткий задний: заброс подтягивает корму и гасит ход; первым мидельный или носовой (по источнику).
- [ ] **Step 2: `alongside-other-side` - другим бортом**
  Меньший угол, меньше хода; задний ход уводит корму от причала - как это компенсировать; остановка и прижим на мидельном шпринге: двигатель вперёд малым, руль от причала.
- [ ] **Step 3: `alongside-offshore` - отжимной ветер**
  Круче угол, чуть больше хода; шпринг первым и сразу работать на нём двигателем; нос сдувает быстрее кормы.
- [ ] **Step 4: `alongside-onshore` - прижимной ветер**
  Остановиться параллельно в полутора-двух ширинах с наветра от места и дать ветру прижать; кранцы, в том числе низко; не заходить углом.
- [ ] **Step 5: `alongside-wind-astern` - ветер вдоль причала с кормы**
  Первым конец, который останавливает ход вперёд (кормовой или шпринг, ведущий назад); когда лучше развернуться и подойти против ветра.
- [ ] **Step 6: `alongside-between-boats` - в промежуток между яхтами**
  Какая длина промежутка нужна; подход под углом к корме передней яхты, шпринг, заводка кормы работой на шпринге; кранцы на носу и на корме, человек с запасным кранцем.
- [ ] **Step 7: `spring-off-bow-out` «Отход носом на кормовом шпринге»**
  Прижимной ветер, сосед сзади; кормовой шпринг, кранец на раковине, задний ход малым - нос уходит от причала; нейтраль, отдать шпринг, вперёд; промежуточные шаги поворота.
- [ ] **Step 8: `spring-off-stern-out` «Отход кормой на носовом шпринге»**
  Прижимной ветер, сосед спереди; носовой шпринг, кранец на носу, вперёд малым, руль к причалу - корма уходит; затем задний ход; как заброс на заднем ходу помогает или мешает на этом борту.
- [ ] **Step 9: Прогон и сдача**
  Run: `npm run check && npm test && npm run e2e`; скриншоты всех 8 манёвров в обеих сторонах в `.local/shots-b/`; коммит; отчёт.

После ревью задач 2 и 3 контроллер сливает обе ветки в `feature/pocket-skipper`.
Конфликт в `docs/content-log.md` (обе дописывают в конец таблицы) - оставить строки обеих сторон; конфликт в `maneuvers.json` - сохранить записи обоих потоков в порядке групп.

### Task 4: Справка, вопросы, чек-лист (содержание)

**Files:**
- Modify: `site/content/guides.json`, `site/content/questions.json`, `site/content/checklists.json`, `docs/content-log.md`

**Interfaces:**
- Consumes: манёвры задач 2 и 3 (справка и вопросы не должны им противоречить; на манёвры можно ссылаться словами «см. манёвр …»).
- Produces: гайд `mooring`, 12-15 вопросов `anchor-mooring`, правки чек-листа приёмки.

- [ ] **Step 1: Гайд `mooring` «Швартовка и отход»**
  Разделы из спецификации: «Эта яхта», «Решения по ветру», «Рулевой», «Экипаж и команды», «Подруливающее устройство», «Ошибки и второй круг».
  Формат - как у гайдов `fethiye` и `money`: у каждого совета `text`, при необходимости `note`, свои `sources`.
  Проверить на экране «Ещё», что справка появилась и открывается.
- [ ] **Step 2: Вопросы**
  12-15 вопросов в теме `anchor-mooring`, у каждого 3-4 варианта, один верный, `explain` с объяснением; не дублировать 19 существующих вопросов темы.
  Правильный ответ не должен быть самым длинным чаще, чем у остальных вопросов: `npm run check` предупреждает при доле выше 40%.
- [ ] **Step 3: Чек-лист «Приёмка яхты»**
  Пункт `prop-shaft` заменить пунктом про уплотнения saildrive (руководство, с. 19); добавить пункты: проверить заброс кормы и выбрать сторону в приложении (Манёвры); есть ли подруливающее, где включается, работает ли в обе стороны; у какого штурвала ручка газа и приборы двигателя.
  Если id пункта меняется, сохранить старые отметки не нужно - это чек-лист одной приёмки.
- [ ] **Step 4: Прогон и сдача**
  Run: `npm run check && npm test && npm run e2e`; коммит; отчёт.

### Task 5: Итоговое ревью и передача

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1:** Итоговое ревью всей ветки против спецификации: все 15 манёвров, справка, вопросы, чек-лист; зеркалирование на реальном содержании (скриншоты `npm run shots` всех зеркальных манёвров в обеих сторонах); `npm run check` - «не сверено 0».
- [ ] **Step 2:** Исправления по ревью и повторная проверка.
- [ ] **Step 3:** Обновить `docs/HANDOFF.md`: что добавлено, счётчики записей и тестов, что проверить на приёмке, следующая задача.
- [ ] **Step 4:** Коммит; спросить пользователя о публикации в `main` (не пушить без его «да»).
