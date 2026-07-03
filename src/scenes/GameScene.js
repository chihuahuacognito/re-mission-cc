import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { GameFlow } from '../systems/GameFlow.js';
import { selectTarget } from '../systems/targeting.js';
import { level01 } from '../data/level01.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.input.setDefaultCursor('none');
    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: 800 });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);
    this.flow = new GameFlow(level01);

    this.label = this.add.text(480, 40, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5).setDepth(500);

    this.cells = [];      // active enemy sprites: {id, sprite, radius, hp}
    this.supports = [];   // dim patches to restore
    this.beatStart = 0;
    this._enterBeat(this.flow.current());
  }

  _clearActors() {
    this.cells.forEach((c) => c.sprite.destroy());
    this.supports.forEach((s) => s.sprite.destroy());
    this.cells = [];
    this.supports = [];
  }

  _spawnCells(defs, tex = 'cell') {
    defs.forEach((d, i) => {
      const sprite = this.add.image(d.x, d.y, tex).setDisplaySize(d.radius * 2, d.radius * 2);
      this.cells.push({ id: `${tex}-${i}-${d.x}-${d.y}`, sprite, radius: d.radius, hp: d.hp ?? 1 });
    });
  }

  _enterBeat(beat) {
    this._advancing = false;
    this._clearActors();
    this.beatStart = this.time.now;
    if (!beat) { this._finish(); return; }
    this.label.setText(beat.config.label || '');

    switch (beat.type) {
      case 'onboarding': // onboarding handled in its own scene; skip if present
        this._advance(); break;
      case 'scan':
        this.label.setText('Sweep the fog. Reveal what\'s hidden.');
        this._spawnCells([{ x: 480, y: 230, radius: 26, hp: 1 }]);
        break;
      case 'wave':
        this._spawnCells(beat.config.enemies);
        break;
      case 'support':
        beat.config.dimPatches.forEach((d, i) => {
          const sprite = this.add.image(d.x, d.y, 'healthy')
            .setDisplaySize(d.radius * 2, d.radius * 2).setAlpha(0.2);
          this.supports.push({ id: `sup-${i}`, sprite, radius: d.radius, x: d.x, y: d.y });
        });
        break;
      case 'chemoAlly':
        this._runChemoAlly(beat.config);
        break;
      case 'boss':
        this._spawnCells([beat.config.mass], 'boss');
        this.bossChargeMs = beat.config.chargeMs;
        break;
      case 'resolution':
        this._finish(); break;
      default:
        this._advance();
    }
  }

  _runChemoAlly(config) {
    // A friendly pulse the player aims: a moving beam of light toward the cluster.
    this._spawnCells(config.cluster);
    const pulse = this.add.image(-40, 270, 'healthy').setDisplaySize(60, 60).setAlpha(0.9);
    this.tweens.add({
      targets: pulse, x: 500, duration: 1200, ease: 'Sine.out',
      onComplete: () => pulse.destroy(),
    });
    this.fx.tone('heal');
  }

  _advance() {
    const elapsed = this.time.now - this.beatStart;
    const next = this.flow.onBeatComplete(elapsed);
    this._enterBeat(next);
  }

  _finish() {
    const end = level01.find((b) => b.type === 'resolution');
    this.scene.start('Result', { text: end.config.text });
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;

    const targets = this.cells.map((c) => ({
      id: c.id, x: c.sprite.x, y: c.sprite.y, radius: c.radius,
    }));
    const assist = this.flow.difficulty.assistRadius();
    const targetId = selectTarget(p, targets, assist);

    // Support patches use dwell-to-restore.
    let dwellKey = null;
    let overSupport = this.supports.find(
      (s) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) <= s.radius);
    let effectiveTargetId = targetId;
    if (overSupport && targetId) {
      // Both a support patch and a cell target are under the pointer: act on
      // whichever is spatially closer rather than always preferring the support.
      const cell = this.cells.find((c) => c.id === targetId);
      const supportDist = Phaser.Math.Distance.Between(p.x, p.y, overSupport.x, overSupport.y);
      const targetDist = cell
        ? Phaser.Math.Distance.Between(p.x, p.y, cell.sprite.x, cell.sprite.y)
        : Infinity;
      if (targetDist < supportDist) {
        overSupport = null;
      } else {
        effectiveTargetId = null;
      }
    }
    if (overSupport) dwellKey = overSupport.id;
    else if (effectiveTargetId) dwellKey = effectiveTargetId;

    const dwellState = this.dwell.update(deltaMs, dwellKey);
    this.reticle.update(p, dwellState.progress);

    const fire = this.controller.justPressed() || dwellState.completed;
    if (!fire) return;

    if (overSupport && (dwellState.completed || this.controller.justPressed())) {
      overSupport.sprite.setAlpha(1);
      this.fx.burst(overSupport.x, overSupport.y, 0x64ffb0);
      this.supports = this.supports.filter((s) => s !== overSupport);
    } else if (effectiveTargetId) {
      const cell = this.cells.find((c) => c.id === effectiveTargetId);
      if (cell) {
        cell.hp -= 1;
        this.fx.burst(cell.sprite.x, cell.sprite.y, 0xff5c7a);
        this.fx.shake(90, 0.003);
        this.fx.tone('hit');
        if (cell.hp <= 0) {
          cell.sprite.destroy();
          this.cells = this.cells.filter((c) => c.id !== effectiveTargetId);
        } else {
          this.tweens.add({ targets: cell.sprite, scale: cell.sprite.scale * 0.85, duration: 120 });
        }
      }
    }

    if (!this._advancing && this.cells.length === 0 && this.supports.length === 0) {
      this._advancing = true;
      this.time.delayedCall(250, () => this._advance());
    }
  }
}
