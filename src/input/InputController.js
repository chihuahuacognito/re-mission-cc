export class InputController {
  constructor(source) {
    this._source = source;
    this._pos = { x: 0, y: 0 };
    this._down = false;
    this._prevDown = false;
  }

  update() {
    this._prevDown = this._down;
    const p = this._source.getPosition();
    this._pos = { x: p.x, y: p.y };
    this._down = this._source.isDown();
  }

  get pointer() { return { x: this._pos.x, y: this._pos.y }; }
  get held() { return this._down; }
  justPressed() { return this._down && !this._prevDown; }
  justReleased() { return !this._down && this._prevDown; }
}
