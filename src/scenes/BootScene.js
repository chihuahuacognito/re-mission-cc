import Phaser from '../engine/phaser-shim.js';
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
      // Deep blue-violet with a lit core and a near-black rim, so the bright
      // interactive cells pop hard against it (was a flat, dull gradient).
      const grad = ctx.createRadialGradient(360, 360, 20, 360, 360, 360);
      grad.addColorStop(0, '#3a2f86');
      grad.addColorStop(0.5, '#171046');
      grad.addColorStop(1, '#04030e');
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

  // Spiky, glowing, high-saturation cancer cell — the clear threat. `cracked`
  // is the 2-HP damage state: bruised and darkened with bright fissures, so it
  // reads as "hurt" at a glance and looks nothing like an ambient blood cell.
  _makeCancer(key, cracked) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    // Outer glow halo so the cell pops against the dark background.
    g.fillStyle(0xff2d5a, 0.16); g.fillCircle(cx, cy, 47);
    g.fillStyle(0xff2d5a, 0.28); g.fillCircle(cx, cy, 40);
    // Spikes — slightly deeper red than the body for crisp definition.
    g.fillStyle(0xe11d48, 1);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.fillCircle(cx + Math.cos(a) * 31, cy + Math.sin(a) * 31, 9);
    }
    g.fillStyle(0xff2d4b, 1); g.fillCircle(cx, cy, 30);          // vivid body
    g.fillStyle(0xff607a, 1); g.fillCircle(cx - 4, cy - 4, 22);  // lit volume
    g.fillStyle(0x7a0b20, 1); g.fillCircle(cx, cy, 13);          // dark core
    g.fillStyle(0xffe3ea, 0.7); g.fillCircle(cx - 11, cy - 12, 7); // hot specular
    if (cracked) {
      g.fillStyle(0x2a0410, 0.4); g.fillCircle(cx, cy, 30);      // bruised overlay
      g.lineStyle(3, 0xffd0d8, 0.95);                            // bright fissures
      g.lineBetween(cx - 20, cy - 8, cx + 2, cy + 2);
      g.lineBetween(cx + 2, cy + 2, cx + 18, cy - 14);
      g.lineBetween(cx - 2, cy + 4, cx + 10, cy + 20);
      g.lineBetween(cx - 14, cy + 10, cx - 2, cy + 4);
    }
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Translucent blue healthy cell: bright luminous membrane + nucleus. Boosted
  // saturation so "yours" reads clearly and cheerfully (was washed out).
  _makeHealthyCell(key) {
    const g = this.add.graphics();
    const cx = 48;
    const cy = 48;
    g.fillStyle(0x3f8bff, 0.5); g.fillCircle(cx, cy, 34);        // translucent body
    g.lineStyle(5, 0x9ecbff, 1); g.strokeCircle(cx, cy, 34);     // bright membrane
    g.fillStyle(0x1e5be0, 1); g.fillCircle(cx + 6, cy + 4, 13);  // nucleus
    g.fillStyle(0xcfe4ff, 0.55); g.fillCircle(cx - 12, cy - 12, 7);
    g.generateTexture(key, 96, 96);
    g.destroy();
  }

  // Ambient red blood cell: deep, desaturated maroon donut — deliberately dim
  // and smooth so it recedes into the bloodstream and never competes with the
  // bright, spiky cancer cells for the player's attention.
  _makeRbc(key) {
    const g = this.add.graphics();
    g.fillStyle(0x6e1526, 1); g.fillCircle(32, 32, 24);   // dark maroon rim
    g.fillStyle(0x4a0e1b, 1); g.fillCircle(32, 32, 20);   // body
    g.fillStyle(0x2e0812, 1); g.fillCircle(32, 32, 11);   // deep central dimple
    g.fillStyle(0x8a2233, 0.4); g.fillCircle(24, 24, 5);  // faint sheen
    g.generateTexture(key, 64, 64);
    g.destroy();
  }

  // Soft ambient bokeh dot.
  _makeBokeh(key) {
    const g = this.add.graphics();
    g.fillStyle(0xbfd8ff, 0.22); g.fillCircle(16, 16, 14);
    g.fillStyle(0xdfeaff, 0.5); g.fillCircle(16, 16, 8);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }
}
