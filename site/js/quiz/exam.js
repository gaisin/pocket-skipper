import { shuffle } from '../random.js';

export const EXAM_SIZE = 30;
export const PASS_RATIO = 0.7;

export function examQuestions(questions, rand = Math.random) {
  return shuffle(questions, rand).slice(0, EXAM_SIZE);
}

export function isPassed(correct, total) {
  return total > 0 && correct / total >= PASS_RATIO;
}
