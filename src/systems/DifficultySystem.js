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

  // Reserved for future levels with moving enemies. This vertical slice's
  // enemies are intentionally static (calm, always-winnable), so this value
  // is currently computed but not consumed anywhere in the slice.
  enemySpeedMultiplier() {
    return 1 - this._struggle * (1 - this._speedFloor);
  }

  assistRadius() {
    return this._assistBase + this._struggle * (this._assistMax - this._assistBase);
  }
}
