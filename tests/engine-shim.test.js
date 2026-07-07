import { describe, it, expect } from 'vitest';
import Phaser from '../src/engine/phaser-shim.js';

describe('Phaser shim', () => {
  it('exposes Scene, Game, AUTO, Scale, and Math.Distance.Between', () => {
    expect(typeof Phaser.Scene).toBe('function');
    expect(typeof Phaser.Game).toBe('function');
    expect('AUTO' in Phaser).toBe(true);
    expect(Phaser.Scale.FIT).toBeDefined();
    expect(Phaser.Scale.CENTER_BOTH).toBeDefined();
  });

  it('Math.Distance.Between matches euclidean distance', () => {
    expect(Phaser.Math.Distance.Between(0, 0, 3, 4)).toBe(5);
  });
});
