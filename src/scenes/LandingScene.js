import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';

export class LandingScene extends Phaser.Scene {
  constructor() { super('Landing'); }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);

    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 700 });
    this.reticle = new Reticle(this);

    this.add.text(360, 235, 'SENTINEL', {
      fontFamily: 'sans-serif', fontSize: '46px', color: '#eafff5', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(360, 300, 'Your body. Your fight.', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#9fdbe8', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this._begin = this.add.text(360, 430, 'Begin', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#7fe7ff',
      backgroundColor: '#12203a', padding: { x: 22, y: 12 }, align: 'center',
    }).setOrigin(0.5).setDepth(10);
    this._t = { x: 360, y: 430, radius: 70 };

    this.add.text(360, 600, 'Point and hold still, or click.', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#8fb3c9', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.done = false;
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;
    const t = this._t;
    const over = Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) <= t.radius;
    const dwellState = this.dwell.update(deltaMs, over ? 'begin' : null);
    this.reticle.update(p, dwellState.progress);

    if (this.done) return;
    if (over && (dwellState.completed || this.controller.justPressed())) {
      this.done = true;
      this.scene.start('LevelSelect');
    }
  }
}
