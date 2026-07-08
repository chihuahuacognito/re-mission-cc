# MediaPipe Gesture Control — Design

**Date:** 2026-07-08
**Content Type:** Design spec

## Goal

Add camera-based hand-gesture control as a **minimal, demonstrable proof-of-concept**, so the
project can be handed to the tech team with a working gesture path already wired through the
game's existing input seam. The prototype currently uses a mouse as a stand-in for the deployment
target's gesture cursor; this replaces that stand-in with a real hand tracker while keeping the
mouse fully working for development.

The control model (confirmed): **the hand aims the reticle; a pinch (or dwell) activates.** This
matches the game's "single pointer + one activate signal + a dwell alternative" model. It is NOT
a discrete-gesture-to-action mapping (no "thumbs-up = jump").

## Non-goals (explicitly the tech team's job later)

- Web-worker threading of detection (runs on the main thread here, frame-throttled).
- Cursor smoothing filters (One-Euro / EMA).
- Calibration flow, robustness to lost hands / poor lighting.
- Offline / vendored MediaPipe model (loads from CDN; needs internet).
- Replacing the mouse. Mouse stays the default and the dev/playtest path.

These are recorded in the "Handoff notes" section so the boundary is explicit.

## Architecture

The game already routes ALL input through `InputController`, which reads a source object exposing
exactly two methods:

```
getPosition() -> { x, y }   // game coords, 0..720
isDown()      -> boolean     // the activate signal
```

`MousePointerAdapter` is the current source. We add a second source and a factory to choose it.

### New: `src/input/GestureAdapter.js`

A source object with the same two-method interface, backed by a webcam + MediaPipe. It is a
**shared singleton** (one camera and one model for the whole app), created lazily on first use and
kept alive across scene transitions — scenes come and go, the tracker keeps running.

Internally it maintains a cached `{ x, y, down }` updated by a detection loop (below). `getPosition`
and `isDown` simply return the cache; they never block.

### New: `src/input/pointerSource.js`

A factory the scenes call instead of constructing an adapter directly:

```
getPointerSource(scene) -> MousePointerAdapter | GestureAdapter(singleton)
```

- Reads the mode from the URL: `?input=gesture` selects gesture; anything else (default) selects
  mouse.
- Mouse mode: returns `new MousePointerAdapter(scene.input)` (per-scene, cheap — unchanged behavior).
- Gesture mode: returns the shared `GestureAdapter` singleton, initializing it on first call.

### Changed: the 5 interactive scenes

`LandingScene`, `LevelSelectScene`, `FTUEScene`, `GameScene`, `ResultScene` each change one line:

```
- new InputController(new MousePointerAdapter(this.input))
+ new InputController(getPointerSource(this))
```

Nothing else in scenes or systems changes. Dwell, reticle, aim-assist, no-fail — all untouched.

## The testable core (pure functions — unit-tested, per project convention)

These hold all the logic and none of the browser/camera dependencies, so they are unit-tested with
Vitest like the rest of the game's pure logic. They live in `src/input/gestureMath.js`. (Importing
`DISPLAY` from `CircularDisplay.js` is Node-safe — `DISPLAY` is a plain const with no engine import.)

`DISPLAY = { cx: 360, cy: 360, radius: 352, safe: 330 }`. The reticle clamps to **`DISPLAY.safe`
(330)** — the play area inside the rim — NOT `DISPLAY.radius` (352, the rim edge).

### `mapHandToGame(normX, normY)` -> `{ x, y }`

- Input: **index fingertip (landmark 8)** in normalized video coords (0..1), origin top-left.
- **Mirror X** (`1 - normX`): the webcam is a selfie view, so raw X is left-right reversed relative
  to what the user sees. (Pinch math uses raw, unmirrored coords — distance is mirror-invariant.)
- Scale to the 720x720 canvas.
- **Clamp into `DISPLAY.safe`** (center 360,360, radius 330): while a hand is tracked, the reticle
  can never leave the play area even if the hand drifts off-frame.

### No-tracking sentinel (safety-critical)

When **no hand is currently tracked** — startup, camera denied, or hand lost mid-play — the adapter
does NOT return the clamped last position. It returns an **off-screen sentinel** (e.g. `{-1000,-1000}`)
and `isDown() === false`. Consequence: no dwell target is ever under the reticle, so a dropped hand
can never auto-complete a dwell and fire. `gestureMath.js` exports `OFFSCREEN` and the adapter's
position cache **initializes to it** (so a camera-denied load never sits on a target). The reticle
simply isn't drawn over anything, which pairs with the "show your hand" status.

### `isPinching(worldLandmarks)` -> `boolean`

- Uses **`worldLandmarks`** (metric, in meters, aspect-ratio-independent) — NOT the 2D normalized
  landmarks, whose x/y are scaled to width/height separately and skew distance on non-square feeds.
- 3D distance between thumb tip (4) and index tip (8), normalized by a hand-size reference
  (wrist 0 -> index MCP 5) so it's invariant to hand distance from the camera.
- Returns true when the normalized distance is below `PINCH_THRESHOLD`.

### `PinchDebouncer` (small stateful class, pure)

- `update(rawPinching) -> boolean`: only flips its output after the raw pinch state holds for
  `PINCH_HOLD_FRAMES` (~3) consecutive frames. Prevents a single misread frame from firing.
  Initial output is `false`.

### Constants

`gestureMath.js` exports tunables in one place: `PINCH_THRESHOLD`, `PINCH_HOLD_FRAMES`, the cursor
landmark index (8), and `OFFSCREEN`. (Mirroring, safe-circle clamp, the no-tracking sentinel, and
debounce are **correctness, not polish** — without them the feature is backwards, escapes the
circle, auto-fires on a dropped hand, or misfires every frame.)

## MediaPipe plumbing (browser-only; manual verification gate)

- Load **`HandLandmarker`** + `FilesetResolver` from `@mediapipe/tasks-vision` via a **version-pinned**
  ESM import of the explicit bundle:
  `import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.x/vision_bundle.mjs"`
  (pin the same version for the `forVisionTasks` wasm path). `HandLandmarker` (not `GestureRecognizer`)
  because we derive pinch from landmarks and never use the built-in gesture categories — the classifier
  would be a larger model and wasted per-frame cost. Consistent with the buildless, static-served
  project; no bundler/build step added.
- The `GestureAdapter` creates its **own hidden `<video>` element** (appended to the document, kept
  offscreen) and requests the webcam with `getUserMedia({ video: { width: 640, height: 480,
  facingMode: 'user' } })`. No change to `index.html`. getUserMedia requires https or
  `http://localhost` — already how the game is served (a `file://` open will NOT get camera access;
  must use the localhost server).
- A detection loop (its own `requestAnimationFrame`, **throttled** to a fraction of frames since the
  game is light) calls `handLandmarker.detectForVideo(video, timestampMs)` where `timestampMs` is
  **`performance.now()`** — a strictly-monotonic source. (Deriving the timestamp from
  `video.currentTime` would pass a duplicate on a throttled frame and `detectForVideo` throws.) It
  gates the first call on `video.readyState >= 2` and non-zero `videoWidth/videoHeight`.
- One hand. On a detected hand it feeds `result.landmarks[0]` (index 8) through `mapHandToGame` and
  `result.worldLandmarks[0]` through `isPinching`/`PinchDebouncer`, then writes the cached
  `{ x, y, down }`. On **no hand** it writes the off-screen sentinel + `down:false` (see safety note).

## Status indicator (approved)

In gesture mode only, a single line of text (no video feed) reports tracker state so a silent
camera/permission failure is visible instead of looking like a dead game:

- "Starting camera…" while initializing.
- "Camera blocked — allow access" if getUserMedia is denied/unavailable.
- "Show your hand" when the camera is live but no hand is detected.
- Hidden once a hand is being tracked.

Implemented as a **DOM overlay element** owned by the `GestureAdapter` (like the hidden video). It
is **CSS-centered over the canvas** (centered on the `#game` container) — deliberately NOT placed at
a game coordinate, so it needs no game-space transform and can't drift as the canvas scales. Being
centered, it is inherently well inside the safe circle. Font size scales with the viewport
(`vmin`-based, floored at 18px) so it stays legible at the display's real rendered size rather than
a fixed pixel size that would shrink relative to the up-scaled canvas. Because the adapter outlives
scenes, the status works regardless of the active scene and needs no per-scene wiring.

## Files

**Add:**
- `src/input/gestureMath.js` — pure mapping/pinch/debounce + constants.
- `src/input/GestureAdapter.js` — singleton source; camera + MediaPipe + detection loop + status.
- `src/input/pointerSource.js` — mouse-vs-gesture factory (URL param).
- `tests/gesture-math.test.js` — unit tests for the pure core.

**Change:**
- `LandingScene`, `LevelSelectScene`, `FTUEScene`, `GameScene`, `ResultScene` — one-line source swap
  (`new MousePointerAdapter(this.input)` → `getPointerSource(this)`).

(No `index.html` change — the adapter creates its own hidden video + status DOM elements.)

## Testing & verification

- **Unit (Vitest):** `mapHandToGame` (mirror at X=0/0.5/1, scale, clamp of an off-frame hand into
  `DISPLAY.safe`, out-of-[0,1] inputs); `isPinching` (below/above threshold, invariance to hand
  distance and orientation via worldLandmarks); `PinchDebouncer` (initial=false, holds N frames,
  rejects a single-frame flicker); the **no-tracking sentinel** (returns `OFFSCREEN`, and `OFFSCREEN`
  is outside `DISPLAY.safe` so no target/aim-assist can match it). Parse gate + full suite stay green.
- **Manual (browser gate — cannot be automated):** serve on localhost, open `?input=gesture`, grant
  camera, verify the reticle tracks the hand, pinch fires, dwell still works, status line behaves,
  and the reticle never leaves the circle. Mouse mode (default) is unaffected.

## Handoff notes (limitations to state plainly)

- Detection runs on the main thread; under load the game can drop frames. Move to a web worker.
- Cursor is raw landmark output — jittery. Add a smoothing filter.
- Model loads from CDN — requires internet. Vendor it for the robot.
- No calibration; mapping assumes the hand roughly spans the camera view. Add calibration/gain.
- Single hand, single pinch; no gesture set beyond aim + pinch.
