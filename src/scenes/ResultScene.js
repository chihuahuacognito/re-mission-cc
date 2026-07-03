import Phaser from 'phaser';
import { CheckInStore } from '../clinical/CheckIn.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this._text = (data && data.text) || 'You restored this. Well done.'; }

  create() {
    this.input.setDefaultCursor('default');
    const fx = new FeedbackSystem(this);

    // "Bloom": expanding healthy light.
    const bloom = this.add.image(480, 250, 'healthy').setDisplaySize(20, 20).setAlpha(0.9);
    this.tweens.add({ targets: bloom, displayWidth: 1200, displayHeight: 1200, alpha: 0.15, duration: 1400, ease: 'Sine.out' });
    fx.tone('win');

    this.add.text(480, 120, this._text, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#eafff5', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(480, 300, 'How in control do you feel right now?', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff',
    }).setOrigin(0.5).setDepth(10);

    const store = new CheckInStore(this._safeStorage());
    for (let n = 1; n <= 5; n++) {
      const bx = 480 + (n - 3) * 70;
      const btn = this.add.text(bx, 360, String(n), {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#7fe7ff',
        backgroundColor: '#12203a', padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        // pre defaults to 3 in the slice (no pre-scene yet); ts from performance clock.
        store.save({ pre: 3, post: n, ts: Math.round(this.time.now) });
        this._thanks();
      });
    }
  }

  _thanks() {
    this.children.list
      .filter((c) => c.setInteractive && c.input)
      .forEach((c) => c.disableInteractive());
    this.add.text(480, 440, 'Thank you. Tap to play again.', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#8fb3c9',
    }).setOrigin(0.5).setDepth(10);
    this.input.once('pointerdown', () => this.scene.start('Onboarding'));
  }

  _safeStorage() {
    try {
      window.localStorage.getItem('probe');
      return window.localStorage;
    } catch {
      const m = new Map();
      return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    }
  }
}
