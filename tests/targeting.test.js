import { describe, it, expect } from 'vitest';
import { selectTarget } from '../src/systems/targeting.js';

const T = (id, x, y, radius = 10) => ({ id, x, y, radius });

describe('selectTarget', () => {
  it('returns null when nothing is within assist radius', () => {
    expect(selectTarget({ x: 0, y: 0 }, [T('a', 500, 0)], 50)).toBe(null);
  });

  it('picks the nearest target by edge distance, allowing coarse aim', () => {
    const targets = [T('far', 200, 0, 10), T('near', 60, 0, 40)];
    // pointer at (0,0): near edge = 60-40=20; far edge = 200-10=190
    expect(selectTarget({ x: 0, y: 0 }, targets, 100)).toBe('near');
  });

  it('counts a pointer inside a hitbox as selected', () => {
    expect(selectTarget({ x: 5, y: 5 }, [T('a', 0, 0, 30)], 10)).toBe('a');
  });
});
