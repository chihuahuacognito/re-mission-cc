import { describe, it, expect } from 'vitest';
import { DwellTracker } from '../src/input/DwellTracker.js';

describe('DwellTracker', () => {
  it('fills progress over dwellMs and completes once', () => {
    const d = new DwellTracker({ dwellMs: 1000 });
    expect(d.update(500, 'a').progress).toBeCloseTo(0.5);
    let r = d.update(500, 'a');
    expect(r.progress).toBe(1);
    expect(r.completed).toBe(true);
    // still hovering same target: does not re-complete
    expect(d.update(100, 'a').completed).toBe(false);
  });

  it('resets when the target changes or is null', () => {
    const d = new DwellTracker({ dwellMs: 1000 });
    d.update(600, 'a');
    expect(d.update(100, 'b').progress).toBeCloseTo(0.1);
    expect(d.update(100, null).progress).toBe(0);
  });
});
