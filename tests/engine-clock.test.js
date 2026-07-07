import { describe, it, expect } from 'vitest';
import { Clock } from '../src/engine/Clock.js';

describe('Clock', () => {
  it('advances now by dt', () => {
    const c = new Clock();
    c.update(16);
    c.update(16);
    expect(c.now).toBe(32);
  });

  it('never fires the callback synchronously in addEvent', () => {
    const c = new Clock();
    let fired = 0;
    c.addEvent({ delay: 16, repeat: 0, callback: () => { fired += 1; } });
    expect(fired).toBe(0);
  });

  it('delayedCall fires exactly once after the delay', () => {
    const c = new Clock();
    let fired = 0;
    c.delayedCall(100, () => { fired += 1; });
    c.update(50);
    expect(fired).toBe(0);
    c.update(50);
    expect(fired).toBe(1);
    c.update(1000);
    expect(fired).toBe(1);
  });

  it('addEvent fires 1+repeat times, getRepeatCount counts down to 0', () => {
    const c = new Clock();
    const seen = [];
    const ev = c.addEvent({ delay: 16, repeat: 2, callback: () => seen.push(ev.getRepeatCount()) });
    for (let i = 0; i < 4; i++) c.update(16);
    expect(seen).toEqual([2, 1, 0]); // 3 fires total
  });

  it('clear() cancels pending events', () => {
    const c = new Clock();
    let fired = 0;
    c.delayedCall(16, () => { fired += 1; });
    c.clear();
    c.update(100);
    expect(fired).toBe(0);
  });
});
