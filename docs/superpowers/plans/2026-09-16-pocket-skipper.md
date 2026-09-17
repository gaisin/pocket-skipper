# Карманный шкипер - план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** офлайн-PWA для iPhone, которое освежает знания шкипера IYT Bareboat Skipper перед чартером из Фетхие на Dufour 430.

**Architecture:** статический сайт в `site/` без сборки: HTML + CSS + ES-модули.
Содержание лежит в `site/content/*.json`, у каждой записи есть источники, проверка `scripts/check-content.mjs` не пускает запись без источника.
Логика (повторения Лейтнера, хранилище, форматирование источников, SVG-схемы) - чистые модули с тестами на `node:test`; экраны - модули в `site/js/views/`.
Деплой - GitHub Actions → GitHub Pages.

**Tech Stack:** HTML, CSS, JavaScript (ES2022, ES-модули), Node 22 (`node:test`), Playwright (только E2E, ставится после согласия пользователя), GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-16-pocket-skipper-design.md`

## Global Constraints

- Никаких фреймворков и шага сборки; единственная npm-зависимость - `@playwright/test` (dev), и её ставит только контроллер после явного «да» пользователя.
- Ничего не устанавливать глобально (`npm -g`, `brew`, `pip`), не менять глобальный git-конфиг.
- Коммиты - от `gaisin <27743952+gaisin@users.noreply.github.com>` (уже в локальном конфиге репозитория). Без строк Co-Authored-By.
- Все URL в приложении относительные (сайт живёт в `https://gaisin.github.io/pocket-skipper/`).
- Язык интерфейса - русский; вместо длинного тире использовать дефис «-».
- Палитра и шрифты - как в `first_draft.html`: Oswald (заголовки, команды), Onest (текст), JetBrains Mono (метки, источники).
- Картинки и текст учебника IYT в репозиторий не копировать: только пересказ своими словами и ссылка «модуль, секция, страница».
- Номер страницы IYT - печатный: печатная страница = страница PDF − 1 (проверено: секция «Человек за бортом» начинается на печатной с. 56, это PDF-страница 57).
- `verified: true` ставится только после сверки текста записи с каждым её источником.
- В длинных Markdown-файлах каждое предложение с новой строки.
- Не вызывать `alert`/`confirm`/`prompt`.

## Карта файлов

```
package.json                       скрипты npm, "type": "module"
.gitignore                         + .local/
scripts/
  check-content.mjs                проверка содержания (CLI)
  lib/validate-content.mjs         чистая функция validateContent()
  update-sw-assets.mjs             пересобирает список файлов в sw.js
  fetch-fonts.mjs                  однократно скачивает шрифты
  extract-iyt-text.js              JXA: текст из PDF учебника → .local/iyt_bbs.txt
  render-icons.sh                  PNG-иконки из SVG через headless Chromium
site/
  index.html                       оболочка, нижние вкладки
  manifest.webmanifest
  sw.js                            service worker (офлайн)
  css/fonts.css  css/tokens.css  css/app.css
  fonts/*.woff2  fonts/OFL.md
  icons/icon.svg  icon-180.png  icon-192.png  icon-512.png
  content/questions.json situations.json maneuvers.json checklists.json vhf.json reference.json external.json
  js/
    app.js          старт, рендер по hash
    routes.js       таблица маршрутов
    router.js       matchRoute()
    pwa.js          регистрация SW, баннер обновления
    content.js      CONTENT_FILES, loadContent()
    storage.js      createStore(), parseState()
    leitner.js      buildSession(), grade(), readiness()
    checks.js       toggleCheck(), resetChecks(), countChecked()
    template.js     fillTemplate(), callValues()
    sources.js      formatSource(), formatSources(), IALA_TOPICS
    dates.js  plural.js  random.js
    ui.js           h(), header(), sourceFooter(), notFound(), table()
    diagrams/svg.js boat.js scene.js lights.js marks.js encounter.js index.js
    quiz/exam.js question.js runner.js summary.js
    views/placeholder.js today.js tests.js situations.js maneuvers.js checklist-ui.js more.js vhf.js checklists.js reference.js external.js settings.js
tests/unit/*.test.mjs              node:test
tests/e2e/*.spec.mjs               Playwright
playwright.config.mjs
.github/workflows/deploy.yml
```

Порядок задач: 1-4 чистая логика, 5-11 интерфейс и офлайн, 12 E2E, 13 деплой, 14-19 наполнение.
После задачи 13 каждый пуш сразу обновляет приложение на телефоне.

---

### Task 1: Каркас проекта и утилиты дат, склонений, перемешивания

**Files:**
- Create: `package.json`, `site/js/dates.js`, `site/js/plural.js`, `site/js/random.js`
- Modify: `.gitignore`
- Test: `tests/unit/utils.test.mjs`

**Interfaces:**
- Produces: `todayISO(now?: Date): string` (`YYYY-MM-DD`, локальная дата); `addDays(iso: string, days: number): string`; `daysBetween(fromIso: string, toIso: string): number`; `plural(n: number, one: string, few: string, many: string): string`; `shuffle<T>(items: T[], rand?: () => number): T[]` (новый массив).

- [ ] **Step 1: package.json и .gitignore**

`package.json`:

```json
{
  "name": "pocket-skipper",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"tests/unit/*.test.mjs\"",
    "check": "node scripts/check-content.mjs",
    "assets": "node scripts/update-sw-assets.mjs",
    "serve": "python3 -m http.server 4173 --bind 127.0.0.1 --directory site",
    "e2e": "playwright test"
  }
}
```

Дописать в `.gitignore` строку `.local/`.

- [ ] **Step 2: Написать падающий тест**

`tests/unit/utils.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayISO, addDays, daysBetween } from '../../site/js/dates.js';
import { plural } from '../../site/js/plural.js';
import { shuffle } from '../../site/js/random.js';

test('todayISO форматирует локальную дату', () => {
  assert.equal(todayISO(new Date(2026, 8, 5, 23, 59)), '2026-09-05');
});

test('addDays переходит через границу месяца и года', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 7), '2027-01-07');
  assert.equal(addDays('2026-09-16', 0), '2026-09-16');
});

test('daysBetween считает целые дни', () => {
  assert.equal(daysBetween('2026-09-16', '2026-10-07'), 21);
  assert.equal(daysBetween('2026-10-07', '2026-09-16'), -21);
});

test('plural выбирает форму слова', () => {
  const f = (n) => plural(n, 'день', 'дня', 'дней');
  assert.deepEqual([1, 2, 5, 11, 12, 21, 22, 25, 111].map(f),
    ['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'дней']);
});

test('shuffle возвращает перестановку и не меняет исходный массив', () => {
  const src = [1, 2, 3, 4];
  const out = shuffle(src, () => 0);
  assert.deepEqual(src, [1, 2, 3, 4]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4]);
  assert.deepEqual(out, [2, 3, 4, 1]);
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL, `Cannot find module .../site/js/dates.js`.

- [ ] **Step 4: Реализация**

`site/js/dates.js`:

```js
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}
```

`site/js/plural.js`:

```js
export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
```

`site/js/random.js` (Фишер-Йетс):

```js
export function shuffle(items, rand = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

Проверка ожидания `[2, 3, 4, 1]` при `rand = () => 0`: i=3 меняет 3↔0 → `[4,2,3,1]`; i=2 меняет 2↔0 → `[3,2,4,1]`; i=1 меняет 1↔0 → `[2,3,4,1]`.

- [ ] **Step 5: Тесты проходят**

Run: `npm test`
Expected: PASS, 5 тестов.

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore site/js/dates.js site/js/plural.js site/js/random.js tests/unit/utils.test.mjs
git commit -m "Add project scaffold and date, plural, shuffle helpers"
```

---

### Task 2: Интервальные повторения (Лейтнер)

**Files:**
- Create: `site/js/leitner.js`
- Test: `tests/unit/leitner.test.mjs`

**Interfaces:**
- Consumes: `addDays` из `site/js/dates.js`.
- Produces: `INTERVALS = [0, 1, 2, 4, 7]`, `SESSION_LIMIT = 15`, `MAX_BOX = 5`;
  тип `Cards = { [questionId: string]: { box: 1..5, due: 'YYYY-MM-DD' } }`;
  `buildSession(cards: Cards, questionIds: string[], today: string, limit?: number): string[]` - сначала просроченные (по возрастанию коробки, затем даты), затем новые в порядке `questionIds`;
  `grade(cards: Cards, id: string, correct: boolean, today: string): Cards` - новый объект; верно → коробка +1 (новая карточка считается коробкой 1), неверно → коробка 1; `due = today + INTERVALS[box-1]`;
  `readiness(cards: Cards, questionIds: string[]): number` - доля карточек в коробках 4-5, от 0 до 1.

- [ ] **Step 1: Падающий тест**

`tests/unit/leitner.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, grade, readiness, INTERVALS, SESSION_LIMIT } from '../../site/js/leitner.js';

const today = '2026-09-16';

test('интервалы соответствуют спецификации', () => {
  assert.deepEqual(INTERVALS, [0, 1, 2, 4, 7]);
  assert.equal(SESSION_LIMIT, 15);
});

test('новая карточка при верном ответе попадает в коробку 2 на завтра', () => {
  const cards = grade({}, 'q1', true, today);
  assert.deepEqual(cards.q1, { box: 2, due: '2026-09-17' });
});

test('неверный ответ возвращает в коробку 1 на сегодня', () => {
  const cards = grade({ q1: { box: 4, due: today } }, 'q1', false, today);
  assert.deepEqual(cards.q1, { box: 1, due: today });
});

test('коробка не превышает 5, интервал 7 дней', () => {
  const cards = grade({ q1: { box: 5, due: today } }, 'q1', true, today);
  assert.deepEqual(cards.q1, { box: 5, due: '2026-09-23' });
});

test('grade не мутирует исходный объект', () => {
  const src = { q1: { box: 1, due: today } };
  grade(src, 'q1', true, today);
  assert.deepEqual(src, { q1: { box: 1, due: today } });
});

test('сессия: сначала просроченные по коробке, потом новые, с лимитом', () => {
  const cards = {
    a: { box: 3, due: '2026-09-15' },
    b: { box: 1, due: '2026-09-16' },
    c: { box: 2, due: '2026-09-20' },
  };
  assert.deepEqual(buildSession(cards, ['a', 'b', 'c', 'd', 'e'], today), ['b', 'a', 'd', 'e']);
  assert.deepEqual(buildSession(cards, ['a', 'b', 'c', 'd', 'e'], today, 3), ['b', 'a', 'd']);
});

test('сессия игнорирует карточки удалённых вопросов', () => {
  assert.deepEqual(buildSession({ gone: { box: 1, due: today } }, ['x'], today), ['x']);
});

test('готовность - доля коробок 4-5', () => {
  const cards = { a: { box: 4, due: today }, b: { box: 5, due: today }, c: { box: 3, due: today } };
  assert.equal(readiness(cards, ['a', 'b', 'c', 'd']), 0.5);
  assert.equal(readiness({}, []), 0);
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `leitner.js` не найден.

- [ ] **Step 3: Реализация**

`site/js/leitner.js`:

```js
import { addDays } from './dates.js';

export const INTERVALS = [0, 1, 2, 4, 7];
export const MAX_BOX = INTERVALS.length;
export const SESSION_LIMIT = 15;

export function buildSession(cards, questionIds, today, limit = SESSION_LIMIT) {
  const due = questionIds
    .filter((id) => cards[id] && cards[id].due <= today)
    .sort((a, b) => cards[a].box - cards[b].box || cards[a].due.localeCompare(cards[b].due));
  const fresh = questionIds.filter((id) => !cards[id]);
  return [...due, ...fresh].slice(0, limit);
}

export function grade(cards, id, correct, today) {
  const previous = cards[id]?.box ?? 1;
  const box = correct ? Math.min(previous + 1, MAX_BOX) : 1;
  return { ...cards, [id]: { box, due: addDays(today, INTERVALS[box - 1]) } };
}

export function readiness(cards, questionIds) {
  if (questionIds.length === 0) return 0;
  const learned = questionIds.filter((id) => (cards[id]?.box ?? 0) >= 4).length;
  return learned / questionIds.length;
}
```

- [ ] **Step 4: Тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/js/leitner.js tests/unit/leitner.test.mjs
git commit -m "Add Leitner spaced repetition scheduling"
```

---

### Task 3: Хранилище прогресса, отметки чек-листов, шаблоны радиовызовов

**Files:**
- Create: `site/js/storage.js`, `site/js/checks.js`, `site/js/template.js`
- Test: `tests/unit/storage.test.mjs`

**Interfaces:**
- Produces:
  - `STORAGE_KEY = 'pocket-skipper:v1'`;
  - тип `State = { version: 1, cards: Cards, checks: { [listKey]: { [itemId]: true } }, settings: { tripDate?, boatName?, callsign?, mmsi?, persons? } }`;
  - `parseState(raw: string): State` - бросает `Error` с русским текстом, если это не наш формат;
  - `createStore(backend: Storage | null): { persistent: boolean, recovered: boolean, state: State, update(fn: (s: State) => State): void, exportJSON(): string, importJSON(raw: string): void }`.
    Если `backend` недоступен → `persistent = false`, данные только в памяти.
    Если сохранённые данные повреждены → копия в `pocket-skipper:v1:corrupt`, `recovered = true`, старт с пустого состояния;
  - `toggleCheck(checks, listKey, itemId)`, `resetChecks(checks, listKey)`, `countChecked(checks, listKey, itemIds): number` - чистые функции;
  - `PLACEHOLDERS = { boat, callsign, mmsi, persons, position, nature, help }` (русские подписи);
  - `callValues(settings): { boat, callsign, mmsi, persons }`;
  - `fillTemplate(line: string, values: object): string` - `{key}` → значение, пустое значение → `‹подпись›`.

- [ ] **Step 1: Падающий тест**

`tests/unit/storage.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, parseState, STORAGE_KEY } from '../../site/js/storage.js';
import { toggleCheck, resetChecks, countChecked } from '../../site/js/checks.js';
import { fillTemplate, callValues } from '../../site/js/template.js';

function memoryBackend(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

test('пустое хранилище даёт пустое состояние', () => {
  const store = createStore(memoryBackend());
  assert.equal(store.persistent, true);
  assert.equal(store.recovered, false);
  assert.deepEqual(store.state, { version: 1, cards: {}, checks: {}, settings: {} });
});

test('update сохраняет состояние в backend', () => {
  const backend = memoryBackend();
  const store = createStore(backend);
  store.update((s) => ({ ...s, settings: { boatName: 'Aurora' } }));
  assert.equal(JSON.parse(backend.data[STORAGE_KEY]).settings.boatName, 'Aurora');
  assert.equal(createStore(backend).state.settings.boatName, 'Aurora');
});

test('повреждённые данные сохраняются в копию, старт с нуля', () => {
  const backend = memoryBackend({ [STORAGE_KEY]: '{broken' });
  const store = createStore(backend);
  assert.equal(store.recovered, true);
  assert.equal(backend.data[`${STORAGE_KEY}:corrupt`], '{broken');
  assert.deepEqual(store.state.cards, {});
});

test('без backend работает в памяти', () => {
  const store = createStore(null);
  assert.equal(store.persistent, false);
  store.update((s) => ({ ...s, settings: { mmsi: '123456789' } }));
  assert.equal(store.state.settings.mmsi, '123456789');
});

test('экспорт и импорт', () => {
  const a = createStore(memoryBackend());
  a.update((s) => ({ ...s, cards: { q1: { box: 3, due: '2026-09-18' } } }));
  const b = createStore(memoryBackend());
  b.importJSON(a.exportJSON());
  assert.deepEqual(b.state.cards, { q1: { box: 3, due: '2026-09-18' } });
});

test('импорт чужого файла отклоняется и не портит состояние', () => {
  const store = createStore(memoryBackend());
  store.update((s) => ({ ...s, settings: { boatName: 'Aurora' } }));
  assert.throws(() => store.importJSON('{"foo": 1}'), /Карманного шкипера/);
  assert.throws(() => parseState('not json'));
  assert.equal(store.state.settings.boatName, 'Aurora');
});

test('отметки чек-листа', () => {
  let checks = toggleCheck({}, 'prep', 'docs');
  checks = toggleCheck(checks, 'prep', 'apps');
  assert.equal(countChecked(checks, 'prep', ['docs', 'apps', 'food']), 2);
  checks = toggleCheck(checks, 'prep', 'docs');
  assert.deepEqual(checks, { prep: { apps: true } });
  assert.deepEqual(resetChecks({ prep: { apps: true }, other: { x: true } }, 'prep'), { other: { x: true } });
  assert.equal(countChecked({ prep: { removed: true } }, 'prep', ['docs']), 0);
});

test('шаблон радиовызова', () => {
  const values = callValues({ boatName: 'Aurora', mmsi: '271000000', callsign: '' });
  assert.equal(fillTemplate('This is {boat} {boat} {boat}, MMSI {mmsi}', values),
    'This is Aurora Aurora Aurora, MMSI 271000000');
  assert.equal(fillTemplate('Call sign {callsign}, position {position}', values),
    'Call sign ‹позывной›, position ‹координаты›');
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `storage.js` не найден.

- [ ] **Step 3: Реализация**

`site/js/storage.js`:

```js
export const STORAGE_KEY = 'pocket-skipper:v1';

function emptyState() {
  return { version: 1, cards: {}, checks: {}, settings: {} };
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseState(raw) {
  const data = JSON.parse(raw);
  if (!isObject(data) || data.version !== 1 || !isObject(data.cards) || !isObject(data.checks) || !isObject(data.settings)) {
    throw new Error('Файл не похож на прогресс Карманного шкипера');
  }
  return { version: 1, cards: data.cards, checks: data.checks, settings: data.settings };
}

export function createStore(backend) {
  let persistent = true;
  let recovered = false;
  let state;
  try {
    const raw = backend.getItem(STORAGE_KEY);
    if (raw === null) {
      state = emptyState();
    } else {
      try {
        state = parseState(raw);
      } catch {
        backend.setItem(`${STORAGE_KEY}:corrupt`, raw);
        recovered = true;
        state = emptyState();
      }
    }
  } catch {
    persistent = false;
    state = emptyState();
  }

  function save() {
    if (persistent) backend.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return {
    get persistent() { return persistent; },
    recovered,
    get state() { return state; },
    update(fn) { state = fn(state); save(); },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(raw) { state = parseState(raw); save(); },
  };
}
```

`site/js/checks.js`:

```js
export function toggleCheck(checks, listKey, itemId) {
  const list = { ...(checks[listKey] ?? {}) };
  if (list[itemId]) delete list[itemId];
  else list[itemId] = true;
  return { ...checks, [listKey]: list };
}

export function resetChecks(checks, listKey) {
  const { [listKey]: _removed, ...rest } = checks;
  return rest;
}

export function countChecked(checks, listKey, itemIds) {
  const list = checks[listKey] ?? {};
  return itemIds.filter((id) => list[id]).length;
}
```

`site/js/template.js`:

```js
export const PLACEHOLDERS = {
  boat: 'название яхты',
  callsign: 'позывной',
  mmsi: 'MMSI',
  persons: 'число людей',
  position: 'координаты',
  nature: 'что случилось',
  help: 'какая помощь нужна',
};

export function callValues(settings) {
  return {
    boat: settings.boatName ?? '',
    callsign: settings.callsign ?? '',
    mmsi: settings.mmsi ?? '',
    persons: settings.persons ?? '',
  };
}

export function fillTemplate(line, values) {
  return line.replace(/\{(\w+)\}/g, (_, key) => values[key] || `‹${PLACEHOLDERS[key] ?? key}›`);
}
```

- [ ] **Step 4: Тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/js/storage.js site/js/checks.js site/js/template.js tests/unit/storage.test.mjs
git commit -m "Add progress store, checklist state and radio call templates"
```

---
### Task 4: Источники, проверка содержания, стартовое содержание

**Files:**
- Create: `site/js/sources.js`, `site/js/content.js`, `scripts/lib/validate-content.mjs`, `scripts/check-content.mjs`
- Create: `site/content/questions.json`, `situations.json`, `maneuvers.json`, `checklists.json`, `vhf.json`, `reference.json`, `external.json` (по одной стартовой записи)
- Test: `tests/unit/content.test.mjs`

**Interfaces:**
- Produces:
  - `IALA_TOPICS` - словарь `{ 'lateral-a', cardinal, 'isolated-danger', 'safe-water', special, 'emergency-wreck' }` → русская подпись;
  - `formatSource(src): string`, `formatSources(list): string` (через ` · `);
  - `CONTENT_FILES = ['questions', 'situations', 'maneuvers', 'checklists', 'vhf', 'reference', 'external']`;
  - `loadContent(fetchFn?): Promise<{ [file]: object }>` - грузит `content/<file>.json` относительным URL;
  - `validateContent(content): string[]` - список ошибок, пустой список = всё хорошо;
  - `ELEMENT_TYPES`, `IMAGE_KINDS`, `MARK_KINDS`, `VHF_KINDS`, `REFERENCE_KINDS` - экспортируются из `validate-content.mjs` и используются рендерерами для согласованности.

**Схема содержания (её используют все следующие задачи).**
Общие поля каждой записи: `id` (`^[a-z0-9-]+$`, уникален во всех файлах), `sources` (непустой массив), `verified` (boolean).

Источник - один из вариантов:
`{"type":"iyt","module":2,"section":8,"page":57}` (section необязательна) ·
`{"type":"colregs","rule":26}` (rule 1-41) или `{"type":"colregs","annex":"I"}` (I-IV) ·
`{"type":"iala","topic":"cardinal"}` ·
`{"type":"web","title":"...","url":"https://...","accessed":"2026-09-16"}`.

| Файл | Корень | Поля записи сверх общих |
|---|---|---|
| questions.json | `{ topics: [{id,title}], questions: [...] }` | `topic` (id темы), `text`, `options` (2-5 шт., `{text, correct?: true}`, ровно один верный), `explain`, `image?` |
| situations.json | `{ situations: [...] }` | `title`, `severity` (`emergency` \| `problem`), `summary`, `steps: [{text, note?}]` |
| maneuvers.json | `{ maneuvers: [...] }` | `title`, `summary`, `scene: {label, wind?, power?, elements: [...]}`, `steps: [{who, command?, text, pose: {x, y, rot, boom?}}]` |
| checklists.json | `{ checklists: [...] }` | `title`, `intro`, `groups: [{title, items: [{id, text, note?}]}]` (id пунктов уникальны внутри списка) |
| vhf.json | `{ sections: [...] }` | `title`, `kind` и данные вида: `channels` → `rows: [{ch, use}]`, `columns?: [подпись1, подпись2]` (по умолчанию «Канал», «Назначение»); `call` → `when`, `lines: [string]`; `phonetic` → `letters: [[буква, слово]]`; `steps` → `steps: [{text, note?}]` |
| reference.json | `{ sections: [...] }` | `title`, `kind`: `table` → `rows: [{label, value}]`; `lights` → `rows: [{label, value, lights: {label, lights: [...]}}]`; `marks` → `rows: [{label, value, mark}]` |
| external.json | `{ links: [...] }` | только `id`, `title`, `url` (https), `lang` (`ru` \| `en`), `note`, `accessed`; без `sources`/`verified` |

`image` вопроса: `{kind:"lights", label, lights:[{color, x, y, flashing?}]}` (color: `red|green|white|yellow`, x 0-200, y 0-120) · `{kind:"marks", label, mark}` (mark из `MARK_KINDS`) · `{kind:"encounter", label, wind?, vessels:[{name, type:"sail"|"power", x, y, rot, boom?}]}`.

Элементы сцены манёвра (`ELEMENT_TYPES`): `quay {x,y,w,h}` · `boat-moored {x,y,rot?,scale?}` · `buoy {x,y}` · `anchor {x,y}` · `line {points:[[x,y],...], dashed?}` · `person {x,y}` · `label {x,y,text}` · `path {d}` (d только из `MLQCZmlqcz`, цифр, пробелов, `.,-`).
Любой элемент может иметь `steps: [индексы шагов]` - тогда он виден только на этих шагах.
Сцена 260×200, ветер `wind` - откуда дует, в градусах (0 - сверху).
`boom` - угол гика в градусах: плюс - гик на левом борту, минус - на правом.

- [ ] **Step 1: Падающий тест**

`tests/unit/content.test.mjs`:

```js
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

test('реальное содержание репозитория проходит проверку', async () => {
  assert.deepEqual(validateContent(await realContent()), []);
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `sources.js` не найден.

- [ ] **Step 3: sources.js и content.js**

`site/js/sources.js`:

```js
export const IALA_TOPICS = {
  'lateral-a': 'латеральные знаки, регион A',
  cardinal: 'кардинальные знаки',
  'isolated-danger': 'знак отдельной опасности',
  'safe-water': 'знак безопасных вод',
  special: 'специальные знаки',
  'emergency-wreck': 'знак новой опасности',
};

export function formatSource(src) {
  switch (src.type) {
    case 'iyt':
      return `IYT BBS, модуль ${src.module}${src.section ? `, секция ${src.section}` : ''}, с. ${src.page}`;
    case 'colregs':
      return src.annex ? `МППСС-72, прил. ${src.annex}` : `МППСС-72, пр. ${src.rule}`;
    case 'iala':
      return `IALA, ${IALA_TOPICS[src.topic]}`;
    case 'web':
      return `${src.title}, ${src.accessed}`;
    default:
      throw new Error(`Неизвестный тип источника: ${src.type}`);
  }
}

export function formatSources(list) {
  return list.map(formatSource).join(' · ');
}
```

`site/js/content.js`:

```js
export const CONTENT_FILES = ['questions', 'situations', 'maneuvers', 'checklists', 'vhf', 'reference', 'external'];

export async function loadContent(fetchFn = (url) => fetch(url)) {
  const entries = await Promise.all(CONTENT_FILES.map(async (name) => {
    const url = `content/${name}.json`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`Не загрузился ${url}: ${res.status}`);
    return [name, await res.json()];
  }));
  return Object.fromEntries(entries);
}
```

- [ ] **Step 4: validate-content.mjs**

`scripts/lib/validate-content.mjs`:

```js
import { IALA_TOPICS } from '../../site/js/sources.js';

export const ELEMENT_TYPES = ['quay', 'boat-moored', 'buoy', 'anchor', 'line', 'person', 'label', 'path'];
export const IMAGE_KINDS = ['lights', 'marks', 'encounter'];
export const MARK_KINDS = ['port', 'starboard', 'north', 'south', 'east', 'west', 'isolated-danger', 'safe-water', 'special', 'emergency-wreck'];
export const LIGHT_COLORS = ['red', 'green', 'white', 'yellow'];
export const VHF_KINDS = ['channels', 'call', 'phonetic', 'steps'];
export const REFERENCE_KINDS = ['table', 'lights', 'marks'];

const ID = /^[a-z0-9-]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PATH_D = /^[MLQCZmlqcz0-9 .,-]+$/;
const ANNEXES = ['I', 'II', 'III', 'IV'];

const text = (v) => typeof v === 'string' && v.trim().length > 0;
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const list = (v) => Array.isArray(v) && v.length > 0;

function checkSource(s, err) {
  switch (s?.type) {
    case 'iyt':
      if (!Number.isInteger(s.module)) err('iyt: нет module');
      if (!Number.isInteger(s.page)) err('iyt: нет page');
      if (s.section !== undefined && !Number.isInteger(s.section)) err('iyt: section должна быть числом');
      break;
    case 'colregs': {
      const ruleOk = Number.isInteger(s.rule) && s.rule >= 1 && s.rule <= 41;
      if (!ruleOk && !ANNEXES.includes(s.annex)) err('colregs: нужен rule 1-41 или annex I-IV');
      break;
    }
    case 'iala':
      if (!(s.topic in IALA_TOPICS)) err(`iala: неизвестная тема ${s.topic}`);
      break;
    case 'web':
      if (!text(s.title)) err('web: нет title');
      if (!/^https:\/\//.test(s.url ?? '')) err('web: url должен начинаться с https://');
      if (!ISO_DATE.test(s.accessed ?? '')) err('web: accessed должен быть в формате YYYY-MM-DD');
      break;
    default:
      err(`неизвестный тип источника ${JSON.stringify(s?.type)}`);
  }
}

function checkImage(img, err) {
  if (!IMAGE_KINDS.includes(img?.kind)) return err(`неизвестный вид картинки ${img?.kind}`);
  if (!text(img.label)) err('у картинки нет label');
  if (img.kind === 'lights') checkLights(img, err);
  if (img.kind === 'marks' && !MARK_KINDS.includes(img.mark)) err(`неизвестный знак ${img.mark}`);
  if (img.kind === 'encounter') {
    if (!list(img.vessels)) err('encounter: нет vessels');
    for (const v of img.vessels ?? []) {
      if (!text(v.name) || !['sail', 'power'].includes(v.type) || !num(v.x) || !num(v.y) || !num(v.rot)) {
        err('encounter: у судна нужны name, type sail|power, x, y, rot');
      }
    }
  }
}

function checkLights(img, err) {
  if (!list(img.lights)) return err('lights: нет огней');
  for (const l of img.lights) {
    if (!LIGHT_COLORS.includes(l.color)) err(`lights: неизвестный цвет ${l.color}`);
    if (!num(l.x) || l.x < 0 || l.x > 200 || !num(l.y) || l.y < 0 || l.y > 120) err('lights: x 0-200, y 0-120');
  }
}

function checkElement(el, err) {
  if (!ELEMENT_TYPES.includes(el?.type)) return err(`неизвестный элемент ${el?.type}`);
  if (el.type === 'path' && !(text(el.d) && PATH_D.test(el.d))) err('path: недопустимые символы в d');
  if (el.type === 'line' && !(list(el.points) && el.points.every((p) => num(p[0]) && num(p[1])))) err('line: нужны points');
  if (el.type === 'label' && !text(el.text)) err('label: нет text');
  if (el.type === 'quay' && ![el.x, el.y, el.w, el.h].every(num)) err('quay: нужны x, y, w, h');
  if (['boat-moored', 'buoy', 'anchor', 'person', 'label'].includes(el.type) && !(num(el.x) && num(el.y))) err(`${el.type}: нужны x, y`);
}

const checkers = {
  questions(r, err, content) {
    const topics = new Set((content.questions.topics ?? []).map((t) => t.id));
    if (!topics.has(r.topic)) err(`неизвестная тема ${r.topic}`);
    if (!text(r.text)) err('нет text');
    if (!text(r.explain)) err('нет explain');
    const opts = r.options ?? [];
    if (opts.length < 2 || opts.length > 5 || !opts.every((o) => text(o.text))) err('нужно 2-5 вариантов с text');
    if (opts.filter((o) => o.correct === true).length !== 1) err('нужен ровно один верный вариант');
    if (r.image !== undefined) checkImage(r.image, err);
  },
  situations(r, err) {
    if (!text(r.title) || !text(r.summary)) err('нужны title и summary');
    if (!['emergency', 'problem'].includes(r.severity)) err('severity: emergency или problem');
    if (!list(r.steps) || !r.steps.every((s) => text(s.text))) err('нужны steps с text');
  },
  maneuvers(r, err) {
    if (!text(r.title) || !text(r.summary)) err('нужны title и summary');
    if (!text(r.scene?.label)) err('scene: нет label');
    if (!Array.isArray(r.scene?.elements)) err('scene: нет elements');
    for (const el of r.scene?.elements ?? []) checkElement(el, err);
    if (!list(r.steps)) err('нет steps');
    for (const s of r.steps ?? []) {
      if (!text(s.who) || !text(s.text)) err('шаг: нужны who и text');
      if (s.command !== undefined && typeof s.command !== 'string') err('шаг: command должен быть строкой');
      if (!(num(s.pose?.x) && num(s.pose?.y) && num(s.pose?.rot))) err('шаг: pose с x, y, rot');
    }
  },
  checklists(r, err) {
    if (!text(r.title) || !text(r.intro)) err('нужны title и intro');
    if (!list(r.groups)) err('нет groups');
    const ids = new Set();
    for (const g of r.groups ?? []) {
      if (!list(g.items)) err(`группа ${g.title}: нет items`);
      for (const item of g.items ?? []) {
        if (!ID.test(item.id ?? '') || ids.has(item.id)) err(`пункт ${item.id}: плохой или повторный id`);
        ids.add(item.id);
        if (!text(item.text)) err(`пункт ${item.id}: нет text`);
      }
    }
  },
  vhf(r, err) {
    if (!text(r.title)) err('нет title');
    if (!VHF_KINDS.includes(r.kind)) return err(`неизвестный kind ${r.kind}`);
    const ok = {
      channels: () => list(r.rows) && r.rows.every((x) => text(x.ch) && text(x.use)),
      call: () => text(r.when) && list(r.lines) && r.lines.every(text),
      phonetic: () => list(r.letters) && r.letters.every((x) => text(x[0]) && text(x[1])),
      steps: () => list(r.steps) && r.steps.every((x) => text(x.text)),
    }[r.kind]();
    if (!ok) err(`данные вида ${r.kind} неполные`);
  },
  reference(r, err) {
    if (!text(r.title)) err('нет title');
    if (!REFERENCE_KINDS.includes(r.kind)) return err(`неизвестный kind ${r.kind}`);
    if (!list(r.rows)) return err('нет rows');
    for (const row of r.rows) {
      if (!text(row.label) || !text(row.value)) err('строка: нужны label и value');
      if (r.kind === 'marks' && !MARK_KINDS.includes(row.mark)) err(`неизвестный знак ${row.mark}`);
      if (r.kind === 'lights') {
        if (!text(row.lights?.label)) err('строка lights: нет lights.label');
        checkLights(row.lights ?? {}, err);
      }
    }
  },
};

const RECORD_LISTS = {
  questions: (c) => c.questions?.questions,
  situations: (c) => c.situations?.situations,
  maneuvers: (c) => c.maneuvers?.maneuvers,
  checklists: (c) => c.checklists?.checklists,
  vhf: (c) => c.vhf?.sections,
  reference: (c) => c.reference?.sections,
};

export function validateContent(content) {
  const errors = [];
  const seen = new Set();
  const useId = (id, where) => {
    if (!ID.test(id ?? '')) errors.push(`${where}: плохой id ${JSON.stringify(id)}`);
    else if (seen.has(id)) errors.push(`${where}: ${id}: id повторяется`);
    seen.add(id);
  };

  for (const [file, pick] of Object.entries(RECORD_LISTS)) {
    const records = pick(content);
    if (!Array.isArray(records)) {
      errors.push(`${file}.json: нет списка записей`);
      continue;
    }
    for (const r of records) {
      const where = `${file}.json`;
      useId(r.id, where);
      const err = (msg) => errors.push(`${where}: ${r.id}: ${msg}`);
      if (!list(r.sources)) err('нет источников');
      for (const s of r.sources ?? []) checkSource(s, err);
      if (typeof r.verified !== 'boolean') err('verified должен быть true или false');
      checkers[file](r, err, content);
    }
  }

  for (const t of content.questions?.topics ?? []) useId(t.id, 'questions.json: topics');

  const links = content.external?.links;
  if (!Array.isArray(links)) errors.push('external.json: нет списка links');
  for (const l of links ?? []) {
    useId(l.id, 'external.json');
    const err = (msg) => errors.push(`external.json: ${l.id}: ${msg}`);
    if (!text(l.title) || !text(l.note)) err('нужны title и note');
    if (!/^https:\/\//.test(l.url ?? '')) err('url должен начинаться с https://');
    if (!['ru', 'en'].includes(l.lang)) err('lang: ru или en');
    if (!ISO_DATE.test(l.accessed ?? '')) err('accessed должен быть в формате YYYY-MM-DD');
  }
  return errors;
}

export function contentStats(content) {
  const records = Object.values(RECORD_LISTS).flatMap((pick) => pick(content) ?? []);
  return { total: records.length, unverified: records.filter((r) => r.verified !== true).map((r) => r.id) };
}
```

- [ ] **Step 5: CLI check-content.mjs**

`scripts/check-content.mjs`:

```js
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
```

- [ ] **Step 6: Стартовое содержание**

Каждый файл - одна запись с `"verified": false`; настоящие записи добавят задачи 13-18.

`site/content/questions.json`:

```json
{
  "topics": [
    { "id": "lights", "title": "Огни и знаки" }
  ],
  "questions": [
    {
      "id": "lights-trawler",
      "topic": "lights",
      "text": "Ночью видны два круговых огня один над другим: зелёный над белым. Что это за судно?",
      "image": {
        "kind": "lights",
        "label": "Зелёный огонь над белым",
        "lights": [{ "color": "green", "x": 100, "y": 42 }, { "color": "white", "x": 100, "y": 78 }]
      },
      "options": [
        { "text": "Траулер за ловом", "correct": true },
        { "text": "Судно, лишённое возможности управляться" },
        { "text": "Лоцманское судно при исполнении обязанностей" },
        { "text": "Судно, ограниченное в возможности маневрировать" }
      ],
      "explain": "Зелёный над белым - судно, занятое тралением. Два красных - лишённое возможности управляться, белый над красным - лоцман, красный-белый-красный - ограниченное в возможности маневрировать.",
      "sources": [{ "type": "colregs", "rule": 26 }],
      "verified": false
    }
  ]
}
```

`site/content/situations.json`:

```json
{
  "situations": [
    {
      "id": "mob",
      "title": "Человек за бортом",
      "severity": "emergency",
      "summary": "Не терять человека из виду и как можно быстрее вернуться к нему.",
      "steps": [
        { "text": "Крикнуть «Человек за бортом!» и указать борт" },
        { "text": "Бросить спасательный круг или подкову", "note": "Сразу, пока человек рядом" },
        { "text": "Назначить наблюдателя", "note": "Не сводит глаз и всё время показывает рукой" },
        { "text": "Нажать MOB на картплоттере или GPS" },
        { "text": "Начать манёвр возврата" }
      ],
      "sources": [{ "type": "iyt", "module": 2, "section": 8, "page": 56 }],
      "verified": false
    }
  ]
}
```

`site/content/maneuvers.json`:

```json
{
  "maneuvers": [
    {
      "id": "tack",
      "title": "Поворот оверштаг",
      "summary": "Смена галса, когда нос проходит линию ветра.",
      "scene": {
        "label": "Лодка меняет галс носом через ветер",
        "wind": 0,
        "elements": [{ "type": "path", "d": "M60 180 Q130 60 200 180" }]
      },
      "steps": [
        { "who": "Шкипер", "command": "Приготовиться к повороту оверштаг!", "text": "Экипаж занимает места у шкотов.", "pose": { "x": 110, "y": 125, "rot": -45, "boom": 18 } },
        { "who": "Экипаж", "command": "Готов!", "text": "Рулевой проверяет, что новый курс свободен.", "pose": { "x": 110, "y": 125, "rot": -45, "boom": 18 } },
        { "who": "Шкипер", "command": "Поворот!", "text": "Рулевой приводится, нос проходит линию ветра.", "pose": { "x": 130, "y": 105, "rot": 0, "boom": 0 } },
        { "who": "Экипаж", "command": "", "text": "Выбрать стаксель-шкот на новом галсе.", "pose": { "x": 150, "y": 125, "rot": 45, "boom": -18 } }
      ],
      "sources": [{ "type": "iyt", "module": 2, "section": 6, "page": 46 }],
      "verified": false
    }
  ]
}
```

`site/content/checklists.json`:

```json
{
  "checklists": [
    {
      "id": "acceptance",
      "title": "Приёмка яхты",
      "intro": "Проверить до подписания акта приёмки.",
      "groups": [
        { "title": "Документы", "items": [{ "id": "papers", "text": "Судовые документы и страховка на борту" }] }
      ],
      "sources": [{ "type": "iyt", "module": 14, "section": 2, "page": 196 }],
      "verified": false
    }
  ]
}
```

`site/content/vhf.json`:

```json
{
  "sections": [
    {
      "id": "vhf-channels",
      "title": "Основные каналы",
      "kind": "channels",
      "rows": [{ "ch": "16", "use": "Бедствие, срочность, безопасность и вызов" }],
      "sources": [{ "type": "iyt", "module": 7, "page": 93 }],
      "verified": false
    }
  ]
}
```

`site/content/reference.json`:

```json
{
  "sections": [
    {
      "id": "ref-cardinal",
      "title": "Кардинальные знаки",
      "kind": "marks",
      "rows": [{ "label": "Северный", "value": "Обходить с севера. Топовая фигура - два конуса вершинами вверх.", "mark": "north" }],
      "sources": [{ "type": "iala", "topic": "cardinal" }],
      "verified": false
    }
  ]
}
```

`site/content/external.json`:

```json
{
  "links": [
    { "id": "ext-sailquiz", "title": "SailQuiz", "url": "https://sailquiz.com/quiz", "lang": "en", "note": "Расхождение, огни, кардинальные знаки, с объяснениями", "accessed": "2026-09-16" }
  ]
}
```

- [ ] **Step 7: Проверки проходят**

Run: `npm test && npm run check`
Expected: тесты PASS; `Содержание в порядке: 6 записей, не сверено 6.`

- [ ] **Step 8: Commit**

```bash
git add site/js/sources.js site/js/content.js scripts tests/unit/content.test.mjs site/content
git commit -m "Add content schema validation and seed content"
```

---
### Task 5: Оболочка приложения - вкладки, маршруты, стили, шрифты

**Files:**
- Create: `scripts/fetch-fonts.mjs`, `site/fonts/*.woff2`, `site/fonts/OFL.md`, `site/css/fonts.css`, `site/css/tokens.css`, `site/css/app.css`
- Create: `site/index.html`, `site/js/ui.js`, `site/js/router.js`, `site/js/routes.js`, `site/js/app.js`, `site/js/views/placeholder.js`
- Test: `tests/unit/router.test.mjs`

**Interfaces:**
- Consumes: `createStore` (Task 3), `loadContent` (Task 4), `formatSource` (Task 4).
- Produces:
  - `matchRoute(hash: string, routes: Array<[RegExp, View]>): { view: View | null, params: string[], tab: string | null }`, где `tab` - первый сегмент после `#/`;
  - тип `View = (ctx: Ctx, ...params: string[]) => Node`;
  - тип `Ctx = { content, store, rerender(): void }`;
  - `routes` - массив `[RegExp, View]` в `site/js/routes.js`; следующие задачи заменяют в нём заглушки;
  - `h(tag, attrs?, ...children): HTMLElement` - атрибуты `on*` → обработчики, `class`, `html` (только для SVG-строк, собранных нашим кодом), `true` → пустой атрибут, `false`/`null` → пропуск; дети сплющиваются на любую глубину;
  - `header(title: string, backHref?: string)`, `sourceFooter(record)`, `notFound()`, `table(headings: string[], rows: string[][])`;
  - `placeholder(title: string, backHref?: string): View`.
- Маршруты: `#/today`, `#/today/session`, `#/tests`, `#/tests/topic/<id>`, `#/tests/exam`, `#/situations`, `#/situations/<id>`, `#/maneuvers`, `#/maneuvers/<id>`, `#/more`, `#/more/vhf`, `#/more/checklist/<id>`, `#/more/reference`, `#/more/external`, `#/more/settings`. Пустой hash = `#/today`.

- [ ] **Step 1: Падающий тест маршрутизатора**

`tests/unit/router.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute } from '../../site/js/router.js';

const a = () => 'a';
const b = () => 'b';
const routes = [[/^#\/tests$/, a], [/^#\/tests\/topic\/([\w-]+)$/, b]];

test('находит маршрут и параметры', () => {
  assert.deepEqual(matchRoute('#/tests/topic/lights', routes), { view: b, params: ['lights'], tab: 'tests' });
  assert.deepEqual(matchRoute('#/tests', routes), { view: a, params: [], tab: 'tests' });
});

test('неизвестный маршрут', () => {
  assert.deepEqual(matchRoute('#/nope', routes), { view: null, params: [], tab: 'nope' });
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `router.js` не найден.

- [ ] **Step 3: router.js**

`site/js/router.js`:

```js
export function matchRoute(hash, routes) {
  const tab = hash.split('/')[1] ?? null;
  for (const [pattern, view] of routes) {
    const m = pattern.exec(hash);
    if (m) return { view, params: m.slice(1), tab };
  }
  return { view: null, params: [], tab };
}
```

Run: `npm test` → PASS.

- [ ] **Step 4: Шрифты**

`scripts/fetch-fonts.mjs` (однократный запуск, результат коммитится):

```js
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
```

Run: `node scripts/fetch-fonts.mjs`
Expected: 6 строк вида `oswald-cyrillic.woff2: NNNN байт`, файл `site/css/fonts.css` с шестью `@font-face` и локальными `url(../fonts/...)`.
Если Google отдаёт не 6 блоков (например, другой набор подмножеств) - посмотреть `css`, поправить `SUBSETS`, не ослабляя проверку до нуля.

`site/fonts/OFL.md`:

```markdown
# Лицензия шрифтов

Oswald, Onest и JetBrains Mono распространяются по SIL Open Font License 1.1.
Текст лицензии: https://openfontlicense.org/open-font-license-official-text/
Файлы скачаны с Google Fonts скриптом `scripts/fetch-fonts.mjs`.
```

- [ ] **Step 5: Токены и стили**

`site/css/tokens.css` (палитра из `first_draft.html`):

```css
:root {
  --ground: #EAF0F2; --paper: #FFFFFF; --ink: #0E2A3B; --muted: #4F6773; --line: #C9D6DC;
  --sea: #1B5E86; --sea-soft: #DCEAF2; --port: #C8322B; --stbd: #1F8A4C; --buoy: #D9A416;
  --ok-bg: #DDF0E4; --bad-bg: #F6DEDC; --warn-bg: #FBF0CF; --on-accent: #FFFFFF;
  --display: "Oswald", "Arial Narrow", sans-serif;
  --body: "Onest", system-ui, -apple-system, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
  --tabbar-h: 58px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #0B1A23; --paper: #12242F; --ink: #E4EEF2; --muted: #93A9B4; --line: #24404F;
    --sea: #6FB4DD; --sea-soft: #17344A; --port: #EE6A62; --stbd: #4CC47E; --buoy: #E8BB3C;
    --ok-bg: #153A26; --bad-bg: #40201F; --warn-bg: #3A3016; --on-accent: #0B1A23;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --ground: #0B1A23; --paper: #12242F; --ink: #E4EEF2; --muted: #93A9B4; --line: #24404F;
  --sea: #6FB4DD; --sea-soft: #17344A; --port: #EE6A62; --stbd: #4CC47E; --buoy: #E8BB3C;
  --ok-bg: #153A26; --bad-bg: #40201F; --warn-bg: #3A3016; --on-accent: #0B1A23;
  color-scheme: dark;
}
```

`site/css/app.css`:

```css
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--ground); color: var(--ink);
  font: 16px/1.5 var(--body);
  padding: env(safe-area-inset-top, 0px) 16px calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 16px);
}
main { max-width: 640px; margin: 0 auto; outline: none; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; text-transform: uppercase; letter-spacing: .01em; text-wrap: balance; margin: 0; }
h1 { font-size: 1.9rem; line-height: 1.1; }
h2 { font-size: 1.2rem; margin-top: 8px; }
p { margin: 0; }
a { color: var(--sea); }
button, input { font: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--sea); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

.view { display: flex; flex-direction: column; gap: 14px; padding-block: 16px; }
.view-head { display: grid; gap: 4px; }
.back { font: 600 .8rem var(--mono); text-decoration: none; }
.lead { color: var(--muted); }
.meta { font: .75rem var(--mono); color: var(--muted); }
.countdown { font: 600 1.1rem var(--display); text-transform: uppercase; color: var(--sea); }

.button {
  display: inline-flex; justify-content: center; align-items: center; gap: 8px; min-height: 44px;
  padding: 10px 16px; border-radius: 8px; border: 1px solid var(--sea);
  background: transparent; color: var(--sea); font-weight: 600; text-decoration: none; cursor: pointer;
}
.button.primary { background: var(--sea); color: var(--on-accent); }
.button.small { min-height: 32px; padding: 4px 10px; font-size: .85rem; }
.button:disabled { opacity: .4; cursor: default; }
.row { display: flex; flex-wrap: wrap; gap: 8px; }
.ctrl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.list a {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 52px;
  padding: 12px 14px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px;
  color: var(--ink); text-decoration: none; font-weight: 500;
}
.list a small { display: block; color: var(--muted); font-weight: 400; font-size: .85rem; }
.list .severity-emergency { border-left: 4px solid var(--port); }

.card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 14px; display: grid; gap: 8px; }
.progress { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.progress > div { height: 100%; background: var(--sea); transition: width .3s; }
.stat { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
.stat .value { font: 600 .9rem var(--mono); font-variant-numeric: tabular-nums; }

.figure { border-radius: 10px; overflow: hidden; }
.figure svg { display: block; width: 100%; height: auto; }
.question { display: grid; gap: 12px; }
.q { font-weight: 600; line-height: 1.35; }
.answers { display: grid; gap: 8px; }
.answer {
  text-align: left; padding: 12px; min-height: 48px; border-radius: 8px;
  border: 1px solid var(--line); background: var(--paper); cursor: pointer;
}
.answer:disabled { cursor: default; }
.answer.ok { background: var(--ok-bg); border-color: var(--stbd); }
.answer.bad { background: var(--bad-bg); border-color: var(--port); }
.answer.chosen { border-color: var(--sea); border-width: 2px; }
.explain { display: grid; gap: 8px; border-left: 3px solid var(--sea); padding-left: 10px; color: var(--muted); }
.summary { display: grid; gap: 12px; }
.score { font: 600 2.4rem var(--display); }
.pass { color: var(--stbd); font-weight: 600; }
.fail { color: var(--port); font-weight: 600; }

.sources { font: .72rem/1.45 var(--mono); color: var(--muted); }
.sources a { color: inherit; }
.badge-unverified {
  display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 3px;
  background: var(--warn-bg); color: var(--ink); border: 1px solid var(--buoy);
}

.alarm { background: var(--port); color: #FFFFFF; border-radius: 10px; padding: 14px; display: grid; gap: 4px; }
.checklist { display: grid; gap: 12px; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; counter-reset: step; }
.check {
  width: 100%; display: grid; grid-template-columns: 28px 1fr; gap: 10px; align-items: start; text-align: left;
  padding: 10px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; cursor: pointer;
}
.check .mark {
  width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  font: 600 .8rem var(--mono); background: var(--sea-soft); color: var(--sea);
}
.numbered .check .mark::before { counter-increment: step; content: counter(step); }
.check.done { opacity: .55; }
.check.done .body { text-decoration: line-through; }
.check.done .mark { background: var(--stbd); color: #FFFFFF; }
.check.done .mark::before { content: "✓"; }
.check small { display: block; color: var(--muted); }

.scene { border-radius: 10px; overflow: hidden; }
.scene svg { display: block; width: 100%; height: auto; }
.scene .boat, .scene .boom { transition: transform .9s ease-in-out; transform-box: view-box; transform-origin: 0 0; }
.scene .boom { transform-box: view-box; }
.step { display: grid; gap: 4px; min-height: 120px; }
.who { font: .75rem var(--mono); color: var(--muted); }
.cmd { font: 600 1.3rem/1.15 var(--display); text-transform: uppercase; }

.svg-water { fill: var(--sea-soft); }
.hull { fill: var(--paper); stroke: var(--ink); stroke-width: 2; }
.mast { fill: var(--ink); }
.boom line { stroke: var(--buoy); stroke-width: 4; stroke-linecap: round; }
.cabin { fill: var(--line); }
.quay { fill: var(--muted); }
.moored .hull { fill: var(--line); }
.buoy-dot { fill: var(--buoy); stroke: var(--ink); }
.anchor line, .anchor path { stroke: var(--ink); stroke-width: 2; fill: none; }
.rope { fill: none; stroke: var(--ink); stroke-width: 1.5; }
.rope.dashed, .track { stroke-dasharray: 4 5; }
.track { fill: none; stroke: var(--muted); stroke-width: 1.5; }
.person circle { fill: var(--port); }
.person .head { fill: #FFFFFF; }
.wind line { stroke: var(--sea); stroke-width: 2; }
.wind path { fill: var(--sea); }
.svg-label { font: 10px var(--mono); fill: var(--muted); }

.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; }
.table { width: 100%; border-collapse: collapse; background: var(--paper); font-size: .92rem; }
.table th, .table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.table th { font: 600 .7rem var(--mono); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.table td:first-child { font-family: var(--mono); font-weight: 600; white-space: nowrap; }
.script { margin: 0; padding-left: 22px; display: grid; gap: 4px; font-family: var(--mono); font-size: .88rem; }
.phonetic { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 4px 12px; font-size: .9rem; }
.phonetic b { font-family: var(--mono); color: var(--sea); }
.ref-row { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; }

.form { display: grid; gap: 12px; }
.field { display: grid; gap: 4px; font-weight: 500; }
.field input { min-height: 44px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.status { min-height: 1.5em; color: var(--stbd); font-weight: 500; }

.banner, .notice-bar {
  position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; margin: 8px auto 0; max-width: 640px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px;
  background: var(--paper); border: 1px solid var(--sea);
}
.notice-bar { border-color: var(--port); }

.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 10;
  display: grid; grid-template-columns: repeat(5, 1fr);
  background: var(--paper); border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.tabbar a {
  min-height: var(--tabbar-h); display: grid; place-items: center; align-content: center; gap: 5px;
  font-size: .68rem; color: var(--muted); text-decoration: none;
}
.tabbar i { width: 20px; height: 3px; border-radius: 2px; background: currentColor; opacity: .45; }
.tabbar a[aria-current="page"] { color: var(--sea); font-weight: 600; }
.tabbar a[aria-current="page"] i { opacity: 1; }
```

- [ ] **Step 6: index.html**

`site/index.html`:

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Карманный шкипер</title>
<meta name="theme-color" content="#0E2A3B">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/app.css">
<script type="module" src="js/app.js"></script>
</head>
<body>
<div id="banner" class="banner" role="status" hidden></div>
<div id="notice" class="notice-bar" role="alert" hidden></div>
<main id="view" tabindex="-1"></main>
<nav class="tabbar" aria-label="Разделы">
  <a href="#/today" data-tab="today"><i></i>Сегодня</a>
  <a href="#/tests" data-tab="tests"><i></i>Тесты</a>
  <a href="#/situations" data-tab="situations"><i></i>Ситуации</a>
  <a href="#/maneuvers" data-tab="maneuvers"><i></i>Манёвры</a>
  <a href="#/more" data-tab="more"><i></i>Ещё</a>
</nav>
</body>
</html>
```

- [ ] **Step 7: ui.js**

`site/js/ui.js`:

```js
import { formatSource } from './sources.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

export function header(title, backHref) {
  return h('header', { class: 'view-head' },
    backHref ? h('a', { class: 'back', href: backHref }, '‹ Назад') : null,
    h('h1', {}, title));
}

export function sourceFooter(record) {
  return h('footer', { class: 'sources' },
    'Источник: ',
    record.sources.map((src, i) => [
      i > 0 ? ' · ' : null,
      src.type === 'web' ? h('a', { href: src.url, target: '_blank', rel: 'noopener' }, formatSource(src)) : formatSource(src),
    ]),
    record.verified ? null : h('span', { class: 'badge-unverified' }, 'не сверено'));
}

export function notFound() {
  return h('section', { class: 'view' },
    header('Не найдено'),
    h('p', {}, 'Такой страницы нет.'),
    h('a', { class: 'button', href: '#/today' }, 'На главную'));
}

export function table(headings, rows) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, headings.map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((cells) => h('tr', {}, cells.map((c) => h('td', {}, c)))))));
}
```

- [ ] **Step 8: Заглушки, маршруты, app.js**

`site/js/views/placeholder.js`:

```js
import { h, header } from '../ui.js';

export function placeholder(title, backHref) {
  return () => h('section', { class: 'view' }, header(title, backHref), h('p', { class: 'lead' }, 'Раздел в работе.'));
}
```

`site/js/routes.js`:

```js
import { placeholder } from './views/placeholder.js';

export const routes = [
  [/^#\/today$/, placeholder('Сегодня')],
  [/^#\/today\/session$/, placeholder('Повторение', '#/today')],
  [/^#\/tests$/, placeholder('Тесты')],
  [/^#\/tests\/topic\/([\w-]+)$/, placeholder('Тема', '#/tests')],
  [/^#\/tests\/exam$/, placeholder('Пробный экзамен', '#/tests')],
  [/^#\/situations$/, placeholder('Ситуации')],
  [/^#\/situations\/([\w-]+)$/, placeholder('Ситуация', '#/situations')],
  [/^#\/maneuvers$/, placeholder('Манёвры')],
  [/^#\/maneuvers\/([\w-]+)$/, placeholder('Манёвр', '#/maneuvers')],
  [/^#\/more$/, placeholder('Ещё')],
  [/^#\/more\/vhf$/, placeholder('УКВ-радио', '#/more')],
  [/^#\/more\/checklist\/([\w-]+)$/, placeholder('Чек-лист', '#/more')],
  [/^#\/more\/reference$/, placeholder('Справочник', '#/more')],
  [/^#\/more\/external$/, placeholder('Внешние тесты', '#/more')],
  [/^#\/more\/settings$/, placeholder('Настройки', '#/more')],
];
```

`site/js/app.js`:

```js
import { loadContent } from './content.js';
import { createStore } from './storage.js';
import { matchRoute } from './router.js';
import { routes } from './routes.js';
import { h, notFound } from './ui.js';

const main = document.getElementById('view');
const notice = document.getElementById('notice');

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function showNotice(text) {
  notice.replaceChildren(text);
  notice.hidden = false;
}

async function start() {
  const store = createStore(safeLocalStorage());
  if (!store.persistent) showNotice('Браузер не даёт сохранять прогресс: он пропадёт после закрытия приложения.');
  else if (store.recovered) showNotice('Сохранённый прогресс оказался повреждён, начали заново. Можно загрузить копию из файла в настройках.');

  const content = await loadContent();
  const ctx = { content, store, rerender: render };

  function render() {
    const hash = location.hash || '#/today';
    const { view, params, tab } = matchRoute(hash, routes);
    for (const link of document.querySelectorAll('.tabbar a')) {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(view ? view(ctx, ...params) : notFound());
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
}

start().catch((err) => {
  console.error(err);
  main.replaceChildren(h('section', { class: 'view' },
    h('h1', {}, 'Приложение не запустилось'),
    h('p', {}, err.message),
    h('p', { class: 'lead' }, 'Откройте приложение при подключении к интернету, чтобы оно загрузилось заново.')));
});
```

- [ ] **Step 9: Проверить в браузере**

Run: `npm run serve` (в фоне), открыть `http://127.0.0.1:4173/` в браузере с шириной окна 390px.
Expected: заголовок «Сегодня», нижняя панель из пяти вкладок, активная вкладка подсвечена; переход по вкладкам меняет заголовок; шрифты Oswald/Onest загружены (в DevTools → Network запросы только к `127.0.0.1`); в консоли нет ошибок; тёмная тема (эмуляция `prefers-color-scheme: dark`) читается.

- [ ] **Step 10: Тесты и commit**

Run: `npm test && npm run check` → PASS.

```bash
git add scripts/fetch-fonts.mjs site tests/unit/router.test.mjs
git commit -m "Add app shell with tabs, routing, styles and self-hosted fonts"
```

---
### Task 6: SVG-схемы - огни, знаки IALA, расхождение, лодка и сцена манёвра

**Files:**
- Create: `site/js/diagrams/svg.js`, `boat.js`, `lights.js`, `marks.js`, `encounter.js`, `scene.js`, `index.js`
- Test: `tests/unit/diagrams.test.mjs`

**Interfaces:**
- Consumes: схема `image` и `scene` из Task 4; CSS-классы из `app.css` (Task 5): `svg-water`, `hull`, `mast`, `boom`, `cabin`, `quay`, `moored`, `buoy-dot`, `anchor`, `rope`, `dashed`, `track`, `person`, `head`, `wind`, `svg-label`.
- Produces (все функции, кроме `applyPose` и `questionImage`, возвращают строку SVG и не трогают DOM):
  - `escapeXml(s: string): string`, `windArrowSVG(fromDeg: number, x: number, y: number): string`;
  - `hullSVG()`, `powerSVG()`, `boomSVG(boom: number)` - лодка носом вверх, центр вращения (0,0), мачта в (0,−7);
  - `lightsSVG({ label, lights }): string` - ночной фон 200×120;
  - `MARK_SPECS` и `markSVG(kind: string, label?: string): string` - буй 200×120;
  - `encounterSVG({ label, wind?, vessels }): string` - 260×200;
  - `renderScene(scene, pose): string`, `poseStyle(pose): string`, `boomStyle(boom): string`;
  - `applyPose(svg: SVGElement, scene, pose, stepIndex: number): void` - меняет положение лодки и видимость элементов;
  - `questionImage(image): HTMLElement` - `<div class="figure">` с нужной схемой.

Цвета знаков IALA (регион A) и топовые фигуры - в `MARK_SPECS`.
Эти данные проверяются в Task 19 по источнику IALA вместе со справочником.

- [ ] **Step 1: Падающий тест**

`tests/unit/diagrams.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml } from '../../site/js/diagrams/svg.js';
import { lightsSVG } from '../../site/js/diagrams/lights.js';
import { markSVG, MARK_SPECS } from '../../site/js/diagrams/marks.js';
import { encounterSVG } from '../../site/js/diagrams/encounter.js';
import { renderScene, poseStyle } from '../../site/js/diagrams/scene.js';
import { MARK_KINDS } from '../../scripts/lib/validate-content.mjs';

test('escapeXml экранирует разметку', () => {
  assert.equal(escapeXml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('огни рисуются нужными цветами и с подписью', () => {
  const svg = lightsSVG({ label: 'Зелёный над <белым>', lights: [{ color: 'green', x: 100, y: 40 }, { color: 'white', x: 100, y: 80 }] });
  assert.match(svg, /aria-label="Зелёный над &lt;белым&gt;"/);
  assert.equal((svg.match(/#3BE37A/g) ?? []).length, 2);
  assert.equal((svg.match(/#F4F7F8/g) ?? []).length, 2);
});

test('для каждого вида знака из схемы есть рисунок', () => {
  assert.deepEqual(Object.keys(MARK_SPECS).sort(), [...MARK_KINDS].sort());
  for (const kind of MARK_KINDS) assert.match(markSVG(kind), /^<svg /);
  assert.throws(() => markSVG('nope'), /Неизвестный знак/);
});

test('топовые фигуры кардинальных знаков', () => {
  assert.deepEqual(MARK_SPECS.north.top, ['cone-up', 'cone-up']);
  assert.deepEqual(MARK_SPECS.south.top, ['cone-down', 'cone-down']);
  assert.deepEqual(MARK_SPECS.east.top, ['cone-up', 'cone-down']);
  assert.deepEqual(MARK_SPECS.west.top, ['cone-down', 'cone-up']);
});

test('расхождение: суда и подписи', () => {
  const svg = encounterSVG({ label: 'Две яхты', wind: 0, vessels: [
    { name: 'А', type: 'sail', x: 80, y: 120, rot: -45, boom: 20 },
    { name: 'Б', type: 'power', x: 180, y: 90, rot: 90 },
  ] });
  assert.match(svg, /translate\(80 120\) rotate\(-45\)/);
  assert.match(svg, />А</);
  assert.match(svg, /class="cabin"/);
  assert.match(svg, /class="wind"/);
});

test('сцена манёвра содержит элементы, ветер и лодку в позе', () => {
  const svg = renderScene({ label: 'Швартовка', wind: 90, elements: [
    { type: 'quay', x: 0, y: 0, w: 260, h: 20 },
    { type: 'label', x: 10, y: 190, text: '<b>' },
  ] }, { x: 100, y: 120, rot: 180, boom: 0 });
  assert.match(svg, /class="quay"/);
  assert.match(svg, /&lt;b&gt;/);
  assert.match(svg, /data-el="1"/);
  assert.match(svg, new RegExp(poseStyle({ x: 100, y: 120, rot: 180 }).replace(/[()]/g, '\\$&')));
});

test('для моторной сцены гик не рисуется', () => {
  const svg = renderScene({ label: 'Мотор', power: true, elements: [] }, { x: 1, y: 2, rot: 0 });
  assert.doesNotMatch(svg, /class="boom"/);
  assert.throws(() => renderScene({ label: 'x', elements: [{ type: 'rocket' }] }, { x: 0, y: 0, rot: 0 }), /Неизвестный элемент/);
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `diagrams/svg.js` не найден.

- [ ] **Step 3: svg.js и boat.js**

`site/js/diagrams/svg.js`:

```js
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// fromDeg - откуда дует ветер: 0 - сверху, 90 - справа. Стрелка показывает, куда дует.
export function windArrowSVG(fromDeg, x, y) {
  return `<g class="wind" transform="translate(${x} ${y}) rotate(${fromDeg})">`
    + '<line x1="0" y1="-16" x2="0" y2="8"/><path d="M-6 4 L0 16 L6 4 Z"/></g>'
    + `<text class="svg-label" x="${x + 14}" y="${y - 6}">ВЕТЕР</text>`;
}
```

`site/js/diagrams/boat.js`:

```js
// Лодка нарисована носом вверх; (0,0) - центр вращения, мачта в (0,-7).
export function hullSVG() {
  return '<path class="hull" d="M0 -35 C16 -17 16 15 10 35 L-10 35 C-16 15 -16 -17 0 -35 Z"/>'
    + '<circle class="mast" cx="0" cy="-7" r="3"/>';
}

export function powerSVG() {
  return '<path class="hull" d="M0 -35 C12 -20 12 20 10 35 L-10 35 C-12 20 -12 -20 0 -35 Z"/>'
    + '<rect class="cabin" x="-6" y="-5" width="12" height="16" rx="2"/>';
}

// boom - угол гика в градусах: плюс - гик на левом борту, минус - на правом.
export function boomStyle(boom) {
  return `transform: translate(0px, -7px) rotate(${boom}deg)`;
}

export function boomSVG(boom) {
  return `<g class="boom" style="${boomStyle(boom)}"><line x1="0" y1="0" x2="0" y2="40"/></g>`;
}
```

- [ ] **Step 4: lights.js и marks.js**

`site/js/diagrams/lights.js`:

```js
import { escapeXml } from './svg.js';

const COLORS = { red: '#FF4A3D', green: '#3BE37A', white: '#F4F7F8', yellow: '#FFC83D' };

export function lightsSVG({ label, lights }) {
  const dots = lights.map(({ color, x, y }) =>
    `<circle cx="${x}" cy="${y}" r="16" fill="${COLORS[color]}" opacity=".18"/>`
    + `<circle cx="${x}" cy="${y}" r="8" fill="${COLORS[color]}"/>`).join('');
  return `<svg viewBox="0 0 200 120" role="img" aria-label="${escapeXml(label)}">`
    + `<rect width="200" height="120" fill="#07131B"/>${dots}</svg>`;
}
```

`site/js/diagrams/marks.js`:

```js
import { escapeXml } from './svg.js';

const C = { red: '#D23A2F', green: '#1F8A4C', yellow: '#F2C230', black: '#1B1F24', white: '#F4F7F8', blue: '#2563B8' };

// bands - горизонтальные полосы сверху вниз, stripes - вертикальные слева направо,
// top - топовые фигуры сверху вниз.
export const MARK_SPECS = {
  port: { bands: ['red'], top: ['can'], topColor: 'red' },
  starboard: { bands: ['green'], top: ['cone-up'], topColor: 'green' },
  north: { bands: ['black', 'yellow'], top: ['cone-up', 'cone-up'], topColor: 'black' },
  south: { bands: ['yellow', 'black'], top: ['cone-down', 'cone-down'], topColor: 'black' },
  east: { bands: ['black', 'yellow', 'black'], top: ['cone-up', 'cone-down'], topColor: 'black' },
  west: { bands: ['yellow', 'black', 'yellow'], top: ['cone-down', 'cone-up'], topColor: 'black' },
  'isolated-danger': { bands: ['black', 'red', 'black'], top: ['sphere', 'sphere'], topColor: 'black' },
  'safe-water': { stripes: ['red', 'white', 'red', 'white'], top: ['sphere'], topColor: 'red' },
  special: { bands: ['yellow'], top: ['x-cross'], topColor: 'yellow' },
  'emergency-wreck': { stripes: ['blue', 'yellow', 'blue', 'yellow'], top: ['plus-cross'], topColor: 'yellow' },
};

const BODY = { x: 80, y: 60, w: 40, h: 50 };

function shape(kind, cy, color) {
  const fill = `fill="${C[color]}" stroke="${C.black}" stroke-width="1"`;
  switch (kind) {
    case 'cone-up': return `<path d="M90 ${cy + 8} L100 ${cy - 8} L110 ${cy + 8} Z" ${fill}/>`;
    case 'cone-down': return `<path d="M90 ${cy - 8} L100 ${cy + 8} L110 ${cy - 8} Z" ${fill}/>`;
    case 'can': return `<rect x="91" y="${cy - 8}" width="18" height="16" ${fill}/>`;
    case 'sphere': return `<circle cx="100" cy="${cy}" r="8" ${fill}/>`;
    case 'x-cross': return `<path d="M92 ${cy - 8} L108 ${cy + 8} M108 ${cy - 8} L92 ${cy + 8}" stroke="${C[color]}" stroke-width="4"/>`;
    case 'plus-cross': return `<path d="M100 ${cy - 9} V${cy + 9} M91 ${cy} H109" stroke="${C[color]}" stroke-width="4"/>`;
    default: throw new Error(`Неизвестная топовая фигура: ${kind}`);
  }
}

function body(spec) {
  const parts = spec.bands ?? spec.stripes;
  const vertical = Boolean(spec.stripes);
  const size = (vertical ? BODY.w : BODY.h) / parts.length;
  return parts.map((color, i) => (vertical
    ? `<rect x="${BODY.x + i * size}" y="${BODY.y}" width="${size}" height="${BODY.h}" fill="${C[color]}"/>`
    : `<rect x="${BODY.x}" y="${BODY.y + i * size}" width="${BODY.w}" height="${size}" fill="${C[color]}"/>`)).join('')
    + `<rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" fill="none" stroke="${C.black}"/>`;
}

export function markSVG(kind, label = kind) {
  const spec = MARK_SPECS[kind];
  if (!spec) throw new Error(`Неизвестный знак: ${kind}`);
  const slots = spec.top.length === 1 ? [40] : [20, 42];
  const tops = spec.top.map((t, i) => shape(t, slots[i], spec.topColor)).join('');
  return `<svg viewBox="0 0 200 120" role="img" aria-label="${escapeXml(label)}">`
    + '<rect class="svg-water" width="200" height="120"/>'
    + `<line x1="100" y1="${slots[0] - 10}" x2="100" y2="${BODY.y}" stroke="${C.black}" stroke-width="2"/>`
    + `${tops}${body(spec)}`
    + '<rect x="0" y="106" width="200" height="14" fill="#1B5E86" opacity=".45"/></svg>';
}
```

- [ ] **Step 5: encounter.js, scene.js, index.js**

`site/js/diagrams/encounter.js`:

```js
import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG } from './boat.js';

export function encounterSVG({ label, wind, vessels }) {
  const boats = vessels.map((v) => {
    const shape = v.type === 'sail' ? hullSVG() + boomSVG(v.boom ?? 0) : powerSVG();
    return `<g transform="translate(${v.x} ${v.y}) rotate(${v.rot}) scale(.7)">${shape}</g>`
      + `<text class="svg-label" x="${v.x + 18}" y="${v.y - 18}">${escapeXml(v.name)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 260 200" role="img" aria-label="${escapeXml(label)}">`
    + '<rect class="svg-water" width="260" height="200"/>'
    + `${wind === undefined ? '' : windArrowSVG(wind, 30, 30)}${boats}</svg>`;
}
```

`site/js/diagrams/scene.js`:

```js
import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG, boomStyle } from './boat.js';

function elementSVG(el) {
  switch (el.type) {
    case 'quay': return `<rect class="quay" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/>`;
    case 'boat-moored': return `<g class="moored" transform="translate(${el.x} ${el.y}) rotate(${el.rot ?? 0}) scale(${el.scale ?? 1})">${hullSVG()}</g>`;
    case 'buoy': return `<circle class="buoy-dot" cx="${el.x}" cy="${el.y}" r="5"/>`;
    case 'anchor': return `<g class="anchor" transform="translate(${el.x} ${el.y})"><line x1="0" y1="-8" x2="0" y2="7"/><line x1="-4" y1="-4" x2="4" y2="-4"/><path d="M-7 2 Q0 12 7 2"/></g>`;
    case 'line': return `<polyline class="rope${el.dashed ? ' dashed' : ''}" points="${el.points.map((p) => p.join(',')).join(' ')}"/>`;
    case 'person': return `<g class="person" transform="translate(${el.x} ${el.y})"><circle r="6"/><circle class="head" r="2.5"/></g>`;
    case 'label': return `<text class="svg-label" x="${el.x}" y="${el.y}">${escapeXml(el.text)}</text>`;
    case 'path': return `<path class="track" d="${el.d}"/>`;
    default: throw new Error(`Неизвестный элемент схемы: ${el.type}`);
  }
}

export function poseStyle({ x, y, rot }) {
  return `transform: translate(${x}px, ${y}px) rotate(${rot}deg)`;
}

export function renderScene(scene, pose) {
  const elements = scene.elements.map((el, i) => `<g data-el="${i}">${elementSVG(el)}</g>`).join('');
  const boat = scene.power ? powerSVG() : hullSVG() + boomSVG(pose.boom ?? 0);
  return `<svg viewBox="0 0 260 200" role="img" aria-label="${escapeXml(scene.label)}">`
    + '<rect class="svg-water" width="260" height="200"/>'
    + elements
    + (scene.wind === undefined ? '' : windArrowSVG(scene.wind, 36, 30))
    + `<g class="boat" style="${poseStyle(pose)}">${boat}</g></svg>`;
}

export function applyPose(svg, scene, pose, stepIndex) {
  svg.querySelector('.boat').setAttribute('style', poseStyle(pose));
  svg.querySelector('.boom')?.setAttribute('style', boomStyle(pose.boom ?? 0));
  scene.elements.forEach((el, i) => {
    const node = svg.querySelector(`[data-el="${i}"]`);
    node.style.display = !el.steps || el.steps.includes(stepIndex) ? '' : 'none';
  });
}
```

`site/js/diagrams/index.js`:

```js
import { h } from '../ui.js';
import { lightsSVG } from './lights.js';
import { markSVG } from './marks.js';
import { encounterSVG } from './encounter.js';

export function questionImage(image) {
  const svg = {
    lights: () => lightsSVG(image),
    marks: () => markSVG(image.mark, image.label),
    encounter: () => encounterSVG(image),
  }[image.kind]();
  return h('div', { class: 'figure', html: svg });
}
```

- [ ] **Step 6: Тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Посмотреть все знаки глазами**

Временно добавить страницу предпросмотра `site/marks-preview.html`:

```html
<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="css/tokens.css"><link rel="stylesheet" href="css/app.css">
<div id="out" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px"></div>
<script type="module">
import { markSVG, MARK_SPECS } from './js/diagrams/marks.js';
out.innerHTML = Object.keys(MARK_SPECS).map((k) => `<figure>${markSVG(k)}<figcaption>${k}</figcaption></figure>`).join('');
</script>
```

Открыть `http://127.0.0.1:4173/marks-preview.html`, сверить каждый знак с таблицей: port - красный, цилиндр; starboard - зелёный, конус вверх; north - чёрный над жёлтым, конусы вверх; south - жёлтый над чёрным, конусы вниз; east - чёрный-жёлтый-чёрный, конусы основаниями друг к другу; west - жёлтый-чёрный-жёлтый, конусы вершинами друг к другу; isolated-danger - чёрный с красной полосой, два чёрных шара; safe-water - красно-белые вертикальные полосы, красный шар; special - жёлтый, жёлтый косой крест; emergency-wreck - сине-жёлтые вертикальные полосы, жёлтый прямой крест.
После проверки удалить `site/marks-preview.html` (он не должен попасть в коммит и в кеш).

- [ ] **Step 8: Commit**

```bash
git add site/js/diagrams tests/unit/diagrams.test.mjs
git commit -m "Add SVG diagrams for lights, IALA marks, encounters and maneuver scenes"
```

---
### Task 7: Вопросы, пробный экзамен и вкладка «Сегодня»

**Files:**
- Create: `site/js/quiz/exam.js`, `site/js/quiz/question.js`, `site/js/quiz/runner.js`, `site/js/quiz/summary.js`, `site/js/views/today.js`, `site/js/views/tests.js`
- Modify: `site/js/routes.js`
- Test: `tests/unit/exam.test.mjs` (чистая часть), остальное - E2E в Task 12

**Interfaces:**
- Consumes: `h`, `header`, `sourceFooter`, `notFound` (Task 5); `questionImage` (Task 6); `buildSession`, `grade`, `readiness` (Task 2); `todayISO`, `daysBetween`, `plural`, `shuffle` (Task 1).
- Produces:
  - `renderQuestion(q, { reveal: boolean }, onAnswered: (correct: boolean, option) => void): HTMLElement` - кнопки ответов имеют класс `answer` и атрибут `data-correct="true|false"`, разбор - блок `.explain`;
  - `quizRunner({ questions, mode: 'session'|'practice'|'exam', onAnswer?, onFinish }): HTMLElement` - в режиме `session` неверный вопрос один раз возвращается в конец очереди; в режиме `exam` разбор не показывается до конца; кнопка перехода - `.button.primary` с текстом «Дальше» или «Итоги»;
  - `resultSummary(results, { backHref: string, exam?: boolean }): HTMLElement` - при `exam: true` показывает «Экзамен сдан»/«Не сдан»;
  - `EXAM_SIZE = 30`, `PASS_RATIO = 0.7`, `examQuestions(questions, rand?)`, `isPassed(correct, total)`;
  - представления `todayView`, `sessionView`, `testsIndexView`, `topicView(ctx, topicId)`, `examView`.

- [ ] **Step 1: Падающий тест чистой части экзамена**

`tests/unit/exam.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examQuestions, isPassed, EXAM_SIZE, PASS_RATIO } from '../../site/js/quiz/exam.js';

test('экзамен берёт не больше EXAM_SIZE разных вопросов', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ id: `q${i}` }));
  const picked = examQuestions(many);
  assert.equal(picked.length, EXAM_SIZE);
  assert.equal(new Set(picked.map((q) => q.id)).size, EXAM_SIZE);
  assert.equal(examQuestions(many.slice(0, 3)).length, 3);
});

test('порог сдачи 70%', () => {
  assert.equal(PASS_RATIO, 0.7);
  assert.equal(isPassed(21, 30), true);
  assert.equal(isPassed(20, 30), false);
  assert.equal(isPassed(0, 0), false);
});
```

- [ ] **Step 2: Тест падает**

Run: `npm test`
Expected: FAIL, модуль `quiz/exam.js` не найден.

- [ ] **Step 3: exam.js**

`site/js/quiz/exam.js`:

```js
import { shuffle } from '../random.js';

export const EXAM_SIZE = 30;
export const PASS_RATIO = 0.7;

export function examQuestions(questions, rand = Math.random) {
  return shuffle(questions, rand).slice(0, EXAM_SIZE);
}

export function isPassed(correct, total) {
  return total > 0 && correct / total >= PASS_RATIO;
}
```

Run: `npm test` → PASS.

- [ ] **Step 4: question.js**

`site/js/quiz/question.js`:

```js
import { h, sourceFooter } from '../ui.js';
import { shuffle } from '../random.js';
import { questionImage } from '../diagrams/index.js';

export function renderQuestion(q, { reveal }, onAnswered) {
  const explain = h('div', { class: 'explain', hidden: true }, h('p', {}, q.explain), sourceFooter(q));
  const answers = h('div', { class: 'answers' });
  let answered = false;

  for (const option of shuffle(q.options)) {
    const button = h('button', { type: 'button', class: 'answer', 'data-correct': String(option.correct === true) }, option.text);
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      for (const b of answers.children) b.disabled = true;
      if (reveal) {
        for (const b of answers.children) if (b.dataset.correct === 'true') b.classList.add('ok');
        if (option.correct !== true) button.classList.add('bad');
        explain.hidden = false;
      } else {
        button.classList.add('chosen');
      }
      onAnswered(option.correct === true, option);
    });
    answers.append(button);
  }

  return h('article', { class: 'question' },
    q.image ? questionImage(q.image) : null,
    h('p', { class: 'q' }, q.text),
    answers,
    explain);
}
```

- [ ] **Step 5: runner.js и summary.js**

`site/js/quiz/runner.js`:

```js
import { h } from '../ui.js';
import { renderQuestion } from './question.js';

export function quizRunner({ questions, mode, onAnswer, onFinish }) {
  const root = h('div', { class: 'runner' });
  if (questions.length === 0) {
    root.append(h('p', { class: 'lead' }, 'Здесь пока нет вопросов.'));
    return root;
  }
  const queue = [...questions];
  const requeued = new Set();
  const results = [];
  let total = queue.length;

  function step() {
    const q = queue.shift();
    if (!q) {
      root.replaceChildren(onFinish(results));
      window.scrollTo(0, 0);
      return;
    }
    const next = h('button', { type: 'button', class: 'button primary', hidden: true, onclick: step }, 'Дальше');
    const card = renderQuestion(q, { reveal: mode !== 'exam' }, (correct, option) => {
      results.push({ question: q, correct, option });
      onAnswer?.(q, correct);
      if (mode === 'session' && !correct && !requeued.has(q.id)) {
        requeued.add(q.id);
        queue.push(q);
        total += 1;
      }
      next.textContent = queue.length ? 'Дальше' : 'Итоги';
      next.hidden = false;
      next.focus();
    });
    root.replaceChildren(
      h('p', { class: 'meta' }, `Вопрос ${results.length + 1} из ${total}`),
      h('div', { class: 'progress' }, h('div', { style: `width:${Math.round((results.length / total) * 100)}%` })),
      card,
      next);
    window.scrollTo(0, 0);
  }

  step();
  return root;
}
```

`site/js/quiz/summary.js`:

```js
import { h, sourceFooter } from '../ui.js';
import { isPassed, PASS_RATIO } from './exam.js';

export function resultSummary(results, { backHref, exam = false }) {
  const correct = results.filter((r) => r.correct).length;
  const wrong = results.filter((r) => !r.correct);
  const passed = isPassed(correct, results.length);
  return h('div', { class: 'summary' },
    h('p', { class: 'score' }, `${correct} из ${results.length}`),
    exam ? h('p', { class: passed ? 'pass' : 'fail' },
      passed ? 'Экзамен сдан' : `Не сдан: нужно не меньше ${Math.round(PASS_RATIO * 100)}%`) : null,
    wrong.length ? h('h2', {}, 'Разбор ошибок') : h('p', {}, 'Без ошибок.'),
    wrong.map((r) => h('div', { class: 'card' },
      h('p', { class: 'q' }, r.question.text),
      h('p', {}, `Ваш ответ: ${r.option.text}`),
      h('p', { class: 'pass' }, `Верно: ${r.question.options.find((o) => o.correct === true).text}`),
      h('p', { class: 'lead' }, r.question.explain),
      sourceFooter(r.question))),
    h('a', { class: 'button primary', href: backHref }, 'Готово'));
}
```

- [ ] **Step 6: views/tests.js**

`site/js/views/tests.js`:

```js
import { h, header, notFound } from '../ui.js';
import { quizRunner } from '../quiz/runner.js';
import { resultSummary } from '../quiz/summary.js';
import { examQuestions, EXAM_SIZE } from '../quiz/exam.js';
import { grade } from '../leitner.js';
import { todayISO } from '../dates.js';
import { shuffle } from '../random.js';

export function recordAnswer(ctx, question, correct) {
  ctx.store.update((s) => ({ ...s, cards: grade(s.cards, question.id, correct, todayISO()) }));
}

export function testsIndexView(ctx) {
  const { topics, questions } = ctx.content.questions;
  return h('section', { class: 'view' },
    header('Тесты'),
    h('a', { class: 'button primary', href: '#/tests/exam' },
      `Пробный экзамен: ${Math.min(EXAM_SIZE, questions.length)} вопросов`),
    h('h2', {}, 'По темам'),
    h('ul', { class: 'list' }, topics.map((t) => h('li', {},
      h('a', { href: `#/tests/topic/${t.id}` },
        h('span', {}, t.title),
        h('span', { class: 'meta' }, String(questions.filter((q) => q.topic === t.id).length)))))));
}

export function topicView(ctx, topicId) {
  const { topics, questions } = ctx.content.questions;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return notFound();
  return h('section', { class: 'view' },
    header(topic.title, '#/tests'),
    quizRunner({
      questions: shuffle(questions.filter((q) => q.topic === topicId)),
      mode: 'practice',
      onAnswer: (q, correct) => recordAnswer(ctx, q, correct),
      onFinish: (results) => resultSummary(results, { backHref: '#/tests' }),
    }));
}

export function examView(ctx) {
  return h('section', { class: 'view' },
    header('Пробный экзамен', '#/tests'),
    h('p', { class: 'lead' }, 'Ответы и разбор - в конце. Для сдачи нужно 70% верных.'),
    quizRunner({
      questions: examQuestions(ctx.content.questions.questions),
      mode: 'exam',
      onFinish: (results) => resultSummary(results, { backHref: '#/tests', exam: true }),
    }));
}
```

Экзамен не меняет коробки Лейтнера - он проверяет, а не тренирует.

- [ ] **Step 7: views/today.js**

`site/js/views/today.js`:

```js
import { h, header } from '../ui.js';
import { buildSession, readiness } from '../leitner.js';
import { todayISO, daysBetween } from '../dates.js';
import { plural } from '../plural.js';
import { quizRunner } from '../quiz/runner.js';
import { resultSummary } from '../quiz/summary.js';
import { recordAnswer } from './tests.js';

function countdown(tripDate, today) {
  if (!tripDate) return h('a', { class: 'button', href: '#/more/settings' }, 'Указать дату выхода');
  const days = daysBetween(today, tripDate);
  const text = days > 0 ? `До выхода ${days} ${plural(days, 'день', 'дня', 'дней')}`
    : days === 0 ? 'Выход сегодня' : 'Поездка уже началась';
  return h('p', { class: 'countdown' }, text);
}

export function todayView(ctx) {
  const today = todayISO();
  const ids = ctx.content.questions.questions.map((q) => q.id);
  const { cards, settings } = ctx.store.state;
  const queue = buildSession(cards, ids, today);
  const ready = Math.round(readiness(cards, ids) * 100);
  return h('section', { class: 'view' },
    header('Сегодня'),
    countdown(settings.tripDate, today),
    h('div', { class: 'stat' },
      h('span', { class: 'meta' }, 'Готовность'),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': ready, 'aria-valuemin': 0, 'aria-valuemax': 100 },
        h('div', { style: `width:${ready}%` })),
      h('span', { class: 'value' }, `${ready}%`)),
    h('p', { class: 'lead' }, 'Готовность - доля вопросов, которые вы уверенно помните (коробки 4 и 5).'),
    queue.length
      ? h('a', { class: 'button primary', href: '#/today/session' },
        `Повторить ${queue.length} ${plural(queue.length, 'карточку', 'карточки', 'карточек')}`)
      : h('p', {}, 'На сегодня всё повторено. Возвращайтесь завтра.'));
}

export function sessionView(ctx) {
  const today = todayISO();
  const byId = new Map(ctx.content.questions.questions.map((q) => [q.id, q]));
  const ids = buildSession(ctx.store.state.cards, [...byId.keys()], today);
  return h('section', { class: 'view' },
    header('Повторение', '#/today'),
    quizRunner({
      questions: ids.map((id) => byId.get(id)),
      mode: 'session',
      onAnswer: (q, correct) => recordAnswer(ctx, q, correct),
      onFinish: (results) => resultSummary(results, { backHref: '#/today' }),
    }));
}
```

- [ ] **Step 8: Подключить маршруты**

В `site/js/routes.js` добавить импорты и заменить пять заглушек:

```js
import { todayView, sessionView } from './views/today.js';
import { testsIndexView, topicView, examView } from './views/tests.js';
```

```js
  [/^#\/today$/, todayView],
  [/^#\/today\/session$/, sessionView],
  [/^#\/tests$/, testsIndexView],
  [/^#\/tests\/topic\/([\w-]+)$/, topicView],
  [/^#\/tests\/exam$/, examView],
```

- [ ] **Step 9: Проверить в браузере**

Run: `npm run serve`, открыть `http://127.0.0.1:4173/` при ширине 390px.
Expected:
- «Сегодня»: кнопка «Указать дату выхода», готовность 0%, кнопка «Повторить 1 карточку».
- Сессия: картинка с зелёным и белым огнём, неверный ответ подсвечивается красным, верный - зелёным, виден разбор и строка «Источник: МППСС-72, пр. 26» с меткой «не сверено»; после «Дальше» тот же вопрос приходит повторно; затем «Итоги».
- «Тесты» → тема → вопрос → итоги; «Пробный экзамен» не показывает разбор до конца, в итогах «Экзамен сдан» или «Не сдан».
- После верных ответов на «Сегодня» готовность и число карточек меняются.
- Консоль без ошибок.

- [ ] **Step 10: Commit**

```bash
git add site/js/quiz site/js/views/today.js site/js/views/tests.js site/js/routes.js tests/unit/exam.test.mjs
git commit -m "Add quiz runner, mock exam and daily review screen"
```

---
### Task 8: Ситуации и чек-листы

**Files:**
- Create: `site/js/views/checklist-ui.js`, `site/js/views/situations.js`, `site/js/views/checklists.js`
- Modify: `site/js/routes.js`

**Interfaces:**
- Consumes: `toggleCheck`, `resetChecks`, `countChecked` (Task 3); `h`, `header`, `sourceFooter`, `notFound` (Task 5).
- Produces:
  - `checklistBlock(ctx, listKey: string, groups: Array<{ title?, items: Array<{ id, text, note? }> }>, { numbered?: boolean }): HTMLElement` - пункт - `button.check` с `aria-pressed`, счётчик `p.meta` с текстом «Отмечено N из M», кнопка «Сбросить отметки»;
  - ключи отметок: `situation:<id>` (пункты - индексы шагов `"0"`, `"1"`, ...) и `checklist:<id>`;
  - `situationsIndexView`, `situationView(ctx, id)`, `checklistView(ctx, id)`.

- [ ] **Step 1: checklist-ui.js**

`site/js/views/checklist-ui.js`:

```js
import { h } from '../ui.js';
import { toggleCheck, resetChecks, countChecked } from '../checks.js';

export function checklistBlock(ctx, listKey, groups, { numbered = false } = {}) {
  const root = h('div', { class: 'checklist' });
  const itemIds = groups.flatMap((g) => g.items.map((i) => i.id));

  function update(fn) {
    ctx.store.update((s) => ({ ...s, checks: fn(s.checks) }));
    render();
  }

  function render() {
    const checks = ctx.store.state.checks[listKey] ?? {};
    root.replaceChildren(
      h('p', { class: 'meta' }, `Отмечено ${countChecked(ctx.store.state.checks, listKey, itemIds)} из ${itemIds.length}`),
      groups.map((group) => h('div', { class: 'group' },
        group.title ? h('h2', {}, group.title) : null,
        h('ul', { class: numbered ? 'steps numbered' : 'steps' }, group.items.map((item) => {
          const done = Boolean(checks[item.id]);
          return h('li', {}, h('button', {
            type: 'button',
            class: done ? 'check done' : 'check',
            'aria-pressed': String(done),
            'data-item': item.id,
            onclick: () => update((c) => toggleCheck(c, listKey, item.id)),
          },
          h('span', { class: 'mark', 'aria-hidden': 'true' }),
          h('span', { class: 'body' }, item.text, item.note ? h('small', {}, item.note) : null)));
        })))),
      h('button', { type: 'button', class: 'button', onclick: () => update((c) => resetChecks(c, listKey)) }, 'Сбросить отметки'));
  }

  render();
  return root;
}
```

CSS из Task 5 рисует номер (`.numbered .mark::before`) и галочку (`.check.done .mark::before`), поэтому `.mark` пустой.

- [ ] **Step 2: situations.js**

`site/js/views/situations.js`:

```js
import { h, header, sourceFooter, notFound } from '../ui.js';
import { checklistBlock } from './checklist-ui.js';

const GROUPS = [
  ['emergency', 'Аварийные'],
  ['problem', 'Нештатные'],
];

export function situationsIndexView(ctx) {
  const all = ctx.content.situations.situations;
  return h('section', { class: 'view' },
    header('Ситуации'),
    GROUPS.map(([severity, title]) => {
      const items = all.filter((s) => s.severity === severity);
      if (!items.length) return null;
      return [h('h2', {}, title), h('ul', { class: 'list' }, items.map((s) => h('li', {},
        h('a', { href: `#/situations/${s.id}`, class: `severity-${s.severity}` },
          h('span', {}, s.title, h('small', {}, s.summary))))))];
    }));
}

export function situationView(ctx, id) {
  const s = ctx.content.situations.situations.find((x) => x.id === id);
  if (!s) return notFound();
  const items = s.steps.map((step, i) => ({ id: String(i), text: step.text, note: step.note }));
  return h('section', { class: 'view' },
    header('', '#/situations'),
    h('div', { class: s.severity === 'emergency' ? 'alarm' : 'card' },
      h('h1', {}, s.title),
      h('p', {}, s.summary)),
    checklistBlock(ctx, `situation:${s.id}`, [{ items }], { numbered: true }),
    sourceFooter(s));
}
```

`header('', ...)` рисует пустой `h1` - вместо этого сделать `header` терпимым к пустому заголовку: в `site/js/ui.js` заменить строку `h('h1', {}, title));` на `title ? h('h1', {}, title) : null);`.

- [ ] **Step 3: checklists.js**

`site/js/views/checklists.js`:

```js
import { h, header, sourceFooter, notFound } from '../ui.js';
import { checklistBlock } from './checklist-ui.js';

export function checklistView(ctx, id) {
  const list = ctx.content.checklists.checklists.find((x) => x.id === id);
  if (!list) return notFound();
  return h('section', { class: 'view' },
    header(list.title, '#/more'),
    h('p', { class: 'lead' }, list.intro),
    checklistBlock(ctx, `checklist:${list.id}`, list.groups),
    sourceFooter(list));
}
```

- [ ] **Step 4: Маршруты**

В `site/js/routes.js`:

```js
import { situationsIndexView, situationView } from './views/situations.js';
import { checklistView } from './views/checklists.js';
```

```js
  [/^#\/situations$/, situationsIndexView],
  [/^#\/situations\/([\w-]+)$/, situationView],
  [/^#\/more\/checklist\/([\w-]+)$/, checklistView],
```

- [ ] **Step 5: Проверить в браузере**

Открыть `#/situations` → «Человек за бортом».
Expected: красная плашка с заголовком, пять пронумерованных шагов; касание отмечает шаг галочкой и зачёркивает; счётчик меняется; после перезагрузки страницы отметки на месте; «Сбросить отметки» снимает всё; внизу источник «IYT BBS, модуль 2, секция 8, с. 56» и «не сверено».
Открыть `#/more/checklist/acceptance` - то же поведение без номеров.

- [ ] **Step 6: Тесты и commit**

Run: `npm test && npm run check` → PASS.

```bash
git add site/js/views/checklist-ui.js site/js/views/situations.js site/js/views/checklists.js site/js/routes.js site/js/ui.js
git commit -m "Add situation and checklist screens with saved checkmarks"
```

---

### Task 9: Манёвры

**Files:**
- Create: `site/js/views/maneuvers.js`
- Modify: `site/js/routes.js`

**Interfaces:**
- Consumes: `renderScene`, `applyPose` (Task 6); `h`, `header`, `sourceFooter`, `notFound` (Task 5).
- Produces: `maneuversIndexView`, `maneuverView(ctx, id)`. На экране манёвра: `.scene` со схемой, счётчик `p.meta` «Шаг N из M», `.who`, `.cmd`, `p.step-text`, кнопки «Назад» и «Дальше»/«Сначала».

- [ ] **Step 1: maneuvers.js**

`site/js/views/maneuvers.js`:

```js
import { h, header, sourceFooter, notFound } from '../ui.js';
import { renderScene, applyPose } from '../diagrams/scene.js';

export function maneuversIndexView(ctx) {
  return h('section', { class: 'view' },
    header('Манёвры'),
    h('ul', { class: 'list' }, ctx.content.maneuvers.maneuvers.map((m) => h('li', {},
      h('a', { href: `#/maneuvers/${m.id}` },
        h('span', {}, m.title, h('small', {}, m.summary)),
        h('span', { class: 'meta' }, `${m.steps.length} шаг.`))))));
}

export function maneuverView(ctx, id) {
  const m = ctx.content.maneuvers.maneuvers.find((x) => x.id === id);
  if (!m) return notFound();

  const figure = h('div', { class: 'scene', html: renderScene(m.scene, m.steps[0].pose) });
  const svg = figure.firstElementChild;
  const counter = h('p', { class: 'meta' });
  const who = h('div', { class: 'who' });
  const command = h('div', { class: 'cmd' });
  const text = h('p', { class: 'step-text' });
  const prev = h('button', { type: 'button', class: 'button' }, 'Назад');
  const next = h('button', { type: 'button', class: 'button primary' }, 'Дальше');
  let index = 0;

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
  show();

  return h('section', { class: 'view' },
    header(m.title, '#/maneuvers'),
    h('p', { class: 'lead' }, m.summary),
    figure,
    counter,
    h('div', { class: 'step', 'aria-live': 'polite' }, who, command, text),
    h('div', { class: 'ctrl' }, prev, next),
    sourceFooter(m));
}
```

- [ ] **Step 2: Маршруты**

В `site/js/routes.js`:

```js
import { maneuversIndexView, maneuverView } from './views/maneuvers.js';
```

```js
  [/^#\/maneuvers$/, maneuversIndexView],
  [/^#\/maneuvers\/([\w-]+)$/, maneuverView],
```

- [ ] **Step 3: Проверить в браузере**

Открыть `#/maneuvers/tack`.
Expected: схема как в `first_draft.html` (вода, пунктир траектории, стрелка «ВЕТЕР», лодка под углом −45°, жёлтый гик на левом борту); «Дальше» плавно поворачивает лодку и перекладывает гик; на последнем шаге кнопка «Сначала»; «Назад» на первом шаге неактивна; при `prefers-reduced-motion: reduce` поворот без анимации.

- [ ] **Step 4: Commit**

```bash
git add site/js/views/maneuvers.js site/js/routes.js
git commit -m "Add step-by-step maneuver screen"
```

---

### Task 10: Раздел «Ещё» - УКВ, справочник, внешние тесты, настройки

**Files:**
- Create: `site/js/views/more.js`, `site/js/views/vhf.js`, `site/js/views/reference.js`, `site/js/views/external.js`, `site/js/views/settings.js`
- Modify: `site/js/routes.js`

**Interfaces:**
- Consumes: `fillTemplate`, `callValues` (Task 3); `lightsSVG`, `markSVG` (Task 6); `table`, `h`, `header`, `sourceFooter` (Task 5); `todayISO` (Task 1).
- Produces: `moreView`, `vhfView`, `referenceView`, `externalView`, `settingsView`.
  Поля формы настроек: `#tripDate`, `#boatName`, `#callsign`, `#mmsi`, `#persons`; статус - `p.status`; кнопки «Сохранить», «Сохранить прогресс в файл», «Загрузить прогресс из файла» (`input#importFile`).

- [ ] **Step 1: more.js**

`site/js/views/more.js`:

```js
import { h, header } from '../ui.js';

export function moreView(ctx) {
  const link = (href, title, note) => h('li', {}, h('a', { href }, h('span', {}, title, note ? h('small', {}, note) : null)));
  return h('section', { class: 'view' },
    header('Ещё'),
    h('ul', { class: 'list' },
      link('#/more/vhf', 'УКВ-радио', 'Каналы, Mayday, Pan-Pan, алфавит'),
      ctx.content.checklists.checklists.map((c) => link(`#/more/checklist/${c.id}`, c.title, c.intro)),
      link('#/more/reference', 'Справочник', 'Огни, знаки, шкала Бофорта'),
      link('#/more/external', 'Внешние тесты', 'Нужен интернет'),
      link('#/more/settings', 'Настройки', 'Дата выхода, яхта, резервная копия')));
}
```

- [ ] **Step 2: vhf.js**

`site/js/views/vhf.js`:

```js
import { h, header, sourceFooter, table } from '../ui.js';
import { fillTemplate, callValues } from '../template.js';

function body(section, values) {
  switch (section.kind) {
    case 'channels':
      return table(['Канал', 'Назначение'], section.rows.map((r) => [r.ch, r.use]));
    case 'call':
      return [
        h('p', { class: 'lead' }, section.when),
        h('ol', { class: 'script' }, section.lines.map((line) => h('li', {}, fillTemplate(line, values)))),
      ];
    case 'phonetic':
      return h('div', { class: 'phonetic' }, section.letters.map(([letter, word]) => h('span', {}, h('b', {}, letter), ` ${word}`)));
    case 'steps':
      return h('ol', { class: 'script' }, section.steps.map((s) => h('li', {}, s.text, s.note ? h('small', {}, ` - ${s.note}`) : null)));
    default:
      throw new Error(`Неизвестный раздел УКВ: ${section.kind}`);
  }
}

export function vhfView(ctx) {
  const values = callValues(ctx.store.state.settings);
  const missing = !values.boat || !values.mmsi;
  return h('section', { class: 'view' },
    header('УКВ-радио', '#/more'),
    missing ? h('a', { class: 'button', href: '#/more/settings' }, 'Вписать название яхты и MMSI в шаблоны') : null,
    ctx.content.vhf.sections.map((s) => h('article', { class: 'card', id: `vhf-${s.id}` },
      h('h2', {}, s.title),
      body(s, values),
      sourceFooter(s))));
}
```

- [ ] **Step 3: reference.js и external.js**

`site/js/views/reference.js`:

```js
import { h, header, sourceFooter, table } from '../ui.js';
import { lightsSVG } from '../diagrams/lights.js';
import { markSVG } from '../diagrams/marks.js';

function rowFigure(kind, row) {
  const svg = kind === 'lights' ? lightsSVG(row.lights) : markSVG(row.mark, row.label);
  return h('div', { class: 'ref-row' },
    h('div', { class: 'figure', html: svg }),
    h('div', {}, h('b', {}, row.label), h('p', {}, row.value)));
}

export function referenceView(ctx) {
  return h('section', { class: 'view' },
    header('Справочник', '#/more'),
    ctx.content.reference.sections.map((s) => h('article', { class: 'card', id: `ref-${s.id}` },
      h('h2', {}, s.title),
      s.kind === 'table'
        ? table(['', ''], s.rows.map((r) => [r.label, r.value]))
        : s.rows.map((r) => rowFigure(s.kind, r)),
      sourceFooter(s))));
}
```

`site/js/views/external.js`:

```js
import { h, header } from '../ui.js';

export function externalView(ctx) {
  return h('section', { class: 'view' },
    header('Внешние тесты', '#/more'),
    h('p', { class: 'lead' }, 'Сторонние сайты: открываются только при подключении к интернету. Мы не отвечаем за их содержание.'),
    h('ul', { class: 'list' }, ctx.content.external.links.map((l) => h('li', {},
      h('a', { href: l.url, target: '_blank', rel: 'noopener' },
        h('span', {}, l.title, h('small', {}, l.note)),
        h('span', { class: 'meta' }, l.lang.toUpperCase()))))));
}
```

У таблицы справочника пустые заголовки - в `table()` (Task 5) не рисовать `thead`, если все заголовки пустые: заменить строку `h('thead', ...)` на
`headings.some(Boolean) ? h('thead', {}, h('tr', {}, headings.map((t) => h('th', {}, t)))) : null,`.

- [ ] **Step 4: settings.js**

`site/js/views/settings.js`:

```js
import { h, header } from '../ui.js';
import { todayISO } from '../dates.js';

function field(id, label, attrs) {
  return h('label', { class: 'field', for: id }, h('span', {}, label), h('input', { id, name: id, ...attrs }));
}

async function exportProgress(json, say) {
  const name = `pocket-skipper-${todayISO()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      say('Файл передан. Сохраните его в «Файлы».');
    } catch (err) {
      if (err.name !== 'AbortError') say(`Не удалось поделиться файлом: ${err.message}`);
    }
    return;
  }
  const url = URL.createObjectURL(file);
  h('a', { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say(`Файл ${name} сохранён.`);
}

export function settingsView(ctx) {
  const s = ctx.store.state.settings;
  const status = h('p', { class: 'status', role: 'status' });
  const say = (text) => { status.textContent = text; };

  const form = h('form', { class: 'form' },
    field('tripDate', 'Дата выхода', { type: 'date', value: s.tripDate ?? '' }),
    field('boatName', 'Название яхты', { type: 'text', value: s.boatName ?? '', autocomplete: 'off' }),
    field('callsign', 'Позывной', { type: 'text', value: s.callsign ?? '', autocapitalize: 'characters', autocomplete: 'off' }),
    field('mmsi', 'MMSI (9 цифр)', { type: 'text', inputmode: 'numeric', pattern: '[0-9]{9}', value: s.mmsi ?? '', autocomplete: 'off' }),
    field('persons', 'Людей на борту', { type: 'number', min: 1, max: 30, value: s.persons ?? '' }),
    h('button', { type: 'submit', class: 'button primary' }, 'Сохранить'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, ...data } }));
    say('Сохранено.');
  });

  const fileInput = h('input', { type: 'file', id: 'importFile', accept: 'application/json,.json', class: 'visually-hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      ctx.store.importJSON(await file.text());
      ctx.rerender();
      document.querySelector('.status').textContent = 'Прогресс загружен.';
    } catch (err) {
      say(`Не удалось загрузить файл: ${err.message}`);
    }
  });

  return h('section', { class: 'view' },
    header('Настройки', '#/more'),
    form,
    status,
    h('h2', {}, 'Резервная копия'),
    h('p', { class: 'lead' }, 'iOS может удалить данные приложения, которым долго не пользовались. Сохраните копию прогресса в «Файлы».'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'button', onclick: () => exportProgress(ctx.store.exportJSON(), say) }, 'Сохранить прогресс в файл'),
      h('label', { class: 'button', for: 'importFile' }, 'Загрузить прогресс из файла'),
      fileInput),
    ctx.store.persistent ? null : h('p', { class: 'fail' }, 'Сейчас прогресс не сохраняется: браузер запретил хранение данных.'));
}
```

- [ ] **Step 5: Маршруты**

В `site/js/routes.js`:

```js
import { moreView } from './views/more.js';
import { vhfView } from './views/vhf.js';
import { referenceView } from './views/reference.js';
import { externalView } from './views/external.js';
import { settingsView } from './views/settings.js';
```

```js
  [/^#\/more$/, moreView],
  [/^#\/more\/vhf$/, vhfView],
  [/^#\/more\/reference$/, referenceView],
  [/^#\/more\/external$/, externalView],
  [/^#\/more\/settings$/, settingsView],
```

После этого импорт `placeholder` в `routes.js` больше не нужен - удалить его и файл `site/js/views/placeholder.js`.

- [ ] **Step 6: Проверить в браузере**

Expected:
- `#/more` - пункты УКВ, «Приёмка яхты», справочник, внешние тесты, настройки.
- `#/more/settings`: ввести дату, «Aurora», MMSI `271000000`, «Сохранить» → «Сохранено.»; MMSI `123` не даёт сохранить (подсказка браузера).
- `#/more/vhf`: таблица каналов; кнопки «Вписать название яхты» нет, когда оба поля заполнены.
- `#/today` показывает «До выхода N дней».
- «Сохранить прогресс в файл» в десктопном Chrome скачивает JSON; «Загрузить прогресс из файла» с этим файлом пишет «Прогресс загружен.»; файл `{"foo":1}` → «Не удалось загрузить файл: Файл не похож на прогресс Карманного шкипера».
- `#/more/reference`: картинка северного кардинального знака рядом с текстом.

- [ ] **Step 7: Тесты и commit**

Run: `npm test && npm run check` → PASS.

```bash
git add site/js
git commit -m "Add VHF, reference, external links and settings screens"
```

---
### Task 11: Офлайн-режим и установка на iPhone

**Files:**
- Create: `site/manifest.webmanifest`, `site/icons/icon.svg`, `scripts/render-icons.sh`, `site/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- Create: `site/sw.js`, `site/js/pwa.js`, `scripts/update-sw-assets.mjs`
- Modify: `site/index.html`, `site/js/app.js`
- Test: `tests/unit/sw-assets.test.mjs`

**Interfaces:**
- Produces:
  - `sw.js`: кеш `pocket-skipper-<VERSION>`, строка `const VERSION = '__BUILD__';` заменяется при деплое на хеш коммита; список файлов между комментариями `// ASSETS:start` и `// ASSETS:end` - JSON-массив;
  - `listSiteAssets(siteDir: URL): Promise<string[]>` и `readSwAssets(swSource: string): string[]` в `scripts/update-sw-assets.mjs`;
  - `registerServiceWorker(banner: HTMLElement): void` - баннер «Доступна новая версия» с кнопкой «Обновить».

- [ ] **Step 1: Падающий тест списка файлов**

`tests/unit/sw-assets.test.mjs`:

```js
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
```

Run: `npm test` → FAIL, модуль `update-sw-assets.mjs` не найден.

- [ ] **Step 2: update-sw-assets.mjs**

`scripts/update-sw-assets.mjs`:

```js
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
```

- [ ] **Step 3: sw.js**

`site/sw.js`:

```js
const VERSION = '__BUILD__';
const CACHE = `pocket-skipper-${VERSION}`;

// ASSETS:start
const ASSETS = [];
// ASSETS:end

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('pocket-skipper-') && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)),
  );
});
```

Стратегия «сначала кеш»: приложение всегда открывается из кеша, новые файлы приходят только с новой версией service worker'а.
Поэтому каждый деплой обязан менять `VERSION` - это делает workflow из Task 13.

- [ ] **Step 4: Иконки и манифест**

`site/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E2A3B"/>
  <path d="M262 92 L262 360 L392 360 Z" fill="#F4F7F8"/>
  <path d="M244 132 L244 360 L132 360 Z" fill="#D9A416"/>
  <path d="M108 384 H412 L376 432 H150 Z" fill="#C8322B"/>
  <path d="M60 456 Q156 432 256 456 T452 456" fill="none" stroke="#6FB4DD" stroke-width="12" stroke-linecap="round"/>
</svg>
```

`scripts/render-icons.sh` - рендер PNG через Chromium, который Playwright уже положил в кеш на этом компьютере:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER_BIN=$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/* 2>/dev/null | head -1)
if [[ -z "$BROWSER_BIN" ]]; then
  echo "Не найден Chromium из кеша Playwright" >&2
  exit 1
fi
for size in 180 192 512; do
  page="$(mktemp -t icon).html"
  printf '<html><body style="margin:0"><img src="file://%s/site/icons/icon.svg" width="%s" height="%s"></body></html>' "$PWD" "$size" "$size" > "$page"
  "$BROWSER_BIN" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --window-size="$size,$size" --screenshot="$PWD/site/icons/icon-$size.png" "file://$page" >/dev/null 2>&1
  rm -f "$page"
  echo "site/icons/icon-$size.png"
done
```

Run: `chmod +x scripts/render-icons.sh && scripts/render-icons.sh && sips -g pixelWidth -g pixelHeight site/icons/icon-*.png`
Expected: три PNG размерами 180, 192 и 512 пикселей.
Открыть `site/icons/icon-512.png` инструментом Read и убедиться, что это парус на тёмно-синем фоне без белых полей.

`site/manifest.webmanifest`:

```json
{
  "name": "Карманный шкипер",
  "short_name": "Шкипер",
  "lang": "ru",
  "start_url": "./#/today",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0E2A3B",
  "theme_color": "#0E2A3B",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

В `site/index.html` после строки с `theme-color` добавить:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Шкипер">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
```

- [ ] **Step 5: pwa.js и подключение**

`site/js/pwa.js`:

```js
import { h } from './ui.js';

export function registerServiceWorker(banner) {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);

  function offer(worker) {
    banner.replaceChildren(
      'Доступна новая версия. ',
      h('button', { type: 'button', class: 'button primary small', onclick: () => worker.postMessage('skip-waiting') }, 'Обновить'));
    banner.hidden = false;
  }

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    if (registration.waiting && hadController) offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
    document.addEventListener('visibilitychange', () => {
      // Без сети проверка обновления падает - это нормально, приложение работает из кеша.
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  }).catch((err) => console.error('Service worker не зарегистрирован', err));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}
```

В `site/js/app.js` добавить импорт `import { registerServiceWorker } from './pwa.js';` и последней строкой файла `registerServiceWorker(document.getElementById('banner'));`.

- [ ] **Step 6: Заполнить список файлов и прогнать тесты**

Run: `npm run assets && npm test && npm run check`
Expected: `sw.js: N файлов в кеше`; все тесты PASS; в списке есть `index.html`, `manifest.webmanifest`, шрифты, иконки, все `content/*.json` и `js/**`.

- [ ] **Step 7: Проверить офлайн в браузере**

Открыть `http://127.0.0.1:4173/`, DevTools → Application: манифест без ошибок, service worker в состоянии `activated`, в Cache Storage `pocket-skipper-__BUILD__` со всеми файлами.
Network → Offline → перезагрузить: приложение открывается, вкладки работают.
Включить сеть, поменять текст в `site/content/external.json` и `VERSION` на `'test'`, перезагрузить: появляется баннер «Доступна новая версия»; «Обновить» перезагружает страницу с новым текстом.
Вернуть `VERSION = '__BUILD__'` и исходный текст.

- [ ] **Step 8: Commit**

```bash
git add site scripts tests/unit/sw-assets.test.mjs
git commit -m "Make the app installable and available offline"
```

---

### Task 12: E2E-тесты в эмуляции iPhone

> **Контроллер:** разрешение получено 2026-09-16 на оба шага: `npm install -D @playwright/test@1.63.0` и, если понадобится, `npx playwright install chromium`. Исходная формулировка: спросить у пользователя разрешение на `npm install -D @playwright/test@1.63.0` (ставится в `node_modules/` проекта и удаляется вместе с этой папкой; Chromium для Playwright уже скачан на компьютер).
> Если после установки Playwright попросит скачать другую сборку браузера (`npx playwright install chromium`) - это отдельная установка, снова спросить.
> Без разрешения задачу не начинать.

**Files:**
- Create: `playwright.config.mjs`, `tests/e2e/helpers.mjs`, `tests/e2e/app.spec.mjs`
- Modify: `package.json`; npm создаст `package-lock.json`

**Interfaces:**
- Consumes: селекторы из задач 7-11: `.answer[data-correct]`, `.explain`, `.sources`, `.runner .button.primary`, `button.check[data-item]`, `p.meta`, `.step-text`, `#boatName`, `#mmsi`, `.status`, `#vhf-<id>`.

- [ ] **Step 1: Установка (только после разрешения)**

Run: `npm install -D @playwright/test@1.63.0`
Expected: в `package.json` появился `devDependencies`, создан `package-lock.json`.

- [ ] **Step 2: Конфигурация**

`playwright.config.mjs`:

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173/', trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory site',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
```

Здесь эмулируется iPhone на движке Chromium (размер экрана, касания, user agent); настоящий Safari проверяется вручную на телефоне в Task 13.

`tests/e2e/helpers.mjs`:

```js
import { readFileSync } from 'node:fs';

export function content(name) {
  return JSON.parse(readFileSync(new URL(`../../site/content/${name}.json`, import.meta.url), 'utf8'));
}
```

- [ ] **Step 3: Тесты**

`tests/e2e/app.spec.mjs`:

```js
import { test, expect } from '@playwright/test';
import { content } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));
  page.errors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page.errors, 'ошибки JavaScript на странице').toEqual([]);
});

test('тема: ответ показывает разбор и источник', async ({ page }) => {
  const topic = content('questions').topics[0];
  await page.goto(`./#/tests/topic/${topic.id}`);
  await page.locator('.answer[data-correct="true"]').click();
  await expect(page.locator('.answer.ok')).toBeVisible();
  await expect(page.locator('.explain')).toBeVisible();
  await expect(page.locator('.explain .sources')).toContainText('Источник:');
});

test('сессия повторяет ошибку и сохраняет прогресс', async ({ page }) => {
  const first = content('questions').questions[0];
  await page.goto('./#/today');
  await page.getByRole('link', { name: /^Повторить/ }).click();
  await page.locator('.answer[data-correct="false"]').first().click();
  await expect(page.locator('.answer.bad')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pocket-skipper:v1')));
  expect(stored.cards[first.id]).toEqual({ box: 1, due: expect.any(String) });
  await page.locator('.runner .button.primary').click();
  await expect(page.locator('p.meta').first()).toContainText('Вопрос 2 из');
});

test('экзамен не показывает разбор до итогов', async ({ page }) => {
  await page.goto('./#/tests/exam');
  const counter = await page.locator('p.meta').first().textContent();
  const count = Number(counter.match(/из (\d+)/)[1]);
  for (let i = 0; i < count; i += 1) {
    await page.locator('.answer').first().click();
    await expect(page.locator('.explain')).toBeHidden();
    await page.locator('.runner .button.primary').click();
  }
  await expect(page.locator('.score')).toContainText(`из ${count}`);
  await expect(page.getByText(/Экзамен сдан|Не сдан/)).toBeVisible();
});

test('отметки ситуации сохраняются и сбрасываются', async ({ page }) => {
  const situation = content('situations').situations[0];
  await page.goto(`./#/situations/${situation.id}`);
  await page.locator('button.check[data-item="0"]').click();
  await expect(page.locator('.checklist p.meta')).toHaveText(`Отмечено 1 из ${situation.steps.length}`);
  await page.reload();
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Сбросить отметки' }).click();
  await expect(page.locator('button.check[data-item="0"]')).toHaveAttribute('aria-pressed', 'false');
});

test('манёвр листается по шагам', async ({ page }) => {
  const maneuver = content('maneuvers').maneuvers[0];
  await page.goto(`./#/maneuvers/${maneuver.id}`);
  await expect(page.getByText(`Шаг 1 из ${maneuver.steps.length}`)).toBeVisible();
  await page.getByRole('button', { name: 'Дальше' }).click();
  await expect(page.getByText(`Шаг 2 из ${maneuver.steps.length}`)).toBeVisible();
  await expect(page.locator('.step-text')).toHaveText(maneuver.steps[1].text);
});

test('название яхты попадает в радиошаблоны', async ({ page }) => {
  await page.goto('./#/more/settings');
  await page.fill('#boatName', 'Aurora');
  await page.fill('#mmsi', '271000000');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('.status')).toHaveText('Сохранено.');
  await page.goto('./#/more/vhf');
  await expect(page.getByRole('link', { name: /Вписать название яхты/ })).toHaveCount(0);
  const call = content('vhf').sections.find((s) => s.kind === 'call' && s.lines.some((l) => l.includes('{boat}')));
  if (call) await expect(page.locator(`#vhf-${call.id}`)).toContainText('Aurora');
});

test('работает без сети после первой загрузки', async ({ page, context }) => {
  await page.goto('./#/today');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();
  await page.getByRole('link', { name: 'Манёвры' }).click();
  await expect(page.getByRole('heading', { name: 'Манёвры' })).toBeVisible();
});
```

- [ ] **Step 4: Прогон**

Run: `npm run e2e`
Expected: 7 passed.
Если что-то падает - это баг приложения или теста: разбираться по `superpowers:systematic-debugging`, проверки не ослаблять.
Затем `npm run e2e -- --repeat-each=3` - все прогоны зелёные, флаки-тестов нет.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json playwright.config.mjs tests/e2e
git commit -m "Add iPhone-emulated end-to-end tests"
```

---

### Task 13: Публикация на GitHub Pages

> **Контроллер:** пользователь одобрил публичный репозиторий `gaisin/pocket-skipper` на личном аккаунте. Перед `gh repo create` убедиться, что `gh api user --jq .login` возвращает `gaisin`.

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: Workflow**

Сначала проверить актуальные мажорные версии: `gh api repos/actions/checkout/releases/latest --jq .tag_name`, так же для `actions/setup-node`, `actions/upload-pages-artifact`, `actions/deploy-pages`; если мажор новее указанного ниже - подставить его.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          CI: "true"
      - name: Stamp service worker version
        run: sed -i "s/__BUILD__/${GITHUB_SHA::12}/" site/sw.js && grep -q "${GITHUB_SHA::12}" site/sw.js
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README**

`README.md`:

```markdown
# Карманный шкипер

Офлайн-тренажёр для шкипера IYT Bareboat Skipper: тесты с интервальными повторениями, аварийные ситуации, манёвры, УКВ-радио и чек-листы.

Приложение: https://gaisin.github.io/pocket-skipper/

На iPhone: открыть ссылку в Safari → «Поделиться» → «На экран Домой».
После первого открытия приложение работает без интернета.

Приложение - для повторения, а не замена учебнику, официальному тексту МППСС-72 и местным правилам.
У каждой карточки указан источник; метка «не сверено» значит, что текст ещё не сверен с источником.

## Разработка

- `npm run serve` - локальный сервер на http://127.0.0.1:4173/
- `npm test` - модульные тесты
- `npm run check` - проверка содержания и источников
- `npm run e2e` - E2E-тесты в эмуляции iPhone
- `npm run assets` - обновить список файлов офлайн-кеша после добавления или удаления файлов в `site/`

Спецификация: `docs/superpowers/specs/2026-09-16-pocket-skipper-design.md`.
```

- [ ] **Step 3: Все проверки локально**

Run: `npm run check && npm test && npm run e2e`
Expected: всё PASS.

- [ ] **Step 4: Репозиторий, пуш, Pages**

```bash
git add .github README.md
git commit -m "Deploy to GitHub Pages"
gh api user --jq .login
gh repo create gaisin/pocket-skipper --public --source . --remote origin --description "Офлайн-тренажёр шкипера IYT Bareboat Skipper"
gh api -X POST repos/gaisin/pocket-skipper/pages -f build_type=workflow
git push -u origin main
```

Если `POST .../pages` вернул ошибку - попробовать `gh api -X PUT repos/gaisin/pocket-skipper/pages -f build_type=workflow`; если и так не получилось - попросить пользователя включить в Settings → Pages источник «GitHub Actions».

- [ ] **Step 5: Дождаться деплоя**

Run: `gh run watch --repo gaisin/pocket-skipper --exit-status $(gh run list --repo gaisin/pocket-skipper --workflow Deploy --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: build и deploy зелёные.
Затем `curl -sI https://gaisin.github.io/pocket-skipper/ | head -1` → `HTTP/2 200`, а `curl -s https://gaisin.github.io/pocket-skipper/sw.js | head -1` содержит 12-символьный хеш вместо `__BUILD__`.

- [ ] **Step 6: Проверка на iPhone (делает пользователь)**

Попросить пользователя: открыть ссылку в Safari → «Поделиться» → «На экран Домой»; открыть приложение с иконки; ответить на один вопрос; включить авиарежим; закрыть приложение и открыть снова - оно должно открыться, прогресс на месте.
Найденные проблемы чинить, начиная с воспроизведения.

---

## Наполнение (задачи 14-19)

### Общие правила для всех задач наполнения

**Источники.**
- Учебник: `/Users/rsln/Downloads/IYT BBS rus.pdf` (271 стр.). Текст извлекается в `.local/iyt_bbs.txt` (Task 14, шаг 1); `.local/` в git не попадает.
- В тексте каждая строка повторяется 2-3 раза (слои PDF) - при чтении убирать дубли: `awk '!seen[$0]++'`.
- Страница PDF N размечена строкой `=== PAGE N ===`; в `sources` пишется печатный номер `N - 1`.
- Как читать страницу: `awk -v p="=== PAGE 58 ===" '$0==p{f=1;next} /^=== PAGE/{f=0} f' .local/iyt_bbs.txt | awk '!seen[$0]++'`.
- Карта начала разделов (печатные страницы; собрана по меткам «МОДУЛЬ N / СЕКЦИЯ M» в тексте PDF): модуль 1: с. 5 (секции 1-2), с. 11 (секция 3); модуль 2: секция 2 «Терминология» - с. 14, секция 3 «Узлы» - с. 35, секция 4 «Предупреждение столкновений» - с. 41, секция 5 «Метеорология» - с. 45, секция 6 «Паруса» - с. 46, секция 7 «Управление на двигателе» - с. 53, секция 8 «Человек за бортом» - с. 56; модуль 4: секция 2 «Теория судна» - с. 61, секция 3 «Предупреждение столкновений» - с. 69, секция 7 «Якоря» - с. 83; модуль 5 - с. 86; модуль 6 «Шлюпки» - с. 87; модуль 7 «УКВ» - с. 93-122 (секции 1-6 начинаются на с. 93, 94, 97, 99, 100, 102); модуль 9: секции 1-2 «Приёмка», «Безопасность» - с. 149, секция 4 - с. 154; модуль 10: секция 1 «Первая помощь» - с. 157, секция 2 «МППСС» - с. 165; модуль 14: секция 2 «Приёмка судна» - с. 196, секция 3 «Метеорология» - с. 201, секция 4 «Лоция» - с. 213, секция 5 «Управление судном» - с. 217; модуль 15: секция 1 - с. 223, секция 2 - с. 224; модуль 16 «Приливы, карты, МППСС (повторение)» - с. 227-245.
  Модуль 8 (карты, компас, навигационное ограждение, по оглавлению около с. 124-148) в тексте без надёжных меток - искать поиском по словам («латеральн», «кардинальн»).
  Карта - ориентир: перед записью в `sources` открыть страницу и убедиться, что факт действительно на ней.
- МППСС-72: номер правила; текст правила сверять по официальной копии, найденной через WebSearch (например, текст ИМО или официальный русский перевод); URL записать в журнал сверки.
- IALA: `{"type":"iala","topic":...}`; сверять по материалам IALA (iala.int) или учебнику (модуль 8, секция 5).
- Всё, что относится к Турции, Фетхие, чартерным правилам, приложениям и Dufour 430, - только `web`-источники с `accessed` = дата обращения. Если надёжного источника не нашлось - пункт не добавлять.

**Своими словами.** Репозиторий публичный: не копировать абзацы учебника и чужие вопросы; писать короткие пересказы. Дословно - только короткие обязательные фразы радиообмена (MAYDAY, PAN-PAN, SÉCURITÉ, «This is»).

**Журнал сверки.** Файл `docs/content-log.md` - таблица, по строке на запись:

```markdown
| id | источник | что сверено | дата |
|---|---|---|---|
| lights-trawler | МППСС-72, пр. 26 (текст: <URL>) | цвета и порядок огней, ответы-обманки по пр. 26, 27, 29 | 2026-09-17 |
```

`verified: true` ставится только одновременно со строкой в журнале.

**Готовность каждой задачи наполнения:** `npm run check` без ошибок и без несверенных записей этой задачи; `npm test` и `npm run e2e` зелёные; просмотр в браузере при ширине 390px; commit; push (после Task 13 пуш сразу обновляет приложение).

---

### Task 14: Извлечение учебника и раздел УКВ-радио

**Files:**
- Create: `scripts/extract-iyt-text.js`, `docs/content-log.md`
- Modify: `site/content/vhf.json`

- [ ] **Step 1: Скрипт извлечения текста**

`scripts/extract-iyt-text.js` (JavaScript for Automation, встроен в macOS, использует PDFKit):

```js
// Запуск: osascript -l JavaScript scripts/extract-iyt-text.js "<путь к PDF>" > .local/iyt_bbs.txt
ObjC.import('PDFKit');

function run(argv) {
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  if (doc.isNil()) throw new Error(`Не удалось открыть PDF: ${argv[0]}`);
  const pages = [];
  for (let i = 0; i < doc.pageCount; i += 1) {
    const text = doc.pageAtIndex(i).string;
    pages.push(`=== PAGE ${i + 1} ===\n${text.isNil() ? '' : text.js}`);
  }
  return pages.join('\n');
}
```

Run:

```bash
mkdir -p .local
osascript -l JavaScript scripts/extract-iyt-text.js "/Users/rsln/Downloads/IYT BBS rus.pdf" > .local/iyt_bbs.txt
grep -c "^=== PAGE" .local/iyt_bbs.txt
git status --short .local
```

Expected: `271`; `git status` про `.local` ничего не выводит (папка игнорируется).
Строка «CoreGraphics PDF has logged an error» в stderr не мешает.

- [ ] **Step 2: Журнал сверки**

Создать `docs/content-log.md` с заголовком «Журнал сверки содержания», абзацем о правилах из раздела «Общие правила» и пустой таблицей.
Добавить в него строки для стартовых записей из Task 4 после их сверки (или удалить стартовые записи, если их заменяют новые).

- [ ] **Step 3: Собрать факты**

Прочитать модуль 7 учебника (печатные с. 93-122, PDF 94-123).
Выписать для себя: назначение каналов, порядок и формулировки MAYDAY, PAN-PAN, SÉCURITÉ, отмена ложного бедствия, процедурные слова, фонетический алфавит, DSC-вызов бедствия.
WebSearch: действующие каналы УКВ береговой охраны и марин в районе Фетхие/Гёчек (сайты марин, Турецкая береговая охрана), экстренный номер береговой охраны Турции.

- [ ] **Step 4: Записать vhf.json**

Разделы (id → kind):
- `vhf-channels` → `channels`: 16, 70 (DSC), каналы связи между судами и с маринами из учебника; отдельной строкой - каналы марин Фетхие и Гёчека с `web`-источником (если каналы из разных источников, сделать два раздела: общий `vhf-channels` и `vhf-channels-fethiye`).
- `vhf-mayday` → `call`: `when` - «Непосредственная серьёзная опасность судну или людям»; `lines` по учебнику с подстановками `{boat}`, `{callsign}`, `{mmsi}`, `{position}`, `{nature}`, `{help}`, `{persons}`; например первая строка `MAYDAY MAYDAY MAYDAY`, вторая `This is {boat} {boat} {boat}, call sign {callsign}, MMSI {mmsi}`.
- `vhf-panpan` → `call`, `vhf-securite` → `call`, `vhf-cancel` → `call` (отмена ложного сигнала бедствия), `vhf-marina` → `call` (обычный вызов марины: запрос места, с `web`- или `iyt`-источником).
- `vhf-prowords` → `channels` с заголовком «Процедурные слова» (в поле `ch` - слово, в `use` - значение): OVER, OUT, SAY AGAIN, SEELONCE MAYDAY, SEELONCE FEENEE, MAYDAY RELAY, ROGER и др. по учебнику.
- `vhf-phonetic` → `phonetic`: 26 букв (ALFA ... ZULU) и цифры, если есть в учебнике.
- `vhf-dsc` → `steps`: вызов бедствия кнопкой DSC по шагам, затем голосовое сообщение на 16 канале.
- `vhf-numbers` → `channels` с заголовком «Экстренные телефоны в Турции» (`ch` - номер, `use` - служба), только с `web`-источником.

- [ ] **Step 5: Сверить, отметить, проверить, закоммитить**

Для каждого раздела - строка в журнале и `verified: true`.
Run: `npm run check && npm test && npm run e2e` → всё зелёное, в выводе check нет несверенных `vhf-*`.
Проверить в браузере `#/more/vhf` с заполненными настройками: имя яхты и MMSI подставлены, поля без значения показаны как `‹координаты›`.

```bash
git add scripts/extract-iyt-text.js docs/content-log.md site/content/vhf.json
git commit -m "Add VHF radio reference with sourced procedures"
git push
```

---

### Task 15: Аварийные и нештатные ситуации

**Files:**
- Modify: `site/content/situations.json`, `docs/content-log.md`

Список (id - заголовок - severity - где искать):
- `mob` - Человек за бортом - emergency - модуль 2, секция 8 (с. 56 и далее), модуль 9;
- `fire` - Пожар на борту - emergency - модуль 1 секция 2, модуль 9 секция 2;
- `abandon` - Оставление судна, спасательный плот - emergency - модуль 6, модуль 9 секция 2;
- `flooding` - Течь - emergency - модуль 9 секция 2, модуль 15;
- `medical` - Травма или болезнь на борту - emergency - модуль 10 секция 1;
- `grounding` - Посадка на мель - problem - модуль 15, модуль 14 секция 5;
- `fouled-prop` - Намотка на винт - problem - модуль 2 секция 7, модуль 15;
- `engine-failure` - Отказ двигателя - problem - модуль 2 секция 7, модуль 14 секция 5;
- `squall` - Шквал и усиление ветра, взятие рифа - problem - модуль 2 секции 5-6, модуль 14 секция 3;
- `dragging-anchor` - Якорь ползёт - problem - модуль 4 секция 7.

- [ ] **Step 1:** для каждой ситуации прочитать указанные страницы (сначала найти нужную страницу: `grep -n "<ключевое слово>" .local/iyt_bbs.txt`, затем определить `=== PAGE` выше найденной строки).
- [ ] **Step 2:** записать `summary` (одна фраза - главная цель) и 5-9 шагов в порядке выполнения; в `note` - короткое пояснение «зачем» или предостережение. Если учебник что-то не покрывает - либо найти `web`-источник (RYA, береговая охрана), либо не писать этот шаг.
- [ ] **Step 3:** в шагах, где нужна радиосвязь, писать «Передать MAYDAY (см. УКВ-радио)» - без дублирования текста вызова.
- [ ] **Step 4:** сверить, журнал, `verified: true`.
- [ ] **Step 5:** `npm run check && npm test && npm run e2e`; просмотр `#/situations` - аварийные сверху с красной полосой; commit `Add emergency and problem situations`; push.

---

### Task 16: Подготовка к поездке и приёмка яхты

**Files:**
- Modify: `site/content/checklists.json`, `docs/content-log.md`

Два списка:

**`prep` - «Подготовка к поездке».** `intro`: «За три недели до выхода. Отмечайте по мере готовности.»
Группы:
- «Документы» - паспорт, сертификат IYT Bareboat Skipper, сертификат УКВ-оператора (у пользователя он есть - пункт «взять с собой»), договор чартера, судовая роль (crew list), страховка; требования Турции к шкиперу и экипажу чартерной яхты - только по `web`-источникам (сайт чартерной компании, официальные турецкие источники).
- «Приложения на телефон» - навигация с офлайн-картами района Фетхие-Гёчек (скачать карты заранее), прогноз ветра, приложения марин/якорных стоянок; только приложения, которые реально существуют и нашлись поиском, с `web`-источником у списка.
- «До выхода из дома» - скачать офлайн-карты и прогноз, пройти в приложении все темы хотя бы раз, распечатать или сохранить радиошаблоны, заполнить в настройках яхту и MMSI, когда станут известны.
- «Турция: местные правила» - откачка фекальных вод и Mavi Kart, стоянка в бухтах (береговые концы), охраняемые районы Фетхие-Гёчек - только с `web`-источниками.
- «Личные вещи» - непромокаемая куртка, нескользящая обувь, перчатки, головной убор, солнцезащитные очки и крем, налобный фонарь, аптечка с личными лекарствами, герметичный чехол для телефона.

**`acceptance` - «Приёмка яхты»** (заменяет стартовую запись). `intro`: «Проверить вместе с представителем чартерной компании до подписания акта.»
Группы по учебнику (модуль 9 секция 1 с. 149, модуль 14 секция 2 с. 196, модуль 15 секция 1 с. 223): «Документы и инвентарь», «Корпус и палуба», «Такелаж и паруса», «Двигатель» (масло, охлаждающая жидкость, забортная вода из выхлопа, ремень, топливо, запасные крыльчатки и фильтры), «Электрика и приборы» (аккумуляторы, навигационные огни, УКВ с проверкой связи, картплоттер, эхолот), «Безопасность» (жилеты по числу людей, спасательный плот и дата обслуживания, огнетушители, сигнальные ракеты и срок годности, аптечка, спасательный круг с огнём, аварийный румпель), «Якорь и швартовы», «Тузик и мотор», «Камбуз и газ» (утечка, запорный кран).
Особенности Dufour 430 (например, расположение аварийного румпеля, кингстонов, аккумуляторного выключателя) добавлять только если нашёлся руководство владельца или страница производителя/чартерной компании (`web`); иначе - общий пункт «Попросить показать, где кингстоны, аварийный румпель и выключатель аккумуляторов».

- [ ] **Step 1:** собрать пункты по учебнику и поиску; у списка `sources` - все использованные источники.
- [ ] **Step 2:** id пунктов - короткие латиницей (`passport`, `iyt-cert`, `life-jackets` ...), уникальны внутри списка.
- [ ] **Step 3:** сверить, журнал, `verified: true`.
- [ ] **Step 4:** `npm run check && npm test && npm run e2e`; в `#/more` появились оба списка; commit `Add trip preparation and yacht acceptance checklists`; push.

---

### Task 17: Манёвры

**Files:**
- Modify: `site/content/maneuvers.json`, `docs/content-log.md`

Список в порядке приоритета (id - заголовок - источник для поиска):
1. `med-mooring` - Швартовка кормой к причалу на муринг - модуль 14 секция 5 (с. 217), модуль 11; сцена: причал сверху (`quay`), соседние лодки (`boat-moored`), муринг-линия (`line`), лодка подходит кормой (поза `rot` около 180), ветер сбоку.
2. `leave-berth` - Отход от причала (кормой к причалу) - те же источники; `power: true` не ставить, если на схеме важен гик; для моторных манёвров `power: true`.
3. `mob-return` - Возврат к человеку за бортом - модуль 2 секция 8 (с. 56); `person` виден на всех шагах, траектория `path`.
4. `anchoring` - Постановка на якорь и снятие - модуль 4 секция 7 (с. 83); `anchor`, `line` якорной цепи показываются на нужных шагах через `steps`.
5. `tack` - Поворот оверштаг (заменяет стартовую запись; сверить с модулем 2 секция 6, с. 46).
6. `gybe` - Поворот фордевинд - модуль 2 секция 6.
7. `reefing` - Взятие рифа - модуль 2 секция 6, модуль 14.
8. `buoy-pickup` - Подход к бую - модуль 4 или 15.

Правила схем:
- Сцена 260×200; лодка в позе `{x, y, rot, boom}`; `rot` 0 - нос вверх, по часовой; `boom` плюс - гик на левом борту.
- Ветер `wind` - откуда дует (0 - сверху). Проверять физику: на острых курсах гик почти по диаметральной плоскости, на полных - вынесен; гик всегда на подветренном борту.
- 3-8 шагов; в `who` - «Шкипер», «Рулевой», «Экипаж» или «Носовой»; `command` - вслух произносимая команда (как в учебнике, английские термины - в скобках) или пустая строка; `text` - что делают и на что смотреть.

- [ ] **Step 1:** для каждого манёвра - прочитать источник, записать шаги.
- [ ] **Step 2:** нарисовать сцену и позы; открыть манёвр в браузере и пролистать все шаги - лодка не должна выходить за край, пересекать причал или соседние лодки; гик на правильном борту.
- [ ] **Step 3:** сверить шаги и команды, журнал, `verified: true`.
- [ ] **Step 4:** `npm run check && npm test && npm run e2e`; commit `Add sourced maneuver walkthroughs`; push.

---

### Task 18: Банк вопросов

**Files:**
- Modify: `site/content/questions.json`, `docs/content-log.md`

Темы (`topics`, порядок отображения) и минимальное число вопросов:

| id | Заголовок | Минимум | Источники |
|---|---|---|---|
| `colregs` | Расхождение судов | 15 | МППСС-72 пр. 5-19; модуль 2 с. 41, модуль 4 с. 69, модуль 10 с. 165 |
| `lights` | Огни и знаки | 20 | МППСС-72 пр. 20-31, прил. I |
| `sounds` | Звуковые сигналы | 8 | МППСС-72 пр. 32-37 |
| `iala` | Навигационное ограждение | 12 | IALA; модуль 8, найти поиском |
| `vhf` | УКВ-радио | 10 | модуль 7 с. 93 |
| `weather` | Метеорология | 8 | модуль 2 с. 45, модуль 14 с. 201 |
| `anchor-mooring` | Якорь и швартовка | 6 | модуль 4 с. 83, модуль 14 с. 217 |
| `safety` | Безопасность и аварии | 10 | модули 1, 2, 9, 10 |
| `skipper` | Обязанности шкипера и приёмка | 6 | модули 9, 14, 15 |

Итого не меньше 95 вопросов - этого хватает на пробный экзамен из 30 вопросов без частых повторов.

Правила вопросов:
- 3-4 варианта, ровно один верный; неверные варианты - правдоподобные ошибки (соседние правила, перепутанные цвета), а не абсурд.
- `explain` - почему верный ответ верный и чем отличаются обманки (1-3 предложения), со ссылкой на правило словами («Правило 12: ...»).
- Картинки:
  - огни - `image.kind = "lights"`; у судна, идущего на наблюдателя, зелёный бортовой огонь виден слева, красный - справа; топовые белые - выше; в `label` - словесное описание;
  - знаки - `image.kind = "marks"`;
  - расхождение - `image.kind = "encounter"` с двумя судами `А` и `Б`, для парусных задавать `boom` по ветру, чтобы галс читался с картинки.
- Не менее 10 вопросов с картинками огней, 6 со знаками, 6 со схемами расхождения.
- Существующий вопрос `lights-trawler` сверить и оставить.
- Сторонние тесты (раздел «Внешние тесты») - только для самопроверки: вопросы не копировать.

- [ ] **Step 1:** написать вопросы по одной теме за раз; после каждой темы `npm run check`.
- [ ] **Step 2:** пройти каждую тему в браузере: картинки читаются, правильный ответ совпадает с картинкой.
- [ ] **Step 3:** сверить каждый вопрос с источником (правило или страница), журнал, `verified: true`.
- [ ] **Step 4:** `npm run check && npm test && npm run e2e`; commit `Add sourced question bank`; push.

---

### Task 19: Справочник, внешние тесты, финальная сверка

**Files:**
- Modify: `site/content/reference.json`, `site/content/external.json`, `docs/content-log.md`
- Possibly modify: `site/js/diagrams/marks.js` (если сверка знаков найдёт расхождение)

- [ ] **Step 1: Справочник**

Разделы:
- `ref-lateral` (`marks`) - латеральные знаки региона A: port, starboard; `ref-cardinal` (`marks`) - north, south, east, west (заменяет стартовую запись); `ref-other-marks` (`marks`) - isolated-danger, safe-water, special, emergency-wreck. В `value` - цвет, топовая фигура, огонь (ритм) и как обходить.
- `ref-lights` (`lights`) - основные сочетания огней: парусное судно на ходу, моторное на ходу, на якоре, лишённое возможности управляться, ограниченное в маневрировании, траулер, нетраловый рыбак, лоцман.
- `ref-beaufort` (`table`) - шкала Бофорта 0-12: балл → узлы и признаки на море (`web`-источник: WMO или Met Office).
- `ref-sounds` (`table`) - звуковые сигналы маневрирования и в тумане (МППСС-72 пр. 34, 35).

- [ ] **Step 2: Сверка рисунков знаков**

Сравнить `MARK_SPECS` в `site/js/diagrams/marks.js` с источником IALA (цвета, порядок полос, топовые фигуры).
Если есть расхождение - поправить `MARK_SPECS`, обновить ожидания в `tests/unit/diagrams.test.mjs` так, чтобы они соответствовали источнику, и записать сверку в журнал строкой `MARK_SPECS`.

- [ ] **Step 3: Внешние тесты**

`external.json` - ссылки, найденные 2026-09-16 (перед записью открыть каждую через WebFetch и убедиться, что страница работает и это действительно тест):
12knots (https://12knots.com/ru/sailing-school/test/ekzamen-po-pravilam-rashozhdeniya-sudov/, ru), NavLib - тренажёр огней (ru), sea-man.org (https://sea-man.org/testy/test-po-mppss, ru), Morkniga (https://www.morkniga.ru/examenator/mppss_ogni_test/, ru), SailQuiz (https://sailquiz.com/quiz, en), SafeSkipper - огни (https://www.safe-skipper.com/nav-lights-shapes-quiz-1-lights/, en) и знаки (https://www.safe-skipper.com/nav-lights-shapes-quiz-2-shapes/, en), OpenExamPrep RYA SRC (https://open-exam-prep.com/practice/eu-rya-src-vhf, en).
Для NavLib полный URL взять из результатов поиска заново (он длинный, с кириллицей в процентной кодировке).
`accessed` - дата проверки.

- [ ] **Step 4: Финальная сверка**

Run: `npm run check`
Expected: `не сверено 0`.
Если остались несверенные записи - сверить или удалить.
Просмотреть все разделы приложения на телефонной ширине, светлая и тёмная темы.

- [ ] **Step 5: Commit и push**

Run: `npm run check && npm test && npm run e2e` → всё зелёное.

```bash
git add site docs tests
git commit -m "Add reference tables, external quizzes and finish content verification"
git push
```

Попросить пользователя обновить приложение на iPhone (баннер «Доступна новая версия» → «Обновить») и пройти пробный экзамен.
