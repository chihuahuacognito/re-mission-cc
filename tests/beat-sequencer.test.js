import { describe, it, expect } from 'vitest';
import { BeatSequencer } from '../src/systems/BeatSequencer.js';
import { level01 } from '../src/data/level01.js';

describe('level01 data', () => {
  it('contains every required slice beat in order', () => {
    const ids = level01.map((b) => b.type);
    expect(ids).toEqual([
      'onboarding', 'scan', 'wave', 'support', 'chemoAlly', 'boss', 'resolution',
    ]);
  });
});

describe('BeatSequencer', () => {
  it('walks beats and reports completion', () => {
    const seq = new BeatSequencer([{ id: 'x', type: 'scan' }, { id: 'y', type: 'boss' }]);
    expect(seq.current().id).toBe('x');
    expect(seq.advance().id).toBe('y');
    expect(seq.isFinished()).toBe(false);
    expect(seq.advance()).toBe(null);
    expect(seq.isFinished()).toBe(true);
    seq.reset();
    expect(seq.current().id).toBe('x');
  });
});
