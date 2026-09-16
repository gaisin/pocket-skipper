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
