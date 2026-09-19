import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG, boomStyle } from './boat.js';
import { SCENE_WIDTH } from './mirror.js';

const WIND_X = 36;
const WIND_Y = 30;
const r1 = (v) => Math.round(v * 10) / 10;

// Стрелка силы: walk - заброс кормы, drift - снос ветром; наконечник в (x2, y2).
function arrowSVG({ x1, y1, x2, y2, kind }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const barb = (da) => `${r1(x2 - 8 * Math.cos(a + da))},${r1(y2 - 8 * Math.sin(a + da))}`;
  return `<g class="force ${kind}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
    + `<polygon points="${x2},${y2} ${barb(0.45)} ${barb(-0.45)}"/></g>`;
}

// Образец стрелки для легенды под схемой: та же отрисовка и классы, что у стрелки в сцене,
// поэтому цвет и пунктир берутся из тех же CSS-правил (совпадают в светлой и тёмной теме).
export function legendArrowSVG(kind) {
  return `<svg viewBox="0 0 32 14" aria-hidden="true">${arrowSVG({ x1: 3, y1: 7, x2: 29, y2: 7, kind })}</svg>`;
}

function elementSVG(el) {
  switch (el.type) {
    case 'quay': return `<rect class="quay" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/>`;
    case 'boat-moored': return `<g class="moored" transform="translate(${el.x} ${el.y}) rotate(${el.rot ?? 0}) scale(${el.scale ?? 1})">${hullSVG()}</g>`;
    case 'buoy': return `<circle class="buoy-dot" cx="${el.x}" cy="${el.y}" r="5"/>`;
    case 'anchor': return `<g class="anchor" transform="translate(${el.x} ${el.y})"><line x1="0" y1="-8" x2="0" y2="7"/><line x1="-4" y1="-4" x2="4" y2="-4"/><path d="M-7 2 Q0 12 7 2"/></g>`;
    case 'line': return `<polyline class="rope${el.dashed ? ' dashed' : ''}" points="${el.points.map((p) => p.join(',')).join(' ')}"/>`;
    case 'person': return `<g class="person" transform="translate(${el.x} ${el.y})"><circle r="6"/><circle class="head" r="2.5"/></g>`;
    case 'label': return `<text class="svg-label" x="${el.x}" y="${el.y}"${el.anchor ? ` text-anchor="${el.anchor}"` : ''}>${escapeXml(el.text)}</text>`;
    case 'path': return `<path class="track" d="${el.d}"/>`;
    case 'arrow': return arrowSVG(el);
    default: throw new Error(`Неизвестный элемент схемы: ${el.type}`);
  }
}

export function poseStyle({ x, y, rot }) {
  return `transform: translate(${x}px, ${y}px) rotate(${rot}deg)`;
}

export function renderScene(scene, pose) {
  const elements = scene.elements.map((el, i) => `<g data-el="${i}">${elementSVG(el)}</g>`).join('');
  const boat = scene.power ? powerSVG() : hullSVG() + boomSVG(pose.boom ?? 0);
  return `<svg viewBox="0 0 260 200" role="img" aria-label="${escapeXml(scene.label)}">`
    + '<rect class="svg-water" width="260" height="200"/>'
    + elements
    + (scene.wind === undefined ? ''
      : scene.mirrored ? windArrowSVG(scene.wind, SCENE_WIDTH - WIND_X, WIND_Y, 'left') : windArrowSVG(scene.wind, WIND_X, WIND_Y))
    + `<g class="boat" style="${poseStyle(pose)}">${boat}</g></svg>`;
}

export function applyPose(svg, scene, pose, stepIndex) {
  svg.querySelector('.boat').setAttribute('style', poseStyle(pose));
  svg.querySelector('.boom')?.setAttribute('style', boomStyle(pose.boom ?? 0));
  scene.elements.forEach((el, i) => {
    const node = svg.querySelector(`[data-el="${i}"]`);
    node.style.display = !el.steps || el.steps.includes(stepIndex) ? '' : 'none';
  });
}
