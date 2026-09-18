import { h, sourceFooter } from '../ui.js';
import { shuffle } from '../random.js';
import { questionImage } from '../diagrams/index.js';

const isCorrect = (option) => option.correct === true;

// Пометка словами, а не только цветом: верный вариант и ошибочный выбор.
function answerTag(option, chosen) {
  if (isCorrect(option)) return h('small', { class: 'answer-tag' }, '✓ Верный ответ');
  if (option === chosen) return h('small', { class: 'answer-tag' }, '✗ Ваш ответ');
  return null;
}

function explainBlock(q, { hidden }) {
  return h('div', { class: 'explain', hidden }, h('p', {}, q.explain), sourceFooter(q));
}

// Вопрос с выбором варианта. Нажатие только выбирает вариант (его можно поменять),
// ответ фиксирует внешняя кнопка через confirm().
export function renderQuestion(q, { onSelect } = {}) {
  const options = shuffle(q.options);
  const explain = explainBlock(q, { hidden: true });
  const answers = h('div', { class: 'answers', role: 'group', 'aria-label': 'Варианты ответа' });
  let selected = null;
  let locked = false;

  const buttons = options.map((option) => h('button', {
    type: 'button',
    class: 'answer',
    'aria-pressed': 'false',
    'data-correct': String(isCorrect(option)),
    onclick: () => {
      if (locked) return;
      selected = option;
      for (const [i, b] of buttons.entries()) b.setAttribute('aria-pressed', String(options[i] === option));
      onSelect?.(option);
    },
  }, option.text));
  answers.append(...buttons);

  return {
    element: h('article', { class: 'question' },
      q.image ? questionImage(q.image) : null,
      h('p', { class: 'q', tabindex: '-1' }, q.text),
      answers,
      explain),
    options,
    // Фиксирует выбор; reveal - показать верный ответ и разбор.
    confirm({ reveal }) {
      if (!selected) throw new Error('Вариант не выбран');
      locked = true;
      for (const [i, b] of buttons.entries()) {
        b.disabled = true;
        if (!reveal) continue;
        if (isCorrect(options[i])) b.classList.add('ok');
        else if (options[i] === selected) b.classList.add('bad');
        const tag = answerTag(options[i], selected);
        if (tag) b.append(tag);
      }
      explain.hidden = !reveal;
      return { option: selected, correct: isCorrect(selected) };
    },
  };
}

// Разбор ответа только для чтения: картинка, все варианты с пометками, пояснение, источник.
export function renderReview(q, { chosen, options = q.options }) {
  return h('article', { class: 'card question review' },
    q.image ? questionImage(q.image) : null,
    h('p', { class: 'q' }, q.text),
    h('ul', { class: 'answers', 'aria-label': 'Варианты ответа' }, options.map((option) => {
      const cls = isCorrect(option) ? 'answer ok' : option === chosen ? 'answer bad' : 'answer';
      return h('li', { class: cls }, option.text, answerTag(option, chosen));
    })),
    explainBlock(q, { hidden: false }));
}
