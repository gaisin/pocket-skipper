import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examQuestions, isPassed, EXAM_SIZE, PASS_RATIO } from '../../site/js/quiz/exam.js';

test('экзамен берёт не больше EXAM_SIZE разных вопросов', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ id: `q${i}` }));
  const picked = examQuestions(many);
  assert.equal(picked.length, EXAM_SIZE);
  assert.equal(new Set(picked.map((q) => q.id)).size, EXAM_SIZE);
  assert.equal(examQuestions(many.slice(0, 3)).length, 3);
});

test('порог сдачи 70%', () => {
  assert.equal(PASS_RATIO, 0.7);
  assert.equal(isPassed(21, 30), true);
  assert.equal(isPassed(20, 30), false);
  assert.equal(isPassed(0, 0), false);
});
