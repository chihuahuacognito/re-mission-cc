export class Camera {
  constructor({ width = 720, rand = Math.random } = {}) {
    this._width = width;
    this._rand = rand;
    this.offsetX = 0;
    this.offsetY = 0;
    this._dur = 0;
    this._t = 0;
    this._intensity = 0;
  }

  // So scenes can call this.cameras.main.shake(...).
  get main() { return this; }

  shake(ms, intensity) { this._dur = ms; this._t = 0; this._intensity = intensity; }

  update(dt) {
    if (this._t < this._dur) {
      this._t += dt;
      const decay = Math.max(0, 1 - this._t / this._dur);
      const mag = this._intensity * this._width * decay;
      this.offsetX = (this._rand() * 2 - 1) * mag;
      this.offsetY = (this._rand() * 2 - 1) * mag;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }
}
