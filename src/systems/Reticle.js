export class Reticle {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(1000);
  }

  update(pointer, dwellProgress = 0) {
    const g = this.g;
    g.clear();
    // outer cursor
    g.lineStyle(2, 0x7fe7ff, 1);
    g.strokeCircle(pointer.x, pointer.y, 14);
    // center dot
    g.fillStyle(0x7fe7ff, 1);
    g.fillCircle(pointer.x, pointer.y, 3);
    // dwell fill ring
    if (dwellProgress > 0) {
      g.lineStyle(4, 0xffe08a, 1);
      g.beginPath();
      g.arc(pointer.x, pointer.y, 20, -Math.PI / 2,
        -Math.PI / 2 + dwellProgress * Math.PI * 2, false);
      g.strokePath();
    }
  }
}
