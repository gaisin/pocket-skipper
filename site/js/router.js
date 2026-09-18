// hash вида #/путь?ключ=значение: маршрут ищется по пути, параметры после ? отдаются в query.
export function matchRoute(hash, routes) {
  const at = hash.indexOf('?');
  const path = at < 0 ? hash : hash.slice(0, at);
  const query = at < 0 ? {} : Object.fromEntries(new URLSearchParams(hash.slice(at + 1)));
  const tab = path.split('/')[1] ?? null;
  for (const [pattern, view] of routes) {
    const m = pattern.exec(path);
    if (m) return { view, params: m.slice(1), tab, query };
  }
  return { view: null, params: [], tab, query };
}
