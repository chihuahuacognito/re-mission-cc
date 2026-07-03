import Phaser from 'phaser';
import { CheckInStore } from '../clinical/CheckIn.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this._text = (data && data.text) || 'You restored this. Well done.'; }

  create() {
    this.input.setDefaultCursor('none');
    const fx = new FeedbackSystem(this);

    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 700 });
    this.reticle = new Reticle(this);

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

    this._store = new CheckInStore(this._safeStorage());

    // Rating buttons are plain visual text objects; hit-testing and
    // activation (dwell OR click) happen in update(), same pattern as
    // OnboardingScene's practice target.
    this._buttons = [];
    for (let n = 1; n <= 5; n++) {
      const bx = 480 + (n - 3) * 70;
      const by = 360;
      const obj = this.add.text(bx, by, String(n), {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#7fe7ff',
        backgroundColor: '#12203a', padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setDepth(10);
      this._buttons.push({ key: `rating-${n}`, value: n, obj, x: bx, y: by, radius: 34 });
    }

    this.rated = false; // guards against a double-save once a rating is chosen
    this.done = false;  // guards against a double-fire of the replay restart
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;

    if (!this.rated) {
      let overBtn = null;
      for (const b of this._buttons) {
        if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.radius) {
          overBtn = b;
          break;
        }
      }
      const dwellState = this.dwell.update(deltaMs, overBtn ? overBtn.key : null);
      this.reticle.update(p, dwellState.progress);

      const activated = overBtn && (dwellState.completed || this.controller.justPressed());
      if (activated) {
        this.rated = true;
        // pre defaults to 3 in the slice (no pre-scene yet); ts from performance clock.
        // Never let a storage write (quota/private-mode) crash the tap — the check-in
        // is best-effort; the player's "play again" flow must always continue.
        try {
          this._store.save({ pre: 3, post: overBtn.value, ts: Math.round(this.time.now) });
        } catch (e) {
          // storage unavailable; proceed without blocking the experience
        }
        this._thanks();
      }
      return;
    }

    // Replay affordance only arms after a rating is chosen: dwell anywhere on
    // screen, or click, restarts the slice.
    const dwellState = this.dwell.update(deltaMs, 'replay');
    this.reticle.update(p, dwellState.progress);
    if (!this.done && (dwellState.completed || this.controller.justPressed())) {
      this.done = true;
      this.scene.start('Onboarding');
    }
  }

  _thanks() {
    this._buttons.forEach((b) => b.obj.setAlpha(0.4));
    this.add.text(480, 440, 'Thank you. Dwell or tap to play again.', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#8fb3c9',
    }).setOrigin(0.5).setDepth(10);
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
