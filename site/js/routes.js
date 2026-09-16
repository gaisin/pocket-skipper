import { placeholder } from './views/placeholder.js';
import { todayView, sessionView } from './views/today.js';
import { testsIndexView, topicView, examView } from './views/tests.js';

export const routes = [
  [/^#\/today$/, todayView],
  [/^#\/today\/session$/, sessionView],
  [/^#\/tests$/, testsIndexView],
  [/^#\/tests\/topic\/([\w-]+)$/, topicView],
  [/^#\/tests\/exam$/, examView],
  [/^#\/situations$/, placeholder('Ситуации')],
  [/^#\/situations\/([\w-]+)$/, placeholder('Ситуация', '#/situations')],
  [/^#\/maneuvers$/, placeholder('Манёвры')],
  [/^#\/maneuvers\/([\w-]+)$/, placeholder('Манёвр', '#/maneuvers')],
  [/^#\/more$/, placeholder('Ещё')],
  [/^#\/more\/vhf$/, placeholder('УКВ-радио', '#/more')],
  [/^#\/more\/checklist\/([\w-]+)$/, placeholder('Чек-лист', '#/more')],
  [/^#\/more\/reference$/, placeholder('Справочник', '#/more')],
  [/^#\/more\/external$/, placeholder('Внешние тесты', '#/more')],
  [/^#\/more\/settings$/, placeholder('Настройки', '#/more')],
];
