import { describe, it, expect } from 'vitest';
import { ProgressStore } from '../src/systems/ProgressStore.js';

function mem() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

describe('ProgressStore', () => {
  it('starts empty with only ftue unlocked (l1 gated on completing ftue)', () => {
    const p = new ProgressStore(mem());
    expect(p.completedIds()).toEqual([]);
    expect(p.isUnlocked('ftue')).toBe(true);   // no unlockedBy
    expect(p.isUnlocked('l1')).toBe(false);     // needs ftue
    expect(p.clearedCount()).toBe(0);
  });

  it('unlocks the next level when its prerequisite is completed', () => {
    const p = new ProgressStore(mem());
    p.markComplete('ftue');
    expect(p.isUnlocked('l1')).toBe(true);
    expect(p.isUnlocked('l2')).toBe(false);
    p.markComplete('l1');
    expect(p.isUnlocked('l2')).toBe(true);
    expect(p.clearedCount()).toBe(1);        // ftue not counted
  });

  it('is idempotent on repeated completion', () => {
    const p = new ProgressStore(mem());
    p.markComplete('l1'); p.markComplete('l1');
    expect(p.completedIds().filter((x) => x === 'l1')).toHaveLength(1);
  });
});
