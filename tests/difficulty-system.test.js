import { describe, it, expect } from 'vitest';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';

describe('DifficultySystem', () => {
  it('starts neutral', () => {
    const d = new DifficultySystem();
    expect(d.enemySpeedMultiplier()).toBe(1);
    expect(d.assistRadius()).toBe(40);
  });

  it('eases (slower enemies, wider assist) when the player struggles', () => {
    const d = new DifficultySystem();
    for (let i = 0; i < 5; i++) d.recordWaveTime(20000, 8000); // way over target
    expect(d.enemySpeedMultiplier()).toBeLessThan(1);
    expect(d.enemySpeedMultiplier()).toBeGreaterThanOrEqual(0.4);
    expect(d.assistRadius()).toBeGreaterThan(40);
    expect(d.assistRadius()).toBeLessThanOrEqual(120);
  });

  it('never exposes a lose/game-over concept', () => {
    const d = new DifficultySystem();
    expect(d.isGameOver).toBeUndefined();
    expect(d.hasLost).toBeUndefined();
  });
});
