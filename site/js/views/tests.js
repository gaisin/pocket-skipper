import { h, header, notFound } from '../ui.js';
import { quizRunner } from '../quiz/runner.js';
import { resultSummary } from '../quiz/summary.js';
import { examQuestions, EXAM_SIZE } from '../quiz/exam.js';
import { grade } from '../leitner.js';
import { todayISO } from '../dates.js';
import { shuffle } from '../random.js';
import { plural } from '../plural.js';

export function recordAnswer(ctx, question, correct) {
  ctx.store.update((s) => ({ ...s, cards: grade(s.cards, question.id, correct, todayISO()) }));
}

export function testsIndexView(ctx) {
  const { topics, questions } = ctx.content.questions;
  const examSize = Math.min(EXAM_SIZE, questions.length);
  return h('section', { class: 'view' },
    header('Тесты'),
    h('a', { class: 'button primary', href: '#/tests/exam' },
      `Пробный экзамен: ${examSize} ${plural(examSize, 'вопрос', 'вопроса', 'вопросов')}`),
    h('h2', {}, 'По темам'),
    h('ul', { class: 'list' }, topics.map((t) => h('li', {},
      h('a', { href: `#/tests/topic/${t.id}` },
        h('span', {}, t.title),
        h('span', { class: 'meta' }, String(questions.filter((q) => q.topic === t.id).length)))))));
}

export function topicView(ctx, topicId) {
  const { topics, questions } = ctx.content.questions;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return notFound();
  return h('section', { class: 'view' },
    header(topic.title, '#/tests'),
    quizRunner({
      questions: shuffle(questions.filter((q) => q.topic === topicId)),
      mode: 'practice',
      onAnswer: (q, correct) => recordAnswer(ctx, q, correct),
      onFinish: (results) => resultSummary(results, { backHref: '#/tests' }),
    }));
}

export function examView(ctx) {
  return h('section', { class: 'view' },
    header('Пробный экзамен', '#/tests'),
    h('p', { class: 'lead' }, 'Ответы и разбор - в конце. Для сдачи нужно 70% верных.'),
    quizRunner({
      questions: examQuestions(ctx.content.questions.questions),
      mode: 'exam',
      onFinish: (results) => resultSummary(results, { backHref: '#/tests', exam: true }),
    }));
}
