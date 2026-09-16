import { escapeXml } from './svg.js';

const COLORS = { red: '#FF4A3D', green: '#3BE37A', white: '#F4F7F8', yellow: '#FFC83D' };

export function lightsSVG({ label, lights }) {
  const dots = lights.map(({ color, x, y }) =>
    `<circle cx="${x}" cy="${y}" r="16" fill="${COLORS[color]}" opacity=".18"/>`
    + `<circle cx="${x}" cy="${y}" r="8" fill="${COLORS[color]}"/>`).join('');
  return `<svg viewBox="0 0 200 120" role="img" aria-label="${escapeXml(label)}">`
    + `<rect width="200" height="120" fill="#07131B"/>${dots}</svg>`;
}
