// Geometry for the quote map's lawn box — a rectangle the customer can move,
// resize and rotate a full 360°. Pure maths in local metres (x east, y north),
// so it's testable under `node --test`; estimator.js converts to lat/lng.
//
// box = { cx, cy, w, h, angle }: centre, width and height in metres, and the
// direction the box's top faces, in degrees clockwise from north.

const RAD = Math.PI / 180;

export function normalizeAngle(a) {
  return ((a % 360) + 360) % 360;
}

// Unit vectors along the box's width (u) and height (v) at a given angle.
function axes(angle) {
  const a = angle * RAD;
  return { u: { x: Math.cos(a), y: -Math.sin(a) }, v: { x: Math.sin(a), y: Math.cos(a) } };
}

export function boxCorners({ cx, cy, w, h, angle }) {
  const { u, v } = axes(angle);
  const pt = (su, sv) => ({
    x: cx + (su * w) / 2 * u.x + (sv * h) / 2 * v.x,
    y: cy + (su * w) / 2 * u.y + (sv * h) / 2 * v.y
  });
  return { nw: pt(-1, 1), ne: pt(1, 1), se: pt(1, -1), sw: pt(-1, -1) };
}

// Where the rotate handle goes: past the middle of the top edge.
export function rotateHandlePoint({ cx, cy, h, angle }, offsetM) {
  const { v } = axes(angle);
  const d = h / 2 + offsetM;
  return { x: cx + d * v.x, y: cy + d * v.y };
}

// The box angle that points its top at `p` (dragging the rotate handle).
export function angleFromCenter({ cx, cy }, p) {
  return normalizeAngle(Math.atan2(p.x - cx, p.y - cy) / RAD);
}

const SIGNS = { nw: [-1, 1], ne: [1, 1], se: [1, -1], sw: [-1, -1] };
const OPPOSITE = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' };
const MIN_SIDE_M = 1;

// Drag one corner to `p`; the opposite corner stays put and the angle is
// unchanged. Clamped so the dragged corner can't cross over and flip the box.
export function resizeFromCorner(box, key, p) {
  const { u, v } = axes(box.angle);
  const fixed = boxCorners(box)[OPPOSITE[key]];
  const [su, sv] = SIGNS[key];
  const dx = p.x - fixed.x, dy = p.y - fixed.y;
  const du = su * Math.max(MIN_SIDE_M, su * (dx * u.x + dy * u.y));
  const dv = sv * Math.max(MIN_SIDE_M, sv * (dx * v.x + dy * v.y));
  return {
    cx: fixed.x + (du * u.x + dv * v.x) / 2,
    cy: fixed.y + (du * u.y + dv * v.y) / 2,
    w: Math.abs(du),
    h: Math.abs(dv),
    angle: box.angle
  };
}

// Angle (0–90°) that lines a box up with the block's longest boundary, so it
// starts square to the fences. `ring` is the block outline in local metres.
export function dominantAngle(ring) {
  let best = null;
  for (let i = 0; i < ring.length - 1; i++) {
    const dx = ring[i + 1].x - ring[i].x, dy = ring[i + 1].y - ring[i].y;
    const len = Math.hypot(dx, dy);
    if (!best || len > best.len) best = { len, bearing: Math.atan2(dx, dy) / RAD };
  }
  if (!best) return 0;
  // The box's width runs at (angle + 90°); align it with the edge, then fold
  // into 0–90 (a rectangle looks the same every quarter turn at the start).
  const a = normalizeAngle(best.bearing - 90) % 90;
  return a > 90 - 1e-9 ? 0 : a;
}

// Snap to the block's axes (blockAngle + k·90°) when within `tolerance`.
export function snapAngle(angle, blockAngle, tolerance = 3) {
  const a = normalizeAngle(angle);
  for (let k = 0; k < 4; k++) {
    const target = normalizeAngle(blockAngle + k * 90);
    const diff = Math.abs(((a - target + 540) % 360) - 180);
    if (diff <= tolerance) return Math.round(target * 1000) / 1000;
  }
  return a;
}
