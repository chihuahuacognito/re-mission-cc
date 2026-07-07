import { describe, it, expect } from 'vitest';
import { ScoreSystem, BASE_POINTS, MAX_MULTIPLIER } from '../src/systems/ScoreSystem.js';

describe('ScoreSystem', () => {
  it('starts at zero score, x1 multiplier', () => {
    const s = new ScoreSystem();
    expect(s.state()).toEqual({ total: 0, multiplier: 1 });
  });

  it('scores 50 x multiplier per cancer hit, then increments the multiplier', () => {
    const s = new ScoreSystem();
    const first = s.hitCancer();
    expect(first.points).toBe(50);        // 50 x 1
    expect(first.total).toBe(50);
    expect(first.multiplier).toBe(2);     // new multiplier, for the HUD
    const second = s.hitCancer();
    expect(second.points).toBe(100);      // 50 x 2
    expect(second.total).toBe(150);
    expect(second.multiplier).toBe(3);
  });

  it('caps the multiplier at x8', () => {
    const s = new ScoreSystem();
    for (let i = 0; i < 20; i++) s.hitCancer();
    expect(s.state().multiplier).toBe(MAX_MULTIPLIER);
    const hit = s.hitCancer();
    expect(hit.points).toBe(BASE_POINTS * MAX_MULTIPLIER); // 400
    expect(hit.multiplier).toBe(MAX_MULTIPLIER);
  });

  it('healthy hit resets the multiplier to x1 but never touches the total', () => {
    const s = new ScoreSystem();
    s.hitCancer();
    s.hitCancer();
    const before = s.state().total;
    s.hitHealthy();
    expect(s.state()).toEqual({ total: before, multiplier: 1 });
  });

  it('has no time-decay API — the combo waits patiently', () => {
    const s = new ScoreSystem();
    expect(s.tick).toBeUndefined();
    expect(s.decay).toBeUndefined();
  });
});
