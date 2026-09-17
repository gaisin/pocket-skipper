// Запись списка отметок: { items: { [itemId]: true }, updatedAt: <мс> }.
// Старый формат - просто { [itemId]: true } без времени - читается как есть.
export const SITUATION_TTL_MS = 12 * 60 * 60 * 1000;

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function readEntry(entry) {
  if (!isObject(entry)) return { items: {}, updatedAt: null };
  if (isObject(entry.items) && typeof entry.updatedAt === 'number') {
    return { items: entry.items, updatedAt: entry.updatedAt };
  }
  return { items: entry, updatedAt: null };
}

// Отмеченные пункты списка; при заданном ttlMs список старше срока (или без времени) считается пустым.
export function activeItems(checks, listKey, { now = Date.now(), ttlMs = null } = {}) {
  const { items, updatedAt } = readEntry(checks[listKey]);
  if (ttlMs !== null && (updatedAt === null || now - updatedAt > ttlMs)) return {};
  return items;
}

export function toggleCheck(checks, listKey, itemId, { now = Date.now(), ttlMs = null } = {}) {
  const items = { ...activeItems(checks, listKey, { now, ttlMs }) };
  if (items[itemId]) delete items[itemId];
  else items[itemId] = true;
  return { ...checks, [listKey]: { items, updatedAt: now } };
}

export function resetChecks(checks, listKey) {
  const { [listKey]: _removed, ...rest } = checks;
  return rest;
}

export function countChecked(checks, listKey, itemIds, options) {
  const items = activeItems(checks, listKey, options);
  return itemIds.filter((id) => items[id]).length;
}
