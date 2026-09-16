import { h } from '../ui.js';
import { renderQuestion } from './question.js';

export function quizRunner({ questions, mode, onAnswer, onFinish }) {
  const root = h('div', { class: 'runner' });
  if (questions.length === 0) {
    root.append(h('p', { class: 'lead' }, 'Здесь пока нет вопросов.'));
    return root;
  }
  const queue = [...questions];
  const requeued = new Set();
  const results = [];
  let total = queue.length;

  function step() {
    const q = queue.shift();
    if (!q) {
      root.replaceChildren(onFinish(results));
      window.scrollTo(0, 0);
      return;
    }
    const next = h('button', { type: 'button', class: 'button primary', hidden: true, onclick: step }, 'Дальше');
    const card = renderQuestion(q, { reveal: mode !== 'exam' }, (correct, option) => {
      results.push({ question: q, correct, option });
      onAnswer?.(q, correct);
      if (mode === 'session' && !correct && !requeued.has(q.id)) {
        requeued.add(q.id);
        queue.push(q);
        total += 1;
      }
      next.textContent = queue.length ? 'Дальше' : 'Итоги';
      next.hidden = false;
      next.focus();
    });
    root.replaceChildren(
      h('p', { class: 'meta' }, `Вопрос ${results.length + 1} из ${total}`),
      h('div', { class: 'progress' }, h('div', { style: `width:${Math.round((results.length / total) * 100)}%` })),
      card,
      next);
    window.scrollTo(0, 0);
  }

  step();
  return root;
}
