import { describe, it, expect } from 'vitest';
import { computeDelta, CheckInStore } from '../src/clinical/CheckIn.js';

function memStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
  };
}

describe('computeDelta', () => {
  it('is post minus pre', () => {
    expect(computeDelta(2, 4)).toBe(2);
    expect(computeDelta(5, 3)).toBe(-2);
  });
});

describe('CheckInStore', () => {
  it('appends records with a computed delta and reads them back', () => {
    const store = new CheckInStore(memStorage());
    const rec = store.save({ pre: 2, post: 4, ts: 1000 });
    expect(rec).toEqual({ pre: 2, post: 4, delta: 2, ts: 1000, baseline: 'measured' });
    store.save({ pre: 3, post: 3, ts: 2000 });
    expect(store.all()).toHaveLength(2);
    expect(store.all()[1].delta).toBe(0);
  });

  it('records no delta and flags a placeholder baseline when pre is a stand-in', () => {
    const store = new CheckInStore(memStorage());
    const rec = store.save({ pre: 3, post: 5, ts: 1000, preIsPlaceholder: true });
    expect(rec.baseline).toBe('placeholder');
    expect(rec.delta).toBeNull();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(new CheckInStore(memStorage()).all()).toEqual([]);
  });
});
