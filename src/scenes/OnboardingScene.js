import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { level01 } from '../data/level01.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';

export class OnboardingScene extends Phaser.Scene {
  constructor() { super('Onboarding'); }

  create() {
    const beat = level01.find((b) => b.type === 'onboarding');
    this.input.setDefaultCursor('none');
    this.input.mouse.disableContextMenu();
    applyCircularChrome(this);

    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 700 });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);

    this.add.text(360, 80, beat.config.text, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5);

    const t = beat.config.practiceTarget;
    this.target = this.add.image(t.x, t.y, 'healthy').setDisplaySize(t.radius * 2, t.radius * 2);
    this._t = t;
    this.hint = this.add.text(360, 620,
      'Move onto the light. Hold still to dwell, or click.', {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#8fb3c9',
      }).setOrigin(0.5);
    this.done = false;
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;
    const t = this._t;
    const over = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= t.radius;
    const dwellState = this.dwell.update(deltaMs, over ? 'practice' : null);
    this.reticle.update(p, dwellState.progress);

    if (this.done) return;
    const activated = (over && this.controller.justPressed()) || dwellState.completed;
    if (activated) {
      this.done = true;
      this.fx.burst(t.x, t.y, 0x64ffb0);
      this.fx.shake();
      this.time.delayedCall(500, () => this.scene.start('Game'));
    }
  }
}
