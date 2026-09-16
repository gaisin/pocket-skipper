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
