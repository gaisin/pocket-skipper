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
