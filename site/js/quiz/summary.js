import { h } from '../ui.js';
import { isPassed, PASS_RATIO } from './exam.js';
import { renderReview } from './question.js';

export function resultSummary(results, { backHref, exam = false }) {
  const correct = results.filter((r) => r.correct).length;
  const wrong = results.filter((r) => !r.correct);
  const passed = isPassed(correct, results.length);
  return h('div', { class: 'summary' },
    h('p', { class: 'score', tabindex: '-1' }, `${correct} из ${results.length}`),
    exam ? h('p', { class: passed ? 'pass' : 'fail' },
      passed ? 'Экзамен сдан' : `Не сдан: нужно не меньше ${Math.round(PASS_RATIO * 100)}%`) : null,
    wrong.length ? h('h2', {}, 'Разбор ошибок') : h('p', {}, 'Без ошибок.'),
    wrong.map((r) => renderReview(r.question, { chosen: r.option, options: r.options })),
    h('a', { class: 'button primary', href: backHref }, 'Готово'));
}
