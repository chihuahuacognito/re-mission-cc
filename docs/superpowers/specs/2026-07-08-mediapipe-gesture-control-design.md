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
Vitest like the rest of the game's pure logic. They live in `src/input/gestureMath.js`.

### `mapHandToGame(normX, normY)` -> `{ x, y }`

- Input: hand landmark in normalized video coords (0..1), origin top-left.
- **Mirror X** (`1 - normX`): the webcam is a selfie view, so raw X is left-right reversed relative
  to what the user sees.
- Scale to the 720x720 canvas.
- **Clamp into the safe circle** (center 360,360, radius ~330 from `CircularDisplay.DISPLAY`): the
  reticle can never leave the visible play area even if the hand does.

### `isPinching(landmarks)` -> `boolean`

- Distance between thumb tip (landmark 4) and index tip (landmark 8), **normalized by a hand-size
  reference** (e.g. wrist-to-index-MCP distance) so it works at any distance from the camera.
- Returns true when the normalized distance is below a threshold constant.

### `PinchDebouncer` (small stateful class, pure)

- `update(rawPinching) -> boolean`: only flips its output after the raw pinch state holds for
  `PINCH_HOLD_FRAMES` (~3) consecutive frames. Prevents a single misread frame from firing.

### The cursor landmark

The **index fingertip (landmark 8)** drives the cursor position.

### Constants

`gestureMath.js` exports tunables in one place: `PINCH_THRESHOLD`, `PINCH_HOLD_FRAMES`, cursor
landmark index. (Mirroring correctness, clamp, and debounce are included as **correctness, not
polish** — without them the feature is backwards, escapes the circle, or misfires every frame.)

## MediaPipe plumbing (browser-only; manual verification gate)

- Load `@mediapipe/tasks-vision` (`GestureRecognizer`, `FilesetResolver`) from the jsDelivr CDN via
  an ESM `import` inside `GestureAdapter.js`. Consistent with the buildless, static-served project;
  no bundler/build step added.
- The `GestureAdapter` creates its **own hidden `<video>` element** (appended to the document, kept
  offscreen) and receives the webcam stream via `navigator.mediaDevices.getUserMedia`. No change to
  `index.html`. getUserMedia requires https or `http://localhost` — already how the game is served
  (double-clicking `index.html` from `file://` will NOT get camera access; must use the localhost
  server).
- A detection loop (its own `requestAnimationFrame`, **throttled** to run on a fraction of frames
  since the game is light) calls `recognizeForVideo`, passes the first hand's landmarks through
  `mapHandToGame` / `isPinching` / `PinchDebouncer`, and writes the cached `{ x, y, down }`.
- `numHands: 1`. If no hand is detected in a frame, position holds at its last value and `down`
  is false.

## Status indicator (approved)

In gesture mode only, a single line of text (no video feed) reports tracker state so a silent
camera/permission failure is visible instead of looking like a dead game:

- "Starting camera…" while initializing.
- "Camera blocked — allow access" if getUserMedia is denied/unavailable.
- "Show your hand" when the camera is live but no hand is detected.
- Hidden once a hand is being tracked.

It obeys the patient-text 18px floor and sits inside the safe circle. Implemented as a **DOM
overlay element** owned by the `GestureAdapter` (like the hidden video), positioned over the
canvas via CSS — not a canvas/scene object. Because the adapter outlives scenes, the status works
regardless of which scene is active and needs no per-scene wiring.

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

- **Unit (Vitest):** `mapHandToGame` (mirror, scale, clamp cases), `isPinching` (below/above
  threshold, distance-invariance), `PinchDebouncer` (hold, flicker rejection). Parse gate + full
  suite stay green.
- **Manual (browser gate — cannot be automated):** serve on localhost, open `?input=gesture`, grant
  camera, verify the reticle tracks the hand, pinch fires, dwell still works, status line behaves,
  and the reticle never leaves the circle. Mouse mode (default) is unaffected.

## Handoff notes (limitations to state plainly)

- Detection runs on the main thread; under load the game can drop frames. Move to a web worker.
- Cursor is raw landmark output — jittery. Add a smoothing filter.
- Model loads from CDN — requires internet. Vendor it for the robot.
- No calibration; mapping assumes the hand roughly spans the camera view. Add calibration/gain.
- Single hand, single pinch; no gesture set beyond aim + pinch.
