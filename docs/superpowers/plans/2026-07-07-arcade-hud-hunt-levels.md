# Arcade HUD + Moving-Cell Hunt Levels Implementation Plan

**Date**: 2026-07-07
**Content Type**: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework levels 1–3 into "destroy the moving cancer cells, avoid the healthy blue cells" hunts with an arcade HUD (score, mission counter, combo, floating popups) and a richer procedural playfield, per the approved spec `docs/superpowers/specs/2026-07-07-arcade-hud-hunt-levels-design.md`.

**Architecture:** Approach A — a new `hunt` beat type inside the existing GameScene. New pure-logic modules (`ScoreSystem`, `motion.js`, `HuntTracker`) are unit-tested with Vitest; new Phaser modules (`HudSystem`, `sprites.js`, BootScene textures) are gated by `npm run build` + manual playtest. Levels stay data files.

**Tech Stack:** Phaser 3 (^3.80), plain JavaScript ES modules, Vite, Vitest. No TypeScript, no new dependencies.

## Global Constraints

- **No fail state, ever.** Nothing counts down, nothing harms the player, the mission counter only ascends, every level is always completable. Do not add any lose/game-over concept.
- **Dwell parity.** Every activation must work by dwell OR click. Dwell keys ONLY on cancer cells (never healthy cells), so dwell-only players can never be forced into a combo reset.
- **Safe circle.** All content inside center (360, 360), radius ~330 (`DISPLAY.safe` from `src/systems/CircularDisplay.js`).
- **Patient-facing text ≥ 18px.** No exceptions, including popups and cues.
- **Never hardcode a dwellMs literal** — scenes already import `DWELL_MS` from `src/systems/pacing.js`; do not change that.
- **Data local-only, no PII.** Score is transient — never write it to ProgressStore or localStorage.
- **Healthy-cell hit**: gentle cue + combo reset to x1 only. No damage, no score loss, no cooldown.
- Commit messages: end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- In this dev environment subagents cannot `git commit` (permission-blocked): subagents `git add` only and report; the controller session commits.
- Shell is PowerShell 5.1: no `&&` chaining. Run commands one at a time or separate with `;`.

---

### Task 1: ScoreSystem (pure logic, TDD)

**Files:**
- Create: `src/systems/ScoreSystem.js`
- Test: `tests/score-system.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `class ScoreSystem` with `hitCancer() -> { points, multiplier, total }` (points = 50 × multiplier *before* increment; `multiplier` in the return is the NEW multiplier after increment, capped at 8 — it is what the HUD displays), `hitHealthy() -> void` (resets multiplier to 1, keeps total), `state() -> { total, multiplier }`. Exported consts `BASE_POINTS = 50`, `MAX_MULTIPLIER = 8`.

- [ ] **Step 1: Write the failing test**

Create `tests/score-system.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { ScoreSystem, BASE_POINTS, MAX_MULTIPLIER } from '../src/systems/ScoreSystem.js';

describe('ScoreSystem', () => {
  it('starts at zero score, x1 multiplier', () => {
    const s = new ScoreSystem();
    expect(s.state()).toEqual({ total: 0, multiplier: 1 });
  });

  it('scores 50 x multiplier per cancer hit, then increments the multiplier', () => {
    const s = new ScoreSystem();
    const first = s.hitCancer();
    expect(first.points).toBe(50);        // 50 x 1
    expect(first.total).toBe(50);
    expect(first.multiplier).toBe(2);     // new multiplier, for the HUD
    const second = s.hitCancer();
    expect(second.points).toBe(100);      // 50 x 2
    expect(second.total).toBe(150);
    expect(second.multiplier).toBe(3);
  });

  it('caps the multiplier at x8', () => {
    const s = new ScoreSystem();
    for (let i = 0; i < 20; i++) s.hitCancer();
    expect(s.state().multiplier).toBe(MAX_MULTIPLIER);
    const hit = s.hitCancer();
    expect(hit.points).toBe(BASE_POINTS * MAX_MULTIPLIER); // 400
    expect(hit.multiplier).toBe(MAX_MULTIPLIER);
  });

  it('healthy hit resets the multiplier to x1 but never touches the total', () => {
    const s = new ScoreSystem();
    s.hitCancer();
    s.hitCancer();
    const before = s.state().total;
    s.hitHealthy();
    expect(s.state()).toEqual({ total: before, multiplier: 1 });
  });

  it('has no time-decay API — the combo waits patiently', () => {
    const s = new ScoreSystem();
    expect(s.tick).toBeUndefined();
    expect(s.decay).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/score-system.test.js`
Expected: FAIL — cannot resolve `../src/systems/ScoreSystem.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/systems/ScoreSystem.js`:

```js
// Per-level, transient score. Never persisted: no stored bests means a worse
// day (more fatigue) can never read as "doing worse than before".
//
// Each cancer hit scores BASE_POINTS x current multiplier, then the multiplier
// increments (capped). A healthy-cell hit resets the multiplier to x1 — the
// only consequence anywhere for imprecision. There is deliberately NO time
// decay: slow play is never punished.
export const BASE_POINTS = 50;
export const MAX_MULTIPLIER = 8;

export class ScoreSystem {
  constructor() {
    this._total = 0;
    this._multiplier = 1;
  }

  hitCancer() {
    const points = BASE_POINTS * this._multiplier;
    this._total += points;
    this._multiplier = Math.min(MAX_MULTIPLIER, this._multiplier + 1);
    return { points, multiplier: this._multiplier, total: this._total };
  }

  hitHealthy() {
    this._multiplier = 1;
  }

  state() {
    return { total: this._total, multiplier: this._multiplier };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/score-system.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/ScoreSystem.js tests/score-system.test.js
git commit -m "feat(score): transient per-level ScoreSystem with patient combo (no time decay)"
```

---

### Task 2: motion.js (pure logic, TDD)

**Files:**
- Create: `src/systems/motion.js`
- Test: `tests/motion.test.js`

**Interfaces:**
- Consumes: `DISPLAY` from `src/systems/CircularDisplay.js` (that module is Phaser-free; safe to import in Node tests).
- Produces:
  - Consts: `FOCUS_SLOW = 0.25`, `WANDER_TURN_RAD_PER_S = 0.9`, `SPAWN_INTERVAL_MS = 2600`.
  - `stepMover(mover, dtMs, { speedMultiplier = 1, focused = false, rand = Math.random, bounds } = {}) -> mover` — pure, returns a NEW mover object `{ x, y, heading, speed, radius }`.
  - `spawnPosition(rand, cellRadius, avoid = null, bounds) -> { x, y }` — `avoid` is `{ x, y, minDist }` or null.

- [ ] **Step 1: Write the failing test**

Create `tests/motion.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  stepMover, spawnPosition, FOCUS_SLOW, SPAWN_INTERVAL_MS,
} from '../src/systems/motion.js';

// Deterministic pseudo-random for reproducible tests.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const noTurn = () => 0.5; // rand()*2-1 === 0 -> heading never drifts

describe('stepMover', () => {
  it('moves along its heading at speed px/s', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 500, { rand: noTurn });
    expect(next.x).toBeCloseTo(410); // 100 px/s * 0.5s
    expect(next.y).toBeCloseTo(360);
  });

  it('does not mutate the input mover', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    stepMover(m, 500, { rand: noTurn });
    expect(m.x).toBe(360);
  });

  it('applies the difficulty speed multiplier', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 500, { rand: noTurn, speedMultiplier: 0.4 });
    expect(next.x).toBeCloseTo(380); // 100 * 0.4 * 0.5
  });

  it('focus-slows a locked cell to FOCUS_SLOW of its speed', () => {
    const m = { x: 360, y: 360, heading: 0, speed: 100, radius: 20 };
    const next = stepMover(m, 1000, { rand: noTurn, focused: true });
    expect(next.x).toBeCloseTo(360 + 100 * FOCUS_SLOW);
  });

  it('keeps cells inside the safe circle and turns them back toward center', () => {
    // Start at the right edge heading straight out.
    const m = { x: 360 + 305, y: 360, heading: 0, speed: 200, radius: 20 };
    const next = stepMover(m, 1000, { rand: noTurn });
    const dist = Math.hypot(next.x - 360, next.y - 360);
    expect(dist).toBeLessThanOrEqual(330 - 20 + 0.001);
    expect(Math.cos(next.heading)).toBeLessThan(0); // now pointing back inward
  });
});

describe('spawnPosition', () => {
  it('always lands inside the safe circle', () => {
    const rand = lcg(42);
    for (let i = 0; i < 100; i++) {
      const p = spawnPosition(rand, 28);
      expect(Math.hypot(p.x - 360, p.y - 360)).toBeLessThanOrEqual(330 - 28 + 0.001);
    }
  });

  it('avoids the given point when asked', () => {
    const rand = lcg(7);
    for (let i = 0; i < 50; i++) {
      const p = spawnPosition(rand, 28, { x: 360, y: 360, minDist: 120 });
      expect(Math.hypot(p.x - 360, p.y - 360)).toBeGreaterThanOrEqual(120);
    }
  });
});

describe('feel constants', () => {
  it('spawns trickle gently (slower than one per second)', () => {
    expect(SPAWN_INTERVAL_MS).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/motion.test.js`
Expected: FAIL — cannot resolve `../src/systems/motion.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/systems/motion.js`:

```js
import { DISPLAY } from './CircularDisplay.js';

// Movement FEEL constants live here (single place to tune how drifting cells
// feel); per-level SPEEDS live in the level data files.
export const FOCUS_SLOW = 0.25;           // a locked cell drifts at 25% speed
export const WANDER_TURN_RAD_PER_S = 0.9; // max random heading drift per second
export const SPAWN_INTERVAL_MS = 2600;    // gentle trickle between cancer spawns

const SAFE = { cx: DISPLAY.cx, cy: DISPLAY.cy, radius: DISPLAY.safe };

// One movement step for a drifting cell. Pure — returns a new mover.
// mover: { x, y, heading (radians), speed (px/s), radius (px) }
export function stepMover(mover, dtMs, {
  speedMultiplier = 1, focused = false, rand = Math.random, bounds = SAFE,
} = {}) {
  const dt = dtMs / 1000;
  let heading = mover.heading + (rand() * 2 - 1) * WANDER_TURN_RAD_PER_S * dt;
  const speed = mover.speed * speedMultiplier * (focused ? FOCUS_SLOW : 1);
  let x = mover.x + Math.cos(heading) * speed * dt;
  let y = mover.y + Math.sin(heading) * speed * dt;

  const maxR = bounds.radius - mover.radius;
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    // Clamp onto the boundary and turn back toward center (with jitter) so a
    // cell never leaves the safe circle and never sticks to the rim.
    x = bounds.cx + (dx / dist) * maxR;
    y = bounds.cy + (dy / dist) * maxR;
    heading = Math.atan2(bounds.cy - y, bounds.cx - x) + (rand() - 0.5) * 0.8;
  }
  return { ...mover, x, y, heading };
}

// Random position inside the safe circle (uniform over area), staying
// `avoid.minDist` away from `avoid` when possible (gives up after 20 tries so
// it can never loop forever).
export function spawnPosition(rand, cellRadius, avoid = null, bounds = SAFE) {
  const maxR = bounds.radius - cellRadius;
  let x = bounds.cx;
  let y = bounds.cy;
  for (let i = 0; i < 20; i++) {
    const r = Math.sqrt(rand()) * maxR;
    const a = rand() * Math.PI * 2;
    x = bounds.cx + Math.cos(a) * r;
    y = bounds.cy + Math.sin(a) * r;
    if (!avoid || Math.hypot(x - avoid.x, y - avoid.y) >= avoid.minDist) break;
  }
  return { x, y };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/motion.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/motion.js tests/motion.test.js
git commit -m "feat(motion): pure drift/bounce/focus-slow movement helpers for hunt levels"
```

---

### Task 3: HuntTracker (pure logic, TDD)

**Files:**
- Create: `src/systems/HuntTracker.js`
- Test: `tests/hunt-tracker.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `class HuntTracker` constructed with `{ missionTotal, maxConcurrent, twoHpEvery = 0 }`; methods `canSpawn(activeCount) -> boolean`, `nextHp() -> 1|2` (increments the spawned counter; every `twoHpEvery`-th spawn is 2 HP, `0` disables), `recordKill() -> void`, `killed() -> number`, `spawned() -> number`, `missionTotal() -> number`, `isComplete() -> boolean`.

- [ ] **Step 1: Write the failing test**

Create `tests/hunt-tracker.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { HuntTracker } from '../src/systems/HuntTracker.js';

describe('HuntTracker', () => {
  it('spawns until the field cap, then waits for room', () => {
    const t = new HuntTracker({ missionTotal: 12, maxConcurrent: 4 });
    expect(t.canSpawn(3)).toBe(true);
    expect(t.canSpawn(4)).toBe(false); // field is full
  });

  it('never spawns past missionTotal', () => {
    const t = new HuntTracker({ missionTotal: 2, maxConcurrent: 4 });
    t.nextHp();
    t.nextHp();
    expect(t.spawned()).toBe(2);
    expect(t.canSpawn(0)).toBe(false); // everything has already spawned
  });

  it('gives every twoHpEvery-th spawn 2 HP', () => {
    const t = new HuntTracker({ missionTotal: 8, maxConcurrent: 8, twoHpEvery: 4 });
    const hps = Array.from({ length: 8 }, () => t.nextHp());
    expect(hps).toEqual([1, 1, 1, 2, 1, 1, 1, 2]);
  });

  it('defaults to all 1-HP cells', () => {
    const t = new HuntTracker({ missionTotal: 4, maxConcurrent: 4 });
    expect([t.nextHp(), t.nextHp(), t.nextHp(), t.nextHp()]).toEqual([1, 1, 1, 1]);
  });

  it('completes when killed reaches missionTotal — the counter only ascends', () => {
    const t = new HuntTracker({ missionTotal: 3, maxConcurrent: 3 });
    t.recordKill();
    t.recordKill();
    expect(t.isComplete()).toBe(false);
    t.recordKill();
    expect(t.isComplete()).toBe(true);
    expect(t.killed()).toBe(3);
    expect(t.missionTotal()).toBe(3);
  });

  it('has no failure concept', () => {
    const t = new HuntTracker({ missionTotal: 3, maxConcurrent: 3 });
    expect(t.isGameOver).toBeUndefined();
    expect(t.hasLost).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hunt-tracker.test.js`
Expected: FAIL — cannot resolve `../src/systems/HuntTracker.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/systems/HuntTracker.js`:

```js
// Spawn/kill bookkeeping for a hunt beat. Pure logic, no failure concept by
// construction: the mission counter only ever counts up, and the hunt is
// complete when every cancer cell has been cleared — always reachable.
export class HuntTracker {
  constructor({ missionTotal, maxConcurrent, twoHpEvery = 0 }) {
    this._total = missionTotal;
    this._max = maxConcurrent;
    this._every = twoHpEvery;
    this._spawned = 0;
    this._killed = 0;
  }

  canSpawn(activeCount) {
    return this._spawned < this._total && activeCount < this._max;
  }

  // Called once per spawn: advances the spawn counter and returns the new
  // cell's HP (every `twoHpEvery`-th spawn is a tougher 2-HP cell).
  nextHp() {
    this._spawned += 1;
    return this._every > 0 && this._spawned % this._every === 0 ? 2 : 1;
  }

  recordKill() { this._killed += 1; }
  killed() { return this._killed; }
  spawned() { return this._spawned; }
  missionTotal() { return this._total; }
  isComplete() { return this._killed >= this._total; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/hunt-tracker.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/HuntTracker.js tests/hunt-tracker.test.js
git commit -m "feat(hunt): HuntTracker spawn/kill bookkeeping (no failure concept)"
```

---

### Task 4: Level data rewrite (hunt beats)

**Files:**
- Modify: `src/levels/level01.js` (full replacement)
- Modify: `src/levels/level02.js` (full replacement)
- Modify: `src/levels/level03.js` (full replacement)
- Test: `tests/levels.test.js` (append a describe block)

**Interfaces:**
- Consumes: nothing (data only).
- Produces: each level exports its beats array as before (`level01Beats` etc.). Hunt beat shape consumed by GameScene in Task 7: `{ id, type: 'hunt', config: { label, missionTotal, maxConcurrent, healthyCount, baseSpeed, killTargetMs, cellRadius, twoHpEvery } }`. Resolution texts are kept verbatim from the current files. `src/levels/index.js` is NOT touched.

- [ ] **Step 1: Add the failing tests**

Append to `tests/levels.test.js` (inside the file, after the existing `describe`):

```js
describe('hunt levels', () => {
  const HUNT_IDS = ['l1', 'l2', 'l3'];

  it('l1–l3 are exactly one hunt beat + one resolution beat', () => {
    for (const id of HUNT_IDS) {
      const beats = getLevel(id).beats;
      expect(beats.length).toBe(2);
      expect(beats[0].type).toBe('hunt');
      expect(beats[1].type).toBe('resolution');
    }
  });

  it('hunt configs carry every field GameScene needs', () => {
    for (const id of HUNT_IDS) {
      const c = getLevel(id).beats[0].config;
      expect(c.missionTotal).toBeGreaterThan(0);
      expect(c.maxConcurrent).toBeGreaterThan(0);
      expect(c.healthyCount).toBeGreaterThan(0);
      expect(c.baseSpeed).toBeGreaterThan(0);
      expect(c.killTargetMs).toBeGreaterThan(0);
      expect(c.cellRadius).toBeGreaterThan(0);
      expect(c.twoHpEvery).toBeGreaterThanOrEqual(0);
      expect(typeof c.label).toBe('string');
    }
  });

  it('difficulty rises purely by drift speed L1 -> L3', () => {
    const speeds = HUNT_IDS.map((id) => getLevel(id).beats[0].config.baseSpeed);
    expect(speeds[0]).toBeLessThan(speeds[1]);
    expect(speeds[1]).toBeLessThan(speeds[2]);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/levels.test.js`
Expected: the 3 new tests FAIL (beats are still 4–6 long, no hunt type); the 4 existing tests still pass.

- [ ] **Step 3: Replace the three level files**

`src/levels/level01.js` (entire file):

```js
// Level 1 — Bloodstream. The gentlest hunt: few cells, slowest drift.
export const level01Beats = [
  { id: 'l1-hunt', type: 'hunt', config: {
    label: 'Clear the bloodstream.\nThe blue cells are yours — let them be.',
    missionTotal: 12,
    maxConcurrent: 4,
    healthyCount: 3,
    baseSpeed: 20,      // px/s — deliberately slow for fatigued players
    killTargetMs: 9000, // pace-of-kills target feeding DifficultySystem easing
    cellRadius: 28,
    twoHpEvery: 0,
  } },
  { id: 'l1-end', type: 'resolution', config: {
    text: 'The bloodstream is clear.\nWell done.',
  } },
];
```

`src/levels/level02.js` (entire file):

```js
// Level 2 — The Lungs. More cells, a little faster.
export const level02Beats = [
  { id: 'l2-hunt', type: 'hunt', config: {
    label: 'Clear the lungs.\nMind the healthy blue cells.',
    missionTotal: 16,
    maxConcurrent: 5,
    healthyCount: 4,
    baseSpeed: 32,
    killTargetMs: 8000,
    cellRadius: 26,
    twoHpEvery: 0,
  } },
  { id: 'l2-end', type: 'resolution', config: {
    text: 'The lungs can breathe again.',
  } },
];
```

`src/levels/level03.js` (entire file):

```js
// Level 3 — The Core. Fastest drift; every 4th cell is a tougher 2-HP cell
// that shows a cracked state after the first hit.
export const level03Beats = [
  { id: 'l3-hunt', type: 'hunt', config: {
    label: 'The tumor core.\nClear every last one — the blue cells are yours.',
    missionTotal: 20,
    maxConcurrent: 6,
    healthyCount: 5,
    baseSpeed: 45,
    killTargetMs: 8000,
    cellRadius: 26,
    twoHpEvery: 4,
  } },
  { id: 'l3-end', type: 'resolution', config: {
    text: 'You reached the core — and cleared it.\nYou fought the whole way.',
  } },
];
```

- [ ] **Step 4: Run the levels tests to verify they pass**

Run: `npx vitest run tests/levels.test.js`
Expected: PASS (7 tests — 4 existing + 3 new).

- [ ] **Step 5: Run the whole suite (GameScene isn't unit-tested, so nothing else should break)**

Run: `npm test`
Expected: all tests pass. (The game itself won't render hunt beats until Task 7 — that's fine; levels are data and the manifest tests still hold.)

- [ ] **Step 6: Commit**

```bash
git add src/levels/level01.js src/levels/level02.js src/levels/level03.js tests/levels.test.js
git commit -m "feat(levels): rework l1-l3 into single-hunt beats with speed-based difficulty"
```

---

### Task 5: sprites.js + BootScene art upgrade

**Files:**
- Create: `src/systems/sprites.js`
- Modify: `src/scenes/BootScene.js` (full replacement)

**Interfaces:**
- Consumes: nothing.
- Produces: `SPRITES` lookup — `{ cancer: 'cancer', cancerCracked: 'cancerCracked', healthy: 'healthyCell', rbc: 'rbc', bokeh: 'bokeh' }`. BootScene generates those five textures plus the legacy `cell`, `boss`, `healthy` dots (FTUE/ResultScene still use them) and a deep blue-violet `bgGlow`. All new cell textures are 96×96 so `setTexture` swaps (cancer → cracked) keep the sprite's display size.

**No unit tests** — Phaser texture generation. Gate: `npm run build` + manual playtest later.

- [ ] **Step 1: Create the sprite lookup**

Create `src/systems/sprites.js`:

```js
// Logical sprite names -> texture keys. Hunt-level code references these
// names only, so real PNG art can replace the procedural textures later by
// loading images under the same keys in BootScene — zero scene-code changes.
export const SPRITES = {
  cancer: 'cancer',
  cancerCracked: 'cancerCracked',
  healthy: 'healthyCell',
  rbc: 'rbc',
  bokeh: 'bokeh',
};
```

- [ ] **Step 2: Replace BootScene**

`src/scenes/BootScene.js` (entire file):

```js
import Phaser from 'phaser';
import { SPRITES } from '../systems/sprites.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Legacy simple dots — FTUE and ResultScene still use these keys.
    this._makeDot('cell', 0xff5c7a);
    this._makeDot('boss', 0xff2e63);
    this._makeDot('healthy', 0x64ffb0);

    // Hunt-level playfield textures (procedural for now; PNG-swappable via
    // the SPRITES lookup in src/systems/sprites.js).
    this._makeCancer(SPRITES.cancer, false);
    this._makeCancer(SPRITES.cancerCracked, true);
    this._makeHealthyCell(SPRITES.healthy);
    this._makeRbc(SPRITES.rbc);
    this._makeBokeh(SPRITES.bokeh);

    if (!this.textures.exists('bgGlow')) {
      const bg = this.textures.createCanvas('bgGlow', 720, 720);
      const ctx = bg.getContext();
      // Deep blue-violet biological depth (was teal).
      const grad = ctx.createRadialGradient(360, 360, 20, 360, 360, 360);
      grad.addColorStop(0, '#2b2160');
      grad.addColorStop(0.55, '#161040');
      grad.addColorStop(1, '#080718');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 720);
      bg.refresh();
    }

    this.scene.start('Landing');
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

  // Spiky red cancer cell; `cracked` adds dark fissures (2-HP damage state).
  _makeCancer(key, cracked) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    g.fillStyle(0xd93a52, 1); // spike ring
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.fillCircle(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 8);
    }
    g.fillStyle(0xff4d5e, 1); g.fillCircle(cx, cy, 30);  // body
    g.fillStyle(0xa61e38, 1); g.fillCircle(cx, cy, 16);  // dark core
    g.fillStyle(0xffffff, 0.25); g.fillCircle(cx - 10, cy - 10, 8); // sheen
    if (cracked) {
      g.lineStyle(3, 0x3d0913, 1);
      g.lineBetween(cx - 18, cy - 6, cx + 4, cy + 2);
      g.lineBetween(cx + 4, cy + 2, cx + 16, cy - 12);
      g.lineBetween(cx - 2, cy + 4, cx + 8, cy + 18);
    }
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Translucent blue healthy cell: membrane ring + nucleus.
  _makeHealthyCell(key) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    g.fillStyle(0x4f7ff0, 0.35); g.fillCircle(cx, cy, 34);       // translucent body
    g.lineStyle(4, 0x86b4ff, 0.9); g.strokeCircle(cx, cy, 34);   // membrane
    g.fillStyle(0x2b4bd6, 0.9); g.fillCircle(cx + 6, cy + 4, 12); // nucleus
    g.fillStyle(0xffffff, 0.3); g.fillCircle(cx - 12, cy - 12, 6);
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Red blood cell: disc with darker dimple (biconcave read).
  _makeRbc(key) {
    const g = this.add.graphics();
    g.fillStyle(0xb3273b, 1); g.fillCircle(32, 32, 26);
    g.fillStyle(0x8c1c2e, 1); g.fillCircle(32, 32, 12);
    g.fillStyle(0xd14b60, 0.5); g.fillCircle(24, 24, 6);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  // Soft ambient bokeh dot.
  _makeBokeh(key) {
    const g = this.add.graphics();
    g.fillStyle(0xbfd8ff, 0.25); g.fillCircle(16, 16, 14);
    g.fillStyle(0xdfeaff, 0.5); g.fillCircle(16, 16, 8);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds clean, no errors.

- [ ] **Step 4: Run the full test suite (guards regressions in Phaser-free modules)**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/sprites.js src/scenes/BootScene.js
git commit -m "feat(art): procedural cancer/healthy/rbc/bokeh textures + blue-violet background, PNG-ready sprite lookup"
```

---

### Task 6: HudSystem + FeedbackSystem.killBurst

**Files:**
- Create: `src/systems/HudSystem.js`
- Modify: `src/systems/FeedbackSystem.js` (add one method)

**Interfaces:**
- Consumes: `DISPLAY` from `src/systems/CircularDisplay.js`; the scene passed to the constructor.
- Produces: `class HudSystem` with `setScore(total)`, `setMission(done, total)`, `setCombo(multiplier)` (pop-tween when it grows, dimmed at x1), `popup(x, y, text, color?)` (rising/fading score number), `cue(x, y, text, holdMs = 1600)` (calm ≥18px line, clamped into the safe circle). `FeedbackSystem.killBurst(x, y, color?)` — ring + 8 outward particle dots.
- All HUD text ≥ 18px. Depths: panel/text 1000–1001, popups/cues 1200 (below the 3000 circular chrome).

**No unit tests** — Phaser rendering. Gate: `npm run build` + manual playtest later.

- [ ] **Step 1: Create HudSystem**

Create `src/systems/HudSystem.js`:

```js
import { DISPLAY } from './CircularDisplay.js';

// Arcade HUD for hunt levels: score panel (top center), mission counter under
// it, combo badge (right), floating "+N" popups and calm cue lines.
// Everything sits inside the safe circle; all text >= 18px (patient-facing
// text floor); depths stay below the circular chrome at 3000.
//
// Deliberate exclusions from the reference image (constraint-driven):
// no countdown timer (time pressure), no hearts/health bar (reads as the
// body failing), no pause button (out of scope).
export class HudSystem {
  constructor(scene) {
    this.scene = scene;
    const cx = DISPLAY.cx;

    const panel = scene.add.graphics().setDepth(1000);
    panel.fillStyle(0x141031, 0.72);
    panel.fillRoundedRect(cx - 92, 34, 184, 76, 18);
    panel.lineStyle(2, 0x6f5fd6, 0.8);
    panel.strokeRoundedRect(cx - 92, 34, 184, 76, 18);

    this._scoreLabel = scene.add.text(cx, 52, 'SCORE', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#7fe7ff',
    }).setOrigin(0.5).setDepth(1001);
    this._scoreValue = scene.add.text(cx, 84, '0', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#eafff5', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    this._mission = scene.add.text(cx, 136, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd75e',
    }).setOrigin(0.5).setDepth(1001);
    this._combo = scene.add.text(595, 340, 'x1', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#9dff8a',
      backgroundColor: '#10241a', padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(1001).setAlpha(0.55);
    this._comboValue = 1;
  }

  setScore(total) {
    this._scoreValue.setText(String(total));
  }

  setMission(done, total) {
    this._mission.setText(`Destroy the cancer cells · ${done}/${total}`);
  }

  setCombo(multiplier) {
    const grew = multiplier > this._comboValue;
    this._comboValue = multiplier;
    this._combo.setText(`x${multiplier}`);
    this._combo.setAlpha(multiplier === 1 ? 0.55 : 1);
    if (grew) {
      this.scene.tweens.add({ targets: this._combo, scale: 1.25, duration: 120, yoyo: true });
    }
  }

  popup(x, y, text, color = '#ffd75e') {
    const t = this.scene.add.text(x, y - 20, text, {
      fontFamily: 'sans-serif', fontSize: '20px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1200);
    this.scene.tweens.add({
      targets: t, y: y - 70, alpha: 0, duration: 900, ease: 'Sine.out',
      onComplete: () => t.destroy(),
    });
  }

  // A calm, non-scolding line near a point of interest, clamped so it always
  // stays legible inside the safe circle.
  cue(x, y, text, holdMs = 1600) {
    const px = Math.min(560, Math.max(160, x));
    const py = Math.min(560, Math.max(150, y));
    const t = this.scene.add.text(px, py, text, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#bcd9ff', align: 'center',
    }).setOrigin(0.5).setDepth(1200);
    this.scene.tweens.add({
      targets: t, alpha: 0, delay: holdMs, duration: 500,
      onComplete: () => t.destroy(),
    });
  }
}
```

- [ ] **Step 2: Add killBurst to FeedbackSystem**

In `src/systems/FeedbackSystem.js`, add this method to the class (after `burst`):

```js
  // Destroy feedback: the ripple ring plus 8 particle dots flying outward.
  killBurst(x, y, color = 0xff5c7a) {
    this.burst(x, y, color);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dot = this.scene.add.circle(x, y, 4, color, 0.9).setDepth(900);
      this.scene.tweens.add({
        targets: dot, x: x + Math.cos(a) * 64, y: y + Math.sin(a) * 64,
        alpha: 0, duration: 450, ease: 'Sine.out', onComplete: () => dot.destroy(),
      });
    }
  }
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 4: Commit**

```bash
git add src/systems/HudSystem.js src/systems/FeedbackSystem.js
git commit -m "feat(hud): arcade HUD (score/mission/combo/popups/cues) + killBurst feedback"
```

---

### Task 7: GameScene hunt integration

**Files:**
- Modify: `src/scenes/GameScene.js` (full replacement below)

**Interfaces:**
- Consumes: everything from Tasks 1–6 — `ScoreSystem` (`hitCancer/hitHealthy/state`), `HuntTracker` (`canSpawn/nextHp/recordKill/killed/spawned/missionTotal/isComplete`), `stepMover/spawnPosition/SPAWN_INTERVAL_MS` from `motion.js`, `SPRITES`, `HudSystem`, `FeedbackSystem.killBurst`, `selectTarget` from `targeting.js`, plus existing `DifficultySystem.enemySpeedMultiplier()/assistRadius()` via `GameFlow`.
- Produces: `scene.start('Result', { levelId, text, score })` — `score` is a number for hunt levels, `null` otherwise (ResultScene consumes it in Task 8).

Key behaviors (all from the spec):
- Lock = nearest cell (cancer OR healthy) within `assistRadius()` via `selectTarget`. Healthy ids are prefixed `h-`.
- **Dwell keys ONLY on a locked cancer cell** — a dwell-only player can never be forced into a healthy hit; healthy hits happen only via click.
- Focus-slow applies only to the locked cancer cell.
- Old beat types (`scan/wave/support/chemoAlly/boss`) remain untouched and functional.

**No unit tests** — scene code. Gate: `npm run build` + full suite + manual playtest.

- [ ] **Step 1: Replace GameScene**

`src/scenes/GameScene.js` (entire file):

```js
import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { GameFlow } from '../systems/GameFlow.js';
import { resolveInteraction } from '../systems/resolveInteraction.js';
import { selectTarget } from '../systems/targeting.js';
import { getLevel } from '../levels/index.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';
import { DWELL_MS, BEAT_SETTLE_MS } from '../systems/pacing.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { HuntTracker } from '../systems/HuntTracker.js';
import { stepMover, spawnPosition, SPAWN_INTERVAL_MS } from '../systems/motion.js';
import { SPRITES } from '../systems/sprites.js';
import { HudSystem } from '../systems/HudSystem.js';

const HEALTHY_RADIUS = 30;

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = (data && data.levelId) || 'l1';
    this.levelBeats = getLevel(this.levelId).beats;
  }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);
    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: DWELL_MS });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);
    this.flow = new GameFlow(this.levelBeats);

    this.label = this.add.text(360, 80, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5).setDepth(500);

    this.cells = [];      // active enemy sprites: {id, sprite, radius, hp, maxHp?, mover?}
    this.supports = [];   // dim patches to restore
    this.healthy = [];    // hunt: drifting healthy blue cells (do not shoot)
    this.ambience = [];   // hunt: non-interactive drifting rbc/bokeh
    this.beatStart = 0;
    this._enterBeat(this.flow.current());
  }

  _clearActors() {
    this.cells.forEach((c) => c.sprite.destroy());
    this.supports.forEach((s) => s.sprite.destroy());
    this.healthy.forEach((h) => h.sprite.destroy());
    this.ambience.forEach((a) => a.sprite.destroy());
    this.cells = [];
    this.supports = [];
    this.healthy = [];
    this.ambience = [];
    this._huntActive = false;
  }

  _spawnCells(defs, tex = 'cell') {
    defs.forEach((d, i) => {
      const sprite = this.add.image(d.x, d.y, tex).setDisplaySize(d.radius * 2, d.radius * 2);
      this.cells.push({ id: `${tex}-${i}-${d.x}-${d.y}`, sprite, radius: d.radius, hp: d.hp ?? 1 });
    });
  }

  _enterBeat(beat) {
    this._advancing = false;
    this._clearActors();
    this.beatStart = this.time.now;
    if (!beat) { this._finish(); return; }
    this.label.setText(beat.config.label || '');

    switch (beat.type) {
      case 'scan':
        this.label.setText(beat.config.label || 'Sweep the fog. Reveal what\'s hidden.');
        this._spawnCells(beat.config.cells);
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
        break;
      case 'hunt':
        this._startHunt(beat.config);
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
    const pulse = this.add.image(90, 360, 'healthy').setDisplaySize(60, 60).setAlpha(0.9);
    this.tweens.add({
      targets: pulse, x: 380, duration: 1200, ease: 'Sine.out',
      onComplete: () => pulse.destroy(),
    });
    this.fx.tone('heal');
  }

  // ---------------- hunt beat ----------------

  _startHunt(config) {
    this._huntActive = true;
    this._huntConfig = config;
    // The HUD's mission banner replaces the top label (they share the space).
    this.label.setText('');

    this.tracker = new HuntTracker({
      missionTotal: config.missionTotal,
      maxConcurrent: config.maxConcurrent,
      twoHpEvery: config.twoHpEvery,
    });
    this.score = new ScoreSystem();
    this.hud = new HudSystem(this);
    this.hud.setScore(0);
    this.hud.setCombo(1);
    this.hud.setMission(0, config.missionTotal);
    if (config.label) this.hud.cue(360, 210, config.label, 2600);

    for (let i = 0; i < config.healthyCount; i++) {
      const pos = spawnPosition(Math.random, HEALTHY_RADIUS);
      const sprite = this.add.image(pos.x, pos.y, SPRITES.healthy)
        .setDisplaySize(HEALTHY_RADIUS * 2, HEALTHY_RADIUS * 2).setDepth(5);
      this.healthy.push({
        id: `h-${i}`, sprite, radius: HEALTHY_RADIUS,
        mover: {
          x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2,
          speed: config.baseSpeed * 0.7, radius: HEALTHY_RADIUS,
        },
      });
    }

    this._makeAmbience();
    // A few cells up front so the hunt starts alive; the rest trickle in.
    const initial = Math.min(3, config.maxConcurrent, config.missionTotal);
    for (let i = 0; i < initial; i++) this._spawnCancer();
    this._spawnAccum = 0;
    this._lastKillAt = this.time.now;
  }

  _spawnCancer() {
    const cfg = this._huntConfig;
    const p = this.controller.pointer;
    // Never spawn under the player's reticle.
    const pos = spawnPosition(Math.random, cfg.cellRadius, { x: p.x, y: p.y, minDist: 120 });
    const hp = this.tracker.nextHp();
    const sprite = this.add.image(pos.x, pos.y, SPRITES.cancer)
      .setDisplaySize(cfg.cellRadius * 2, cfg.cellRadius * 2).setAlpha(0).setDepth(6);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 600 });
    this.cells.push({
      id: `cancer-${this.tracker.spawned()}`, sprite, radius: cfg.cellRadius, hp, maxHp: hp,
      mover: {
        x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2,
        speed: cfg.baseSpeed, radius: cfg.cellRadius,
      },
    });
  }

  _makeAmbience() {
    for (let i = 0; i < 4; i++) this._ambientMover(SPRITES.rbc, 22, 0.5, 8, -5);
    for (let i = 0; i < 10; i++) {
      this._ambientMover(SPRITES.bokeh, 6 + Math.random() * 8, 0.25, 4, -6);
    }
  }

  _ambientMover(tex, radius, alpha, speed, depth) {
    const pos = spawnPosition(Math.random, radius);
    const sprite = this.add.image(pos.x, pos.y, tex)
      .setDisplaySize(radius * 2, radius * 2).setAlpha(alpha).setDepth(depth);
    this.ambience.push({
      sprite,
      mover: { x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2, speed, radius },
    });
  }

  _updateHunt(deltaMs) {
    const p = this.controller.pointer;
    const speedMult = this.flow.difficulty.enemySpeedMultiplier();
    const assist = this.flow.difficulty.assistRadius();

    // Lock: nearest cell (cancer or healthy) within the assist radius.
    const all = [
      ...this.cells.map((c) => ({ id: c.id, x: c.mover.x, y: c.mover.y, radius: c.radius })),
      ...this.healthy.map((h) => ({ id: h.id, x: h.mover.x, y: h.mover.y, radius: h.radius })),
    ];
    const lockedId = selectTarget(p, all, assist);
    const lockedCancer = lockedId && !lockedId.startsWith('h-')
      ? this.cells.find((c) => c.id === lockedId) : null;
    const lockedHealthy = lockedId && lockedId.startsWith('h-')
      ? this.healthy.find((h) => h.id === lockedId) : null;

    // Drift everything; the locked cancer cell focus-slows so it stays trackable.
    for (const c of this.cells) {
      c.mover = stepMover(c.mover, deltaMs, {
        speedMultiplier: speedMult, focused: c === lockedCancer,
      });
      c.sprite.setPosition(c.mover.x, c.mover.y);
    }
    for (const h of this.healthy) {
      h.mover = stepMover(h.mover, deltaMs, {});
      h.sprite.setPosition(h.mover.x, h.mover.y);
    }
    for (const a of this.ambience) {
      a.mover = stepMover(a.mover, deltaMs, {});
      a.sprite.setPosition(a.mover.x, a.mover.y);
    }

    // Dwell keys ONLY on cancer: dwell-only players can never be forced into
    // a healthy hit (their only path to a combo reset would be a click).
    const dwellState = this.dwell.update(deltaMs, lockedCancer ? lockedCancer.id : null);
    this.reticle.update(p, dwellState.progress);

    // Gentle trickle spawn.
    this._spawnAccum += deltaMs;
    if (this._spawnAccum >= SPAWN_INTERVAL_MS && this.tracker.canSpawn(this.cells.length)) {
      this._spawnAccum = 0;
      this._spawnCancer();
    }

    const clicked = this.controller.justPressed();
    if ((dwellState.completed || clicked) && lockedCancer) {
      this._hitCancer(lockedCancer);
    } else if (clicked && lockedHealthy) {
      this._hitHealthy(lockedHealthy);
    }

    if (!this._advancing && this.tracker.isComplete()) {
      this._advancing = true;
      this.time.delayedCall(BEAT_SETTLE_MS, () => this._advance());
    }
  }

  _hitCancer(cell) {
    cell.hp -= 1;
    const gained = this.score.hitCancer();
    this.hud.setScore(gained.total);
    this.hud.setCombo(gained.multiplier);
    this.hud.popup(cell.mover.x, cell.mover.y, `+${gained.points}`);
    this.fx.tone('hit');
    if (cell.hp <= 0) {
      this.fx.killBurst(cell.mover.x, cell.mover.y, 0xff5c7a);
      this.fx.shake(90, 0.003);
      cell.sprite.destroy();
      this.cells = this.cells.filter((c) => c !== cell);
      this.tracker.recordKill();
      this.hud.setMission(this.tracker.killed(), this.tracker.missionTotal());
      // Kill pace feeds the easing difficulty: slow pace -> cells drift slower.
      const now = this.time.now;
      this.flow.difficulty.recordWaveTime(now - this._lastKillAt, this._huntConfig.killTargetMs);
      this._lastKillAt = now;
    } else {
      this.fx.burst(cell.mover.x, cell.mover.y, 0xff5c7a);
      if (cell.maxHp > 1) {
        cell.sprite.setTexture(SPRITES.cancerCracked);
        this.tweens.add({
          targets: cell.sprite, scale: cell.sprite.scale * 0.9, duration: 140, yoyo: true,
        });
      }
    }
  }

  _hitHealthy(h) {
    // Gentle, no-fail consequence: the healthy cell shrugs it off unharmed;
    // only the combo resets. No damage, no score loss, no cooldown.
    this.score.hitHealthy();
    this.hud.setCombo(1);
    this.fx.burst(h.mover.x, h.mover.y, 0x7fb8ff);
    this.hud.cue(h.mover.x, h.mover.y - 60, 'That one\'s healthy — it\'s safe.');
    this.tweens.add({
      targets: h.sprite,
      displayWidth: h.radius * 2.3, displayHeight: h.radius * 2.3,
      duration: 130, yoyo: true,
    });
  }

  // ---------------- shared flow ----------------

  _advance() {
    const elapsed = this.time.now - this.beatStart;
    const next = this.flow.onBeatComplete(elapsed);
    this._enterBeat(next);
  }

  _finish() {
    const end = this.levelBeats.find((b) => b.type === 'resolution');
    const score = this.score ? this.score.state().total : null;
    this.scene.start('Result', { levelId: this.levelId, text: end.config.text, score });
  }

  update(_time, deltaMs) {
    this.controller.update();

    if (this._huntActive) {
      this._updateHunt(deltaMs);
      return;
    }

    const p = this.controller.pointer;

    const targets = this.cells.map((c) => ({
      id: c.id, x: c.sprite.x, y: c.sprite.y, radius: c.radius,
    }));
    const supportTargets = this.supports.map((s) => ({
      id: s.id, x: s.x, y: s.y, radius: s.radius,
    }));
    const assist = this.flow.difficulty.assistRadius();
    const { supportId, targetId } = resolveInteraction(p, targets, supportTargets, assist);

    // Support patches use dwell-to-restore.
    const overSupport = supportId ? this.supports.find((s) => s.id === supportId) : null;
    const effectiveTargetId = targetId;
    const dwellKey = overSupport ? overSupport.id : effectiveTargetId;

    const dwellState = this.dwell.update(deltaMs, dwellKey);
    this.reticle.update(p, dwellState.progress);

    const fire = this.controller.justPressed() || dwellState.completed;
    if (!fire) return;

    if (overSupport && (dwellState.completed || this.controller.justPressed())) {
      overSupport.sprite.setAlpha(1);
      this.fx.burst(overSupport.x, overSupport.y, 0x64ffb0);
      this.supports = this.supports.filter((s) => s !== overSupport);
    } else if (effectiveTargetId) {
      const cell = this.cells.find((c) => c.id === effectiveTargetId);
      if (cell) {
        cell.hp -= 1;
        this.fx.burst(cell.sprite.x, cell.sprite.y, 0xff5c7a);
        this.fx.shake(90, 0.003);
        this.fx.tone('hit');
        if (cell.hp <= 0) {
          cell.sprite.destroy();
          this.cells = this.cells.filter((c) => c.id !== effectiveTargetId);
        } else {
          this.tweens.add({ targets: cell.sprite, scale: cell.sprite.scale * 0.85, duration: 120 });
        }
      }
    }

    if (!this._advancing && this.cells.length === 0 && this.supports.length === 0
        && this.flow.current() && this.flow.current().type !== 'hunt') {
      this._advancing = true;
      this.time.delayedCall(BEAT_SETTLE_MS, () => this._advance());
    }
  }
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass (44+: 33 existing + Tasks 1–4 additions).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(game): hunt beat — moving cancer/healthy cells, lock-on dwell + focus-slow, HUD scoring, ambience"
```

---

### Task 8: ResultScene score line

**Files:**
- Modify: `src/scenes/ResultScene.js`

**Interfaces:**
- Consumes: `scene.start('Result', { levelId, text, score })` from Task 7 — `score` is a number or `null`/`undefined`.
- Produces: nothing new downstream. Score is displayed only; never persisted.

- [ ] **Step 1: Read the score in init**

In `src/scenes/ResultScene.js`, change `init` to:

```js
  init(data) {
    this._text = (data && data.text) || 'You restored this. Well done.';
    this._levelId = data && data.levelId;
    this._score = (data && typeof data.score === 'number') ? data.score : null;
  }
```

- [ ] **Step 2: Show it in create**

In `create()`, directly after the existing `this.add.text(360, 150, this._text, ...)` block, add:

```js
    if (this._score !== null) {
      this.add.text(360, 215, `Score  ${this._score}`, {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ffd75e', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    }
```

- [ ] **Step 3: Verify the build and suite**

Run: `npm run build`
Expected: clean.
Run: `npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/ResultScene.js
git commit -m "feat(result): celebrate the transient level score (never persisted)"
```

---

### Task 9: Docs — playtest checklist + CLAUDE.md status

**Files:**
- Modify: `docs/playtest-checklist.md` (append a section — read the file first; keep its existing header/format)
- Modify: `CLAUDE.md` (update the "Current status" section)

- [ ] **Step 1: Append hunt items to the playtest checklist**

Append to `docs/playtest-checklist.md`:

```markdown
## Hunt levels + arcade HUD (2026-07-07)

Therapeutic constraints under motion:
- [ ] Cell drift feels slow and trackable on L1 even when tired; L3 is livelier but never frantic.
- [ ] Dwell-only play (no clicking at all) can complete every level — dwell never fires at a healthy cell.
- [ ] Focus-slow is felt: a locked cell visibly settles under the reticle.
- [ ] Hitting a healthy cell reads calm, not scolding: soft blue ripple, "That one's healthy — it's safe.", combo quietly returns to x1. It must never feel like damage or failure.
- [ ] Combo reset does not sting — no harsh sound, no red flash, no lost points.
- [ ] Difficulty easing works: killing slowly for a while visibly slows the drift.

HUD & legibility (bedside distance, circular display):
- [ ] Score panel, mission counter, combo badge and popups all sit inside the safe circle.
- [ ] All HUD text legible at 18px+; floating "+N" popups readable while rising.
- [ ] Mission counter only ever counts up; nothing on screen counts down.
- [ ] No timer, no hearts/health bar, no fail imagery anywhere.

Playfield look:
- [ ] Cancer cells read as "wrong" (spiky red), healthy cells as "yours" (soft blue) at a glance.
- [ ] 2-HP cells (L3) visibly crack after the first hit.
- [ ] Background ambience (red blood cells, bokeh) reads as depth, not as targets.
- [ ] Result screen shows the score once, celebratory, with no comparison to past runs.
```

- [ ] **Step 2: Update CLAUDE.md current status**

In `CLAUDE.md`, replace the `## Current status (2026-07-04)` section body with:

```markdown
## Current status (2026-07-07)

Playable vertical slice + full navigable structure. Levels 1–3 are now moving-cell
"hunt" levels (destroy drifting cancer cells, avoid healthy blue cells; difficulty =
drift speed, easing only) with an arcade HUD: transient per-level score, mission
counter, patient combo (no time decay; resets only on a healthy-cell hit), floating
popups. FTUE unchanged. New systems: `ScoreSystem`, `HuntTracker`, `motion.js`
(all pure + unit-tested), `HudSystem`, `sprites.js` (PNG-swappable procedural art).
Chemo-ally beat is currently unused by any level (deliberate scope cut — see
`docs/superpowers/specs/2026-07-07-arcade-hud-hunt-levels-design.md`); the beat
type still renders, so it can return. **All scene visuals + felt pace are
browser/device-verification-pending** — see `docs/playtest-checklist.md`.
```

- [ ] **Step 3: Final verification**

Run: `npm test`
Expected: all tests pass.
Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add docs/playtest-checklist.md CLAUDE.md
git commit -m "docs: hunt-level playtest checklist items + status update"
```

---

## Post-plan notes for the executor

- The **manual browser playtest cannot be automated** — after Task 9, tell the human the build is ready to playtest (`npm run dev`) and point at the new checklist section. Do not claim visual/pacing verification.
- Spec regression flag: constraint #5 (treatment-as-ally) is intentionally unrepresented in playable levels this iteration; do not "fix" this by re-adding beats.
