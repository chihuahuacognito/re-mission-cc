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

describe('hunt levels', () => {
  const HUNT_IDS = ['l1', 'l2', 'l3'];

  it('l1–l3 are exactly one hunt beat + one resolution beat', () => {
    for (const id of HUNT_IDS) {
      const beats = getLevel(id).beats;
      expect(beats.length).toBe(2);
      expect(beats[0].type).toBe('hunt');
      expect(beats[1].type).toBe('resolution');
    }
  });

  it('hunt configs carry every field GameScene needs', () => {
    for (const id of HUNT_IDS) {
      const c = getLevel(id).beats[0].config;
      expect(c.missionTotal).toBeGreaterThan(0);
      expect(c.maxConcurrent).toBeGreaterThan(0);
      expect(c.healthyCount).toBeGreaterThan(0);
      expect(c.baseSpeed).toBeGreaterThan(0);
      expect(c.killTargetMs).toBeGreaterThan(0);
      expect(c.cellRadius).toBeGreaterThan(0);
      expect(c.twoHpEvery).toBeGreaterThanOrEqual(0);
      expect(typeof c.label).toBe('string');
    }
  });

  it('difficulty rises purely by drift speed L1 -> L3', () => {
    const speeds = HUNT_IDS.map((id) => getLevel(id).beats[0].config.baseSpeed);
    expect(speeds[0]).toBeLessThan(speeds[1]);
    expect(speeds[1]).toBeLessThan(speeds[2]);
  });
});
