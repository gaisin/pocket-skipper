export function matchRoute(hash, routes) {
  const tab = hash.split('/')[1] ?? null;
  for (const [pattern, view] of routes) {
    const m = pattern.exec(hash);
    if (m) return { view, params: m.slice(1), tab };
  }
  return { view: null, params: [], tab };
}
