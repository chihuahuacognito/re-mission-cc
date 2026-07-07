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
