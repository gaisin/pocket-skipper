import { placeholder } from './views/placeholder.js';
import { todayView, sessionView } from './views/today.js';
import { testsIndexView, topicView, examView } from './views/tests.js';
import { situationsIndexView, situationView } from './views/situations.js';
import { checklistView } from './views/checklists.js';
import { maneuversIndexView, maneuverView } from './views/maneuvers.js';

export const routes = [
  [/^#\/today$/, todayView],
  [/^#\/today\/session$/, sessionView],
  [/^#\/tests$/, testsIndexView],
  [/^#\/tests\/topic\/([\w-]+)$/, topicView],
  [/^#\/tests\/exam$/, examView],
  [/^#\/situations$/, situationsIndexView],
  [/^#\/situations\/([\w-]+)$/, situationView],
  [/^#\/maneuvers$/, maneuversIndexView],
  [/^#\/maneuvers\/([\w-]+)$/, maneuverView],
  [/^#\/more$/, placeholder('Ещё')],
  [/^#\/more\/vhf$/, placeholder('УКВ-радио', '#/more')],
  [/^#\/more\/checklist\/([\w-]+)$/, checklistView],
  [/^#\/more\/reference$/, placeholder('Справочник', '#/more')],
  [/^#\/more\/external$/, placeholder('Внешние тесты', '#/more')],
  [/^#\/more\/settings$/, placeholder('Настройки', '#/more')],
];
