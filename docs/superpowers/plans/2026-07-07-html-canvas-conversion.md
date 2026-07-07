# Buildless HTML/Canvas Conversion Implementation Plan

**Date**: 2026-07-07
**Content Type**: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phaser 3 with a small dependency-free retained-mode Canvas 2D harness (`src/engine/`) plus a `Phaser`-shaped shim, so the game runs as a buildless static-served HTML project with every behaviour and visual intact, per `docs/superpowers/specs/2026-07-07-html-canvas-conversion-design.md`.

**Architecture:** A retained-mode harness (display list, per-frame redraw) exposes exactly the Phaser API the code uses; one `phaser-shim.js` default-exports a `Phaser`-shaped facade backed by the harness. The 7 Phaser-importing files change only their import *source*; all scene/system/logic bodies stay identical. Pure engine logic is unit-tested with Vitest; DOM/rendering is gated by a `node --check` parse pass and a manual browser playtest.

**Tech Stack:** Plain JavaScript ES modules, Canvas 2D, Vitest. No Phaser, no Vite, no bundler, no new runtime dependencies.

## Global Constraints

- **Keep everything intact.** No gameplay/visual/therapeutic-behaviour change. This is a port.
- **The logic layer, all of `src/systems/`, `src/input/`, `src/levels/`, `src/clinical/`, `src/config.js`, and everything in `tests/` are NOT edited.** The only non-engine edits are the import-source line in `src/main.js` + the 6 scenes, `index.html`, `package.json`, and docs.
- **The 55 existing unit tests must stay green at every task.** Run `npm test` — expect `Tests 55 passed` (plus any new engine tests).
- **API surface is fixed** (from the spec's audit): implement exactly what the code calls, no more, no less.
- **Correctness requirements** (spec §"Correctness requirements") are mandatory: single-source sizing (`scaleX/scaleY` canonical, `displayWidth/scale` derived); clamp per-frame `dt` ≤ 50 ms; pointer exposes `worldX/worldY/isDown`; one persistent pointer, `mouseup` on `window`, never reset `isDown` on scene change; teardown clears display list/tweens/timers but NOT textures/sound/cache; deferred scene swap; `addEvent` fires `1+repeat` times, `getRepeatCount()` counts down to 0, never fires synchronously; camera shake render-only + reset each frame, excluded from pointer coords; Image/Circle origin 0.5, Text origin 0,0; stable depth sort by `(depth, seq)`; Graphics is a replayable command buffer under a local transform; Circle `fillAlpha` distinct from `alpha`; cancelling a tween does NOT fire `onComplete`; destroyed tween targets are dropped without `onComplete`; unknown eases fall back to Linear.
- Node 18+. Shell is PowerShell 5.1: no `&&` chaining; run commands singly or separate with `;`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- In this dev environment subagents cannot `git commit` (permission-blocked): subagents `git add` only and report; the controller session commits.

## File map (new engine modules under `src/engine/`)

| File | Responsibility | Test gate |
| --- | --- | --- |
| `color.js` | `colorToRgba(int, alpha)` | unit |
| `geometry.js` | `distanceBetween(x1,y1,x2,y2)` | unit |
| `objects.js` | `DisplayObject`, `Image`, `Text`, `Circle` (sizing/origin/destroy) | unit |
| `Tweens.js` | tween manager | unit |
| `Clock.js` | timers/`now` | unit |
| `Camera.js` | shake offset | unit |
| `textures.js` | texture store + `createCanvas` | unit (store) + browser |
| `Graphics.js` | command-buffer graphics | unit (buffer) + browser |
| `InputManager.js` | `clientToGame` + DOM pointer | unit (map) + browser |
| `Renderer.js` | draw display list | parse + browser |
| `Scene.js` / `SceneManager.js` | lifecycle, teardown, deferred swap | unit (teardown) + browser |
| `Loop.js` | RAF loop + `clampDelta` | unit (clamp) + browser |
| `phaser-shim.js` | `Phaser` facade + bootstrap | unit (Distance) + browser |

---

### Task 1: color + geometry primitives

**Files:**
- Create: `src/engine/color.js`, `src/engine/geometry.js`
- Test: `tests/engine-primitives.test.js`

**Interfaces:**
- Produces: `colorToRgba(colorInt, alpha = 1) -> string` (e.g. `colorToRgba(0xff0000, 0.5) === 'rgba(255,0,0,0.5)'`); `distanceBetween(x1,y1,x2,y2) -> number`.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-primitives.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { colorToRgba } from '../src/engine/color.js';
import { distanceBetween } from '../src/engine/geometry.js';

describe('colorToRgba', () => {
  it('converts 0xRRGGBB + alpha to an rgba() string', () => {
    expect(colorToRgba(0xff0000, 1)).toBe('rgba(255,0,0,1)');
    expect(colorToRgba(0x00ff00, 0.5)).toBe('rgba(0,255,0,0.5)');
    expect(colorToRgba(0x7fe7ff)).toBe('rgba(127,231,255,1)');
  });
});

describe('distanceBetween', () => {
  it('is the euclidean distance', () => {
    expect(distanceBetween(0, 0, 3, 4)).toBe(5);
    expect(distanceBetween(10, 10, 10, 10)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-primitives.test.js`
Expected: FAIL — cannot resolve `../src/engine/color.js`.

- [ ] **Step 3: Write the implementations**

Create `src/engine/color.js`:

```js
// Convert a Phaser-style 0xRRGGBB integer + alpha into a CSS rgba() string.
export function colorToRgba(colorInt, alpha = 1) {
  const r = (colorInt >> 16) & 0xff;
  const g = (colorInt >> 8) & 0xff;
  const b = colorInt & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
```

Create `src/engine/geometry.js`:

```js
// Replacement for Phaser.Math.Distance.Between.
export function distanceBetween(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-primitives.test.js`
Expected: PASS (2 describes, 3 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/engine/color.js src/engine/geometry.js tests/engine-primitives.test.js
git commit -m "feat(engine): color + geometry primitives for the Canvas harness"
```

---

### Task 2: Display objects (sizing / origin / destroy)

**Files:**
- Create: `src/engine/objects.js`
- Test: `tests/engine-objects.test.js`

**Interfaces:**
- Produces:
  - `class DisplayObject` — fields `x, y, depth=0, alpha=1, scaleX=1, scaleY=1, visible=true, originX=0.5, originY=0.5, destroyed=false, seq` (monotonic); methods `setDepth/setAlpha/setPosition/setOrigin/setVisible/destroy` (chainable); accessor `scale` (get→`scaleX`, set→both); `destroy()` sets `destroyed=true` and calls `this._onDestroy?.(this)`.
  - `class Image extends DisplayObject` — ctor `(x, y, key, frameWidth, frameHeight)`; `setTexture(key)`; `setDisplaySize(w,h)`; accessors `displayWidth` (`frameWidth*scaleX` / inverse), `displayHeight`.
  - `class Text extends DisplayObject` — ctor `(x, y, text, style)`; origin defaults `0,0`; `setText(str)`.
  - `class Circle extends DisplayObject` — ctor `(x, y, radius, fillColor, fillAlpha=1)`; origin `0.5`.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-objects.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { DisplayObject, Image, Text, Circle } from '../src/engine/objects.js';

describe('Image sizing — single source of truth', () => {
  it('setDisplaySize sets scale from the native frame size', () => {
    const img = new Image(0, 0, 'k', 64, 64);
    img.setDisplaySize(32, 32);
    expect(img.scaleX).toBe(0.5);
    expect(img.displayWidth).toBe(32);
    expect(img.scale).toBe(0.5);
  });

  it('displayWidth and scale round-trip through the same state', () => {
    const img = new Image(0, 0, 'k', 96, 96);
    img.displayWidth = 48;               // set via displayWidth
    expect(img.scaleX).toBe(0.5);
    img.scale = 2;                        // set via scale → both axes
    expect(img.displayWidth).toBe(192);
    expect(img.displayHeight).toBe(192);
  });

  it('setTexture changes the key', () => {
    const img = new Image(0, 0, 'a', 96, 96).setTexture('b');
    expect(img.key).toBe('b');
  });
});

describe('origins', () => {
  it('Image and Circle default to centre; Text to top-left', () => {
    expect(new Image(0, 0, 'k', 10, 10).originX).toBe(0.5);
    expect(new Circle(0, 0, 5, 0xffffff).originX).toBe(0.5);
    const t = new Text(0, 0, 'hi', {});
    expect(t.originX).toBe(0);
    expect(t.originY).toBe(0);
  });
});

describe('destroy', () => {
  it('flags destroyed and fires the onDestroy hook', () => {
    let hit = null;
    const o = new DisplayObject(1, 2);
    o._onDestroy = (self) => { hit = self; };
    o.destroy();
    expect(o.destroyed).toBe(true);
    expect(hit).toBe(o);
  });

  it('gives every object a monotonic seq', () => {
    const a = new DisplayObject();
    const b = new DisplayObject();
    expect(b.seq).toBeGreaterThan(a.seq);
  });
});

describe('Circle fillAlpha is distinct from alpha', () => {
  it('keeps the ctor fill alpha separate from the object alpha', () => {
    const c = new Circle(0, 0, 4, 0xff0000, 0.9);
    expect(c.fillAlpha).toBe(0.9);
    expect(c.alpha).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-objects.test.js`
Expected: FAIL — cannot resolve `../src/engine/objects.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/objects.js`:

```js
let SEQ = 0;

export class DisplayObject {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.depth = 0;
    this.alpha = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.visible = true;
    this.originX = 0.5;
    this.originY = 0.5;
    this.destroyed = false;
    this.seq = SEQ++;
    this._onDestroy = null;
  }

  setDepth(d) { this.depth = d; return this; }
  setAlpha(a) { this.alpha = a; return this; }
  setPosition(x, y) { this.x = x; this.y = y; return this; }
  setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; }
  setVisible(v) { this.visible = v; return this; }

  // scale is an alias over the canonical scaleX/scaleY (spec: single source).
  get scale() { return this.scaleX; }
  set scale(v) { this.scaleX = v; this.scaleY = v; }

  destroy() {
    this.destroyed = true;
    if (this._onDestroy) this._onDestroy(this);
  }
}

export class Image extends DisplayObject {
  constructor(x, y, key, frameWidth, frameHeight) {
    super(x, y);
    this.key = key;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
  }

  // Our only setTexture use (cancer -> cancerCracked) keeps the same 96x96
  // frame, so display size is preserved; frame stays as constructed.
  setTexture(key) { this.key = key; return this; }

  setDisplaySize(w, h) {
    this.scaleX = w / this.frameWidth;
    this.scaleY = h / this.frameHeight;
    return this;
  }

  get displayWidth() { return this.frameWidth * this.scaleX; }
  set displayWidth(v) { this.scaleX = v / this.frameWidth; }
  get displayHeight() { return this.frameHeight * this.scaleY; }
  set displayHeight(v) { this.scaleY = v / this.frameHeight; }
}

export class Text extends DisplayObject {
  constructor(x, y, text, style) {
    super(x, y);
    this.originX = 0; // Phaser Text default origin is top-left.
    this.originY = 0;
    this.text = String(text);
    this.style = style || {};
  }

  setText(str) { this.text = String(str); return this; }
}

export class Circle extends DisplayObject {
  constructor(x, y, radius, fillColor, fillAlpha = 1) {
    super(x, y);
    this.radius = radius;
    this.fillColor = fillColor;
    this.fillAlpha = fillAlpha; // distinct from the object's alpha
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-objects.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/objects.js tests/engine-objects.test.js
git commit -m "feat(engine): display objects with single-source sizing + origin rules"
```

---

### Task 3: Tween manager

**Files:**
- Create: `src/engine/Tweens.js`
- Test: `tests/engine-tweens.test.js`

**Interfaces:**
- Produces: `class Tweens` with `add(config) -> tween`, `update(dtMs)`, `clear()`. Config: `targets` (object or array), `duration`, `ease` (`'Sine.out'|'Sine.inOut'|'Sine.in'|undefined`), `yoyo`, `delay`, `repeat` (`-1`=infinite), `onComplete`, plus any numeric props to tween. `clear()` empties without firing `onComplete`. Destroyed targets drop the tween without firing `onComplete`.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-tweens.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-tweens.test.js`
Expected: FAIL — cannot resolve `../src/engine/Tweens.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/Tweens.js`:

```js
const EASES = {
  Linear: (k) => k,
  'Sine.in': (k) => 1 - Math.cos((k * Math.PI) / 2),
  'Sine.out': (k) => Math.sin((k * Math.PI) / 2),
  'Sine.inOut': (k) => -(Math.cos(Math.PI * k) - 1) / 2,
};
function easeFn(name) { return EASES[name] || EASES.Linear; }

const RESERVED = new Set(['targets', 'duration', 'ease', 'yoyo', 'delay', 'repeat', 'onComplete', 'hold']);

export class Tweens {
  constructor() { this._tweens = []; }

  add(cfg) {
    const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
    const props = {};
    for (const k in cfg) if (!RESERVED.has(k)) props[k] = cfg[k];
    const tw = {
      targets, props,
      duration: cfg.duration || 0,
      ease: easeFn(cfg.ease),
      yoyo: !!cfg.yoyo,
      delayLeft: cfg.delay || 0,
      repeat: cfg.repeat || 0,
      remaining: cfg.repeat || 0,
      onComplete: cfg.onComplete,
      elapsed: 0,
      dir: 1,
      from: null,
      done: false,
    };
    this._tweens.push(tw);
    return tw;
  }

  update(dt) {
    for (const tw of this._tweens) {
      if (tw.done) continue;
      if (tw.targets.some((t) => t && t.destroyed)) { tw.done = true; continue; } // no onComplete
      if (tw.delayLeft > 0) { tw.delayLeft -= dt; continue; }
      if (!tw.from) tw.from = tw.targets.map((t) => { const o = {}; for (const p in tw.props) o[p] = t[p]; return o; });

      tw.elapsed += dt;
      const k = tw.duration > 0 ? Math.min(1, tw.elapsed / tw.duration) : 1;
      const e = tw.ease(k);
      const f = tw.dir === 1 ? e : 1 - e;
      tw.targets.forEach((t, i) => {
        for (const p in tw.props) { const a = tw.from[i][p]; t[p] = a + (tw.props[p] - a) * f; }
      });

      if (k >= 1) {
        if (tw.yoyo && tw.dir === 1) { tw.dir = -1; tw.elapsed = 0; }
        else if (tw.repeat === -1 || tw.remaining > 0) {
          if (tw.repeat !== -1) tw.remaining -= 1;
          tw.elapsed = 0; tw.dir = 1;
        } else {
          // settle exactly on the final values, then complete
          tw.targets.forEach((t, i) => { for (const p in tw.props) t[p] = tw.dir === 1 ? tw.props[p] : tw.from[i][p]; });
          tw.done = true;
          if (tw.onComplete) tw.onComplete();
        }
      }
    }
    this._tweens = this._tweens.filter((t) => !t.done);
  }

  clear() { this._tweens = []; } // teardown: never fires onComplete
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-tweens.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Tweens.js tests/engine-tweens.test.js
git commit -m "feat(engine): tween manager (easing, yoyo, repeat, delay, safe teardown)"
```

---

### Task 4: Clock / timers

**Files:**
- Create: `src/engine/Clock.js`
- Test: `tests/engine-clock.test.js`

**Interfaces:**
- Produces: `class Clock` with `now` (ms, advanced by `update`), `update(dtMs)`, `delayedCall(ms, cb) -> event`, `addEvent({delay, repeat=0, callback}) -> event`, `clear()`. Event exposes `getRepeatCount()`. `addEvent` fires `1+repeat` times, `getRepeatCount()` counts down to 0, and NEVER fires synchronously inside `addEvent`.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-clock.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-clock.test.js`
Expected: FAIL — cannot resolve `../src/engine/Clock.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/Clock.js`:

```js
export class Clock {
  constructor() {
    this.now = 0;
    this._events = [];
  }

  update(dt) {
    this.now += dt;
    for (const ev of this._events) {
      if (ev.removed) continue;
      ev._acc += dt;
      // Fire per elapsed delay; getRepeatCount() returns remaining repeats.
      while (!ev.removed && (ev.delay <= 0 || ev._acc >= ev.delay)) {
        if (ev.delay > 0) ev._acc -= ev.delay;
        ev.callback();
        if (ev._remaining <= 0) ev.removed = true;
        else ev._remaining -= 1;
        if (ev.delay <= 0) break; // zero-delay one-shot guard
      }
    }
    this._events = this._events.filter((e) => !e.removed);
  }

  addEvent({ delay, repeat = 0, callback }) {
    const ev = {
      delay, _remaining: repeat, _acc: 0, removed: false, callback,
      getRepeatCount() { return this._remaining; },
    };
    this._events.push(ev);
    return ev;
  }

  delayedCall(ms, cb) { return this.addEvent({ delay: ms, repeat: 0, callback: cb }); }

  clear() { this._events = []; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-clock.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Clock.js tests/engine-clock.test.js
git commit -m "feat(engine): clock/timers with Phaser addEvent repeat semantics"
```

---

### Task 5: Camera shake

**Files:**
- Create: `src/engine/Camera.js`
- Test: `tests/engine-camera.test.js`

**Interfaces:**
- Produces: `class Camera` ctor `({ width = 720, rand = Math.random } = {})`; fields `offsetX`, `offsetY` (0 when idle); `main` (returns `this`, so `cameras.main.shake` works); `shake(ms, intensity)`; `update(dtMs)`. Offset magnitude ≤ `intensity * width`; resets to 0 after the duration; never accumulates.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-camera.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { Camera } from '../src/engine/Camera.js';

describe('Camera shake', () => {
  it('offset stays within intensity*width while shaking, zero when idle', () => {
    const cam = new Camera({ width: 720, rand: () => 1 });
    expect(cam.offsetX).toBe(0);
    cam.shake(100, 0.01);
    cam.update(16);
    expect(Math.abs(cam.offsetX)).toBeLessThanOrEqual(0.01 * 720 + 1e-9);
    expect(Math.abs(cam.offsetY)).toBeLessThanOrEqual(0.01 * 720 + 1e-9);
  });

  it('resets to zero after the duration elapses', () => {
    const cam = new Camera({ width: 720, rand: () => 1 });
    cam.shake(100, 0.01);
    cam.update(200);
    expect(cam.offsetX).toBe(0);
    expect(cam.offsetY).toBe(0);
  });

  it('exposes itself as .main for cameras.main.shake', () => {
    const cam = new Camera();
    expect(cam.main).toBe(cam);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-camera.test.js`
Expected: FAIL — cannot resolve `../src/engine/Camera.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/Camera.js`:

```js
export class Camera {
  constructor({ width = 720, rand = Math.random } = {}) {
    this._width = width;
    this._rand = rand;
    this.offsetX = 0;
    this.offsetY = 0;
    this._dur = 0;
    this._t = 0;
    this._intensity = 0;
  }

  // So scenes can call this.cameras.main.shake(...).
  get main() { return this; }

  shake(ms, intensity) { this._dur = ms; this._t = 0; this._intensity = intensity; }

  update(dt) {
    if (this._t < this._dur) {
      this._t += dt;
      const decay = Math.max(0, 1 - this._t / this._dur);
      const mag = this._intensity * this._width * decay;
      this.offsetX = (this._rand() * 2 - 1) * mag;
      this.offsetY = (this._rand() * 2 - 1) * mag;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-camera.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Camera.js tests/engine-camera.test.js
git commit -m "feat(engine): render-only camera shake (bounded, self-resetting)"
```

---

### Task 6: Texture store

**Files:**
- Create: `src/engine/textures.js`
- Test: `tests/engine-textures.test.js`

**Interfaces:**
- Produces: `class Textures` with `register(key, canvas, frameWidth, frameHeight)`, `exists(key) -> bool`, `get(key) -> { canvas, width, height }`, `getFrame(key) -> { width, height }` (throws a clear error if missing), `createCanvas(key, w, h) -> { getContext(), refresh() }`. `createCanvas` allocates an offscreen canvas via `document.createElement` and registers it; browser-only, so it is NOT unit-tested here (covered by the browser boot). The store bookkeeping IS unit-tested with a fake canvas.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-textures.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-textures.test.js`
Expected: FAIL — cannot resolve `../src/engine/textures.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/textures.js`:

```js
export class Textures {
  constructor() { this._map = new Map(); }

  register(key, canvas, frameWidth, frameHeight) {
    this._map.set(key, { canvas, width: frameWidth, height: frameHeight });
  }

  exists(key) { return this._map.has(key); }

  get(key) { return this._map.get(key); }

  getFrame(key) {
    const t = this._map.get(key);
    if (!t) throw new Error(`Texture not found: ${key}`);
    return { width: t.width, height: t.height };
  }

  // Browser-only: allocates an offscreen canvas the caller draws into,
  // mirroring Phaser's textures.createCanvas(...).getContext()/refresh().
  createCanvas(key, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.register(key, canvas, w, h);
    const ctx = canvas.getContext('2d');
    return { getContext: () => ctx, refresh: () => {} };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-textures.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/textures.js tests/engine-textures.test.js
git commit -m "feat(engine): texture store + offscreen createCanvas"
```

---

### Task 7: Graphics command buffer

**Files:**
- Create: `src/engine/Graphics.js`
- Test: `tests/engine-graphics.test.js`

**Interfaces:**
- Produces: `class Graphics extends DisplayObject` recording an ordered command buffer. Methods (all chainable, all pushing a command): `clear()`, `fillStyle(color, alpha)`, `lineStyle(width, color, alpha)`, `fillCircle(x,y,r)`, `strokeCircle(x,y,r)`, `fillRoundedRect(x,y,w,h,radius)`, `strokeRoundedRect(x,y,w,h,radius)`, `lineBetween(x1,y1,x2,y2)`, `beginPath()`, `moveTo(x,y)`, `lineTo(x,y)`, `arc(x,y,r,a0,a1,acw)`, `strokePath()`. Plus `generateTexture(key, w, h)` (browser-only: rasterises the buffer to an offscreen canvas and registers it via the injected `_textures`). Exposes `commands` (array) for testing; `clear()` empties it.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-graphics.test.js`:

```js
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
```

Note: `clear()` records a `{op:'clear'}` sentinel then resets the array to just that sentinel, so the renderer's replay starts clean each frame while the array is never empty mid-record.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-graphics.test.js`
Expected: FAIL — cannot resolve `../src/engine/Graphics.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/Graphics.js`:

```js
import { DisplayObject } from './objects.js';
import { colorToRgba } from './color.js';

export class Graphics extends DisplayObject {
  constructor() {
    super(0, 0);
    this.commands = [];
    this._textures = null; // injected by the add.graphics factory
  }

  clear() { this.commands = [{ op: 'clear' }]; return this; }
  fillStyle(color, alpha = 1) { this.commands.push({ op: 'fillStyle', color, alpha }); return this; }
  lineStyle(width, color, alpha = 1) { this.commands.push({ op: 'lineStyle', width, color, alpha }); return this; }
  fillCircle(x, y, r) { this.commands.push({ op: 'fillCircle', x, y, r }); return this; }
  strokeCircle(x, y, r) { this.commands.push({ op: 'strokeCircle', x, y, r }); return this; }
  fillRoundedRect(x, y, w, h, radius) { this.commands.push({ op: 'fillRoundedRect', x, y, w, h, radius }); return this; }
  strokeRoundedRect(x, y, w, h, radius) { this.commands.push({ op: 'strokeRoundedRect', x, y, w, h, radius }); return this; }
  lineBetween(x1, y1, x2, y2) { this.commands.push({ op: 'lineBetween', x1, y1, x2, y2 }); return this; }
  beginPath() { this.commands.push({ op: 'beginPath' }); return this; }
  moveTo(x, y) { this.commands.push({ op: 'moveTo', x, y }); return this; }
  lineTo(x, y) { this.commands.push({ op: 'lineTo', x, y }); return this; }
  arc(x, y, r, a0, a1, acw = false) { this.commands.push({ op: 'arc', x, y, r, a0, a1, acw }); return this; }
  strokePath() { this.commands.push({ op: 'strokePath' }); return this; }

  // Replay the command buffer into a 2D context. Used by the renderer (each
  // frame) and by generateTexture (once, onto an offscreen canvas).
  replay(ctx) {
    let fill = 'rgba(0,0,0,1)';
    let stroke = 'rgba(0,0,0,1)';
    for (const c of this.commands) {
      switch (c.op) {
        case 'clear': break;
        case 'fillStyle': fill = colorToRgba(c.color, c.alpha); break;
        case 'lineStyle': ctx.lineWidth = c.width; stroke = colorToRgba(c.color, c.alpha); break;
        case 'fillCircle': ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); break;
        case 'strokeCircle': ctx.strokeStyle = stroke; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke(); break;
        case 'fillRoundedRect': ctx.fillStyle = fill; roundRect(ctx, c.x, c.y, c.w, c.h, c.radius); ctx.fill(); break;
        case 'strokeRoundedRect': ctx.strokeStyle = stroke; roundRect(ctx, c.x, c.y, c.w, c.h, c.radius); ctx.stroke(); break;
        case 'lineBetween': ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2); ctx.stroke(); break;
        case 'beginPath': ctx.beginPath(); break;
        case 'moveTo': ctx.moveTo(c.x, c.y); break;
        case 'lineTo': ctx.lineTo(c.x, c.y); break;
        case 'arc': ctx.arc(c.x, c.y, c.r, c.a0, c.a1, c.acw); break;
        case 'strokePath': ctx.strokeStyle = stroke; ctx.stroke(); break;
        default: break;
      }
    }
  }

  generateTexture(key, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.replay(canvas.getContext('2d'));
    if (this._textures) this._textures.register(key, canvas, w, h);
    return this;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-graphics.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Graphics.js tests/engine-graphics.test.js
git commit -m "feat(engine): replayable Graphics command buffer + generateTexture"
```

---

### Task 8: Input manager (coordinate mapping + DOM pointer)

**Files:**
- Create: `src/engine/InputManager.js`
- Test: `tests/engine-input.test.js`

**Interfaces:**
- Produces: `clientToGame(clientX, clientY, rect, size = 720) -> { x, y }` (pure; maps a client point through the canvas bounding rect into 720-space). `class InputManager` ctor `(canvas)`: attaches `mousemove`/`mousedown` on the canvas and `mouseup` on `window`; maintains `this.activePointer = { worldX, worldY, isDown }`; `setDefaultCursor(css)` sets `canvas.style.cursor`. The class DOM wiring is browser-verified; only `clientToGame` is unit-tested.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-input.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { clientToGame } from '../src/engine/InputManager.js';

describe('clientToGame', () => {
  it('maps a client point through the canvas rect into 720-space', () => {
    const rect = { left: 10, top: 20, width: 360, height: 360 };
    expect(clientToGame(190, 200, rect, 720)).toEqual({ x: 360, y: 360 });
  });

  it('maps the top-left corner to the origin', () => {
    const rect = { left: 10, top: 20, width: 360, height: 360 };
    expect(clientToGame(10, 20, rect, 720)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-input.test.js`
Expected: FAIL — cannot resolve `../src/engine/InputManager.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/InputManager.js`:

```js
// Pure: map a client-space point through the canvas bounding rect into the
// game's 720x720 coordinate space (handles CSS scaling / letterboxing).
export function clientToGame(clientX, clientY, rect, size = 720) {
  return {
    x: ((clientX - rect.left) / rect.width) * size,
    y: ((clientY - rect.top) / rect.height) * size,
  };
}

export class InputManager {
  constructor(canvas, size = 720) {
    this._canvas = canvas;
    this._size = size;
    // ONE persistent pointer for the whole game (spec: never reset isDown on
    // scene change; that is what preserves the cross-scene click-bleed guard).
    this.activePointer = { worldX: 0, worldY: 0, isDown: false };

    canvas.addEventListener('mousemove', (e) => this._move(e));
    canvas.addEventListener('mousedown', (e) => { this._move(e); this.activePointer.isDown = true; });
    // mouseup on window so a release outside the circle is never missed.
    window.addEventListener('mouseup', () => { this.activePointer.isDown = false; });
  }

  _move(e) {
    const rect = this._canvas.getBoundingClientRect();
    const p = clientToGame(e.clientX, e.clientY, rect, this._size);
    this.activePointer.worldX = p.x;
    this.activePointer.worldY = p.y;
  }

  setDefaultCursor(css) { this._canvas.style.cursor = css; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-input.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/InputManager.js tests/engine-input.test.js
git commit -m "feat(engine): persistent DOM pointer + client->game mapping"
```

---

### Task 9: Renderer

**Files:**
- Create: `src/engine/Renderer.js`

**Interfaces:**
- Consumes: `Image`, `Text`, `Circle` from `objects.js`; `Graphics` from `Graphics.js`; `colorToRgba`; a `Textures` instance; a `Camera` instance.
- Produces: `class Renderer` ctor `(ctx, textures, size = 720)`; `render(displayList, camera)`. Clears the canvas, applies the camera shake translate (reset each frame by save/restore), draws every non-destroyed visible object sorted by `(depth asc, seq asc)`. Image draws the texture canvas at `x - displayWidth*originX, y - displayHeight*originY`; Circle fills at opacity `alpha*fillAlpha`; Text renders multi-line (`\n`) with `fontStyle`/`fontSize`/`fontFamily`, origin, and optional `backgroundColor`+`padding` box; Graphics replays under `translate(x,y); scale(scaleX,scaleY)`.

**No unit test** — DOM rendering. Gate: `npm run check` (parse) in Task 13 + browser playtest. Verify parse now with `node --check`.

- [ ] **Step 1: Write the implementation**

Create `src/engine/Renderer.js`:

```js
import { Image, Text, Circle } from './objects.js';
import { Graphics } from './Graphics.js';
import { colorToRgba } from './color.js';

export class Renderer {
  constructor(ctx, textures, size = 720) {
    this._ctx = ctx;
    this._textures = textures;
    this._size = size;
  }

  render(displayList, camera) {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._size, this._size);
    ctx.save();
    if (camera) ctx.translate(camera.offsetX, camera.offsetY);

    const list = displayList
      .filter((o) => !o.destroyed && o.visible)
      .sort((a, b) => (a.depth - b.depth) || (a.seq - b.seq));

    for (const o of list) {
      ctx.save();
      ctx.globalAlpha = o.alpha;
      if (o instanceof Image) this._image(ctx, o);
      else if (o instanceof Circle) this._circle(ctx, o);
      else if (o instanceof Text) this._text(ctx, o);
      else if (o instanceof Graphics) this._graphics(ctx, o);
      ctx.restore();
    }
    ctx.restore();
  }

  _image(ctx, o) {
    const tex = this._textures.get(o.key);
    if (!tex) return;
    const dw = o.displayWidth;
    const dh = o.displayHeight;
    ctx.drawImage(tex.canvas, o.x - dw * o.originX, o.y - dh * o.originY, dw, dh);
  }

  _circle(ctx, o) {
    ctx.globalAlpha = o.alpha * o.fillAlpha;
    ctx.fillStyle = colorToRgba(o.fillColor, 1);
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  _graphics(ctx, o) {
    ctx.translate(o.x, o.y);
    ctx.scale(o.scaleX, o.scaleY);
    o.replay(ctx);
  }

  _text(ctx, o) {
    const s = o.style || {};
    const size = parseInt(s.fontSize || '16px', 10);
    const family = s.fontFamily || 'sans-serif';
    const weight = s.fontStyle ? `${s.fontStyle} ` : '';
    ctx.font = `${weight}${size}px ${family}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const lines = o.text.split('\n');
    const lineH = Math.round(size * 1.2);
    let maxW = 0;
    for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
    const blockW = maxW;
    const blockH = lineH * lines.length;

    // Origin applies to the whole block.
    const left = o.x - blockW * o.originX;
    const top = o.y - blockH * o.originY;

    if (s.backgroundColor) {
      const px = (s.padding && s.padding.x) || 0;
      const py = (s.padding && s.padding.y) || 0;
      ctx.fillStyle = s.backgroundColor;
      ctx.fillRect(left - px, top - py, blockW + px * 2, blockH + py * 2);
    }

    ctx.fillStyle = s.color || '#ffffff';
    lines.forEach((ln, i) => {
      const w = ctx.measureText(ln).width;
      // Align each line inside the block by origin: 0 = left, 0.5 = centre, 1 = right.
      const drawX = left + (blockW - w) * o.originX;
      ctx.fillText(ln, drawX, top + i * lineH);
    });
  }
}
```

- [ ] **Step 2: Verify it parses**

Run: `node --check src/engine/Renderer.js`
Expected: no output, exit 0.

- [ ] **Step 3: Confirm the full suite still passes (no accidental import breakage)**

Run: `npm test`
Expected: all tests pass (55 + engine tests from Tasks 1–8).

- [ ] **Step 4: Commit**

```bash
git add src/engine/Renderer.js
git commit -m "feat(engine): canvas renderer (depth sort, images, text, circles, graphics)"
```

---

### Task 10: Scene base + SceneManager (lifecycle, teardown, deferred swap)

**Files:**
- Create: `src/engine/Scene.js`, `src/engine/SceneManager.js`
- Test: `tests/engine-scene-manager.test.js`

**Interfaces:**
- Produces:
  - `class Scene` ctor `(key)` storing `this.key`. Subclasses define `init/create/update`.
  - `class SceneManager` ctor `({ scenes, tweens, clock, camera, input, textures, renderer })` where `scenes` is an array of Scene instances (key read from `.key`). Fields: `displayList` (array), `active`. Methods: `start(key, data)` (defers), `step()` (processes one pending swap: teardown → set active → inject sys → `init(data)` → `create()`), `compact()` (drops destroyed from `displayList`). Teardown clears `displayList`, `tweens`, `clock` but NEVER `textures`. Injects onto the scene: `add.{image,text,graphics,circle}`, `tweens`, `time`(clock), `cameras`(camera), `input`, `textures`, `sound`(stub), `cache`(stub), `scene`(`{ start }`).

- [ ] **Step 1: Write the failing test**

Create `tests/engine-scene-manager.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-scene-manager.test.js`
Expected: FAIL — cannot resolve `../src/engine/Scene.js`.

- [ ] **Step 3: Write the implementations**

Create `src/engine/Scene.js`:

```js
export class Scene {
  constructor(key) { this.key = key; }
}
```

Create `src/engine/SceneManager.js`:

```js
import { Image, Text, Circle } from './objects.js';
import { Graphics } from './Graphics.js';

export class SceneManager {
  constructor({ scenes, tweens, clock, camera, input, textures, renderer }) {
    this.tweens = tweens;
    this.clock = clock;
    this.camera = camera;
    this.input = input;
    this.textures = textures;
    this.renderer = renderer;
    this.displayList = [];
    this.active = null;
    this._pending = null;
    this._byKey = new Map();
    for (const s of scenes) this._byKey.set(s.key, s);
  }

  start(key, data) { this._pending = { key, data }; }

  step() {
    if (!this._pending) return;
    const { key, data } = this._pending;
    this._pending = null;
    this._teardown();
    const scene = this._byKey.get(key);
    this.active = scene;
    this._inject(scene);
    if (scene.init) scene.init(data || {});
    if (scene.create) scene.create();
  }

  compact() {
    if (this.displayList.some((o) => o.destroyed)) {
      this.displayList = this.displayList.filter((o) => !o.destroyed);
    }
  }

  _teardown() {
    this.tweens.clear();
    this.clock.clear();
    this.displayList.length = 0;
    // textures, sound, cache are engine-global and deliberately survive.
  }

  _inject(scene) {
    const list = this.displayList;
    const textures = this.textures;
    const add = {
      image: (x, y, key) => {
        const f = textures.getFrame(key);
        const o = new Image(x, y, key, f.width, f.height);
        list.push(o); // destroy() sets .destroyed; compact() drops it next frame
        return o;
      },
      text: (x, y, str, style) => { const o = new Text(x, y, str, style); list.push(o); return o; },
      circle: (x, y, r, color, alpha) => { const o = new Circle(x, y, r, color, alpha); list.push(o); return o; },
      graphics: () => { const g = new Graphics(); g._textures = textures; list.push(g); return g; },
    };
    scene.add = add;
    scene.tweens = this.tweens;
    scene.time = this.clock;
    scene.cameras = this.camera;
    scene.input = this.input;
    scene.textures = this.textures;
    scene.sound = { play: () => {} };
    scene.cache = { audio: { exists: () => false } };
    scene.scene = { start: (k, d) => this.start(k, d) };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-scene-manager.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Scene.js src/engine/SceneManager.js tests/engine-scene-manager.test.js
git commit -m "feat(engine): scene base + manager (deferred swap, scoped teardown)"
```

---

### Task 11: Loop (delta clamp + frame order)

**Files:**
- Create: `src/engine/Loop.js`
- Test: `tests/engine-loop.test.js`

**Interfaces:**
- Produces: `clampDelta(dt) -> number` (`min(max(dt,0), 50)`). `class Loop` ctor `({ manager, clock, tweens, camera, renderer })`; `start()` runs the RAF loop; each frame: process deferred swap (`manager.step()`), `clock.update(dt)`, `tweens.update(dt)`, `camera.update(dt)`, `active.update(clock.now, dt)`, `manager.compact()`, `renderer.render(manager.displayList, camera)`. First frame `dt≈0`; `dt` clamped via `clampDelta`. The RAF wiring is browser-verified; only `clampDelta` is unit-tested.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-loop.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { clampDelta } from '../src/engine/Loop.js';

describe('clampDelta', () => {
  it('clamps a spike to 50ms (prevents auto-firing an in-progress dwell)', () => {
    expect(clampDelta(1000)).toBe(50);
  });
  it('floors negatives to 0', () => {
    expect(clampDelta(-5)).toBe(0);
  });
  it('passes a normal frame through', () => {
    expect(clampDelta(16)).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-loop.test.js`
Expected: FAIL — cannot resolve `../src/engine/Loop.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/Loop.js`:

```js
// Clamp per-frame delta: floor negatives, cap spikes at 50ms so a background
// tab return (multi-second dt) can't instantly complete an in-progress dwell.
export function clampDelta(dt) { return Math.min(Math.max(dt, 0), 50); }

export class Loop {
  constructor({ manager, clock, tweens, camera, renderer }) {
    this._manager = manager;
    this._clock = clock;
    this._tweens = tweens;
    this._camera = camera;
    this._renderer = renderer;
    this._last = null;
  }

  start() {
    const frame = (t) => {
      if (this._last === null) this._last = t;
      const dt = clampDelta(t - this._last);
      this._last = t;

      this._manager.step();            // apply any deferred scene swap first
      this._clock.update(dt);
      this._tweens.update(dt);
      this._camera.update(dt);
      const scene = this._manager.active;
      if (scene && scene.update) scene.update(this._clock.now, dt);
      this._manager.compact();
      this._renderer.render(this._manager.displayList, this._camera);

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-loop.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/Loop.js tests/engine-loop.test.js
git commit -m "feat(engine): RAF loop with delta clamp + fixed frame order"
```

---

### Task 12: Phaser shim + bootstrap

**Files:**
- Create: `src/engine/phaser-shim.js`
- Test: `tests/engine-shim.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1–11.
- Produces: a default export shaped like `Phaser`: `{ Scene, Game, AUTO, Scale: { FIT, CENTER_BOTH }, Math: { Distance: { Between } } }`. `Scene` is the engine `Scene`. `Between(x1,y1,x2,y2)` delegates to `distanceBetween`. `new Game(config)` boots the engine: find `#{config.parent}` (default `'game'`), create a `config.width × config.height` canvas, CSS-scale it to a centred square, build all managers, register `config.scene` instances, `start` the first scene, and run the `Loop`. `AUTO`, `Scale.*` are inert constants (config fields are accepted and ignored). The bootstrap is browser-verified; only `Math.Distance.Between` is unit-tested.

- [ ] **Step 1: Write the failing test**

Create `tests/engine-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine-shim.test.js`
Expected: FAIL — cannot resolve `../src/engine/phaser-shim.js`.

- [ ] **Step 3: Write the implementation**

Create `src/engine/phaser-shim.js`:

```js
import { Scene } from './Scene.js';
import { SceneManager } from './SceneManager.js';
import { Tweens } from './Tweens.js';
import { Clock } from './Clock.js';
import { Camera } from './Camera.js';
import { Textures } from './textures.js';
import { Renderer } from './Renderer.js';
import { InputManager } from './InputManager.js';
import { Loop } from './Loop.js';
import { distanceBetween } from './geometry.js';

// Boots the harness from a Phaser-style config (width, height, parent, scene[]).
class Game {
  constructor(config) {
    const size = config.width || 720;
    const parent = document.getElementById(config.parent || 'game') || document.body;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = config.height || size;
    canvas.style.width = 'min(100vw, 100vh)';
    canvas.style.height = 'min(100vw, 100vh)';
    canvas.style.display = 'block';
    if (config.backgroundColor) canvas.style.background = config.backgroundColor;
    parent.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const textures = new Textures();
    const tweens = new Tweens();
    const clock = new Clock();
    const camera = new Camera({ width: size });
    const input = new InputManager(canvas, size);
    const renderer = new Renderer(ctx, textures, size);

    // Scene registry expects instances; config.scene is an array of classes.
    const scenes = config.scene.map((SceneClass) => new SceneClass());
    const manager = new SceneManager({ scenes, tweens, clock, camera, input, textures, renderer });

    manager.start(scenes[0].key);
    new Loop({ manager, clock, tweens, camera, renderer }).start();
  }
}

const Phaser = {
  Scene,
  Game,
  AUTO: 'AUTO',
  Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  Math: { Distance: { Between: distanceBetween } },
};

export default Phaser;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/engine-shim.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Parse-check the whole engine**

Run each: `node --check src/engine/phaser-shim.js`
Expected: exit 0, no output.

- [ ] **Step 6: Commit**

```bash
git add src/engine/phaser-shim.js tests/engine-shim.test.js
git commit -m "feat(engine): Phaser-shaped shim + canvas bootstrap"
```

---

### Task 13: Wire-up — repoint imports, buildless tooling, first browser boot

**Files:**
- Modify: `src/main.js`, `src/scenes/BootScene.js`, `src/scenes/LandingScene.js`, `src/scenes/LevelSelectScene.js`, `src/scenes/FTUEScene.js`, `src/scenes/GameScene.js`, `src/scenes/ResultScene.js` (import source only)
- Create: `scripts/check.mjs` (parse gate)
- Modify: `index.html`, `package.json`
- Delete: `vite.config.js`, `dist/` (stale build output)

**Interfaces:**
- Consumes: `src/engine/phaser-shim.js` (default export) in place of the `phaser` package.
- Produces: a buildless, static-servable app. After this task the game boots in a served browser and all tests pass.

- [ ] **Step 1: Repoint the import in `src/main.js`**

Change line 1 of `src/main.js` from `import Phaser from 'phaser';` to:

```js
import Phaser from './engine/phaser-shim.js';
```

(Leave the rest of `main.js` — `new Phaser.Game({ type: Phaser.AUTO, ... })` — unchanged.)

- [ ] **Step 2: Repoint the import in all 6 scenes**

In each of `src/scenes/BootScene.js`, `LandingScene.js`, `LevelSelectScene.js`, `FTUEScene.js`, `GameScene.js`, `ResultScene.js`, change `import Phaser from 'phaser';` to:

```js
import Phaser from '../engine/phaser-shim.js';
```

Change nothing else in these files.

- [ ] **Step 3: Update `index.html`**

Change the script tag from `<script type="module" src="/src/main.js"></script>` to:

```html
    <script type="module" src="./src/main.js"></script>
```

(No import map. The `#game` div and its CSS stay as-is; the engine creates the canvas inside it.)

- [ ] **Step 4: Create the parse-gate script**

Create `scripts/check.mjs`:

```js
// Parse gate: `node --check` every src/**/*.js. Replaces the old `vite build`
// compile check (catches syntax/parse errors without executing browser code).
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith('.js')) execFileSync(process.execPath, ['--check', p], { stdio: 'inherit' });
  }
}
walk('src');
console.log('parse ok');
```

- [ ] **Step 5: Update `package.json`**

Replace the `scripts`, `dependencies`, and `devDependencies` sections so it reads:

```json
  "scripts": {
    "serve": "python -m http.server 8000",
    "serve:npx": "npx serve -l 8000 .",
    "check": "node scripts/check.mjs",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "engines": { "node": ">=18" },
  "devDependencies": {
    "vitest": "^2.1.9"
  }
```

(Removes `phaser` entirely and `vite`; drops `dev`/`build`/`preview`; adds `serve`, `serve:npx`, `check`, `engines`.)

- [ ] **Step 6: Delete the dead Vite files**

```bash
git rm vite.config.js
git rm -r --cached dist
```

(If `dist/` is untracked, instead run `rm -rf dist`. It is stale build output.)

- [ ] **Step 7: Refresh installed deps and confirm tests still pass**

Run: `npm install`
Then: `npm test`
Expected: `npm install` completes (phaser/vite removed from tree; vitest keeps its own vite). `npm test` → all tests pass (55 original + all engine tests).

- [ ] **Step 8: Parse-check every source file**

Run: `npm run check`
Expected: prints `parse ok`, exit 0 (every `src/**/*.js` parses, including the new engine).

- [ ] **Step 9: Manual browser boot (the real integration gate)**

Run: `npm run serve` (or `npm run serve:npx`), open `http://localhost:8000/` in a browser.
Expected: the game boots to the Landing scene, the console is clean (no errors), and the pointer/reticle tracks the mouse. This confirms the shim + engine drive the real scenes. Do a quick pass: Landing → Level Select → FTUE → a hunt level → Result. Report what you see; visuals are human-verified, not automated.

- [ ] **Step 10: Commit**

```bash
git add src/main.js src/scenes scripts/check.mjs package.json index.html
git commit -m "feat(build): drop Phaser+Vite, repoint imports to the Canvas shim (buildless)"
```

---

### Task 14: Docs — compile gate + status

**Files:**
- Modify: `CLAUDE.md`, `docs/playtest-checklist.md`

- [ ] **Step 1: Update the commands + gate in `CLAUDE.md`**

In `CLAUDE.md`, replace the `## Commands` code block with:

```bash
npm run serve   # static server (python http.server) — open the printed URL to playtest
npm test        # Vitest unit tests (pure-logic + engine)
npm run check   # node --check parse gate over src/ (replaces the old build gate)
```

And in the "Testing & verification" section, replace the sentence
"Their gate is `npm run build` + a **manual in-browser playtest**" with:
"Their gate is `npm run check` (parse) + a **manual in-browser playtest** (served via `npm run serve`; ES modules require a static server, not `file://`)."

- [ ] **Step 2: Update the tech-stack + status lines in `CLAUDE.md`**

In `## Tech stack`, replace the "Phaser 3 ... Vite, Vitest" line with:

```markdown
Plain JavaScript (ES modules) on a small hand-rolled Canvas 2D harness (`src/engine/`),
Vitest, Node 18+. Buildless: served statically, no bundler. (Phaser and Vite were removed
in the 2026-07-07 conversion — see `docs/superpowers/specs/2026-07-07-html-canvas-conversion-design.md`.)
```

Append to `## Current status (2026-07-07)`:

```markdown

Converted off Phaser to a dependency-free Canvas 2D harness (`src/engine/`) + a
`Phaser`-shaped shim; scene/system/logic bodies are unchanged (only the Phaser import
source moved). Buildless — run `npm run serve` and open the URL; `npm test` covers logic
+ engine; `npm run check` is the parse gate. Rendering/visual parity is browser-verified.
```

- [ ] **Step 2b: Add a conversion parity section to the playtest checklist**

Append to `docs/playtest-checklist.md`:

```markdown
## Post-Phaser conversion parity (2026-07-07)

Served via `npm run serve` (ES modules need a static server, not file://). Confirm the
Canvas harness reproduces the Phaser build 1:1:
- [ ] Boots straight to Landing with a clean console.
- [ ] Reticle tracks the mouse exactly; dwell ring fills; click and dwell both activate.
- [ ] Full flow works: Landing → Level Select (nodes pulse) → FTUE → each hunt level → Result.
- [ ] Hunt: cells drift + bounce inside the circle, lock-on focus-slow, +N popups rise, combo badge appears only after the first kill, healthy-hit cue + combo reset, cracked 2-HP cells, kill burst + camera shake.
- [ ] Circular chrome/mask + warm background render; nothing clipped outside the safe circle.
- [ ] Text: multi-line resolution text centred; "Begin"/rating/combo chip backgrounds render; all ≥18px.
- [ ] Switching a browser tab away and back does NOT auto-complete an in-progress dwell (delta clamp).
- [ ] Result score line shows; rating buttons work; replay returns to Level Select.
```

- [ ] **Step 3: Final verification**

Run: `npm test`
Expected: all pass.
Run: `npm run check`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/playtest-checklist.md
git commit -m "docs: buildless serve/check gates + conversion parity checklist"
```

---

## Post-plan notes for the executor

- **Tasks 1–12 are unit/parse-gated only** — nothing renders in a browser until Task 13. That is inherent to building an engine bottom-up; the unit tests de-risk the pure logic and Task 13 is the first real integration. Do not skip the Task 13 Step 8 browser boot.
- **Visual/pace parity cannot be automated.** After Task 14, tell the human to playtest via `npm run serve` against the new checklist; do not claim visual parity yourself.
- If the Task 13 browser boot surfaces a missing Phaser method (a call the audit missed), add it to the appropriate engine module + shim with a matching unit test, then re-run — do not stub it silently.
- `setTexture` assumes same-size frames (only `cancer→cancerCracked`, both 96²). If a future call swaps to a different-size texture, extend `Image.setTexture` to refresh `frameWidth/Height` from `textures.getFrame`.
