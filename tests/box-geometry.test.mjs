import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxCorners, resizeFromCorner, angleFromCenter, rotateHandlePoint, dominantAngle, snapAngle } from '../assets/js/box-geometry.mjs';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const nearPt = (p, x, y, eps = 1e-6) => near(p.x, x, eps) && near(p.y, y, eps);

test('boxCorners at 0° is an axis-aligned rectangle', () => {
  const c = boxCorners({ cx: 0, cy: 0, w: 10, h: 4, angle: 0 });
  assert.ok(nearPt(c.nw, -5, 2) && nearPt(c.ne, 5, 2) && nearPt(c.se, 5, -2) && nearPt(c.sw, -5, -2));
});

test('boxCorners rotates clockwise from north', () => {
  // At 90° the box's "top" faces east, so its width now runs north–south.
  const c = boxCorners({ cx: 0, cy: 0, w: 10, h: 4, angle: 90 });
  assert.ok(nearPt(c.nw, 2, 5) && nearPt(c.ne, 2, -5) && nearPt(c.se, -2, -5) && nearPt(c.sw, -2, 5));
});

test('rotation keeps the side lengths (and so the area)', () => {
  const c = boxCorners({ cx: 3, cy: -7, w: 12, h: 5, angle: 37 });
  const len = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(near(len(c.nw, c.ne), 12) && near(len(c.ne, c.se), 5));
});

test('rotateHandlePoint sits beyond the top edge, in the box’s up direction', () => {
  const p0 = rotateHandlePoint({ cx: 0, cy: 0, w: 10, h: 4, angle: 0 }, 3);
  assert.ok(nearPt(p0, 0, 5)); // h/2 + 3 north of centre
  const p90 = rotateHandlePoint({ cx: 0, cy: 0, w: 10, h: 4, angle: 90 }, 3);
  assert.ok(nearPt(p90, 5, 0)); // now east of centre
});

test('angleFromCenter turns a handle position into a 0–360 bearing', () => {
  const box = { cx: 1, cy: 1, w: 4, h: 4, angle: 0 };
  assert.ok(near(angleFromCenter(box, { x: 1, y: 5 }), 0));
  assert.ok(near(angleFromCenter(box, { x: 5, y: 1 }), 90));
  assert.ok(near(angleFromCenter(box, { x: 1, y: -3 }), 180));
  assert.ok(near(angleFromCenter(box, { x: -3, y: 1 }), 270));
});

test('resizeFromCorner keeps the opposite corner fixed, even when rotated', () => {
  const box = { cx: 0, cy: 0, w: 10, h: 4, angle: 30 };
  const before = boxCorners(box);
  const target = { x: before.ne.x + 2, y: before.ne.y + 1 };
  const after = resizeFromCorner(box, 'ne', target);
  const corners = boxCorners(after);
  assert.ok(nearPt(corners.sw, before.sw.x, before.sw.y, 1e-9));
  assert.equal(after.angle, 30);
});

test('resizeFromCorner never flips the box inside out', () => {
  const box = { cx: 0, cy: 0, w: 10, h: 4, angle: 0 };
  // Drag the north-east corner right past the south-west one.
  const after = resizeFromCorner(box, 'ne', { x: -20, y: -20 });
  assert.ok(after.w >= 1 && after.h >= 1);
  const c = boxCorners(after);
  assert.ok(c.ne.x > c.sw.x && c.ne.y > c.sw.y);
});

test('dominantAngle lines the box up with the longest edge of the block', () => {
  const rect = [[0, 0], [30, 0], [30, 12], [0, 12], [0, 0]].map(([x, y]) => ({ x, y }));
  assert.ok(near(dominantAngle(rect), 0));
  const a = (25 * Math.PI) / 180;
  const rot = rect.map(({ x, y }) => ({ x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a) }));
  assert.ok(near(dominantAngle(rot), 25, 1e-6));
});

test('snapAngle pulls near-aligned angles onto the block’s axes, else leaves them', () => {
  assert.equal(snapAngle(92, 0), 90);
  assert.equal(snapAngle(358.5, 0), 0);
  assert.equal(snapAngle(27, 25), 25);
  assert.equal(snapAngle(40, 0), 40);
});
