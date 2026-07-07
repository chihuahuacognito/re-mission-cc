// Pure: map a client-space point through the canvas bounding rect into the
// game's 720x720 coordinate space (handles CSS scaling / letterboxing).
export function clientToGame(clientX, clientY, rect, size = 720) {
  return {
    x: ((clientX - rect.left) / rect.width) * size,
    y: ((clientY - rect.top) / rect.height) * size,
  };
}

export class InputManager {
  constructor(canvas, size = 720) {
    this._canvas = canvas;
    this._size = size;
    // ONE persistent pointer for the whole game (spec: never reset isDown on
    // scene change; that is what preserves the cross-scene click-bleed guard).
    this.activePointer = { worldX: 0, worldY: 0, isDown: false };

    canvas.addEventListener('mousemove', (e) => this._move(e));
    canvas.addEventListener('mousedown', (e) => { this._move(e); this.activePointer.isDown = true; });
    // mouseup on window so a release outside the circle is never missed.
    window.addEventListener('mouseup', () => { this.activePointer.isDown = false; });
  }

  _move(e) {
    const rect = this._canvas.getBoundingClientRect();
    const p = clientToGame(e.clientX, e.clientY, rect, this._size);
    this.activePointer.worldX = p.x;
    this.activePointer.worldY = p.y;
  }

  setDefaultCursor(css) { this._canvas.style.cursor = css; }
}
