const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// fromDeg - откуда дует ветер: 0 - сверху, 90 - справа. Стрелка показывает, куда дует.
// labelSide - с какой стороны от стрелки подпись: справа (обычно) или слева (в отражённой сцене).
export function windArrowSVG(fromDeg, x, y, labelSide = 'right') {
  const label = labelSide === 'left'
    ? `<text class="svg-label" x="${x - 14}" y="${y - 6}" text-anchor="end">ВЕТЕР</text>`
    : `<text class="svg-label" x="${x + 14}" y="${y - 6}">ВЕТЕР</text>`;
  return `<g class="wind" transform="translate(${x} ${y}) rotate(${fromDeg})">`
    + '<line x1="0" y1="-16" x2="0" y2="8"/><path d="M-6 4 L0 16 L6 4 Z"/></g>'
    + label;
}
