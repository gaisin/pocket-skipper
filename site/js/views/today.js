import { h, header } from '../ui.js';
import { buildSession, readiness } from '../leitner.js';
import { todayISO, daysBetween } from '../dates.js';
import { plural } from '../plural.js';
import { quizRunner } from '../quiz/runner.js';
import { resultSummary } from '../quiz/summary.js';
import { recordAnswer } from './tests.js';

function countdown(tripDate, today) {
  if (!tripDate) return h('a', { class: 'button', href: '#/more/settings' }, 'Указать дату выхода');
  const days = daysBetween(today, tripDate);
  const text = days > 0 ? `До выхода ${days} ${plural(days, 'день', 'дня', 'дней')}`
    : days === 0 ? 'Выход сегодня' : 'Поездка уже началась';
  return h('p', { class: 'countdown' }, text);
}

export function todayView(ctx) {
  const today = todayISO();
  const ids = ctx.content.questions.questions.map((q) => q.id);
  const { cards, settings } = ctx.store.state;
  const queue = buildSession(cards, ids, today);
  const ready = Math.round(readiness(cards, ids) * 100);
  return h('section', { class: 'view' },
    header('Сегодня'),
    countdown(settings.tripDate, today),
    h('div', { class: 'stat' },
      h('span', { class: 'meta' }, 'Готовность'),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': ready, 'aria-valuemin': 0, 'aria-valuemax': 100 },
        h('div', { style: `width:${ready}%` })),
      h('span', { class: 'value' }, `${ready}%`)),
    h('p', { class: 'lead' }, 'Готовность - доля вопросов, которые вы уверенно помните (коробки 4 и 5).'),
    queue.length
      ? h('a', { class: 'button primary', href: '#/today/session' },
        `Повторить ${queue.length} ${plural(queue.length, 'карточку', 'карточки', 'карточек')}`)
      : h('p', {}, 'На сегодня всё повторено. Возвращайтесь завтра.'));
}

export function sessionView(ctx) {
  const today = todayISO();
  const byId = new Map(ctx.content.questions.questions.map((q) => [q.id, q]));
  const ids = buildSession(ctx.store.state.cards, [...byId.keys()], today);
  return h('section', { class: 'view' },
    header('Повторение', '#/today'),
    quizRunner({
      questions: ids.map((id) => byId.get(id)),
      mode: 'session',
      onAnswer: (q, correct) => recordAnswer(ctx, q, correct),
      onFinish: (results) => resultSummary(results, { backHref: '#/today' }),
    }));
}
