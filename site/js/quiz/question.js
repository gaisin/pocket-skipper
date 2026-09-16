import { h, sourceFooter } from '../ui.js';
import { shuffle } from '../random.js';
import { questionImage } from '../diagrams/index.js';

export function renderQuestion(q, { reveal }, onAnswered) {
  const explain = h('div', { class: 'explain', hidden: true }, h('p', {}, q.explain), sourceFooter(q));
  const answers = h('div', { class: 'answers' });
  let answered = false;

  for (const option of shuffle(q.options)) {
    const button = h('button', { type: 'button', class: 'answer', 'data-correct': String(option.correct === true) }, option.text);
    button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      for (const b of answers.children) b.disabled = true;
      if (reveal) {
        for (const b of answers.children) if (b.dataset.correct === 'true') b.classList.add('ok');
        if (option.correct !== true) button.classList.add('bad');
        explain.hidden = false;
      } else {
        button.classList.add('chosen');
      }
      onAnswered(option.correct === true, option);
    });
    answers.append(button);
  }

  return h('article', { class: 'question' },
    q.image ? questionImage(q.image) : null,
    h('p', { class: 'q' }, q.text),
    answers,
    explain);
}
