# Cancer Game — Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-07-03
**Content Type:** Implementation Plan

**Goal:** Build a playable, web-based 2D vertical slice of an empowerment-fantasy cancer game ("Region 01", ~3–5 min) where an adult patient pilots a "Sentinel" to fight and heal their body, driven by a single-pointer input model (mouse now, gesture later).

**Architecture:** Phaser 3 game booted by Vite. All input flows through an `InputController` abstraction (mouse adapter now, gesture adapter later). The level is data (`level01.js`) advanced by a `BeatSequencer`. Pure-logic systems (input, difficulty, aim-assist, sequencing, check-in) are unit-tested with Vitest; Phaser scenes/systems are verified manually in-browser. A `DifficultySystem` structurally guarantees no demoralizing fail-state.

**Tech Stack:** Phaser 3, plain JavaScript (ES modules), Vite, Vitest, Node 18+.

## Global Constraints

- **No fail-state ever.** No code path may produce a "you lost / your body failed" outcome. Difficulty only eases. (Spec §2 constraint 1)
- **One-handed, low-effort, forgiving input.** Single pointer + one activate signal + dwell alternative everywhere. No rapid/precise input, no sustained holds required. (Spec §2 constraint 2, §4)
- **Aim-assist + generous hitboxes** so coarse/jittery pointing always succeeds. (Spec §4)
- **Treatment framed as ally** — the "chemo pulse" beat helps the player. (Spec §2 constraint 3, §6.5)
- **All input via `InputController`** — game code never reads mouse/pointer directly. (Spec §4, §7)
- **Levels are data**, not code — beats live in `src/data/level01.js`. (Spec §7)
- **Clinical hook is local-only, no PII, no accounts.** (Spec §8)
- **Art/tone:** bioluminescent sci-fi, hopeful, not gory, not sterile. (Spec §6)
- Node **18+**, ES modules (`"type": "module"`), Phaser **^3.80**, Vite **^5**, Vitest **^2**.

---

### Task 1: Project scaffold + booting Phaser

**Files:**
- Create: `.gitignore`, `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/config.js`
- Test: `tests/config.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `createGameConfig(sceneList)` in `src/config.js` → returns a Phaser game config object `{ type, width, height, backgroundColor, physics, scene, scale }`. `GAME_WIDTH = 960`, `GAME_HEIGHT = 540` exported constants.

- [ ] **Step 1: Initialize repo and Node project**

Run in `F:\newprojects\cancergame`:
```bash
git init
npm init -y
npm install phaser@^3.80
npm install -D vite@^5 vitest@^2
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.vite/
*.local
```

- [ ] **Step 3: Set scripts in `package.json`**

Add `"type": "module"` and merge these scripts:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Write the failing test**

`tests/config.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { createGameConfig, GAME_WIDTH, GAME_HEIGHT } from '../src/config.js';

describe('createGameConfig', () => {
  it('uses the fixed slice resolution', () => {
    expect(GAME_WIDTH).toBe(960);
    expect(GAME_HEIGHT).toBe(540);
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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/config.js`.

- [ ] **Step 6: Implement `src/config.js`**

```javascript
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Phaser-free on purpose: this stays unit-testable in Node without loading
// the engine. main.js merges in the Phaser-specific fields (type, scale).
export function createGameConfig(sceneList) {
  return {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05060f',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    scene: sceneList,
  };
}
```

Note: `config.js` deliberately does NOT import or reference `Phaser`, so the test runs in plain Node. The `type` and `scale` fields (which need `Phaser.AUTO` / `Phaser.Scale`) are added in `main.js`, which imports Phaser for real.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 8: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Sentinel</title>
    <style>
      html, body { margin: 0; height: 100%; background: #05060f; overflow: hidden; }
      #game { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 9: Create `src/main.js` with a placeholder scene**

```javascript
import Phaser from 'phaser';
import { createGameConfig } from './config.js';

class BootPlaceholder extends Phaser.Scene {
  constructor() { super('BootPlaceholder'); }
  create() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Sentinel — boot OK', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#7fe7ff',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  ...createGameConfig([BootPlaceholder]),
});
```

- [ ] **Step 10: Verify it boots**

Run: `npm run dev`
Open the printed URL. Expected: a dark screen with cyan text "Sentinel — boot OK", centered.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Phaser + Vitest, boot placeholder scene"
```

---

### Task 2: InputController abstraction (pointer + activate)

**Files:**
- Create: `src/input/InputController.js`
- Test: `tests/input-controller.test.js`

**Interfaces:**
- Consumes: an *input source* object with `getPosition() -> {x, y}` and `isDown() -> boolean`.
- Produces: `InputController` class with:
  - `constructor(source)`
  - `update()` — sample the source once per frame; call before reads.
  - `get pointer()` → `{ x, y }` (last sampled position)
  - `get held()` → boolean (activate currently down)
  - `justPressed()` → boolean (rising edge since last `update`)
  - `justReleased()` → boolean (falling edge since last `update`)

- [ ] **Step 1: Write the failing test**

`tests/input-controller.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { InputController } from '../src/input/InputController.js';

function fakeSource() {
  const state = { x: 0, y: 0, down: false };
  return {
    state,
    getPosition: () => ({ x: state.x, y: state.y }),
    isDown: () => state.down,
  };
}

describe('InputController', () => {
  it('samples pointer position on update', () => {
    const src = fakeSource();
    const input = new InputController(src);
    src.state.x = 100; src.state.y = 42;
    input.update();
    expect(input.pointer).toEqual({ x: 100, y: 42 });
  });

  it('detects rising and falling edges only once per transition', () => {
    const src = fakeSource();
    const input = new InputController(src);

    input.update();
    expect(input.justPressed()).toBe(false);

    src.state.down = true;
    input.update();
    expect(input.justPressed()).toBe(true);
    expect(input.held).toBe(true);

    input.update();
    expect(input.justPressed()).toBe(false); // still held, not a new press

    src.state.down = false;
    input.update();
    expect(input.justReleased()).toBe(true);
    input.update();
    expect(input.justReleased()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/input-controller.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/input/InputController.js`**

```javascript
export class InputController {
  constructor(source) {
    this._source = source;
    this._pos = { x: 0, y: 0 };
    this._down = false;
    this._prevDown = false;
  }

  update() {
    this._prevDown = this._down;
    const p = this._source.getPosition();
    this._pos = { x: p.x, y: p.y };
    this._down = this._source.isDown();
  }

  get pointer() { return { x: this._pos.x, y: this._pos.y }; }
  get held() { return this._down; }
  justPressed() { return this._down && !this._prevDown; }
  justReleased() { return !this._down && this._prevDown; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/input-controller.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/input/InputController.js tests/input-controller.test.js
git commit -m "feat(input): pointer+activate abstraction with edge detection"
```

---

### Task 3: MousePointerAdapter (the "now" input source)

**Files:**
- Create: `src/input/MousePointerAdapter.js`
- Test: `tests/mouse-adapter.test.js`

**Interfaces:**
- Consumes: a Phaser-like input object exposing `activePointer: { worldX, worldY, isDown }`. (In the real game this is `scene.input`.)
- Produces: `MousePointerAdapter` implementing the source interface (`getPosition()`, `isDown()`) consumed by `InputController` (Task 2). This is the file a future `GestureAdapter` mirrors.

- [ ] **Step 1: Write the failing test**

`tests/mouse-adapter.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { MousePointerAdapter } from '../src/input/MousePointerAdapter.js';

describe('MousePointerAdapter', () => {
  it('reads world position and down-state from a Phaser input object', () => {
    const phaserInput = { activePointer: { worldX: 12, worldY: 34, isDown: true } };
    const adapter = new MousePointerAdapter(phaserInput);
    expect(adapter.getPosition()).toEqual({ x: 12, y: 34 });
    expect(adapter.isDown()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/mouse-adapter.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/input/MousePointerAdapter.js`**

```javascript
export class MousePointerAdapter {
  constructor(phaserInput) {
    this._input = phaserInput;
  }
  getPosition() {
    const p = this._input.activePointer;
    return { x: p.worldX, y: p.worldY };
  }
  isDown() {
    return this._input.activePointer.isDown;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/mouse-adapter.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/input/MousePointerAdapter.js tests/mouse-adapter.test.js
git commit -m "feat(input): mouse pointer adapter as the current input source"
```

---

### Task 4: DwellTracker (hover-to-fill, no-click activation)

**Files:**
- Create: `src/input/DwellTracker.js`
- Test: `tests/dwell-tracker.test.js`

**Interfaces:**
- Consumes: nothing (pure logic).
- Produces: `DwellTracker` class:
  - `constructor({ dwellMs })` (default `dwellMs = 700`)
  - `update(dtMs, targetKey)` where `targetKey` is a string/number id or `null` when the pointer is over nothing. Returns `{ progress, completed, targetKey }` where `progress` is 0..1. Switching target resets progress. `completed` is `true` on the single frame progress reaches 1; the tracker then latches that target until it changes (won't re-fire while still hovering).

- [ ] **Step 1: Write the failing test**

`tests/dwell-tracker.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { DwellTracker } from '../src/input/DwellTracker.js';

describe('DwellTracker', () => {
  it('fills progress over dwellMs and completes once', () => {
    const d = new DwellTracker({ dwellMs: 1000 });
    expect(d.update(500, 'a').progress).toBeCloseTo(0.5);
    let r = d.update(500, 'a');
    expect(r.progress).toBe(1);
    expect(r.completed).toBe(true);
    // still hovering same target: does not re-complete
    expect(d.update(100, 'a').completed).toBe(false);
  });

  it('resets when the target changes or is null', () => {
    const d = new DwellTracker({ dwellMs: 1000 });
    d.update(600, 'a');
    expect(d.update(100, 'b').progress).toBeCloseTo(0.1);
    expect(d.update(100, null).progress).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/dwell-tracker.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/input/DwellTracker.js`**

```javascript
export class DwellTracker {
  constructor({ dwellMs = 700 } = {}) {
    this._dwellMs = dwellMs;
    this._key = null;
    this._elapsed = 0;
    this._latched = false;
  }

  update(dtMs, targetKey) {
    if (targetKey !== this._key) {
      this._key = targetKey;
      this._elapsed = 0;
      this._latched = false;
    }
    if (targetKey == null) {
      return { progress: 0, completed: false, targetKey: null };
    }
    if (this._latched) {
      return { progress: 1, completed: false, targetKey };
    }
    this._elapsed = Math.min(this._dwellMs, this._elapsed + dtMs);
    const progress = this._elapsed / this._dwellMs;
    const completed = progress >= 1;
    if (completed) this._latched = true;
    return { progress, completed, targetKey };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/dwell-tracker.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/input/DwellTracker.js tests/dwell-tracker.test.js
git commit -m "feat(input): dwell-to-act tracker for low-effort activation"
```

---

### Task 5: Aim-assist target selection

**Files:**
- Create: `src/systems/targeting.js`
- Test: `tests/targeting.test.js`

**Interfaces:**
- Consumes: nothing (pure function).
- Produces: `selectTarget(pointer, targets, assistRadius)` where `pointer = {x,y}`, `targets = [{id, x, y, radius}]`, returns the `id` of the best target or `null`. "Best" = smallest edge-distance (`dist(center) - target.radius`) that is `<= assistRadius`. Ties broken by first in array.

- [ ] **Step 1: Write the failing test**

`tests/targeting.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { selectTarget } from '../src/systems/targeting.js';

const T = (id, x, y, radius = 10) => ({ id, x, y, radius });

describe('selectTarget', () => {
  it('returns null when nothing is within assist radius', () => {
    expect(selectTarget({ x: 0, y: 0 }, [T('a', 500, 0)], 50)).toBe(null);
  });

  it('picks the nearest target by edge distance, allowing coarse aim', () => {
    const targets = [T('far', 200, 0, 10), T('near', 60, 0, 40)];
    // pointer at (0,0): near edge = 60-40=20; far edge = 200-10=190
    expect(selectTarget({ x: 0, y: 0 }, targets, 100)).toBe('near');
  });

  it('counts a pointer inside a hitbox as selected', () => {
    expect(selectTarget({ x: 5, y: 5 }, [T('a', 0, 0, 30)], 10)).toBe('a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/targeting.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/systems/targeting.js`**

```javascript
export function selectTarget(pointer, targets, assistRadius) {
  let best = null;
  let bestEdge = Infinity;
  for (const t of targets) {
    const dx = t.x - pointer.x;
    const dy = t.y - pointer.y;
    const edge = Math.sqrt(dx * dx + dy * dy) - t.radius;
    if (edge <= assistRadius && edge < bestEdge) {
      bestEdge = edge;
      best = t.id;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/targeting.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/targeting.js tests/targeting.test.js
git commit -m "feat(systems): aim-assist target selection with forgiving hitboxes"
```

---

### Task 6: DifficultySystem (adaptive easing, structurally no fail-state)

**Files:**
- Create: `src/systems/DifficultySystem.js`
- Test: `tests/difficulty-system.test.js`

**Interfaces:**
- Consumes: nothing (pure logic).
- Produces: `DifficultySystem` class:
  - `constructor({ speedFloor = 0.4, assistBase = 40, assistMax = 120 } = {})`
  - `recordWaveTime(elapsedMs, targetMs)` — call when a wave clears; if the player took longer than `targetMs`, struggle rises; if faster, it decays slightly.
  - `enemySpeedMultiplier()` → number in `[speedFloor, 1]` (lower when struggling).
  - `assistRadius()` → number in `[assistBase, assistMax]` (higher when struggling).
  - There is deliberately **no** `isGameOver()`/`hasLost()` method — failure is not representable.

- [ ] **Step 1: Write the failing test**

`tests/difficulty-system.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { DifficultySystem } from '../src/systems/DifficultySystem.js';

describe('DifficultySystem', () => {
  it('starts neutral', () => {
    const d = new DifficultySystem();
    expect(d.enemySpeedMultiplier()).toBe(1);
    expect(d.assistRadius()).toBe(40);
  });

  it('eases (slower enemies, wider assist) when the player struggles', () => {
    const d = new DifficultySystem();
    for (let i = 0; i < 5; i++) d.recordWaveTime(20000, 8000); // way over target
    expect(d.enemySpeedMultiplier()).toBeLessThan(1);
    expect(d.enemySpeedMultiplier()).toBeGreaterThanOrEqual(0.4);
    expect(d.assistRadius()).toBeGreaterThan(40);
    expect(d.assistRadius()).toBeLessThanOrEqual(120);
  });

  it('never exposes a lose/game-over concept', () => {
    const d = new DifficultySystem();
    expect(d.isGameOver).toBeUndefined();
    expect(d.hasLost).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/difficulty-system.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/systems/DifficultySystem.js`**

```javascript
export class DifficultySystem {
  constructor({ speedFloor = 0.4, assistBase = 40, assistMax = 120 } = {}) {
    this._speedFloor = speedFloor;
    this._assistBase = assistBase;
    this._assistMax = assistMax;
    this._struggle = 0; // clamped 0..1
  }

  recordWaveTime(elapsedMs, targetMs) {
    if (elapsedMs > targetMs) {
      this._struggle = Math.min(1, this._struggle + 0.2);
    } else {
      this._struggle = Math.max(0, this._struggle - 0.1);
    }
  }

  enemySpeedMultiplier() {
    return 1 - this._struggle * (1 - this._speedFloor);
  }

  assistRadius() {
    return this._assistBase + this._struggle * (this._assistMax - this._assistBase);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/difficulty-system.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/DifficultySystem.js tests/difficulty-system.test.js
git commit -m "feat(systems): adaptive difficulty that only eases, never fails the player"
```

---

### Task 7: Level data + BeatSequencer

**Files:**
- Create: `src/data/level01.js`, `src/systems/BeatSequencer.js`
- Test: `tests/beat-sequencer.test.js`

**Interfaces:**
- Consumes: nothing (pure logic).
- Produces:
  - `level01` (array of beat descriptors). Each beat: `{ id, type, config }`. Types used by the slice: `onboarding`, `scan`, `wave`, `support`, `chemoAlly`, `boss`, `resolution`.
  - `BeatSequencer` class:
    - `constructor(beats)`
    - `current()` → current beat object (or `null` if finished)
    - `advance()` → moves to next beat, returns the new `current()`
    - `isFinished()` → boolean
    - `reset()`

- [ ] **Step 1: Write the failing test**

`tests/beat-sequencer.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/beat-sequencer.test.js`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement `src/data/level01.js`**

```javascript
// The vertical slice as data. Coordinates assume a 960x540 field.
export const level01 = [
  { id: 'intro', type: 'onboarding', config: {
    text: 'You are the Sentinel. This is your body.\nLet\'s clear it together.',
    practiceTarget: { x: 480, y: 300, radius: 46 },
  } },
  { id: 'scan1', type: 'scan', config: {
    fogRects: [{ x: 300, y: 120, w: 360, h: 220 }],
    reveal: 'cluster1',
  } },
  { id: 'wave1', type: 'wave', config: {
    targetMs: 8000,
    enemies: [
      { x: 360, y: 180, radius: 26, hp: 1, speed: 20 },
      { x: 520, y: 150, radius: 26, hp: 1, speed: 20 },
      { x: 470, y: 260, radius: 26, hp: 1, speed: 20 },
    ],
  } },
  { id: 'support1', type: 'support', config: {
    dimPatches: [{ x: 200, y: 400, radius: 44 }, { x: 760, y: 380, radius: 44 }],
    label: 'Clear the fog. Restore your body.',
  } },
  { id: 'ally1', type: 'chemoAlly', config: {
    label: 'A treatment pulse is here — aim it. It fights with you.',
    cluster: [
      { x: 620, y: 200, radius: 24, hp: 1 },
      { x: 680, y: 240, radius: 24, hp: 1 },
      { x: 640, y: 300, radius: 24, hp: 1 },
      { x: 720, y: 300, radius: 24, hp: 1 },
    ],
  } },
  { id: 'boss1', type: 'boss', config: {
    mass: { x: 480, y: 250, radius: 70, hp: 5 },
    chargeMs: 900,
    label: 'Charge your strike.',
  } },
  { id: 'end', type: 'resolution', config: {
    text: 'You restored this. Well done.',
  } },
];
```

- [ ] **Step 4: Implement `src/systems/BeatSequencer.js`**

```javascript
export class BeatSequencer {
  constructor(beats) {
    this._beats = beats;
    this._i = 0;
  }
  current() {
    return this._i < this._beats.length ? this._beats[this._i] : null;
  }
  advance() {
    this._i += 1;
    return this.current();
  }
  isFinished() {
    return this._i >= this._beats.length;
  }
  reset() {
    this._i = 0;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test tests/beat-sequencer.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/level01.js src/systems/BeatSequencer.js tests/beat-sequencer.test.js
git commit -m "feat(level): data-driven level01 beats + beat sequencer"
```

---

### Task 8: Clinical check-in hook (pre/post, local-only)

**Files:**
- Create: `src/clinical/CheckIn.js`
- Test: `tests/checkin.test.js`

**Interfaces:**
- Consumes: an injectable storage object shaped like `window.localStorage` (`getItem(key)`, `setItem(key, value)`).
- Produces:
  - `computeDelta(pre, post)` → `post - pre`.
  - `CheckInStore` class:
    - `constructor(storage, key = 'sentinel.checkins')`
    - `save({ pre, post, ts })` → appends `{ pre, post, delta, ts }` to a JSON array; returns the saved record.
    - `all()` → array of saved records (empty array if none).
  - No PII is stored; `ts` is passed in by the caller (never generated here, so tests stay deterministic).

- [ ] **Step 1: Write the failing test**

`tests/checkin.test.js`:
```javascript
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
    expect(rec).toEqual({ pre: 2, post: 4, delta: 2, ts: 1000 });
    store.save({ pre: 3, post: 3, ts: 2000 });
    expect(store.all()).toHaveLength(2);
    expect(store.all()[1].delta).toBe(0);
  });

  it('returns an empty array when nothing is stored', () => {
    expect(new CheckInStore(memStorage()).all()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/checkin.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/clinical/CheckIn.js`**

```javascript
export function computeDelta(pre, post) {
  return post - pre;
}

export class CheckInStore {
  constructor(storage, key = 'sentinel.checkins') {
    this._storage = storage;
    this._key = key;
  }

  all() {
    const raw = this._storage.getItem(this._key);
    return raw ? JSON.parse(raw) : [];
  }

  save({ pre, post, ts }) {
    const record = { pre, post, delta: computeDelta(pre, post), ts };
    const list = this.all();
    list.push(record);
    this._storage.setItem(this._key, JSON.stringify(list));
    return record;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/checkin.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/clinical/CheckIn.js tests/checkin.test.js
git commit -m "feat(clinical): local-only pre/post sense-of-control check-in"
```

---

### Task 9: Reticle + FeedbackSystem (shared game-feel helpers)

**Files:**
- Create: `src/systems/Reticle.js`, `src/systems/FeedbackSystem.js`

**Interfaces:**
- Consumes: a Phaser `Scene`, and `InputController` (Task 2), `DwellTracker` (Task 4).
- Produces:
  - `Reticle` class: draws the pointer cursor + dwell ring. `constructor(scene)`, `update(pointer, dwellProgress)` positions the cursor at `pointer` and draws a ring filling to `dwellProgress` (0..1).
  - `FeedbackSystem` class: `constructor(scene)`, `burst(x, y, color)` (particle pop), `shake(ms = 120, intensity = 0.004)`, `tone(kind)` where `kind ∈ {'hit','heal','win'}` (uses `scene.sound` if a sound exists, else no-op). All effects are additive juice; safe to call anytime.

This task has no unit test (pure Phaser rendering); it is verified visually in Task 10.

- [ ] **Step 1: Implement `src/systems/Reticle.js`**

```javascript
export class Reticle {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(1000);
  }

  update(pointer, dwellProgress = 0) {
    const g = this.g;
    g.clear();
    // outer cursor
    g.lineStyle(2, 0x7fe7ff, 1);
    g.strokeCircle(pointer.x, pointer.y, 14);
    // center dot
    g.fillStyle(0x7fe7ff, 1);
    g.fillCircle(pointer.x, pointer.y, 3);
    // dwell fill ring
    if (dwellProgress > 0) {
      g.lineStyle(4, 0xffe08a, 1);
      g.beginPath();
      g.arc(pointer.x, pointer.y, 20, -Math.PI / 2,
        -Math.PI / 2 + dwellProgress * Math.PI * 2, false);
      g.strokePath();
    }
  }
}
```

- [ ] **Step 2: Implement `src/systems/FeedbackSystem.js`**

```javascript
export class FeedbackSystem {
  constructor(scene) {
    this.scene = scene;
  }

  burst(x, y, color = 0x7fe7ff) {
    const g = this.scene.add.graphics().setDepth(900);
    let r = 4;
    const tick = this.scene.time.addEvent({
      delay: 16, repeat: 12, callback: () => {
        r += 6;
        g.clear();
        g.lineStyle(3, color, Math.max(0, 1 - r / 80));
        g.strokeCircle(x, y, r);
        if (tick.getRepeatCount() === 0) g.destroy();
      },
    });
  }

  shake(ms = 120, intensity = 0.004) {
    this.scene.cameras.main.shake(ms, intensity);
  }

  tone(kind) {
    // Check the audio CACHE (was the key loaded?), not sound.get() which only
    // finds already-instantiated Sound objects and would never become truthy.
    const audioCache = this.scene.cache && this.scene.cache.audio;
    if (audioCache && audioCache.exists(kind)) {
      this.scene.sound.play(kind);
    }
    // else: no-op until audio assets are added
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/systems/Reticle.js src/systems/FeedbackSystem.js
git commit -m "feat(systems): reticle with dwell ring + feedback juice helpers"
```

---

### Task 10: BootScene + OnboardingScene (teach the controls)

**Files:**
- Create: `src/scenes/BootScene.js`, `src/scenes/OnboardingScene.js`
- Modify: `src/main.js` (register scenes, remove placeholder)

**Interfaces:**
- Consumes: `createGameConfig` (Task 1), `InputController` + `MousePointerAdapter` (Tasks 2–3), `DwellTracker` (Task 4), `Reticle` + `FeedbackSystem` (Task 9), `level01` (Task 7).
- Produces: `BootScene` (key `'Boot'`) that generates placeholder textures and starts `Onboarding`; `OnboardingScene` (key `'Onboarding'`) that teaches pointer + activate + dwell on the level's `onboarding` practice target, then starts `Game` (built in Task 11).

- [ ] **Step 1: Implement `src/scenes/BootScene.js`**

```javascript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Placeholder textures: a soft glowing dot for cells, a healthy dot.
    this._makeDot('cell', 0xff5c7a);
    this._makeDot('boss', 0xff2e63);
    this._makeDot('healthy', 0x64ffb0);
    this.scene.start('Onboarding');
  }

  _makeDot(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(32, 32, 30);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(24, 24, 10);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
}
```

- [ ] **Step 2: Implement `src/scenes/OnboardingScene.js`**

```javascript
import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { level01 } from '../data/level01.js';

export class OnboardingScene extends Phaser.Scene {
  constructor() { super('Onboarding'); }

  create() {
    const beat = level01.find((b) => b.type === 'onboarding');
    this.input.setDefaultCursor('none');
    this.input.mouse.disableContextMenu();

    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 700 });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);

    this.add.text(480, 90, beat.config.text, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5);

    const t = beat.config.practiceTarget;
    this.target = this.add.image(t.x, t.y, 'healthy').setDisplaySize(t.radius * 2, t.radius * 2);
    this._t = t;
    this.hint = this.add.text(480, 400,
      'Move onto the light. Hold still to dwell, or click.', {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#8fb3c9',
      }).setOrigin(0.5);
    this.done = false;
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;
    const t = this._t;
    const over = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= t.radius;
    const dwellState = this.dwell.update(deltaMs, over ? 'practice' : null);
    this.reticle.update(p, dwellState.progress);

    if (this.done) return;
    const activated = (over && this.controller.justPressed()) || dwellState.completed;
    if (activated) {
      this.done = true;
      this.fx.burst(t.x, t.y, 0x64ffb0);
      this.fx.shake();
      this.time.delayedCall(500, () => this.scene.start('Game'));
    }
  }
}
```

- [ ] **Step 3: Update `src/main.js`**

```javascript
import Phaser from 'phaser';
import { createGameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { OnboardingScene } from './scenes/OnboardingScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultScene } from './scenes/ResultScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  ...createGameConfig([BootScene, OnboardingScene, GameScene, ResultScene]),
});
```

Note: `GameScene` and `ResultScene` are created in Tasks 11–12. Until Task 11 lands, temporarily comment out their imports and the two entries in the scene array to keep `npm run dev` running; re-enable them as those tasks complete.

- [ ] **Step 4: Verify onboarding in-browser**

Run: `npm run dev`
Expected: text prompt at top; a green "healthy" dot mid-screen; a cyan reticle follows the mouse with a dwell ring that fills when you hold the cursor over the dot; clicking or completing the dwell pops a burst + screen shake. (Scene will error trying to start `Game` until Task 11 — that's expected; confirm the interaction first.)

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.js src/scenes/OnboardingScene.js src/main.js
git commit -m "feat(scenes): boot textures + onboarding that teaches pointer/dwell"
```

---

### Task 11: GameScene — the playable level (scan, waves, support, ally, boss)

**Files:**
- Create: `src/scenes/GameScene.js`
- Test: `tests/game-flow.test.js` (pure flow-controller extracted below)
- Create: `src/systems/GameFlow.js`

**Interfaces:**
- Consumes: `BeatSequencer` + `level01` (Task 7), `selectTarget` (Task 5), `DifficultySystem` (Task 6), `InputController`/`MousePointerAdapter` (Tasks 2–3), `DwellTracker` (Task 4), `Reticle`/`FeedbackSystem` (Task 9).
- Produces:
  - `GameFlow` (pure) — owns the sequencer + difficulty and decides transitions independent of rendering: `constructor(beats)`, `current()`, `onBeatComplete(elapsedMs)` → advances, records wave timing when the completed beat had a `targetMs`, returns the next beat (or `null`). Exposes `difficulty` (a `DifficultySystem`).
  - `GameScene` (key `'Game'`) — renders each beat type and drives it with the input model; on the final `resolution` beat, starts `Result` passing the played outcome.

- [ ] **Step 1: Write the failing test for `GameFlow`**

`tests/game-flow.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { GameFlow } from '../src/systems/GameFlow.js';

describe('GameFlow', () => {
  it('advances through beats and eases difficulty on slow waves', () => {
    const beats = [
      { id: 'w', type: 'wave', config: { targetMs: 5000 } },
      { id: 'b', type: 'boss', config: {} },
    ];
    const flow = new GameFlow(beats);
    expect(flow.current().id).toBe('w');
    const next = flow.onBeatComplete(9000); // slow wave -> struggle up
    expect(next.id).toBe('b');
    expect(flow.difficulty.enemySpeedMultiplier()).toBeLessThan(1);
  });

  it('returns null after the last beat', () => {
    const flow = new GameFlow([{ id: 'x', type: 'resolution', config: {} }]);
    expect(flow.onBeatComplete(0)).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/game-flow.test.js`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement `src/systems/GameFlow.js`**

```javascript
import { BeatSequencer } from './BeatSequencer.js';
import { DifficultySystem } from './DifficultySystem.js';

export class GameFlow {
  constructor(beats) {
    this._seq = new BeatSequencer(beats);
    this.difficulty = new DifficultySystem();
  }
  current() { return this._seq.current(); }
  onBeatComplete(elapsedMs) {
    const beat = this._seq.current();
    if (beat && beat.config && typeof beat.config.targetMs === 'number') {
      this.difficulty.recordWaveTime(elapsedMs, beat.config.targetMs);
    }
    return this._seq.advance();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/game-flow.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/scenes/GameScene.js`**

```javascript
import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { GameFlow } from '../systems/GameFlow.js';
import { selectTarget } from '../systems/targeting.js';
import { level01 } from '../data/level01.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.input.setDefaultCursor('none');
    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 800 });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);
    this.flow = new GameFlow(level01);

    this.label = this.add.text(480, 40, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5).setDepth(500);

    this.cells = [];      // active enemy sprites: {id, sprite, radius, hp}
    this.supports = [];   // dim patches to restore
    this.beatStart = 0;
    this._enterBeat(this.flow.current());
  }

  _clearActors() {
    this.cells.forEach((c) => c.sprite.destroy());
    this.supports.forEach((s) => s.sprite.destroy());
    this.cells = [];
    this.supports = [];
  }

  _spawnCells(defs, tex = 'cell') {
    defs.forEach((d, i) => {
      const sprite = this.add.image(d.x, d.y, tex).setDisplaySize(d.radius * 2, d.radius * 2);
      this.cells.push({ id: `${tex}-${i}-${d.x}-${d.y}`, sprite, radius: d.radius, hp: d.hp ?? 1 });
    });
  }

  _enterBeat(beat) {
    this._clearActors();
    this.beatStart = this.time.now;
    if (!beat) { this._finish(); return; }
    this.label.setText(beat.config.label || '');

    switch (beat.type) {
      case 'onboarding': // onboarding handled in its own scene; skip if present
        this._advance(); break;
      case 'scan':
        this.label.setText('Sweep the fog. Reveal what\'s hidden.');
        this._spawnCells([{ x: 480, y: 230, radius: 26, hp: 1 }]);
        break;
      case 'wave':
        this._spawnCells(beat.config.enemies);
        break;
      case 'support':
        beat.config.dimPatches.forEach((d, i) => {
          const sprite = this.add.image(d.x, d.y, 'healthy')
            .setDisplaySize(d.radius * 2, d.radius * 2).setAlpha(0.2);
          this.supports.push({ id: `sup-${i}`, sprite, radius: d.radius, x: d.x, y: d.y });
        });
        break;
      case 'chemoAlly':
        this._runChemoAlly(beat.config);
        break;
      case 'boss':
        this._spawnCells([beat.config.mass], 'boss');
        this.bossChargeMs = beat.config.chargeMs;
        break;
      case 'resolution':
        this._finish(); break;
      default:
        this._advance();
    }
  }

  _runChemoAlly(config) {
    // A friendly pulse the player aims: a moving beam of light toward the cluster.
    this._spawnCells(config.cluster);
    const pulse = this.add.image(-40, 270, 'healthy').setDisplaySize(60, 60).setAlpha(0.9);
    this.tweens.add({
      targets: pulse, x: 500, duration: 1200, ease: 'Sine.out',
      onComplete: () => pulse.destroy(),
    });
    this.fx.tone('heal');
  }

  _advance() {
    const elapsed = this.time.now - this.beatStart;
    const next = this.flow.onBeatComplete(elapsed);
    this._enterBeat(next);
  }

  _finish() {
    const end = level01.find((b) => b.type === 'resolution');
    this.scene.start('Result', { text: end.config.text });
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;

    const targets = this.cells.map((c) => ({
      id: c.id, x: c.sprite.x, y: c.sprite.y, radius: c.radius,
    }));
    const assist = this.flow.difficulty.assistRadius();
    const targetId = selectTarget(p, targets, assist);

    // Support patches use dwell-to-restore.
    let dwellKey = null;
    const overSupport = this.supports.find(
      (s) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= s.radius);
    if (overSupport) dwellKey = overSupport.id;
    else if (targetId) dwellKey = targetId;

    const dwellState = this.dwell.update(deltaMs, dwellKey);
    this.reticle.update(p, dwellState.progress);

    const fire = this.controller.justPressed() || dwellState.completed;
    if (!fire) return;

    if (overSupport && (dwellState.completed || this.controller.justPressed())) {
      overSupport.sprite.setAlpha(1);
      this.fx.burst(overSupport.x, overSupport.y, 0x64ffb0);
      this.supports = this.supports.filter((s) => s !== overSupport);
    } else if (targetId) {
      const cell = this.cells.find((c) => c.id === targetId);
      if (cell) {
        cell.hp -= 1;
        this.fx.burst(cell.sprite.x, cell.sprite.y, 0xff5c7a);
        this.fx.shake(90, 0.003);
        this.fx.tone('hit');
        if (cell.hp <= 0) {
          cell.sprite.destroy();
          this.cells = this.cells.filter((c) => c.id !== targetId);
        } else {
          this.tweens.add({ targets: cell.sprite, scale: cell.sprite.scale * 0.85, duration: 120 });
        }
      }
    }

    if (this.cells.length === 0 && this.supports.length === 0) {
      this.time.delayedCall(250, () => this._advance());
    }
  }
}
```

- [ ] **Step 6: Verify the level plays start-to-finish in-browser**

Run: `npm run dev`
Expected: after onboarding, the Game scene runs each beat — reveal cell, clear a wave (coarse aim works via assist), restore dim patches by dwelling, the chemo pulse sweeps through the cluster, the boss takes multiple hits, then it transitions to the Result scene. Confirm you can NEVER reach a "lose" screen and that struggling (deliberately missing/stalling) makes enemies no harder.

- [ ] **Step 7: Commit**

```bash
git add src/systems/GameFlow.js src/scenes/GameScene.js tests/game-flow.test.js
git commit -m "feat(scenes): playable level with scan/wave/support/ally/boss beats"
```

---

### Task 12: ResultScene — heal payoff + post check-in

**Files:**
- Create: `src/scenes/ResultScene.js`

**Interfaces:**
- Consumes: `CheckInStore` (Task 8), `FeedbackSystem` (Task 9).
- Produces: `ResultScene` (key `'Result'`) receiving `{ text }` via `init(data)`. Shows the region "blooming" to healthy light, the resolution text, a one-tap 1–5 "how in control do you feel now?" scale, saves the check-in locally, then offers replay (restart at `Onboarding`).

- [ ] **Step 1: Implement `src/scenes/ResultScene.js`**

```javascript
import Phaser from 'phaser';
import { CheckInStore } from '../clinical/CheckIn.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this._text = (data && data.text) || 'You restored this. Well done.'; }

  create() {
    this.input.setDefaultCursor('default');
    const fx = new FeedbackSystem(this);

    // "Bloom": expanding healthy light.
    const bloom = this.add.image(480, 250, 'healthy').setDisplaySize(20, 20).setAlpha(0.9);
    this.tweens.add({ targets: bloom, displayWidth: 1200, displayHeight: 1200, alpha: 0.15, duration: 1400, ease: 'Sine.out' });
    fx.tone('win');

    this.add.text(480, 120, this._text, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#eafff5', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(480, 300, 'How in control do you feel right now?', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff',
    }).setOrigin(0.5).setDepth(10);

    const store = new CheckInStore(this._safeStorage());
    for (let n = 1; n <= 5; n++) {
      const bx = 480 + (n - 3) * 70;
      const btn = this.add.text(bx, 360, String(n), {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#7fe7ff',
        backgroundColor: '#12203a', padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        // pre defaults to 3 in the slice (no pre-scene yet); ts from performance clock.
        // Never let a storage write (quota/private-mode) crash the tap.
        try {
          store.save({ pre: 3, post: n, ts: Math.round(this.time.now) });
        } catch (e) {
          // storage unavailable; proceed without blocking the experience
        }
        this._thanks();
      });
    }
  }

  _thanks() {
    this.children.list
      .filter((c) => c.setInteractive && c.input)
      .forEach((c) => c.disableInteractive());
    this.add.text(480, 440, 'Thank you. Tap to play again.', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#8fb3c9',
    }).setOrigin(0.5).setDepth(10);
    this.input.once('pointerdown', () => this.scene.start('Onboarding'));
  }

  _safeStorage() {
    try {
      window.localStorage.getItem('probe');
      return window.localStorage;
    } catch {
      const m = new Map();
      return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    }
  }
}
```

- [ ] **Step 2: Verify the full loop in-browser**

Run: `npm run dev`
Expected: completing the level shows the bloom animation, resolution text, and a 1–5 scale. Tapping a number records it (check `localStorage['sentinel.checkins']` in DevTools — an array with `{pre, post, delta, ts}`), shows thanks, and tapping again restarts at Onboarding.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/ResultScene.js
git commit -m "feat(scenes): heal-bloom resolution + local post-session check-in"
```

---

### Task 13: Full-slice verification pass + playtest checklist

**Files:**
- Create: `docs/playtest-checklist.md`

**Interfaces:**
- Consumes: the whole app.
- Produces: a documented manual verification pass tied to the spec's therapeutic constraints.

- [ ] **Step 1: Run the automated suite**

Run: `npm test`
Expected: all suites pass (config, input-controller, mouse-adapter, dwell-tracker, targeting, difficulty-system, beat-sequencer, checkin, game-flow).

- [ ] **Step 2: Create `docs/playtest-checklist.md`**

```markdown
# Sentinel Vertical Slice — Playtest Checklist
**Date:** 2026-07-03
**Content Type:** Test Checklist

Verify each against the therapeutic constraints (spec §2):

- [ ] No path reaches a "lose" / "game over" / "your body failed" state.
- [ ] Entire slice is completable one-handed using ONLY dwell (no clicks).
- [ ] Entire slice is completable using ONLY activate (clicks), no dwell.
- [ ] Coarse, jittery pointing still hits targets (aim-assist visibly forgiving).
- [ ] Deliberately stalling on the wave makes enemies slower/assist wider — never harder.
- [ ] Onboarding teaches pointer + activate + dwell before real gameplay.
- [ ] The chemo-pulse beat reads as "treatment helping me," not an enemy.
- [ ] Boss clear + region bloom lands as "I did that" (agency payoff).
- [ ] Post check-in saves locally with no PII; delta computed correctly.
- [ ] Full run takes ~3–5 minutes at a calm pace.
```

- [ ] **Step 3: Walk the checklist in-browser**

Run: `npm run dev` and complete every checklist item. Fix any failures before committing. Re-run `npm test` after any code change.

- [ ] **Step 4: Commit**

```bash
git add docs/playtest-checklist.md
git commit -m "docs: vertical-slice playtest checklist tied to therapeutic constraints"
```

---

## Self-Review Notes

**Spec coverage:** §3 stack → Task 1. §4 input model → Tasks 2–4, 9. §5 core loop → Task 11. §6 vertical slice beats (onboarding/scan/wave/support/chemoAlly/boss/resolution) → Tasks 7, 10, 11, 12. §7 architecture/file layout → all tasks follow the spec tree. §8 clinical hook → Tasks 8, 12. §9 testing (Vitest logic + manual checklist) → Tasks 1–8, 11 (unit) and 13 (manual). §2 no-fail-state constraint → Task 6 (structural) + Task 13 (verified).

**Type consistency:** `InputController` API (`pointer`, `held`, `justPressed`, `update`) is consistent across Tasks 2/10/11. `selectTarget(pointer, targets, assistRadius)` signature consistent Tasks 5/11. `DwellTracker.update(dtMs, key) → {progress, completed, targetKey}` consistent Tasks 4/10/11. `CheckInStore.save({pre,post,ts})` consistent Tasks 8/12. `GameFlow.onBeatComplete/current/difficulty` consistent Tasks 11.

**Placeholder scan:** no TODO/TBD; every code step shows complete code; manual-verification steps are used only where behavior is visual (Phaser rendering), consistent with spec §9.
