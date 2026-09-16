import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG } from './boat.js';

export function encounterSVG({ label, wind, vessels }) {
  const boats = vessels.map((v) => {
    const shape = v.type === 'sail' ? hullSVG() + boomSVG(v.boom ?? 0) : powerSVG();
    return `<g transform="translate(${v.x} ${v.y}) rotate(${v.rot}) scale(.7)">${shape}</g>`
      + `<text class="svg-label" x="${v.x + 18}" y="${v.y - 18}">${escapeXml(v.name)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 260 200" role="img" aria-label="${escapeXml(label)}">`
    + '<rect class="svg-water" width="260" height="200"/>'
    + `${wind === undefined ? '' : windArrowSVG(wind, 30, 30)}${boats}</svg>`;
}
