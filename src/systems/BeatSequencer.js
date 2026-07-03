export class BeatSequencer {
  constructor(beats) {
    this._beats = beats;
    this._i = 0;
  }
  current() {
    return this._i < this._beats.length ? this._beats[this._i] : null;
  }
  advance() {
    this._i += 1;
    return this.current();
  }
  isFinished() {
    return this._i >= this._beats.length;
  }
  reset() {
    this._i = 0;
  }
}
