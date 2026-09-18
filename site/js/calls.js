// Кнопки радиовызова в карточке ситуации. Какие вызовы показать, задаёт поле calls ситуации:
// id разделов vhf.json вида call, ровно те вызовы, что названы в её шагах.
const KNOWN = {
  'vhf-mayday': { label: 'MAYDAY - шаблон вызова', alarm: true },
  'vhf-panpan': { label: 'PAN-PAN - шаблон вызова', alarm: false },
};

// section - раздел vhf.json; alarm - красная кнопка бедствия.
export function callButton(section) {
  return Object.hasOwn(KNOWN, section.id) ? { ...KNOWN[section.id] } : { label: `${section.title} - шаблон`, alarm: false };
}

// from - откуда открыт шаблон: «Назад» на экране УКВ-радио вернёт к этой ситуации.
export const vhfSectionHref = (sectionId, situationId) => `#/more/vhf/${sectionId}?from=situations/${situationId}`;
