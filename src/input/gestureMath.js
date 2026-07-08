// Pure math for gesture control — no browser, camera, or engine deps, so it is
// unit-tested with Vitest like the rest of the game's logic. The GestureAdapter
// feeds MediaPipe landmarks through these; the mapping, mirror, safe-circle
// clamp, no-tracking sentinel, and pinch debounce are all CORRECTNESS (without
// them the cursor is backwards, escapes the circle, auto-fires on a dropped
// hand, or misfires every frame), not polish.
import { DISPLAY } from '../systems/CircularDisplay.js';

// --- Tunables (one place) ---------------------------------------------------

// The MediaPipe hand landmark used as the cursor: the index fingertip.
export const CURSOR_LANDMARK = 8;

// Pinch fires when the thumb-tip/index-tip distance, normalized by hand size,
// drops below this. Between a firm pinch (~0.1) and an open hand (~1.0).
export const PINCH_THRESHOLD = 0.4;

// The debouncer only trusts a pinch state that survives this many consecutive
// frames, so one misread frame can't fire (or drop) an activation.
export const PINCH_HOLD_FRAMES = 3;

// Returned when NO hand is tracked (startup, camera denied, hand lost). It sits
// far outside the safe circle, so no dwell target is ever under the reticle and
// a dropped hand can never auto-complete a dwell and fire.
export const OFFSCREEN = { x: -1000, y: -1000 };

// --- Cursor mapping ---------------------------------------------------------

// Map a normalized fingertip position (0..1, origin top-left, selfie feed) to
// game coordinates, clamped into the safe play circle.
export function mapHandToGame(normX, normY) {
  // Mirror X: the webcam is a selfie view, so raw X is reversed vs. what the
  // user sees. (Pinch math uses raw coords — distance is mirror-invariant.)
  let x = (1 - normX) * DISPLAY.size;
  let y = normY * DISPLAY.size;

  // Clamp onto the safe circle (the play area inside the rim, not the rim edge)
  // so a hand drifting off-frame can never push the reticle out of the circle.
  const dx = x - DISPLAY.cx;
  const dy = y - DISPLAY.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > DISPLAY.safe) {
    const k = DISPLAY.safe / dist;
    x = DISPLAY.cx + dx * k;
    y = DISPLAY.cy + dy * k;
  }
  return { x, y };
}

// --- Pinch detection --------------------------------------------------------

function dist3d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// True when the thumb and index tips are pinched together. Uses metric
// worldLandmarks (meters, aspect-ratio-independent) and normalizes by hand size
// (wrist -> index MCP) so it's invariant to how far the hand is from the camera.
export function isPinching(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length <= CURSOR_LANDMARK) return false;
  const wrist = worldLandmarks[0];
  const indexMcp = worldLandmarks[5];
  const thumbTip = worldLandmarks[4];
  const indexTip = worldLandmarks[8];
  const handSize = dist3d(wrist, indexMcp);
  if (handSize === 0) return false;
  const pinchDist = dist3d(thumbTip, indexTip);
  return pinchDist / handSize < PINCH_THRESHOLD;
}

// Debounces the raw per-frame pinch reading: its output only flips once the raw
// state has held for PINCH_HOLD_FRAMES consecutive frames. Initial output false.
export class PinchDebouncer {
  constructor(holdFrames = PINCH_HOLD_FRAMES) {
    this._holdFrames = holdFrames;
    this._out = false;
    this._count = 0; // consecutive frames the raw reading has disagreed with _out
  }

  update(rawPinching) {
    if (rawPinching === this._out) {
      this._count = 0;
    } else if (++this._count >= this._holdFrames) {
      this._out = rawPinching;
      this._count = 0;
    }
    return this._out;
  }
}
