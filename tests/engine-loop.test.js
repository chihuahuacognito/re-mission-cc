import { describe, it, expect } from 'vitest';
import { clampDelta } from '../src/engine/Loop.js';

describe('clampDelta', () => {
  it('clamps a spike to 50ms (prevents auto-firing an in-progress dwell)', () => {
    expect(clampDelta(1000)).toBe(50);
  });
  it('floors negatives to 0', () => {
    expect(clampDelta(-5)).toBe(0);
  });
  it('passes a normal frame through', () => {
    expect(clampDelta(16)).toBe(16);
  });
});
