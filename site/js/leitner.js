import { addDays } from './dates.js';

export const INTERVALS = [0, 1, 2, 4, 7];
export const MAX_BOX = INTERVALS.length;
export const SESSION_LIMIT = 15;

export function buildSession(cards, questionIds, today, limit = SESSION_LIMIT) {
  const due = questionIds
    .filter((id) => cards[id] && cards[id].due <= today)
    .sort((a, b) => cards[a].box - cards[b].box || cards[a].due.localeCompare(cards[b].due));
  const fresh = questionIds.filter((id) => !cards[id]);
  return [...due, ...fresh].slice(0, limit);
}

export function grade(cards, id, correct, today) {
  const previous = cards[id]?.box ?? 1;
  const box = correct ? Math.min(previous + 1, MAX_BOX) : 1;
  return { ...cards, [id]: { box, due: addDays(today, INTERVALS[box - 1]) } };
}

export function readiness(cards, questionIds) {
  if (questionIds.length === 0) return 0;
  const learned = questionIds.filter((id) => (cards[id]?.box ?? 0) >= 4).length;
  return learned / questionIds.length;
}
