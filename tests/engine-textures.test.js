import { describe, it, expect } from 'vitest';
import { Textures } from '../src/engine/textures.js';

describe('Textures store', () => {
  it('registers and looks up a texture with its frame size', () => {
    const t = new Textures();
    const fakeCanvas = { width: 64, height: 64 };
    t.register('cell', fakeCanvas, 64, 64);
    expect(t.exists('cell')).toBe(true);
    expect(t.get('cell').canvas).toBe(fakeCanvas);
    expect(t.getFrame('cell')).toEqual({ width: 64, height: 64 });
  });

  it('exists() is false for unknown keys', () => {
    expect(new Textures().exists('nope')).toBe(false);
  });

  it('getFrame throws a clear error for a missing key', () => {
    expect(() => new Textures().getFrame('ghost')).toThrow(/ghost/);
  });
});
