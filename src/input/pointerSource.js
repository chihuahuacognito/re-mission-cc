// Chooses the pointer source for a scene: mouse (default) or hand gesture.
// Scenes call this instead of constructing an adapter directly, so switching
// input modes is a URL param, not a code change:
//
//   ?input=gesture  -> shared GestureAdapter singleton (camera + MediaPipe)
//   anything else   -> per-scene MousePointerAdapter (unchanged dev/playtest path)
//
// The mouse stays the default and the dev path; gesture is opt-in. GestureAdapter
// is imported statically but constructed lazily (getGestureAdapter), and it
// dynamic-import()s MediaPipe only on that first construction — so mouse mode
// and offline dev never fetch the camera model.
import { MousePointerAdapter } from './MousePointerAdapter.js';
import { getGestureAdapter } from './GestureAdapter.js';

function gestureRequested() {
  try {
    return new URLSearchParams(window.location.search).get('input') === 'gesture';
  } catch (e) {
    return false; // no window/URL (e.g. non-browser) -> mouse
  }
}

export function getPointerSource(scene) {
  if (gestureRequested()) return getGestureAdapter();
  return new MousePointerAdapter(scene.input);
}
