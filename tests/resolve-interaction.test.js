import { describe, it, expect } from 'vitest';
import { resolveInteraction } from '../src/systems/resolveInteraction.js';

const C = (id, x, y, radius = 26) => ({ id, x, y, radius });
const S = (id, x, y, radius = 44) => ({ id, x, y, radius });

describe('resolveInteraction', () => {
  it('returns both null when the pointer is over nothing', () => {
    const r = resolveInteraction({ x: 0, y: 0 }, [C('c1', 500, 500)], [S('s1', 500, 0)], 40);
    expect(r).toEqual({ supportId: null, targetId: null });
  });

  it('selects a cell target when only a cell is under the pointer', () => {
    const r = resolveInteraction({ x: 100, y: 100 }, [C('c1', 100, 100)], [S('s1', 500, 500)], 40);
    expect(r).toEqual({ supportId: null, targetId: 'c1' });
  });

  it('selects a support when only a support is under the pointer', () => {
    const r = resolveInteraction({ x: 100, y: 100 }, [C('c1', 500, 500)], [S('s1', 100, 100)], 40);
    expect(r).toEqual({ supportId: 's1', targetId: null });
  });

  it('picks the closer of a cell and support when both overlap the pointer (cell closer)', () => {
    const r = resolveInteraction({ x: 0, y: 0 }, [C('c1', 10, 0, 30)], [S('s1', 20, 0, 30)], 40);
    expect(r).toEqual({ supportId: null, targetId: 'c1' });
  });

  it('picks the closer of a cell and support when both overlap the pointer (support closer)', () => {
    const r = resolveInteraction({ x: 0, y: 0 }, [C('c1', 20, 0, 30)], [S('s1', 10, 0, 30)], 40);
    expect(r).toEqual({ supportId: 's1', targetId: null });
  });
});
