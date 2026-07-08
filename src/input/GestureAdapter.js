// Camera-backed pointer source: the hand aims the reticle, a pinch activates.
// Exposes the same two-method interface as MousePointerAdapter
// (getPosition/isDown) so it drops into InputController unchanged.
//
// It is a SHARED SINGLETON (getGestureAdapter): one camera + one model for the
// whole app, created lazily on first use and kept alive across scene
// transitions — scenes come and go, the tracker keeps running. getPosition and
// isDown just read a cache the detection loop updates; they never block.
//
// Browser-only (camera + MediaPipe + DOM). No automated test — its gate is the
// manual browser playtest. The pure logic lives in gestureMath.js and IS tested.
import {
  mapHandToGame,
  isPinching,
  PinchDebouncer,
  CURSOR_LANDMARK,
  OFFSCREEN,
} from './gestureMath.js';

// Version-pinned MediaPipe (same version across the ESM bundle and the wasm
// path). Loaded via dynamic import() so mouse mode — and offline dev — never
// fetch it; only initializing gesture mode touches the network.
const MP_VERSION = '0.10.14';
const MEDIAPIPE_ESM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`;
const MEDIAPIPE_WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Detection is throttled: the game is light and the pace is slow, so ~25fps of
// hand tracking is plenty and leaves the main thread free. (Web-worker
// threading is the tech team's job — see the design's handoff notes.)
const DETECT_INTERVAL_MS = 40;

class GestureAdapter {
  constructor() {
    // Position cache INITIALIZES to the off-screen sentinel so a camera-denied
    // or still-starting load never sits on a dwell target and auto-fires.
    this._cache = { x: OFFSCREEN.x, y: OFFSCREEN.y, down: false };
    this._pinch = new PinchDebouncer();
    this._landmarker = null;
    this._lastDetect = 0;

    this._video = this._makeVideo();
    this._status = this._makeStatus();
    this._setStatus('Starting camera…');

    // Loop runs immediately; it no-ops until the model is ready.
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    this._init();
  }

  // --- The source interface InputController consumes --------------------------

  getPosition() {
    return { x: this._cache.x, y: this._cache.y };
  }

  isDown() {
    return this._cache.down;
  }

  // --- DOM elements the adapter owns (no index.html change) -------------------

  _makeVideo() {
    const v = document.createElement('video');
    v.autoplay = true;
    v.playsInline = true;
    v.muted = true;
    v.style.position = 'fixed';
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.opacity = '0';
    v.style.pointerEvents = 'none';
    v.style.left = '-9999px';
    document.body.appendChild(v);
    return v;
  }

  _makeStatus() {
    const el = document.createElement('div');
    // CSS-centered over the canvas (the #game container fills and centers the
    // viewport), NOT a game coordinate — so it needs no game-space transform and
    // can't drift as the canvas scales. Font is vmin-based, floored at 18px, so
    // it stays legible at the display's real rendered size.
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.font = '600 max(18px, 3.4vmin) sans-serif';
    el.style.color = '#eafff5';
    el.style.textAlign = 'center';
    el.style.textShadow = '0 1px 6px rgba(0,0,0,0.6)';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '10';
    document.body.appendChild(el);
    return el;
  }

  // text === null hides the line (a hand is being tracked).
  _setStatus(text) {
    if (text == null) {
      this._status.style.display = 'none';
    } else {
      this._status.textContent = text;
      this._status.style.display = 'block';
    }
  }

  // --- Camera + model bring-up ------------------------------------------------

  async _init() {
    // getUserMedia needs https or http://localhost — how the game is served. A
    // file:// open gets no camera; the status line makes that failure visible.
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
    } catch (e) {
      this._setStatus('Camera blocked — allow access');
      return;
    }
    this._video.srcObject = stream;
    try {
      await this._video.play();
    } catch (e) {
      /* autoplay policies vary; readyState gate below still guards detection */
    }

    try {
      const { HandLandmarker, FilesetResolver } = await import(MEDIAPIPE_ESM_URL);
      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      // HandLandmarker (not GestureRecognizer): we derive pinch from landmarks
      // and never use the built-in gesture categories, so the classifier would
      // be a larger model and wasted per-frame cost.
      this._landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    } catch (e) {
      // Model/CDN load failed (e.g. offline). Surface it rather than a dead game.
      this._setStatus('Camera blocked — allow access');
      return;
    }
    this._setStatus('Show your hand');
  }

  // --- Detection loop ---------------------------------------------------------

  _loop() {
    requestAnimationFrame(this._loop);
    if (!this._landmarker) return; // model not ready (or camera denied)

    const now = performance.now(); // strictly-monotonic; detectForVideo throws on dup timestamps
    if (now - this._lastDetect < DETECT_INTERVAL_MS) return;

    const v = this._video;
    if (v.readyState < 2 || !v.videoWidth || !v.videoHeight) return;
    this._lastDetect = now;

    let result;
    try {
      result = this._landmarker.detectForVideo(v, now);
    } catch (e) {
      return; // skip a bad frame rather than tear down the loop
    }
    this._consume(result);
  }

  _consume(result) {
    const landmarks = result && result.landmarks && result.landmarks[0];
    const world = result && result.worldLandmarks && result.worldLandmarks[0];

    if (landmarks && landmarks.length > CURSOR_LANDMARK) {
      const tip = landmarks[CURSOR_LANDMARK];
      const { x, y } = mapHandToGame(tip.x, tip.y);
      const down = this._pinch.update(world ? isPinching(world) : false);
      this._cache = { x, y, down };
      this._setStatus(null); // tracking -> hide the status line
    } else {
      // No hand: off-screen sentinel + down:false (safety-critical — see
      // gestureMath). Decay the debouncer so a re-acquired hand starts un-pinched.
      this._pinch.update(false);
      this._cache = { x: OFFSCREEN.x, y: OFFSCREEN.y, down: false };
      this._setStatus('Show your hand');
    }
  }
}

let _instance = null;

// Lazily create and return the shared singleton. Safe to call every scene;
// the camera/model are brought up only once.
export function getGestureAdapter() {
  if (!_instance) _instance = new GestureAdapter();
  return _instance;
}
