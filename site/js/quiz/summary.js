import { h, sourceFooter } from '../ui.js';
import { isPassed, PASS_RATIO } from './exam.js';

export function resultSummary(results, { backHref, exam = false }) {
  const correct = results.filter((r) => r.correct).length;
  const wrong = results.filter((r) => !r.correct);
  const passed = isPassed(correct, results.length);
  return h('div', { class: 'summary' },
    h('p', { class: 'score' }, `${correct} из ${results.length}`),
    exam ? h('p', { class: passed ? 'pass' : 'fail' },
      passed ? 'Экзамен сдан' : `Не сдан: нужно не меньше ${Math.round(PASS_RATIO * 100)}%`) : null,
    wrong.length ? h('h2', {}, 'Разбор ошибок') : h('p', {}, 'Без ошибок.'),
    wrong.map((r) => h('div', { class: 'card' },
      h('p', { class: 'q' }, r.question.text),
      h('p', {}, `Ваш ответ: ${r.option.text}`),
      h('p', { class: 'pass' }, `Верно: ${r.question.options.find((o) => o.correct === true).text}`),
      h('p', { class: 'lead' }, r.question.explain),
      sourceFooter(r.question))),
    h('a', { class: 'button primary', href: backHref }, 'Готово'));
}
