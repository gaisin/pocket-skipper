// Зеркалирование схем манёвров по стороне заброса кормы на заднем ходу.
// Базовый рисунок и текст - для случая «корму уводит влево»; для «вправо» - зеркальная копия.
export const SCENE_WIDTH = 260;

const SIDE_PAIR = /\[\[([^[\]|]+)\|([^[\]|]+)\]\]/g;

// «[[левым|правым]] бортом»: первый вариант - для «влево» и пока сторона не выбрана, второй - для «вправо».
export function resolveSides(text, walk) {
  return text.replace(SIDE_PAIR, (_, left, right) => (walk === 'right' ? right : left));
}

export function stripSidePairs(text) {
  return text.replace(SIDE_PAIR, '');
}

const round = (v) => Math.round(v * 1000) / 1000;
const flipX = (x) => round(SCENE_WIDTH - x);

export function mirrorPose(pose) {
  const out = { ...pose, x: flipX(pose.x), rot: 0 - pose.rot };
  if (pose.boom !== undefined) out.boom = 0 - pose.boom;
  return out;
}

// Только абсолютные команды M, L, Q, C, Z: у них все координаты - пары (x, y).
export function mirrorPath(d) {
  let isX = true;
  return d.replace(/[MLQCZ]|-?\d*\.?\d+/g, (token) => {
    if (/[MLQCZ]/.test(token)) {
      isX = true;
      return token;
    }
    const out = isX ? String(flipX(Number(token))) : token;
    isX = !isX;
    return out;
  });
}

function mirrorElement(el) {
  switch (el.type) {
    case 'quay': return { ...el, x: flipX(el.x + el.w) };
    case 'boat-moored': return { ...el, x: flipX(el.x), rot: 0 - (el.rot ?? 0) };
    case 'buoy':
    case 'anchor':
    case 'person': return { ...el, x: flipX(el.x) };
    case 'label': return { ...el, x: flipX(el.x), anchor: el.anchor === 'end' ? 'start' : 'end' };
    case 'line': return { ...el, points: el.points.map(([x, y]) => [flipX(x), y]) };
    case 'path': return { ...el, d: mirrorPath(el.d) };
    case 'arrow': return { ...el, x1: flipX(el.x1), x2: flipX(el.x2) };
    default: throw new Error(`Неизвестный элемент схемы: ${el.type}`);
  }
}

export function mirrorScene(scene) {
  return {
    ...scene,
    mirrored: !scene.mirrored,
    wind: scene.wind === undefined ? undefined : (360 - scene.wind) % 360,
    elements: scene.elements.map(mirrorElement),
  };
}

// Манёвр для выбранной стороны заброса: стороны в тексте подставлены, при «вправо» схема отражена.
export function maneuverFor(maneuver, walk) {
  if (!maneuver.mirror) return maneuver;
  const side = (text) => (text === undefined ? undefined : resolveSides(text, walk));
  const flip = walk === 'right';
  const scene = flip ? mirrorScene(maneuver.scene) : maneuver.scene;
  return {
    ...maneuver,
    title: side(maneuver.title),
    summary: side(maneuver.summary),
    scene: {
      ...scene,
      label: side(scene.label),
      elements: scene.elements.map((el) => (el.type === 'label' ? { ...el, text: side(el.text) } : el)),
    },
    steps: maneuver.steps.map((s) => ({
      ...s,
      who: side(s.who),
      command: side(s.command),
      text: side(s.text),
      pose: flip ? mirrorPose(s.pose) : s.pose,
    })),
  };
}
