export class MousePointerAdapter {
  constructor(phaserInput) {
    this._input = phaserInput;
  }
  getPosition() {
    const p = this._input.activePointer;
    return { x: p.worldX, y: p.worldY };
  }
  isDown() {
    return this._input.activePointer.isDown;
  }
}
