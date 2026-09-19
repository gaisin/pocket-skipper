import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatSource, formatSources } from '../../site/js/sources.js';
import { CONTENT_FILES, loadContent } from '../../site/js/content.js';
import { validateContent, contentStats, longestCorrectShare } from '../../scripts/lib/validate-content.mjs';
import { callButton, vhfSectionHref } from '../../site/js/calls.js';

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
    maneuvers: { groups: [{ id: 'sail', title: 'Под парусом' }], maneuvers: [src({ id: 'm-1', group: 'sail', title: 'Оверштаг', summary: 'x',
      scene: { label: 'схема', wind: 0, elements: [{ type: 'buoy', x: 10, y: 10 }] },
      steps: [{ who: 'Шкипер', command: 'Поворот!', text: 'x', pose: { x: 130, y: 120, rot: -45, boom: 20 } }] })] },
    checklists: { checklists: [src({ id: 'c-1', title: 'Сборы', intro: 'x',
      groups: [{ title: 'Документы', items: [{ id: 'passport', text: 'Паспорт' }] }] })] },
    vhf: { sections: [
      src({ id: 'v-1', title: 'Каналы', kind: 'channels', rows: [{ ch: '16', use: 'бедствие' }] }),
      src({ id: 'vhf-mayday', title: 'MAYDAY', kind: 'call', when: 'x', lines: ['MAYDAY'] }),
    ] },
    reference: { sections: [src({ id: 'r-1', title: 'Знаки', kind: 'marks', rows: [{ label: 'Северный', value: 'x', mark: 'north' }] })] },
    guides: { guides: [{ id: 'g-1', title: 'Лоция', summary: 'x', verified: false, sections: [
      { title: 'Погода', tips: [{ text: 'Днём дует с северо-запада', note: 'почему', sources: [{ type: 'web', title: 'Лоция', url: 'https://x.example', accessed: '2026-09-18' }] }] },
    ] }] },
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

// Зеркальный манёвр с шагом, где текст подставлен, и подписью на схеме.
function mirrored(text) {
  const c = minimal();
  const m = c.maneuvers.maneuvers[0];
  m.mirror = true;
  m.steps[0].text = text;
  return c;
}

test('зеркальный манёвр: слово о стороне вне пары [[..|..]] не проходит', () => {
  for (const text of ['Подойти левым бортом', 'Причал справа', 'Корму уводит влево', 'Руль налево', 'Кругом против часовой стрелки', 'ЛЕВЫЙ борт']) {
    assert.match(validateContent(mirrored(text)).join('\n'), /m-1: слово о стороне .* вне пары \[\[\.\.\|\.\.\]\]/, text);
  }
  const c = minimal();
  c.maneuvers.maneuvers[0].mirror = true;
  c.maneuvers.maneuvers[0].title = 'Лагом левым бортом';
  c.maneuvers.maneuvers[0].scene.elements.push({ type: 'label', x: 1, y: 1, text: 'СПРАВА' });
  c.maneuvers.maneuvers[0].steps[0].command = 'Право руля!';
  const text = validateContent(c).join('\n');
  assert.match(text, /«левым»/);
  assert.match(text, /«справа»/);
  assert.match(text, /«право»/);
});

test('зеркальный манёвр: похожие слова и слова внутри пары проходят', () => {
  for (const text of [
    'Правило простое', 'Управление на заднем ходу', 'Направление ветра', 'Рулевой держит курс', 'Сказать рулевому',
    'Подправить длину шпринга', 'Исправить курс', 'Отправить носового', 'См. справку', 'Экипаж справится',
    'Двигатель работает правильно', 'Стоянка на 12 часов', 'Корму уводит [[влево|вправо]]', 'Подойти [[левым|правым]] бортом, причал [[слева|справа]]',
  ]) {
    assert.deepEqual(validateContent(mirrored(text)), [], text);
  }
});

test('незеркальный манёвр может называть стороны без пар', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].steps[0].text = 'Подойти левым бортом, причал справа';
  assert.deepEqual(validateContent(c), []);
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

test('подписи колонок раздела УКВ: две непустые строки', () => {
  const c = minimal();
  c.vhf.sections[0].columns = ['Слово', 'Значение'];
  assert.deepEqual(validateContent(c), []);
  for (const bad of [['Слово'], ['Слово', ' '], ['Слово', 'Значение', 'Ещё'], 'Слово', ['Слово', 1]]) {
    c.vhf.sections[0].columns = bad;
    assert.match(validateContent(c).join('\n'), /v-1: columns: нужны две подписи/);
  }
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
  assert.equal(ok.guides.url, 'content/guides.json');
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

test('элемент сцены со списком шагов требует непустой массив', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].scene.elements[0].steps = [];
  assert.match(validateContent(c).join('\n'), /steps должны быть номерами шагов/);
});

test('числовые поля диаграмм (rot, scale, boom, wind) проверяются, когда заданы', () => {
  const bad = '0" onload="x';
  const c = minimal();
  c.maneuvers.maneuvers[0].scene.wind = bad;
  c.maneuvers.maneuvers[0].scene.elements.push({ type: 'boat-moored', x: 10, y: 10, rot: bad, scale: bad });
  c.maneuvers.maneuvers[0].steps[0].pose.boom = bad;
  c.questions.questions[0].image = {
    kind: 'encounter', label: 'Расхождение', wind: bad,
    vessels: [{ name: 'А', type: 'sail', x: 10, y: 10, rot: 0, boom: bad }],
  };
  const text = validateContent(c).join('\n');
  assert.match(text, /boat-moored: rot и scale должны быть числами/);
  assert.match(text, /шаг: pose\.boom должен быть числом/);
  assert.match(text, /encounter: boom должен быть числом/);
  assert.match(text, /scene: wind должен быть числом/);
  assert.match(text, /encounter: wind должен быть числом/);

  const ok = minimal();
  ok.maneuvers.maneuvers[0].scene.elements.push({ type: 'boat-moored', x: 10, y: 10, rot: 15, scale: 0.8 });
  ok.questions.questions[0].image = {
    kind: 'encounter', label: 'Расхождение', wind: 45,
    vessels: [{ name: 'А', type: 'sail', x: 10, y: 10, rot: 0, boom: 10 }],
  };
  assert.deepEqual(validateContent(ok), []);
});

test('доля вопросов, где верный ответ строго самый длинный', () => {
  const q = (topic, correct, ...others) => ({
    topic,
    options: [{ text: correct, correct: true }, ...others.map((text) => ({ text }))],
  });
  const stats = longestCorrectShare([
    q('a', 'длинный ответ', 'коротко', 'тоже'),
    q('a', 'равно', 'ровно'),
    q('a', 'кор', 'длиннее'),
    q('b', 'самый длинный', 'нет'),
  ]);
  assert.equal(stats.total, 4);
  assert.equal(stats.longest, 2);
  assert.equal(stats.share, 0.5);
  assert.deepEqual(stats.topics, [
    { topic: 'b', total: 1, longest: 1, share: 1 },
    { topic: 'a', total: 3, longest: 1, share: 1 / 3 },
  ]);
  assert.deepEqual(longestCorrectShare([]), { total: 0, longest: 0, share: 0, topics: [] });
});

test('line: точка - ровно две конечные координаты', () => {
  for (const points of [[[1, 2, 3]], [[1]], [[1, Infinity]], ['ab'], [[1, 2], [3, 4, 5]]]) {
    const c = minimal();
    c.maneuvers.maneuvers[0].scene.elements.push({ type: 'line', points });
    assert.ok(validateContent(c).some((e) => e.includes('line')), JSON.stringify(points));
  }
  const ok = minimal();
  ok.maneuvers.maneuvers[0].scene.elements.push({ type: 'line', points: [[1, 2], [3, 4]] });
  assert.deepEqual(validateContent(ok), []);
});

test('видео к манёврам: корректные ссылки YouTube проходят', () => {
  const c = minimal();
  c.maneuvers.maneuvers[0].videos = [
    { title: 'Поворот оверштаг', url: 'https://www.youtube.com/watch?v=nG7e3K5JB4E' },
    { title: 'С таймкодом и плейлистом', url: 'https://www.youtube.com/watch?v=aDAVzY6vsPk&t=95&list=PLs6j9IuTwY-UcqW0ePFOqb_G9tL-zrlSp' },
    { title: 'Короткая ссылка', url: 'https://youtu.be/loU4MgPH5Ro' },
  ];
  assert.deepEqual(validateContent(c), []);
});

test('видео к манёврам: пустой список и не массив не проходят', () => {
  for (const videos of [[], 'https://youtu.be/loU4MgPH5Ro', {}, null]) {
    const c = minimal();
    c.maneuvers.maneuvers[0].videos = videos;
    assert.match(validateContent(c).join('\n'), /m-1: videos: нужен непустой список/, JSON.stringify(videos));
  }
});

test('видео к манёврам: нужен title', () => {
  for (const title of [undefined, '', '   ', 42]) {
    const c = minimal();
    c.maneuvers.maneuvers[0].videos = [{ title, url: 'https://youtu.be/loU4MgPH5Ro' }];
    assert.match(validateContent(c).join('\n'), /m-1: видео: нет title/, JSON.stringify(title));
  }
});

test('видео к манёврам: url только YouTube watch или youtu.be с id из 11 символов', () => {
  const bad = [
    undefined,
    'http://www.youtube.com/watch?v=loU4MgPH5Ro',
    'https://youtube.com/watch?v=loU4MgPH5Ro',
    'https://www.youtube.com/watch?v=loU4MgPH5R',
    'https://www.youtube.com/watch?v=loU4MgPH5Roo',
    'https://www.youtube.com/watch?v=loU4MgPH5R!',
    'https://www.youtube.com/watch?v=loU4MgPH5Ro&autoplay=1',
    'https://www.youtube.com/watch?v=loU4MgPH5Ro&t=abc',
    'https://www.youtube.com/playlist?list=PLs6j9IuTwY-UcqW0ePFOqb_G9tL-zrlSp',
    'https://www.youtube.com/embed/loU4MgPH5Ro',
    'https://youtu.be/loU4MgPH5Ro/extra',
    'https://youtu.be.evil.com/loU4MgPH5Ro',
    'https://www.youtube.com/watch?v=loU4MgPH5Ro"><script>',
    'javascript:alert(1)',
  ];
  for (const url of bad) {
    const c = minimal();
    c.maneuvers.maneuvers[0].videos = [{ title: 'Видео', url }];
    assert.match(validateContent(c).join('\n'), /m-1: видео: url должен быть ссылкой на YouTube/, String(url));
  }
});

test('реальное содержание репозитория проходит проверку', async () => {
  assert.deepEqual(validateContent(await realContent()), []);
});

test('ситуация без calls не требует шаблонов вызова', () => {
  const c = minimal();
  c.vhf.sections = c.vhf.sections.filter((x) => x.id !== 'vhf-mayday');
  assert.deepEqual(validateContent(c), []);
});

test('calls ситуации: непустой список id разделов vhf.json вида call', () => {
  const ok = minimal();
  ok.situations.situations[0].calls = ['vhf-mayday'];
  assert.deepEqual(validateContent(ok), []);

  for (const calls of [[], 'vhf-mayday', {}, null]) {
    const c = minimal();
    c.situations.situations[0].calls = calls;
    assert.match(validateContent(c).join('\n'), /s-1: calls: нужен непустой список id разделов vhf\.json/, JSON.stringify(calls));
  }
  // Нет такого раздела; раздел есть, но это не шаблон вызова; не строка.
  for (const id of ['vhf-nope', 'v-1', 42]) {
    const c = minimal();
    c.situations.situations[0].calls = ['vhf-mayday', id];
    assert.ok(validateContent(c).includes(`situations.json: s-1: calls: нет шаблона вызова ${id} в vhf.json`), String(id));
  }
  const dup = minimal();
  dup.situations.situations[0].calls = ['vhf-mayday', 'vhf-mayday'];
  assert.match(validateContent(dup).join('\n'), /s-1: calls: vhf-mayday повторяется/);
});

// Кнопки вызова в карточке - ровно те вызовы, что названы в шагах, в порядке первого упоминания.
test('calls каждой ситуации совпадают с вызовами, которые названы в её шагах', async () => {
  const c = await realContent();
  const CALL_WORDS = [['vhf-mayday', /MAYDAY(?! RELAY)/], ['vhf-panpan', /PAN-PAN/]];
  for (const s of c.situations.situations) {
    const text = s.steps.map((st) => `${st.text} ${st.note ?? ''}`).join('\n');
    const mentioned = CALL_WORDS
      .map(([id, re]) => [id, text.search(re)])
      .filter(([, pos]) => pos >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => id);
    assert.deepEqual(s.calls ?? [], mentioned, s.id);
  }
});

test('надпись и вид кнопки вызова', () => {
  assert.deepEqual(callButton({ id: 'vhf-mayday', title: 'MAYDAY - бедствие' }), { label: 'MAYDAY - шаблон вызова', alarm: true });
  assert.deepEqual(callButton({ id: 'vhf-panpan', title: 'PAN-PAN - срочность' }), { label: 'PAN-PAN - шаблон вызова', alarm: false });
  assert.deepEqual(callButton({ id: 'vhf-securite', title: 'SÉCURITÉ' }), { label: 'SÉCURITÉ - шаблон', alarm: false });
});

test('ссылка на шаблон вызова помнит ситуацию, из которой открыта', () => {
  assert.equal(vhfSectionHref('vhf-mayday', 'mob'), '#/more/vhf/vhf-mayday?from=situations/mob');
});

// Гайды: источник у каждого совета, общего списка источников у гайда нет.
const guideErrors = (mutate) => {
  const c = minimal();
  mutate(c.guides.guides[0], c);
  return validateContent(c).join('\n');
};

test('гайд: нужны title, summary и непустые разделы с советами', () => {
  assert.match(guideErrors((g) => { g.title = ' '; }), /guides\.json: g-1: нужны title и summary/);
  assert.match(guideErrors((g) => { delete g.summary; }), /g-1: нужны title и summary/);
  for (const sections of [undefined, [], 'x']) {
    assert.match(guideErrors((g) => { g.sections = sections; }), /g-1: нет sections/, JSON.stringify(sections));
  }
  assert.match(guideErrors((g) => { g.sections[0].title = ''; }), /g-1: раздел 1: нет title/);
  for (const tips of [undefined, [], {}]) {
    assert.match(guideErrors((g) => { g.sections[0].tips = tips; }), /g-1: раздел 1: нет tips/, JSON.stringify(tips));
  }
});

test('гайд: у совета нужен text, note - непустая строка, если задан', () => {
  assert.match(guideErrors((g) => { g.sections[0].tips[0].text = ''; }), /g-1: раздел 1, совет 1: нет text/);
  assert.match(guideErrors((g) => { g.sections[0].tips[0].note = ' '; }), /g-1: раздел 1, совет 1: note должна быть непустой строкой/);
  assert.equal(guideErrors((g) => { delete g.sections[0].tips[0].note; }), '');
});

test('гайд: у каждого совета свои корректные источники', () => {
  assert.match(guideErrors((g) => { g.sections[0].tips[0].sources = []; }), /g-1: раздел 1, совет 1: нет источников/);
  assert.match(guideErrors((g) => { delete g.sections[0].tips[0].sources; }), /g-1: раздел 1, совет 1: нет источников/);
  const bad = guideErrors((g) => {
    g.sections.push({ title: 'Деньги', tips: [{ text: 'Залог', sources: [{ type: 'web', title: 'x', url: 'http://x', accessed: '18.09' }] }] });
  });
  assert.match(bad, /g-1: раздел 2, совет 1: web: url должен начинаться с https/);
  assert.match(bad, /g-1: раздел 2, совет 1: web: accessed/);
});

test('гайд: общий список источников не нужен и не допускается', () => {
  assert.doesNotMatch(guideErrors(() => {}), /нет источников/);
  assert.match(guideErrors((g) => { g.sources = [{ type: 'colregs', rule: 26 }]; }), /g-1: источники указываются у советов, а не у гайда/);
});

test('гайд: verified - true или false, id уникален среди всех файлов', () => {
  assert.match(guideErrors((g) => { g.verified = 'yes'; }), /g-1: verified должен быть true или false/);
  assert.match(guideErrors((g) => { g.id = 'q-1'; }), /guides\.json: q-1: id повторяется/);
  assert.match(guideErrors((g) => { g.id = 'Fethiye Guide'; }), /guides\.json: плохой id/);
  assert.match(validateContent({ ...minimal(), guides: {} }).join('\n'), /guides\.json: нет списка записей/);
});

test('статистика сверки учитывает гайды', () => {
  const c = minimal();
  assert.ok(contentStats(c).unverified.includes('g-1'));
  c.guides.guides[0].verified = true;
  assert.ok(!contentStats(c).unverified.includes('g-1'));
});
