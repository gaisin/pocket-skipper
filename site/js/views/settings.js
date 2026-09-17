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
      if (err.name !== 'AbortError') say(`Не удалось поделиться файлом: ${err.message}`, { fail: true });
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
  const say = (text, { fail = false } = {}) => {
    status.textContent = text;
    status.classList.toggle('fail', fail);
  };

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
      say(`Не удалось загрузить файл: ${err.message}`, { fail: true });
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
