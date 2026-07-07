import { describe, it, expect } from 'vitest';
import {
  stepMover, spawnPosition, FOCUS_SLOW, SPAWN_INTERVAL_MS,
} from '../src/systems/motion.js';

// Deterministic pseudo-random for reproducible tests.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const noTurn = () => 0.5; // rand()*2-1 === 0 -> heading never drifts

describe('stepMover', () => {
  it('moves along its heading at speed px/s', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 500, { rand: noTurn });
    expect(next.x).toBeCloseTo(410); // 100 px/s * 0.5s
    expect(next.y).toBeCloseTo(360);
  });

  it('does not mutate the input mover', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    stepMover(m, 500, { rand: noTurn });
    expect(m.x).toBe(360);
  });

  it('applies the difficulty speed multiplier', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 500, { rand: noTurn, speedMultiplier: 0.4 });
    expect(next.x).toBeCloseTo(380); // 100 * 0.4 * 0.5
  });

  it('focus-slows a locked cell to FOCUS_SLOW of its speed', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 1000, { rand: noTurn, focused: true });
    expect(next.x).toBeCloseTo(360 + 100 * FOCUS_SLOW);
  });

  it('keeps cells inside the safe circle and turns them back toward center', () => {
    // Start at the right edge heading straight out.
    const m = { x: 360 + 305, y: 360, heading: 0, speed: 200, radius: 20 };
    const next = stepMover(m, 1000, { rand: noTurn });
    const dist = Math.hypot(next.x - 360, next.y - 360);
    expect(dist).toBeLessThanOrEqual(330 - 20 + 0.001);
    expect(Math.cos(next.heading)).toBeLessThan(0); // now pointing back inward
  });
});

describe('spawnPosition', () => {
  it('always lands inside the safe circle', () => {
    const rand = lcg(42);
    for (let i = 0; i < 100; i++) {
      const p = spawnPosition(rand, 28);
      expect(Math.hypot(p.x - 360, p.y - 360)).toBeLessThanOrEqual(330 - 28 + 0.001);
    }
  });

  it('avoids the given point when asked', () => {
    const rand = lcg(7);
    for (let i = 0; i < 50; i++) {
      const p = spawnPosition(rand, 28, { x: 360, y: 360, minDist: 120 });
      expect(Math.hypot(p.x - 360, p.y - 360)).toBeGreaterThanOrEqual(120);
    }
  });
});

describe('feel constants', () => {
  it('spawns trickle gently (slower than one per second)', () => {
    expect(SPAWN_INTERVAL_MS).toBeGreaterThan(1000);
  });
});
