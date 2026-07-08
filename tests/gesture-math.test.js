import { describe, it, expect } from 'vitest';
import {
  mapHandToGame,
  isPinching,
  PinchDebouncer,
  PINCH_THRESHOLD,
  PINCH_HOLD_FRAMES,
  CURSOR_LANDMARK,
  OFFSCREEN,
} from '../src/input/gestureMath.js';
import { DISPLAY } from '../src/systems/CircularDisplay.js';

// Build a 21-entry landmark array (MediaPipe hand model), then overwrite the
// indices a test cares about. Untouched entries sit at the origin.
function hand(overrides = {}) {
  const pts = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const [i, p] of Object.entries(overrides)) pts[i] = p;
  return pts;
}

function distToCenter({ x, y }) {
  return Math.hypot(x - DISPLAY.cx, y - DISPLAY.cy);
}

describe('mapHandToGame', () => {
  it('maps the center of the frame to the center of the canvas', () => {
    expect(mapHandToGame(0.5, 0.5)).toEqual({ x: 360, y: 360 });
  });

  it('mirrors X (selfie view): moving the real hand right moves the cursor right', () => {
    // normX < 0.5 is the hand toward the camera's left; mirrored it reads right.
    const left = mapHandToGame(0.4, 0.5);
    const right = mapHandToGame(0.6, 0.5);
    expect(left.x).toBeGreaterThan(360); // 1-0.4 = 0.6 -> 432
    expect(right.x).toBeLessThan(360); //  1-0.6 = 0.4 -> 288
    expect(left.x).toBe(432);
    expect(right.x).toBe(288);
  });

  it('does not mirror Y', () => {
    expect(mapHandToGame(0.5, 0.25).y).toBe(180);
    expect(mapHandToGame(0.5, 0.75).y).toBe(540);
  });

  it('clamps an off-frame hand onto the safe circle, never outside it', () => {
    // normX=1 -> mirrored 0 -> raw x=0, well left of the safe circle.
    const p = mapHandToGame(1, 0.5);
    expect(distToCenter(p)).toBeCloseTo(DISPLAY.safe, 6);
    expect(p).toEqual({ x: DISPLAY.cx - DISPLAY.safe, y: DISPLAY.cy });
  });

  it('clamps inputs outside [0,1] into the safe circle', () => {
    const p = mapHandToGame(1.5, -0.5);
    expect(distToCenter(p)).toBeLessThanOrEqual(DISPLAY.safe + 1e-6);
  });

  it('leaves a point already inside the safe circle unclamped', () => {
    const p = mapHandToGame(0.45, 0.5); // mirrored 0.55 -> x=396, dist 36
    expect(p.x).toBeCloseTo(396, 6);
    expect(p.y).toBe(360);
    expect(distToCenter(p)).toBeLessThan(DISPLAY.safe);
  });
});

describe('isPinching', () => {
  // wrist(0)->index-MCP(5) is the hand-size reference; thumb(4)/index(8) tips
  // are the pinch pair. Distances are 3D metric (worldLandmarks).
  const pinched = hand({
    0: { x: 0, y: 0, z: 0 },
    5: { x: 0.08, y: 0, z: 0 }, // hand size 0.08m
    4: { x: 0.10, y: 0, z: 0 },
    8: { x: 0.11, y: 0, z: 0 }, // tips 0.01m apart -> ratio 0.125
  });
  const open = hand({
    0: { x: 0, y: 0, z: 0 },
    5: { x: 0.08, y: 0, z: 0 },
    4: { x: 0.05, y: 0, z: 0 },
    8: { x: 0.05, y: 0.09, z: 0 }, // tips 0.09m apart -> ratio 1.125
  });

  it('returns true when the tips are close relative to hand size', () => {
    expect(isPinching(pinched)).toBe(true);
  });

  it('returns false when the tips are far apart', () => {
    expect(isPinching(open)).toBe(false);
  });

  it('is invariant to hand distance from the camera (uniform scale)', () => {
    const scale = (pts, k) => pts.map((p) => ({ x: p.x * k, y: p.y * k, z: p.z * k }));
    expect(isPinching(scale(pinched, 3))).toBe(true);
    expect(isPinching(scale(open, 3))).toBe(false);
  });

  it('is invariant to hand orientation (rigid rotation)', () => {
    // rotate 90deg in the xy-plane: (x,y,z) -> (-y,x,z). Distances preserved.
    const rot = (pts) => pts.map((p) => ({ x: -p.y, y: p.x, z: p.z }));
    expect(isPinching(rot(pinched))).toBe(true);
    expect(isPinching(rot(open))).toBe(false);
  });

  it('the threshold sits between the two example ratios', () => {
    expect(PINCH_THRESHOLD).toBeGreaterThan(0.125);
    expect(PINCH_THRESHOLD).toBeLessThan(1.125);
  });
});

describe('PinchDebouncer', () => {
  it('starts false', () => {
    expect(new PinchDebouncer().update(false)).toBe(false);
  });

  it('only flips to true after the raw state holds PINCH_HOLD_FRAMES frames', () => {
    const d = new PinchDebouncer();
    for (let i = 0; i < PINCH_HOLD_FRAMES - 1; i++) {
      expect(d.update(true)).toBe(false); // not yet
    }
    expect(d.update(true)).toBe(true); // the Nth consecutive frame flips it
  });

  it('rejects a single-frame flicker', () => {
    const d = new PinchDebouncer();
    expect(d.update(true)).toBe(false); // one stray frame
    expect(d.update(false)).toBe(false); // back to steady, never flipped
    expect(d.update(false)).toBe(false);
  });

  it('flips back to false symmetrically after a held release', () => {
    const d = new PinchDebouncer();
    for (let i = 0; i < PINCH_HOLD_FRAMES; i++) d.update(true);
    expect(d.update(true)).toBe(true);
    for (let i = 0; i < PINCH_HOLD_FRAMES - 1; i++) {
      expect(d.update(false)).toBe(true); // still latched
    }
    expect(d.update(false)).toBe(false);
  });
});

describe('no-tracking sentinel', () => {
  it('OFFSCREEN sits outside the safe circle so no target can match it', () => {
    expect(distToCenter(OFFSCREEN)).toBeGreaterThan(DISPLAY.safe);
  });

  it('CURSOR_LANDMARK is the index fingertip (8)', () => {
    expect(CURSOR_LANDMARK).toBe(8);
  });
});
