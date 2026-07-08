import Phaser from '../engine/phaser-shim.js';
import { CheckInStore } from '../clinical/CheckIn.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { InputController } from '../input/InputController.js';
import { getPointerSource } from '../input/pointerSource.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';
import { ProgressStore } from '../systems/ProgressStore.js';
import { safeLocalStorage } from '../systems/safeStorage.js';
import { DWELL_MS } from '../systems/pacing.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) {
    this._text = (data && data.text) || 'You restored this. Well done.';
    this._levelId = data && data.levelId;
    this._score = (data && typeof data.score === 'number') ? data.score : null;
  }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);
    const fx = new FeedbackSystem(this);

    this.controller = new InputController(getPointerSource(this));
    this.dwell = new DwellTracker({ dwellMs: DWELL_MS });
    this.reticle = new Reticle(this);

    // "Bloom": expanding healthy light.
    const bloom = this.add.image(360, 360, 'healthy').setDisplaySize(20, 20).setAlpha(0.9).setDepth(0);
    this.tweens.add({ targets: bloom, displayWidth: 1200, displayHeight: 1200, alpha: 0.15, duration: 1400, ease: 'Sine.out' });
    fx.tone('win');

    this.add.text(360, 150, this._text, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#eafff5', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    if (this._score !== null) {
      this.add.text(360, 215, `Score  ${this._score}`, {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ffd75e', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(360, 410, 'How in control do you feel right now?', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff',
    }).setOrigin(0.5).setDepth(10);

    this._store = new CheckInStore(this._safeStorage());

    // Rating buttons are plain visual text objects; hit-testing and
    // activation (dwell OR click) happen in update(), same pattern used
    // for dwell/click targets elsewhere (e.g. LandingScene's Begin target).
    this._buttons = [];
    for (let n = 1; n <= 5; n++) {
      const bx = 360 + (n - 3) * 64;
      const by = 480;
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
        // pre is a placeholder in the slice (no pre-scene yet) — flag it so no
        // false delta is recorded. ts from performance clock. Never let a storage
        // write (quota/private-mode) crash the tap — the check-in is best-effort;
        // the player's "play again" flow must always continue.
        try {
          this._store.save({
            pre: 3, post: overBtn.value, ts: Math.round(this.time.now), preIsPlaceholder: true,
          });
        } catch (e) {
          // storage unavailable; proceed without blocking the experience
        }
        if (this._levelId) {
          try {
            new ProgressStore(this._safeStorage()).markComplete(this._levelId);
          } catch (e) {
            // storage unavailable; proceed without blocking the experience
          }
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
      this.scene.start('LevelSelect');
    }
  }

  _thanks() {
    this._buttons.forEach((b) => b.obj.setAlpha(0.4));
    this.add.text(360, 570, 'Thank you. Dwell or tap to continue.', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#8fb3c9',
    }).setOrigin(0.5).setDepth(10);
  }

  _safeStorage() {
    return safeLocalStorage();
  }
}
