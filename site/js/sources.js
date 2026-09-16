export const IALA_TOPICS = {
  'lateral-a': 'латеральные знаки, регион A',
  cardinal: 'кардинальные знаки',
  'isolated-danger': 'знак отдельной опасности',
  'safe-water': 'знак безопасных вод',
  special: 'специальные знаки',
  'emergency-wreck': 'знак новой опасности',
};

export function formatSource(src) {
  switch (src.type) {
    case 'iyt':
      return `IYT BBS, модуль ${src.module}${src.section ? `, секция ${src.section}` : ''}, с. ${src.page}`;
    case 'colregs':
      return src.annex ? `МППСС-72, прил. ${src.annex}` : `МППСС-72, пр. ${src.rule}`;
    case 'iala':
      return `IALA, ${IALA_TOPICS[src.topic]}`;
    case 'web':
      return `${src.title}, ${src.accessed}`;
    default:
      throw new Error(`Неизвестный тип источника: ${src.type}`);
  }
}

export function formatSources(list) {
  return list.map(formatSource).join(' · ');
}
