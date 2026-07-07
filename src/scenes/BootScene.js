import Phaser from 'phaser';
import { SPRITES } from '../systems/sprites.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Legacy simple dots — FTUE and ResultScene still use these keys.
    this._makeDot('cell', 0xff5c7a);
    this._makeDot('boss', 0xff2e63);
    this._makeDot('healthy', 0x64ffb0);

    // Hunt-level playfield textures (procedural for now; PNG-swappable via
    // the SPRITES lookup in src/systems/sprites.js).
    this._makeCancer(SPRITES.cancer, false);
    this._makeCancer(SPRITES.cancerCracked, true);
    this._makeHealthyCell(SPRITES.healthy);
    this._makeRbc(SPRITES.rbc);
    this._makeBokeh(SPRITES.bokeh);

    if (!this.textures.exists('bgGlow')) {
      const bg = this.textures.createCanvas('bgGlow', 720, 720);
      const ctx = bg.getContext();
      // Deep blue-violet biological depth (was teal).
      const grad = ctx.createRadialGradient(360, 360, 20, 360, 360, 360);
      grad.addColorStop(0, '#2b2160');
      grad.addColorStop(0.55, '#161040');
      grad.addColorStop(1, '#080718');
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

  // Spiky red cancer cell; `cracked` adds dark fissures (2-HP damage state).
  _makeCancer(key, cracked) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    g.fillStyle(0xd93a52, 1); // spike ring
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.fillCircle(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 8);
    }
    g.fillStyle(0xff4d5e, 1); g.fillCircle(cx, cy, 30);  // body
    g.fillStyle(0xa61e38, 1); g.fillCircle(cx, cy, 16);  // dark core
    g.fillStyle(0xffffff, 0.25); g.fillCircle(cx - 10, cy - 10, 8); // sheen
    if (cracked) {
      g.lineStyle(3, 0x3d0913, 1);
      g.lineBetween(cx - 18, cy - 6, cx + 4, cy + 2);
      g.lineBetween(cx + 4, cy + 2, cx + 16, cy - 12);
      g.lineBetween(cx - 2, cy + 4, cx + 8, cy + 18);
    }
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Translucent blue healthy cell: membrane ring + nucleus.
  _makeHealthyCell(key) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    g.fillStyle(0x4f7ff0, 0.35); g.fillCircle(cx, cy, 34);       // translucent body
    g.lineStyle(4, 0x86b4ff, 0.9); g.strokeCircle(cx, cy, 34);   // membrane
    g.fillStyle(0x2b4bd6, 0.9); g.fillCircle(cx + 6, cy + 4, 12); // nucleus
    g.fillStyle(0xffffff, 0.3); g.fillCircle(cx - 12, cy - 12, 6);
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Red blood cell: disc with darker dimple (biconcave read).
  _makeRbc(key) {
    const g = this.add.graphics();
    g.fillStyle(0xb3273b, 1); g.fillCircle(32, 32, 26);
    g.fillStyle(0x8c1c2e, 1); g.fillCircle(32, 32, 12);
    g.fillStyle(0xd14b60, 0.5); g.fillCircle(24, 24, 6);
    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  // Soft ambient bokeh dot.
  _makeBokeh(key) {
    const g = this.add.graphics();
    g.fillStyle(0xbfd8ff, 0.25); g.fillCircle(16, 16, 14);
    g.fillStyle(0xdfeaff, 0.5); g.fillCircle(16, 16, 8);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }
}
