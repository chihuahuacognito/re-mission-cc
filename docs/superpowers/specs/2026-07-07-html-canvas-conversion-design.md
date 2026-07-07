# Design: Convert Sentinel from Phaser to a Buildless HTML/Canvas Project

**Date**: 2026-07-07
**Content Type**: Design Specification

## Goal

Replace Phaser 3 with a small, dependency-free, retained-mode Canvas 2D harness while
**keeping every gameplay behaviour, visual, and therapeutic constraint intact**. The end
state is a buildless plain-HTML project: native ES modules served by any static file
server, no bundler, no game engine. Vitest is retained for the pure-logic unit tests.

## Non-goals

No gameplay or visual redesign. No audio, gesture input, or Capacitor packaging. No
change to the logic layer, the levels, or the therapeutic constraints. This is a
port, not a feature change.

## Decisions (brainstorming + agent review)

| Decision | Choice |
| --- | --- |
| Harness style | Retained-mode Canvas harness (Approach A) — display list, objects persist, redrawn each frame. |
| Phaser coupling | A single `Phaser`-shaped **shim module** backed by the harness; the 7 Phaser-importing files change only their import *source* string. Scene/system bodies are untouched. |
| Build tooling | Buildless. Remove `phaser` and `vite`; keep `vitest`. Native ES modules; served by a static server (not `file://`). |
| FX fidelity | Rebuild the tween/FX the game uses; a couple of the fiddliest may be trimmed slightly and will be called out. |
| Verification | 55 logic unit tests stay green throughout; scene/visual parity is a human browser playtest against `docs/playtest-checklist.md`. |

**Rejected:** vendoring real Phaser via an import map (an agent suggested it). That keeps the
engine we are trying to remove; our shim *is* the replacement.

## Architecture

```
Browser (static server) → index.html
  → import map? NO. relative ES-module imports only.
  → ./src/main.js  (unchanged body; import source now points at the shim)
      new Phaser.Game(config)         // Phaser === our shim's default export
        → engine boots: canvas, managers, scene registry, RAF loop
```

Two layers:

1. **`src/engine/` — the harness** (new, ~10 focused modules). Owns the canvas, display
   list, rendering, tweens, clock, camera, input, and scene lifecycle.
2. **`src/engine/phaser-shim.js` — the compatibility facade** (new). Default-exports a
   `Phaser`-shaped object: `{ Scene, Game, AUTO, Scale: { FIT, CENTER_BOTH }, Math: {
   Distance: { Between } } }`. This is the ONLY thing the 7 legacy files import. It maps
   `Phaser.Scene`→ engine `Scene`, `new Phaser.Game(cfg)`→ engine bootstrap, and the two
   static helpers used (`Phaser.AUTO`, `Phaser.Scale.*`, `Phaser.Math.Distance.Between`).

Everything else — all of `src/systems/`, `src/input/`, `src/levels/`, `src/clinical/`,
`src/config.js` — is **unchanged**.

## Files

### New — `src/engine/`

| File | Responsibility |
| --- | --- |
| `color.js` | `0xRRGGBB` + alpha → `rgba()` string. |
| `textures.js` | Global texture store of offscreen canvases; `exists(key)`, `createCanvas(key,w,h)`→`{ getContext(), refresh() }`, `register(key, canvas, frameW, frameH)`, `get(key)`. Survives scene teardown. |
| `objects.js` | `Image`, `Text`, `Circle` display objects. Shared base with `depth`, `alpha`, origin, `x`, `y`, `scaleX`, `scaleY`, `visible`, `destroy()`, and a monotonic creation `seq`. |
| `Graphics.js` | Retained command-buffer graphics object; records + replays commands each frame under its own `(x,y,scaleX,scaleY)` transform; `generateTexture(key,w,h)`. |
| `Tweens.js` | Tween manager: `add(config)`, `update(dt)`; per-tween easing, `yoyo`, `delay`, `repeat` (incl. `-1`), `onComplete`; `killTweensOf`/`clear` for teardown. |
| `Clock.js` | `now`, `delayedCall(ms, cb)`, `addEvent({delay, repeat, callback})`→ event with `getRepeatCount()`; `update(dt)`; `clear()` for teardown. |
| `Camera.js` | `main.shake(ms, intensity)`; produces a per-frame render offset (reset every frame); `update(dt)`. |
| `InputManager.js` | One persistent pointer for the whole game; DOM `mousemove`/`mousedown` on canvas, `mouseup` on `window`; maintains `activePointer.{worldX, worldY, isDown}` in 720-space; `setDefaultCursor`. |
| `Renderer.js` | Clears canvas, applies camera offset, draws the display list sorted by `(depth asc, seq asc)`. Image/Text/Circle/Graphics draw routines. |
| `SceneManager.js` | `register(sceneInstances)`, `start(key, data)` with a **deferred swap** (flag now, swap at top of next loop tick); tears down the outgoing scene's display list + tweens + timers (NOT textures/sound); calls `init(data)` then `create()`. |
| `Scene.js` | Base class. Constructor `super(key)` stores the key. The manager injects `this.add.{image,text,graphics,circle}`, `this.tweens`, `this.time`, `this.cameras.main`, `this.input`, `this.textures`, `this.sound`, `this.cache`, and `this.scene` (with `start`). |
| `Loop.js` | RAF loop. On first frame `lastTime=now` so `dt≈0`; **clamp `dt` to ≤ 50 ms**; each tick: process deferred scene swap → `clock.update` → `tweens.update` → `camera.update` → `activeScene.update(now, dt)` → `renderer.render`. |
| `phaser-shim.js` | The `Phaser`-shaped facade described above; also hosts the engine bootstrap invoked by `new Phaser.Game(cfg)`. |

### Changed — import source only (bodies untouched)

`src/main.js` and the 6 scenes (`BootScene`, `LandingScene`, `LevelSelectScene`,
`FTUEScene`, `GameScene`, `ResultScene`): change `import Phaser from 'phaser'` to
`import Phaser from '../engine/phaser-shim.js'` (and `./engine/…` for `main.js`). No
other edits. In particular, `Phaser.Math.Distance.Between`, `Phaser.Scene`,
`new Phaser.Game(...)`, `Phaser.AUTO`, `Phaser.Scale.*` continue to work via the shim.

### Changed — tooling

- `index.html`: `/src/main.js` → `./src/main.js`; no import map. Add a `<canvas>`? No —
  the engine creates the 720×720 canvas inside `#game` and CSS-scales it to a centered
  square (preserving the current FIT/center behaviour). Keep the existing `#game`
  flex-centering CSS.
- `package.json`: remove `phaser` (dependencies) and `vite` (devDependencies); keep
  `vitest`. Remove `dev`/`build`/`preview` scripts; add `serve` (`python -m http.server
  8000`), `serve:npx` (`npx serve -l 8000 .`), and `check` (parse-gate, below). Add
  `"engines": { "node": ">=18" }`. Keep `"type": "module"`.
- Delete `vite.config.js` (empty no-op) and the stale `dist/` directory.

### Unchanged

All of `src/systems/` (incl. `Reticle`, `FeedbackSystem`, `HudSystem`, `CircularDisplay`,
`sprites`), `src/input/`, `src/levels/`, `src/clinical/`, `src/config.js`, and every file
under `tests/`.

## The shim/engine API contract (what the harness must provide)

Derived from an exhaustive audit of every Phaser call in the repo. The harness must
implement exactly this surface — no more (YAGNI), no less (or something crashes).

**Scene**: `extends Phaser.Scene`; `super('Key')`; `init(data)`; `create()`;
`update(time, deltaMs)`; `this.scene.start(key[, data])`.

**Factories** (`this.add.`): `image(x,y,key)`, `text(x,y,string,style)`,
`graphics()`, `circle(x,y,radius,color,alpha)`.

**Display-object methods**: `setDepth`, `setOrigin`, `setAlpha`, `setDisplaySize`,
`setPosition`, `setText`, `setTexture`, `destroy`. **Direct props** read/written:
`x`, `y`, `scale`, `scaleX`, `scaleY`, `displayWidth`, `displayHeight`, `alpha`.

**Tweens** (`this.tweens.add`): keys `targets`, `duration`, `ease`, `yoyo`, `delay`,
`repeat`, `onComplete`; tweened props `x`, `y`, `alpha`, `scale`, `scaleX`, `scaleY`,
`displayWidth`, `displayHeight`; ease strings `'Sine.out'`, `'Sine.inOut'`, and default
(Linear).

**Time** (`this.time`): `now`, `delayedCall(ms, cb)`, `addEvent({delay, repeat,
callback})` → `{ getRepeatCount() }`.

**Cameras**: `this.cameras.main.shake(ms, intensity)`.

**Input**: `this.input.setDefaultCursor(css)`; `this.input` handed to
`MousePointerAdapter`, which reads `activePointer.worldX`, `.worldY`, `.isDown`.

**Textures/sound/cache**: `this.textures.exists(key)`,
`this.textures.createCanvas(key,w,h).getContext()/refresh()`,
`graphics.generateTexture(key,w,h)`; `this.cache.audio.exists(key)` (stub → false),
`this.sound.play(key)` (stub → no-op).

**Graphics commands**: `clear`, `fillStyle(color,alpha)`, `fillCircle`,
`fillRoundedRect`, `lineStyle(w,color,alpha)`, `strokeCircle`, `strokeRoundedRect`,
`lineBetween`, `beginPath`, `moveTo`, `lineTo`, `arc`, `strokePath`, `generateTexture`.

**Statics** (`Phaser.`): `Scene`, `Game`, `AUTO`, `Scale.FIT`, `Scale.CENTER_BOTH`,
`Math.Distance.Between(x1,y1,x2,y2)`.

## Correctness requirements (parity traps the harness MUST honour)

These are the failure modes the port must design out. Each becomes a plan requirement
with a targeted check.

**Sizing — single source of truth.** Store only `scaleX`/`scaleY` internally.
`displayWidth`/`displayHeight` are getters/setters derived from `frameWidth × scaleX`
(and inverse on set). `setDisplaySize(w,h)` sets scale from the texture's native frame
size. `scale` getter returns `scaleX`; `scale` setter writes both. This keeps
`GameScene` reading `cell.sprite.scale` (then tweening `scale`) consistent with
`_hitHealthy` tweening `displayWidth`, and `ResultScene`'s bloom tween. Frame sizes:
generated textures at their `generateTexture` w/h (`cancer/healthy/boss` 96, `cell/rbc`
64, `bokeh` 32, `bgGlow` 720).

**Delta clamp.** `Loop` initialises `lastTime` on the first RAF (frame-0 `dt≈0`) and
clamps per-frame `dt` to ≤ 50 ms *before* it reaches clock/tweens/scene. Without this, a
background-tab return or first-frame spike instantly completes an in-progress dwell — a
spurious activation that violates the forgiving-input constraint.

**Pointer.** One persistent `activePointer` for the whole game, exposing `worldX`,
`worldY`, `isDown`. `mousedown` on the canvas, `mouseup` on `window` (so a release
outside the circle isn't missed and `isDown` can't stick). Client→game mapping via the
canvas bounding rect (handle CSS scaling; ignore devicePixelRatio for pointer math).
Camera shake is NOT folded into pointer coords. Never reset `isDown` on scene change —
that is what preserves `InputController.justPressed()`'s cross-scene click-bleed guard.

**Scene teardown scope.** Tearing down a scene clears its display list, tweens, and
timers only. The texture store, `sound`, and `cache` are engine-global and survive (Boot
generates all textures once and is never re-entered).

**Deferred scene swap.** `scene.start()` (called synchronously inside `BootScene.create`)
sets a pending-swap flag; the actual teardown+swap happens at the top of the next loop
tick. The loop never calls `update` on a torn-down or pending scene.

**Timer semantics.** `addEvent({delay, repeat, callback})` fires `1 + repeat` times;
`getRepeatCount()` counts remaining repeats down to 0; the callback is NEVER invoked
synchronously inside `addEvent` (FeedbackSystem's `burst` closes over the returned event
and reads `getRepeatCount()` on the first callback — a sync fire would throw). `delayedCall`
= `addEvent` with `repeat:0`.

**Camera shake.** A per-frame render translate of magnitude ≈ `intensity × gameWidth`,
fully reset the next frame (no accumulation). `this.cameras.main` must exist so `shake`
never throws.

**Origins.** Image and Circle default origin `0.5, 0.5`; Text default origin `0, 0`
until `setOrigin` overrides. `.x/.y` is the anchor; render offsets by origin × display
size. Distance-based hit tests assume centre = the sprite's `x,y`, so image centring is
load-bearing.

**Depth sort.** Assign each object a monotonic `seq` at creation; sort by `(depth asc,
seq asc)`; never re-key on live array index (objects are destroyed mid-run). Ties (e.g.
Reticle and HUD panel both at depth 1000) resolve by creation order, matching Phaser's
display-list order.

**Text.** Split on `\n`; measure with `ctx.measureText`; line height ≈ 1.2 × fontSize;
block height = lines × lineHeight; `setOrigin(0.5)` centres the whole block vertically
and horizontally. Compose the canvas font as `${fontStyle} ${fontSize} ${fontFamily}`
(parse the `'30px'` string; support `fontStyle:'bold'`). Draw the `backgroundColor` rect
(text bounds + `padding`) before glyphs, positioned by origin — this preserves the
"Begin", rating-button, and combo-badge chip looks.

**Graphics.** A retained command buffer replayed each render inside
`translate(x,y); scale(scaleX,scaleY)` — required because `Reticle`/`burst` do
`clear()`+redraw every frame and `LevelSelect` nodes draw in local space and tween
`scaleX/scaleY`. `generateTexture(key,w,h)` rasterises the buffer to an offscreen canvas
and registers it (with frame size w,h). Colours convert `0xRRGGBB`+alpha → `#rrggbb` +
`globalAlpha`.

**Circle alpha.** The 5th ctor arg (`fillAlpha`) is distinct from the game-object
`alpha`; render opacity = `alpha × fillAlpha` (so `killBurst`'s `add.circle(...,0.9)`
then `alpha`-to-0 tween reads correctly).

**createCanvas.** Returns an object whose `getContext()` is a real 2D context and
`refresh()` uploads/no-ops; the registered texture is drawable via `drawImage`;
`textures.exists(key)` guards re-creation (BootScene).

**Tween teardown.** Infinite (`repeat:-1`) and pending tweens are cancelled on scene
teardown (they reference soon-destroyed objects). Cancelling a tween does NOT fire its
`onComplete` (destruction is handled by display-list teardown). Unknown ease names fall
back to Linear rather than throw.

**Stubs.** `input.setDefaultCursor` sets `canvas.style.cursor`; `sound.play` and
`cache.audio.exists` are no-op/false so the silent no-audio path never throws.

## Tooling / buildless details

- **Vitest stays green**: no test imports Phaser (audited); Vitest bundles its own Vite in
  `node_modules`, so dropping the `vite` devDependency doesn't remove Vitest's Vite. With
  `vite.config.js` deleted, Vitest uses defaults.
- **Serving**: native ES modules require HTTP (not `file://`). `npm run serve` →
  `python -m http.server 8000`; `serve:npx` → `npx serve`. Serve repo root so `./src`
  resolves. Any server must send `.js` as `application/javascript` (both listed servers do).
- **Compile gate replacement**: the old `npm run build` gate becomes (1) `npm test`, plus
  (2) `npm run check` — a `node --check` parse pass over every `src/**/*.js` (catches the
  syntax/parse errors the bundler used to), plus (3) a manual served-browser load with a
  clean console. `CLAUDE.md` is updated to say so.

## Testing & verification

- **Unit (Vitest)**: the existing 55 tests must pass unchanged at every step — they prove
  the untouched logic layer is intact. No new logic tests (the port adds no logic).
- **Parse gate**: `npm run check` passes over all of `src/` (including the new engine).
- **Scenes/visuals**: human browser playtest against `docs/playtest-checklist.md`. Every
  existing checklist item must still hold (no-fail, dwell-or-click parity, safe circle,
  18px floor, calm pace, hunt behaviour, combo reveal, contrast). Visual parity is
  human-verified, not automated — stated explicitly.

## Risks

- **Missed API method** in a scene not fully traced. Mitigated: the contract above is from
  an exhaustive audit; the parse gate + first browser boot surface anything missed as an
  immediate error, not a silent regression.
- **Subtle FX drift** (easing curve, timing). Accepted per the FX decision; any deliberate
  simplification is called out in the plan and checklist.
- **Pointer mapping** under unusual display scaling on the target robot hardware — flagged
  for device verification, same as the existing visuals.

## Out of scope

Audio, gesture input, Capacitor packaging, moving-enemy AI, any gameplay/visual redesign,
automated scene/rendering tests.
