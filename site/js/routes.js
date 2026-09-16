import { todayView, sessionView } from './views/today.js';
import { testsIndexView, topicView, examView } from './views/tests.js';
import { situationsIndexView, situationView } from './views/situations.js';
import { checklistView } from './views/checklists.js';
import { maneuversIndexView, maneuverView } from './views/maneuvers.js';
import { moreView } from './views/more.js';
import { vhfView } from './views/vhf.js';
import { referenceView } from './views/reference.js';
import { externalView } from './views/external.js';
import { settingsView } from './views/settings.js';

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
  [/^#\/more$/, moreView],
  [/^#\/more\/vhf$/, vhfView],
  [/^#\/more\/checklist\/([\w-]+)$/, checklistView],
  [/^#\/more\/reference$/, referenceView],
  [/^#\/more\/external$/, externalView],
  [/^#\/more\/settings$/, settingsView],
];
