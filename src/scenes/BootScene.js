import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Placeholder textures: a soft glowing dot for cells, a healthy dot.
    this._makeDot('cell', 0xff5c7a);
    this._makeDot('boss', 0xff2e63);
    this._makeDot('healthy', 0x64ffb0);

    if (!this.textures.exists('bgGlow')) {
      const bg = this.textures.createCanvas('bgGlow', 720, 720);
      const ctx = bg.getContext();
      const grad = ctx.createRadialGradient(360, 360, 20, 360, 360, 360);
      grad.addColorStop(0, '#1f5a6b');
      grad.addColorStop(0.55, '#0e2f3b');
      grad.addColorStop(1, '#06171e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 720);
      bg.refresh();
    }

    this.scene.start('Landing');
  }

  _makeDot(key, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(32, 32, 30);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(24, 24, 10);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }
}
