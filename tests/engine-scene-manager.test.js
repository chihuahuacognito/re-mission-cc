import { describe, it, expect } from 'vitest';
import { Scene } from '../src/engine/Scene.js';
import { SceneManager } from '../src/engine/SceneManager.js';
import { Tweens } from '../src/engine/Tweens.js';
import { Clock } from '../src/engine/Clock.js';
import { Textures } from '../src/engine/textures.js';

function makeManager(scenes) {
  const textures = new Textures();
  textures.register('k', { width: 10, height: 10 }, 10, 10);
  const tweens = new Tweens();
  const clock = new Clock();
  const mgr = new SceneManager({
    scenes, tweens, clock,
    camera: { main: {}, offsetX: 0, offsetY: 0 },
    input: { setDefaultCursor() {}, activePointer: {} },
    textures,
    renderer: { render() {} },
  });
  return { mgr, tweens, clock, textures };
}

describe('SceneManager', () => {
  it('defers the scene swap until step()', () => {
    class A extends Scene { constructor() { super('A'); } create() {} }
    class B extends Scene { constructor() { super('B'); } create() {} }
    const { mgr } = makeManager([new A(), new B()]);
    mgr.start('A'); mgr.step();
    expect(mgr.active.key).toBe('A');
    mgr.start('B');
    expect(mgr.active.key).toBe('A'); // not yet
    mgr.step();
    expect(mgr.active.key).toBe('B');
  });

  it('passes init data then runs create', () => {
    const order = [];
    class A extends Scene {
      constructor() { super('A'); }
      init(d) { order.push(['init', d.n]); }
      create() { order.push(['create']); }
    }
    const { mgr } = makeManager([new A()]);
    mgr.start('A', { n: 7 }); mgr.step();
    expect(order).toEqual([['init', 7], ['create']]);
  });

  it('teardown clears display list + tweens + timers but keeps textures', () => {
    class A extends Scene {
      constructor() { super('A'); }
      create() {
        this.add.image(0, 0, 'k');
        this.tweens.add({ targets: { v: 0 }, v: 1, duration: 100 });
        this.time.delayedCall(100, () => {});
      }
    }
    class B extends Scene { constructor() { super('B'); } create() {} }
    const { mgr, tweens, clock, textures } = makeManager([new A(), new B()]);
    mgr.start('A'); mgr.step();
    expect(mgr.displayList.length).toBe(1);
    mgr.start('B'); mgr.step();
    expect(mgr.displayList.length).toBe(0);
    expect(tweens._tweens.length).toBe(0);
    expect(clock._events.length).toBe(0);
    expect(textures.exists('k')).toBe(true); // survived
  });
});
