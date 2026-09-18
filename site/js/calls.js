// Какой радиовызов подавать при ситуации данной тяжести: id раздела в vhf.json и надпись кнопки.
export const CALL_SECTIONS = {
  emergency: { id: 'vhf-mayday', label: 'MAYDAY - шаблон вызова' },
  problem: { id: 'vhf-panpan', label: 'PAN-PAN - шаблон вызова' },
};

export const vhfSectionHref = (sectionId) => `#/more/vhf/${sectionId}`;
