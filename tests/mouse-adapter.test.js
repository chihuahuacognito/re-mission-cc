import { describe, it, expect } from 'vitest';
import { MousePointerAdapter } from '../src/input/MousePointerAdapter.js';

describe('MousePointerAdapter', () => {
  it('reads world position and down-state from a Phaser input object', () => {
    const phaserInput = { activePointer: { worldX: 12, worldY: 34, isDown: true } };
    const adapter = new MousePointerAdapter(phaserInput);
    expect(adapter.getPosition()).toEqual({ x: 12, y: 34 });
    expect(adapter.isDown()).toBe(true);
  });
});
