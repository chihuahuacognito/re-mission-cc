import { describe, it, expect } from 'vitest';
import { Graphics } from '../src/engine/Graphics.js';

describe('Graphics command buffer', () => {
  it('records commands in order', () => {
    const g = new Graphics();
    g.fillStyle(0xff0000, 1).fillCircle(10, 20, 5);
    expect(g.commands).toEqual([
      { op: 'fillStyle', color: 0xff0000, alpha: 1 },
      { op: 'fillCircle', x: 10, y: 20, r: 5 },
    ]);
  });

  it('clear() empties the buffer (redraw-each-frame pattern)', () => {
    const g = new Graphics();
    g.lineStyle(2, 0x00ff00, 1).strokeCircle(0, 0, 3);
    g.clear();
    expect(g.commands).toEqual([{ op: 'clear' }]);
  });

  it('is a DisplayObject with a local transform default', () => {
    const g = new Graphics();
    expect(g.scaleX).toBe(1);
    expect(g.depth).toBe(0);
    expect(typeof g.setDepth).toBe('function');
  });
});
