import { escapeXml } from './svg.js';

const C = { red: '#D23A2F', green: '#1F8A4C', yellow: '#F2C230', black: '#1B1F24', white: '#F4F7F8', blue: '#2563B8' };

// bands - горизонтальные полосы сверху вниз, stripes - вертикальные слева направо,
// top - топовые фигуры сверху вниз.
export const MARK_SPECS = {
  port: { bands: ['red'], top: ['can'], topColor: 'red' },
  starboard: { bands: ['green'], top: ['cone-up'], topColor: 'green' },
  north: { bands: ['black', 'yellow'], top: ['cone-up', 'cone-up'], topColor: 'black' },
  south: { bands: ['yellow', 'black'], top: ['cone-down', 'cone-down'], topColor: 'black' },
  east: { bands: ['black', 'yellow', 'black'], top: ['cone-up', 'cone-down'], topColor: 'black' },
  west: { bands: ['yellow', 'black', 'yellow'], top: ['cone-down', 'cone-up'], topColor: 'black' },
  'isolated-danger': { bands: ['black', 'red', 'black'], top: ['sphere', 'sphere'], topColor: 'black' },
  'safe-water': { stripes: ['red', 'white', 'red', 'white'], top: ['sphere'], topColor: 'red' },
  special: { bands: ['yellow'], top: ['x-cross'], topColor: 'yellow' },
  'emergency-wreck': { stripes: ['blue', 'yellow', 'blue', 'yellow'], top: ['plus-cross'], topColor: 'yellow' },
};

const BODY = { x: 80, y: 60, w: 40, h: 50 };

function shape(kind, cy, color) {
  const fill = `fill="${C[color]}" stroke="${C.black}" stroke-width="1"`;
  switch (kind) {
    case 'cone-up': return `<path d="M90 ${cy + 8} L100 ${cy - 8} L110 ${cy + 8} Z" ${fill}/>`;
    case 'cone-down': return `<path d="M90 ${cy - 8} L100 ${cy + 8} L110 ${cy - 8} Z" ${fill}/>`;
    case 'can': return `<rect x="91" y="${cy - 8}" width="18" height="16" ${fill}/>`;
    case 'sphere': return `<circle cx="100" cy="${cy}" r="8" ${fill}/>`;
    case 'x-cross': return `<path d="M92 ${cy - 8} L108 ${cy + 8} M108 ${cy - 8} L92 ${cy + 8}" stroke="${C[color]}" stroke-width="4"/>`;
    case 'plus-cross': return `<path d="M100 ${cy - 9} V${cy + 9} M91 ${cy} H109" stroke="${C[color]}" stroke-width="4"/>`;
    default: throw new Error(`Неизвестная топовая фигура: ${kind}`);
  }
}

function body(spec) {
  const parts = spec.bands ?? spec.stripes;
  const vertical = Boolean(spec.stripes);
  const size = (vertical ? BODY.w : BODY.h) / parts.length;
  return parts.map((color, i) => (vertical
    ? `<rect x="${BODY.x + i * size}" y="${BODY.y}" width="${size}" height="${BODY.h}" fill="${C[color]}"/>`
    : `<rect x="${BODY.x}" y="${BODY.y + i * size}" width="${BODY.w}" height="${size}" fill="${C[color]}"/>`)).join('')
    + `<rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" fill="none" stroke="${C.black}"/>`;
}

export function markSVG(kind, label = kind) {
  const spec = MARK_SPECS[kind];
  if (!spec) throw new Error(`Неизвестный знак: ${kind}`);
  const slots = spec.top.length === 1 ? [40] : [20, 42];
  const tops = spec.top.map((t, i) => shape(t, slots[i], spec.topColor)).join('');
  return `<svg viewBox="0 0 200 120" role="img" aria-label="${escapeXml(label)}">`
    + '<rect width="200" height="120" fill="#DCEAF2"/>' // знаки - дневные средства: фон дневной в любой теме
    + `<line x1="100" y1="${slots[0] - 10}" x2="100" y2="${BODY.y}" stroke="${C.black}" stroke-width="2"/>`
    + `${tops}${body(spec)}`
    + '<rect x="0" y="106" width="200" height="14" fill="#1B5E86" opacity=".45"/></svg>';
}
