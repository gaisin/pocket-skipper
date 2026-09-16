import { h } from '../ui.js';
import { lightsSVG } from './lights.js';
import { markSVG } from './marks.js';
import { encounterSVG } from './encounter.js';

export function questionImage(image) {
  const svg = {
    lights: () => lightsSVG(image),
    marks: () => markSVG(image.mark, image.label),
    encounter: () => encounterSVG(image),
  }[image.kind]();
  return h('div', { class: 'figure', html: svg });
}
