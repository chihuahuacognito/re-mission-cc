import { describe, it, expect } from 'vitest';
import { LEVELS, getLevel } from '../src/levels/index.js';

describe('level manifest', () => {
  it('has ftue first then l1,l2,l3 in ascending order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['ftue', 'l1', 'l2', 'l3']);
    expect(LEVELS.map((l) => l.order)).toEqual([0, 1, 2, 3]);
  });

  it('links unlocks in a chain', () => {
    expect(getLevel('ftue').unlockedBy).toBe(null);
    expect(getLevel('l1').unlockedBy).toBe('ftue');
    expect(getLevel('l2').unlockedBy).toBe('l1');
    expect(getLevel('l3').unlockedBy).toBe('l2');
  });

  it('gives playable levels a non-empty beats array ending in resolution', () => {
    for (const id of ['l1', 'l2', 'l3']) {
      const beats = getLevel(id).beats;
      expect(Array.isArray(beats)).toBe(true);
      expect(beats.length).toBeGreaterThan(0);
      expect(beats[beats.length - 1].type).toBe('resolution');
    }
  });

  it('returns null for an unknown id', () => {
    expect(getLevel('nope')).toBe(null);
  });
});
