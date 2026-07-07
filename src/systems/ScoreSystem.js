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
