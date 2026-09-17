import { MAX_BOX } from './leitner.js';

export const STORAGE_KEY = 'pocket-skipper:v1';

function emptyState() {
  return { version: 1, cards: {}, checks: {}, settings: {} };
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v) => typeof v === 'string' && ISO_DATE.test(v);
const isString = (v) => typeof v === 'string';

// Допустимые поля настроек и проверка значения каждого; остальное отбрасывается.
const SETTINGS_FIELDS = {
  tripDate: isIsoDate,
  boatName: isString,
  callsign: isString,
  mmsi: isString,
  persons: (v) => isString(v) || Number.isFinite(v),
};

function sanitizeCards(cards) {
  const valid = Object.entries(cards).filter(([, c]) =>
    isObject(c) && Number.isInteger(c.box) && c.box >= 1 && c.box <= MAX_BOX && isIsoDate(c.due));
  return Object.fromEntries(valid.map(([id, c]) => [id, { box: c.box, due: c.due }]));
}

function sanitizeSettings(settings) {
  return Object.fromEntries(Object.entries(settings)
    .filter(([key, value]) => Object.hasOwn(SETTINGS_FIELDS, key) && SETTINGS_FIELDS[key](value)));
}

export function parseState(raw) {
  const data = JSON.parse(raw);
  if (!isObject(data) || data.version !== 1 || !isObject(data.cards) || !isObject(data.checks) || !isObject(data.settings)) {
    throw new Error('Файл не похож на прогресс Карманного шкипера');
  }
  return {
    version: 1,
    cards: sanitizeCards(data.cards),
    checks: data.checks,
    settings: sanitizeSettings(data.settings),
  };
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
