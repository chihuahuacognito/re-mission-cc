import { describe, it, expect } from 'vitest';
import { GameFlow } from '../src/systems/GameFlow.js';

describe('GameFlow', () => {
  it('advances through beats and eases difficulty on slow waves', () => {
    const beats = [
      { id: 'w', type: 'wave', config: { targetMs: 5000 } },
      { id: 'b', type: 'boss', config: {} },
    ];
    const flow = new GameFlow(beats);
    expect(flow.current().id).toBe('w');
    const next = flow.onBeatComplete(9000); // slow wave -> struggle up
    expect(next.id).toBe('b');
    expect(flow.difficulty.enemySpeedMultiplier()).toBeLessThan(1);
  });

  it('returns null after the last beat', () => {
    const flow = new GameFlow([{ id: 'x', type: 'resolution', config: {} }]);
    expect(flow.onBeatComplete(0)).toBe(null);
  });
});
