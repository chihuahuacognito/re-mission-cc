import { describe, it, expect } from 'vitest';
import { HuntTracker } from '../src/systems/HuntTracker.js';

describe('HuntTracker', () => {
  it('spawns until the field cap, then waits for room', () => {
    const t = new HuntTracker({ missionTotal: 12, maxConcurrent: 4 });
    expect(t.canSpawn(3)).toBe(true);
    expect(t.canSpawn(4)).toBe(false); // field is full
  });

  it('never spawns past missionTotal', () => {
    const t = new HuntTracker({ missionTotal: 2, maxConcurrent: 4 });
    t.nextHp();
    t.nextHp();
    expect(t.spawned()).toBe(2);
    expect(t.canSpawn(0)).toBe(false); // everything has already spawned
  });

  it('gives every twoHpEvery-th spawn 2 HP', () => {
    const t = new HuntTracker({ missionTotal: 8, maxConcurrent: 8, twoHpEvery: 4 });
    const hps = Array.from({ length: 8 }, () => t.nextHp());
    expect(hps).toEqual([1, 1, 1, 2, 1, 1, 1, 2]);
  });

  it('defaults to all 1-HP cells', () => {
    const t = new HuntTracker({ missionTotal: 4, maxConcurrent: 4 });
    expect([t.nextHp(), t.nextHp(), t.nextHp(), t.nextHp()]).toEqual([1, 1, 1, 1]);
  });

  it('completes when killed reaches missionTotal — the counter only ascends', () => {
    const t = new HuntTracker({ missionTotal: 3, maxConcurrent: 3 });
    t.recordKill();
    t.recordKill();
    expect(t.isComplete()).toBe(false);
    t.recordKill();
    expect(t.isComplete()).toBe(true);
    expect(t.killed()).toBe(3);
    expect(t.missionTotal()).toBe(3);
  });

  it('has no failure concept', () => {
    const t = new HuntTracker({ missionTotal: 3, maxConcurrent: 3 });
    expect(t.isGameOver).toBeUndefined();
    expect(t.hasLost).toBeUndefined();
  });
});
