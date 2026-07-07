import { describe, it, expect } from 'vitest';
import { Tweens } from '../src/engine/Tweens.js';

describe('Tweens', () => {
  it('linearly interpolates a prop and fires onComplete at the end', () => {
    const tw = new Tweens();
    const o = { x: 0 };
    let done = false;
    tw.add({ targets: o, x: 100, duration: 100, onComplete: () => { done = true; } });
    tw.update(50);
    expect(o.x).toBeCloseTo(50);
    expect(done).toBe(false);
    tw.update(50);
    expect(o.x).toBeCloseTo(100);
    expect(done).toBe(true);
  });

  it('yoyo returns to the start value then completes', () => {
    const tw = new Tweens();
    const o = { a: 0 };
    tw.add({ targets: o, a: 10, duration: 100, yoyo: true });
    tw.update(100); // forward -> 10
    expect(o.a).toBeCloseTo(10);
    tw.update(100); // back -> 0
    expect(o.a).toBeCloseTo(0);
  });

  it('repeat:-1 never completes', () => {
    const tw = new Tweens();
    const o = { a: 0 };
    let done = false;
    tw.add({ targets: o, a: 10, duration: 100, repeat: -1, onComplete: () => { done = true; } });
    for (let i = 0; i < 10; i++) tw.update(100);
    expect(done).toBe(false);
  });

  it('does not fire onComplete when the target is destroyed', () => {
    const tw = new Tweens();
    const o = { x: 0, destroyed: false };
    let done = false;
    tw.add({ targets: o, x: 100, duration: 100, onComplete: () => { done = true; } });
    o.destroyed = true;
    tw.update(100);
    expect(done).toBe(false);
  });

  it('clear() cancels without firing onComplete', () => {
    const tw = new Tweens();
    const o = { x: 0 };
    let done = false;
    tw.add({ targets: o, x: 100, duration: 100, onComplete: () => { done = true; } });
    tw.clear();
    tw.update(100);
    expect(done).toBe(false);
  });

  it('honours a delay before starting', () => {
    const tw = new Tweens();
    const o = { x: 0 };
    tw.add({ targets: o, x: 100, duration: 100, delay: 100 });
    tw.update(100); // still in delay
    expect(o.x).toBe(0);
    tw.update(100); // now runs full duration
    expect(o.x).toBeCloseTo(100);
  });
});
