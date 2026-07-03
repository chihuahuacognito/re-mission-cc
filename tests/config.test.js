import { describe, it, expect } from 'vitest';
import { createGameConfig, GAME_WIDTH, GAME_HEIGHT } from '../src/config.js';

describe('createGameConfig', () => {
  it('uses the fixed slice resolution', () => {
    expect(GAME_WIDTH).toBe(720);
    expect(GAME_HEIGHT).toBe(720);
  });

  it('builds a config carrying the provided scene list', () => {
    const scenes = [{ key: 'A' }, { key: 'B' }];
    const cfg = createGameConfig(scenes);
    expect(cfg.width).toBe(GAME_WIDTH);
    expect(cfg.height).toBe(GAME_HEIGHT);
    expect(cfg.scene).toEqual(scenes);
    expect(cfg.physics.default).toBe('arcade');
  });
});
