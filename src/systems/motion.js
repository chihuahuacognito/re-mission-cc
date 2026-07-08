import { DISPLAY } from './CircularDisplay.js';

// Movement FEEL constants live here (single place to tune how drifting cells
// feel); per-level SPEEDS live in the level data files.
export const FOCUS_SLOW = 0.25;           // a locked cell drifts at 25% speed
export const WANDER_TURN_RAD_PER_S = 0.9; // max random heading drift per second
export const SPAWN_INTERVAL_MS = 1500;    // how often the field tops up toward maxConcurrent

const SAFE = { cx: DISPLAY.cx, cy: DISPLAY.cy, radius: DISPLAY.safe };

// One movement step for a drifting cell. Pure — returns a new mover.
// mover: { x, y, heading (radians), speed (px/s), radius (px) }
export function stepMover(mover, dtMs, {
  speedMultiplier = 1, focused = false, rand = Math.random, bounds = SAFE,
} = {}) {
  const dt = dtMs / 1000;
  let heading = mover.heading + (rand() * 2 - 1) * WANDER_TURN_RAD_PER_S * dt;
  const speed = mover.speed * speedMultiplier * (focused ? FOCUS_SLOW : 1);
  let x = mover.x + Math.cos(heading) * speed * dt;
  let y = mover.y + Math.sin(heading) * speed * dt;

  const maxR = bounds.radius - mover.radius;
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    // Clamp onto the boundary and turn back toward center (with jitter) so a
    // cell never leaves the safe circle and never sticks to the rim.
    x = bounds.cx + (dx / dist) * maxR;
    y = bounds.cy + (dy / dist) * maxR;
    heading = Math.atan2(bounds.cy - y, bounds.cx - x) + (rand() - 0.5) * 0.8;
  }
  return { ...mover, x, y, heading };
}

// Random position inside the safe circle (uniform over area), staying
// `avoid.minDist` away from `avoid` when possible (gives up after 20 tries so
// it can never loop forever).
export function spawnPosition(rand, cellRadius, avoid = null, bounds = SAFE) {
  const maxR = bounds.radius - cellRadius;
  let x = bounds.cx;
  let y = bounds.cy;
  for (let i = 0; i < 20; i++) {
    const r = Math.sqrt(rand()) * maxR;
    const a = rand() * Math.PI * 2;
    x = bounds.cx + Math.cos(a) * r;
    y = bounds.cy + Math.sin(a) * r;
    if (!avoid || Math.hypot(x - avoid.x, y - avoid.y) >= avoid.minDist) break;
  }
  return { x, y };
}
