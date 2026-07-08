import { describe, it, expect } from 'vitest';
import { HuntTracker } from '../src/systems/HuntTracker.js';
import { getLevel } from '../src/levels/index.js';

// Drives the same spawn/kill bookkeeping GameScene._updateHunt runs: fill the
// field to maxConcurrent up front, then every frame top up toward the cap while
// the player clears cells. Guards the reported bug — "goal says 12 but only 4
// ever appear, nothing respawns after the first 4 are cleared."
function simulateHunt(config, { killsPerSecond = 4, fps = 60 } = {}) {
  const tracker = new HuntTracker(config);
  let cells = 0;
  const initial = Math.min(config.maxConcurrent, config.missionTotal);
  for (let i = 0; i < initial; i++) { tracker.nextHp(); cells += 1; }

  const framesPerKill = Math.max(1, Math.round(fps / killsPerSecond));
  let peakConcurrent = cells;
  let clearedFieldThenRefilled = false;
  let frame = 0;
  while (!tracker.isComplete() && frame < 100000) {
    frame += 1;
    // every-frame refill (verbatim intent of _updateHunt)
    while (tracker.canSpawn(cells)) { tracker.nextHp(); cells += 1; }
    peakConcurrent = Math.max(peakConcurrent, cells);
    if (frame % framesPerKill === 0 && cells > 0) {
      cells -= 1;
      tracker.recordKill();
      if (cells === 0 && tracker.canSpawn(0)) clearedFieldThenRefilled = true;
    }
  }
  return { tracker, peakConcurrent, clearedFieldThenRefilled, cells };
}

describe('hunt refill — clearing the field respawns up to missionTotal', () => {
  for (const id of ['l1', 'l2', 'l3']) {
    const config = getLevel(id).beats.find((b) => b.type === 'hunt').config;
    it(`${id}: spawns all ${config.missionTotal} cells despite a cap of ${config.maxConcurrent}`, () => {
      const { tracker } = simulateHunt(config);
      expect(tracker.spawned()).toBe(config.missionTotal);
      expect(tracker.killed()).toBe(config.missionTotal);
      expect(tracker.isComplete()).toBe(true);
    });

    it(`${id}: respawns beyond the initial ${config.maxConcurrent} — not "only a few appear"`, () => {
      const { tracker } = simulateHunt(config);
      // If respawn were broken, spawned would stall at maxConcurrent.
      expect(tracker.spawned()).toBeGreaterThan(config.maxConcurrent);
    });

    it(`${id}: never exceeds the concurrent cap and never overspawns`, () => {
      const { peakConcurrent, tracker } = simulateHunt(config);
      expect(peakConcurrent).toBeLessThanOrEqual(config.maxConcurrent);
      expect(tracker.spawned()).toBeLessThanOrEqual(config.missionTotal);
    });
  }
});

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
