// Лодка нарисована носом вверх; (0,0) - центр вращения, мачта в (0,-7).
export function hullSVG() {
  return '<path class="hull" d="M0 -35 C16 -17 16 15 10 35 L-10 35 C-16 15 -16 -17 0 -35 Z"/>'
    + '<circle class="mast" cx="0" cy="-7" r="3"/>';
}

export function powerSVG() {
  return '<path class="hull" d="M0 -35 C12 -20 12 20 10 35 L-10 35 C-12 20 -12 -20 0 -35 Z"/>'
    + '<rect class="cabin" x="-6" y="-5" width="12" height="16" rx="2"/>';
}

// boom - угол гика в градусах: плюс - гик на левом борту, минус - на правом.
export function boomStyle(boom) {
  return `transform: translate(0px, -7px) rotate(${boom}deg)`;
}

export function boomSVG(boom) {
  return `<g class="boom" style="${boomStyle(boom)}"><line x1="0" y1="0" x2="0" y2="40"/></g>`;
}
