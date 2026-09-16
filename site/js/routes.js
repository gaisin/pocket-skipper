import { placeholder } from './views/placeholder.js';

export const routes = [
  [/^#\/today$/, placeholder('Сегодня')],
  [/^#\/today\/session$/, placeholder('Повторение', '#/today')],
  [/^#\/tests$/, placeholder('Тесты')],
  [/^#\/tests\/topic\/([\w-]+)$/, placeholder('Тема', '#/tests')],
  [/^#\/tests\/exam$/, placeholder('Пробный экзамен', '#/tests')],
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
