export class DwellTracker {
  constructor({ dwellMs = 700 } = {}) {
    this._dwellMs = dwellMs;
    this._key = null;
    this._elapsed = 0;
    this._latched = false;
  }

  update(dtMs, targetKey) {
    if (targetKey !== this._key) {
      this._key = targetKey;
      this._elapsed = 0;
      this._latched = false;
    }
    if (targetKey == null) {
      return { progress: 0, completed: false, targetKey: null };
    }
    if (this._latched) {
      return { progress: 1, completed: false, targetKey };
    }
    this._elapsed = Math.min(this._dwellMs, this._elapsed + dtMs);
    const progress = this._elapsed / this._dwellMs;
    const completed = progress >= 1;
    if (completed) this._latched = true;
    return { progress, completed, targetKey };
  }
}
