import Phaser from '../engine/phaser-shim.js';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';
import { ProgressStore } from '../systems/ProgressStore.js';
import { safeLocalStorage } from '../systems/safeStorage.js';
import { PLAY_DWELL_MS, BEAT_SETTLE_MS } from '../systems/pacing.js';

// A staged tutorial that never fails: aim -> fire -> done.
export class FTUEScene extends Phaser.Scene {
  constructor() { super('FTUE'); }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);
    this.controller = new InputController(new MousePointerAdapter(this.input));
    // Unhurried hover-to-lock — teaches the same calm pace the levels use.
    this.dwell = new DwellTracker({ dwellMs: PLAY_DWELL_MS });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);

    this.prompt = this.add.text(360, 90, '', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this._targetObjs = [];
    this._target = null;
    this._advanced = false;
    this.stage = -1;
    this._setStage(0);
  }

  _clearTarget() {
    this._targetObjs.forEach((o) => o.destroy());
    this._targetObjs = [];
    this._target = null;
  }

  _setStage(n) {
    this._clearTarget();
    this.stage = n;
    this._advanced = false;

    switch (n) {
      case 0: {
        this.prompt.setText('Move the light onto the ring.');
        const g = this.add.graphics().setDepth(5);
        g.lineStyle(4, 0x7fe7ff, 0.85);
        g.strokeCircle(360, 360, 46);
        this._targetObjs.push(g);
        this._target = { x: 360, y: 360, radius: 46 };
        break;
      }
      case 1: {
        this.prompt.setText('Now strike it — pinch, or hold to lock on.');
        const img = this.add.image(360, 360, 'cell').setDisplaySize(160, 160).setDepth(5);
        this._targetObjs.push(img);
        this._target = { x: 360, y: 360, radius: 80 };
        break;
      }
      default:
        break;
    }
  }

  _completeTutorial() {
    try {
      new ProgressStore(safeLocalStorage()).markComplete('ftue');
    } catch (e) {
      // storage unavailable; proceed without blocking the tutorial
    }
    // A brief settle so the strike's burst is seen before we move on.
    this.time.delayedCall(BEAT_SETTLE_MS, () => this.scene.start('LevelSelect'));
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;

    const t = this._target;
    const over = !!t && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= t.radius;
    const key = this.stage === 0 ? 'aim' : 'fire';
    const dwellState = this.dwell.update(deltaMs, over ? key : null);
    this.reticle.update(p, dwellState.progress);

    if (this._advanced) return;

    if (this.stage === 0) {
      if (dwellState.completed) {
        this._advanced = true;
        this._setStage(1);
      }
    } else if (this.stage === 1) {
      const activated = (over && this.controller.justPressed()) || dwellState.completed;
      if (activated) {
        this._advanced = true;
        this.fx.burst(360, 360, 0xff5c7a);
        this.fx.shake();
        this._completeTutorial();
      }
    }
  }
}
