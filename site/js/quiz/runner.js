import { h } from '../ui.js';
import { renderQuestion } from './question.js';

// mode: 'practice' и 'session' показывают разбор сразу после «Ответить»,
// 'exam' - только в итогах. В 'session' ошибка повторяется в конце очереди один раз.
export function quizRunner({ questions, mode, onAnswer, onFinish }) {
  const root = h('div', { class: 'runner' });
  if (questions.length === 0) {
    root.append(h('p', { class: 'lead' }, 'Здесь пока нет вопросов.'));
    return root;
  }
  const reveal = mode !== 'exam';
  const queue = [...questions];
  const requeued = new Set();
  const results = [];
  let total = queue.length;

  function finish({ byUser }) {
    root.replaceChildren(onFinish(results));
    window.scrollTo(0, 0);
    if (byUser) root.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
  }

  // byUser - шаг по кнопке: фокус переносим на новый вопрос, иначе он теряется вместе со старой кнопкой.
  function step({ byUser = false } = {}) {
    const q = queue.shift();
    if (!q) return finish({ byUser });
    const nextLabel = () => (queue.length ? 'Дальше' : 'Итоги');
    const primary = h('button', { type: 'button', class: 'button primary', disabled: true },
      reveal ? 'Ответить' : nextLabel());
    const card = renderQuestion(q, { onSelect: () => { primary.disabled = false; } });
    let answered = false;

    function confirm() {
      const { option, correct } = card.confirm({ reveal });
      answered = true;
      results.push({ question: q, correct, option, options: card.options });
      onAnswer?.(q, correct);
      if (mode === 'session' && !correct && !requeued.has(q.id)) {
        requeued.add(q.id);
        queue.push(q);
        total += 1;
      }
    }

    primary.addEventListener('click', () => {
      if (!reveal) {
        confirm();
        step({ byUser: true });
      } else if (!answered) {
        confirm();
        primary.textContent = nextLabel();
        primary.focus();
      } else {
        step({ byUser: true });
      }
    });

    root.replaceChildren(
      h('div', { class: 'runner-head' },
        h('p', { class: 'meta' }, `Вопрос ${results.length + 1} из ${total}`),
        h('div', { class: 'progress' }, h('div', { style: `width:${Math.round((results.length / total) * 100)}%` }))),
      card.element,
      primary);
    window.scrollTo(0, 0);
    if (byUser) card.element.querySelector('.q').focus({ preventScroll: true });
  }

  step();
  return root;
}
