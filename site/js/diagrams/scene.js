import { escapeXml, windArrowSVG } from './svg.js';
import { hullSVG, powerSVG, boomSVG, boomStyle } from './boat.js';

function elementSVG(el) {
  switch (el.type) {
    case 'quay': return `<rect class="quay" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}"/>`;
    case 'boat-moored': return `<g class="moored" transform="translate(${el.x} ${el.y}) rotate(${el.rot ?? 0}) scale(${el.scale ?? 1})">${hullSVG()}</g>`;
    case 'buoy': return `<circle class="buoy-dot" cx="${el.x}" cy="${el.y}" r="5"/>`;
    case 'anchor': return `<g class="anchor" transform="translate(${el.x} ${el.y})"><line x1="0" y1="-8" x2="0" y2="7"/><line x1="-4" y1="-4" x2="4" y2="-4"/><path d="M-7 2 Q0 12 7 2"/></g>`;
    case 'line': return `<polyline class="rope${el.dashed ? ' dashed' : ''}" points="${el.points.map((p) => p.join(',')).join(' ')}"/>`;
    case 'person': return `<g class="person" transform="translate(${el.x} ${el.y})"><circle r="6"/><circle class="head" r="2.5"/></g>`;
    case 'label': return `<text class="svg-label" x="${el.x}" y="${el.y}">${escapeXml(el.text)}</text>`;
    case 'path': return `<path class="track" d="${el.d}"/>`;
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
    + (scene.wind === undefined ? '' : windArrowSVG(scene.wind, 36, 30))
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
