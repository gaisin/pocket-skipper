import { IALA_TOPICS } from '../../site/js/sources.js';
import { CALL_SECTIONS } from '../../site/js/calls.js';

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
const YOUTUBE_URL = /^https:\/\/(?:www\.youtube\.com\/watch\?v=[\w-]{11}(?:&t=\d+s?|&list=[\w-]+)*|youtu\.be\/[\w-]{11})$/;

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
      if (!Object.hasOwn(IALA_TOPICS, s.topic)) err(`iala: неизвестная тема ${s.topic}`);
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

// Видео - дополнительный просмотр, не источник: только ссылки на YouTube.
function checkVideos(videos, err) {
  if (!list(videos)) return err('videos: нужен непустой список');
  for (const v of videos) {
    if (!text(v?.title)) err('видео: нет title');
    if (!YOUTUBE_URL.test(v?.url ?? '')) err('видео: url должен быть ссылкой на YouTube (watch?v=<id> или youtu.be/<id>)');
  }
}

function checkImage(img, err) {
  if (!IMAGE_KINDS.includes(img?.kind)) return err(`неизвестный вид картинки ${img?.kind}`);
  if (!text(img.label)) err('у картинки нет label');
  if (img.kind === 'lights') checkLights(img, err);
  if (img.kind === 'marks' && !MARK_KINDS.includes(img.mark)) err(`неизвестный знак ${img.mark}`);
  if (img.kind === 'encounter') {
    if (img.wind !== undefined && !num(img.wind)) err('encounter: wind должен быть числом');
    if (!list(img.vessels)) err('encounter: нет vessels');
    for (const v of img.vessels ?? []) {
      if (!text(v.name) || !['sail', 'power'].includes(v.type) || !num(v.x) || !num(v.y) || !num(v.rot)) {
        err('encounter: у судна нужны name, type sail|power, x, y, rot');
      }
      if (v.boom !== undefined && !num(v.boom)) err('encounter: boom должен быть числом');
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

function checkElement(el, err, stepsCount = undefined) {
  if (!ELEMENT_TYPES.includes(el?.type)) return err(`неизвестный элемент ${el?.type}`);
  if (el.type === 'path' && !(text(el.d) && PATH_D.test(el.d))) err('path: недопустимые символы в d');
  if (el.type === 'line' && !(list(el.points) && el.points.every((p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1])))) err('line: нужны points');
  if (el.type === 'label' && !text(el.text)) err('label: нет text');
  if (el.type === 'quay' && ![el.x, el.y, el.w, el.h].every(num)) err('quay: нужны x, y, w, h');
  if (['boat-moored', 'buoy', 'anchor', 'person', 'label'].includes(el.type) && !(num(el.x) && num(el.y))) err(`${el.type}: нужны x, y`);
  if (el.type === 'boat-moored' && ((el.rot !== undefined && !num(el.rot)) || (el.scale !== undefined && !num(el.scale)))) {
    err('boat-moored: rot и scale должны быть числами');
  }
  if (el.steps !== undefined) {
    if (!Array.isArray(el.steps) || el.steps.length === 0 || !el.steps.every((s) => Number.isInteger(s) && s >= 0 && s < stepsCount)) {
      err(`элемент ${el.type}: steps должны быть номерами шагов 0..${stepsCount - 1}`);
    }
  }
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
  situations(r, err, content) {
    if (!text(r.title) || !text(r.summary)) err('нужны title и summary');
    if (!['emergency', 'problem'].includes(r.severity)) err('severity: emergency или problem');
    const call = Object.hasOwn(CALL_SECTIONS, r.severity) ? CALL_SECTIONS[r.severity].id : null;
    if (call && !(content.vhf?.sections ?? []).some((s) => s.id === call && s.kind === 'call')) {
      err(`нет шаблона вызова ${call} в vhf.json`);
    }
    if (!list(r.steps) || !r.steps.every((s) => text(s.text))) err('нужны steps с text');
  },
  maneuvers(r, err) {
    if (!text(r.title) || !text(r.summary)) err('нужны title и summary');
    if (!text(r.scene?.label)) err('scene: нет label');
    if (!Array.isArray(r.scene?.elements)) err('scene: нет elements');
    if (r.scene?.wind !== undefined && !num(r.scene.wind)) err('scene: wind должен быть числом');
    const stepsCount = Array.isArray(r.steps) ? r.steps.length : 0;
    for (const el of r.scene?.elements ?? []) checkElement(el, err, stepsCount);
    if (!list(r.steps)) err('нет steps');
    for (const s of r.steps ?? []) {
      if (!text(s.who) || !text(s.text)) err('шаг: нужны who и text');
      if (s.command !== undefined && typeof s.command !== 'string') err('шаг: command должен быть строкой');
      if (!(num(s.pose?.x) && num(s.pose?.y) && num(s.pose?.rot))) err('шаг: pose с x, y, rot');
      if (s.pose?.boom !== undefined && !num(s.pose.boom)) err('шаг: pose.boom должен быть числом');
    }
    if (r.videos !== undefined) checkVideos(r.videos, err);
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
    if (r.columns !== undefined && !(Array.isArray(r.columns) && r.columns.length === 2 && r.columns.every(text))) {
      err('columns: нужны две подписи');
    }
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

function correctIsLongest(q) {
  const correct = q.options.find((o) => o.correct === true);
  if (!correct) return false;
  return q.options.every((o) => o === correct || o.text.length < correct.text.length);
}

// Доля вопросов, где верный вариант строго длиннее всех остальных (подсказка «выбери самый длинный»).
// Темы отсортированы от худшей к лучшей.
export function longestCorrectShare(questions) {
  const byTopic = new Map();
  for (const q of questions) {
    const t = byTopic.get(q.topic) ?? { topic: q.topic, total: 0, longest: 0 };
    t.total += 1;
    if (correctIsLongest(q)) t.longest += 1;
    byTopic.set(q.topic, t);
  }
  const topics = [...byTopic.values()]
    .map((t) => ({ ...t, share: t.longest / t.total }))
    .sort((a, b) => b.share - a.share);
  const total = questions.length;
  const longest = topics.reduce((sum, t) => sum + t.longest, 0);
  return { total, longest, share: total ? longest / total : 0, topics };
}
