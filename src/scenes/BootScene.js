import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Placeholder textures: a soft glowing dot for cells, a healthy dot.
    this._makeDot('cell', 0xff5c7a);
    this._makeDot('boss', 0xff2e63);
    this._makeDot('healthy', 0x64ffb0);
    this.scene.start('Onboarding');
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
