import Phaser from '../engine/phaser-shim.js';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { FeedbackSystem } from '../systems/FeedbackSystem.js';
import { GameFlow } from '../systems/GameFlow.js';
import { resolveInteraction } from '../systems/resolveInteraction.js';
import { selectTarget } from '../systems/targeting.js';
import { getLevel } from '../levels/index.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';
import { PLAY_DWELL_MS, BEAT_SETTLE_MS } from '../systems/pacing.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { HuntTracker } from '../systems/HuntTracker.js';
import { stepMover, spawnPosition } from '../systems/motion.js';
import { SPRITES } from '../systems/sprites.js';
import { HudSystem } from '../systems/HudSystem.js';

const HEALTHY_RADIUS = 30;

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.levelId = (data && data.levelId) || 'l1';
    this.levelBeats = getLevel(this.levelId).beats;
  }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);
    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: PLAY_DWELL_MS });
    this.reticle = new Reticle(this);
    this.fx = new FeedbackSystem(this);
    this.flow = new GameFlow(this.levelBeats);

    this.label = this.add.text(360, 80, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff', align: 'center',
    }).setOrigin(0.5).setDepth(500);

    this.cells = [];      // active enemy sprites: {id, sprite, radius, hp, maxHp?, mover?}
    this.supports = [];   // dim patches to restore
    this.healthy = [];    // hunt: drifting healthy blue cells (do not shoot)
    this.ambience = [];   // hunt: non-interactive drifting rbc/bokeh
    this.beatStart = 0;
    this._enterBeat(this.flow.current());
  }

  _clearActors() {
    this.cells.forEach((c) => c.sprite.destroy());
    this.supports.forEach((s) => s.sprite.destroy());
    this.healthy.forEach((h) => h.sprite.destroy());
    this.ambience.forEach((a) => a.sprite.destroy());
    this.cells = [];
    this.supports = [];
    this.healthy = [];
    this.ambience = [];
    this._huntActive = false;
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
      case 'scan':
        this.label.setText(beat.config.label || 'Sweep the fog. Reveal what\'s hidden.');
        this._spawnCells(beat.config.cells);
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
        break;
      case 'hunt':
        this._startHunt(beat.config);
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
    const pulse = this.add.image(90, 360, 'healthy').setDisplaySize(60, 60).setAlpha(0.9);
    this.tweens.add({
      targets: pulse, x: 380, duration: 1200, ease: 'Sine.out',
      onComplete: () => pulse.destroy(),
    });
    this.fx.tone('heal');
  }

  // ---------------- hunt beat ----------------

  _startHunt(config) {
    this._huntActive = true;
    this._huntConfig = config;
    // The HUD's mission banner replaces the top label (they share the space).
    this.label.setText('');

    this.tracker = new HuntTracker({
      missionTotal: config.missionTotal,
      maxConcurrent: config.maxConcurrent,
      twoHpEvery: config.twoHpEvery,
    });
    this.score = new ScoreSystem();
    this.hud = new HudSystem(this);
    this.hud.setScore(0);
    this.hud.setCombo(1);
    this.hud.setMission(0, config.missionTotal);
    if (config.label) this.hud.cue(360, 210, config.label, 2600);

    for (let i = 0; i < config.healthyCount; i++) {
      const pos = spawnPosition(Math.random, HEALTHY_RADIUS);
      const sprite = this.add.image(pos.x, pos.y, SPRITES.healthy)
        .setDisplaySize(HEALTHY_RADIUS * 2, HEALTHY_RADIUS * 2).setDepth(5);
      this.healthy.push({
        id: `h-${i}`, sprite, radius: HEALTHY_RADIUS,
        mover: {
          x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2,
          speed: config.baseSpeed * 0.7, radius: HEALTHY_RADIUS,
        },
      });
    }

    this._makeAmbience();
    // Fill the field to the concurrency cap up front so the mission's scale
    // (e.g. 12 cells) reads immediately; the rest refill in as cells clear.
    const initial = Math.min(config.maxConcurrent, config.missionTotal);
    for (let i = 0; i < initial; i++) this._spawnCancer();
    this._lastKillAt = this.time.now;
  }

  _spawnCancer() {
    const cfg = this._huntConfig;
    const p = this.controller.pointer;
    // Never spawn under the player's reticle.
    const pos = spawnPosition(Math.random, cfg.cellRadius, { x: p.x, y: p.y, minDist: 120 });
    const hp = this.tracker.nextHp();
    const sprite = this.add.image(pos.x, pos.y, SPRITES.cancer)
      .setDisplaySize(cfg.cellRadius * 2, cfg.cellRadius * 2).setAlpha(0).setDepth(6);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 600 });
    this.cells.push({
      id: `cancer-${this.tracker.spawned()}`, sprite, radius: cfg.cellRadius, hp, maxHp: hp,
      mover: {
        x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2,
        speed: cfg.baseSpeed, radius: cfg.cellRadius,
      },
    });
  }

  _makeAmbience() {
    for (let i = 0; i < 4; i++) this._ambientMover(SPRITES.rbc, 22, 0.4, 8, -5);
    for (let i = 0; i < 10; i++) {
      this._ambientMover(SPRITES.bokeh, 6 + Math.random() * 8, 0.25, 4, -6);
    }
  }

  _ambientMover(tex, radius, alpha, speed, depth) {
    const pos = spawnPosition(Math.random, radius);
    const sprite = this.add.image(pos.x, pos.y, tex)
      .setDisplaySize(radius * 2, radius * 2).setAlpha(alpha).setDepth(depth);
    this.ambience.push({
      sprite,
      mover: { x: pos.x, y: pos.y, heading: Math.random() * Math.PI * 2, speed, radius },
    });
  }

  _updateHunt(deltaMs) {
    const p = this.controller.pointer;
    const speedMult = this.flow.difficulty.enemySpeedMultiplier();
    const assist = this.flow.difficulty.assistRadius();

    // Lock: nearest cell (cancer or healthy) within the assist radius.
    const all = [
      ...this.cells.map((c) => ({ id: c.id, x: c.mover.x, y: c.mover.y, radius: c.radius })),
      ...this.healthy.map((h) => ({ id: h.id, x: h.mover.x, y: h.mover.y, radius: h.radius })),
    ];
    const lockedId = selectTarget(p, all, assist);
    const lockedCancer = lockedId && !lockedId.startsWith('h-')
      ? this.cells.find((c) => c.id === lockedId) : null;
    const lockedHealthy = lockedId && lockedId.startsWith('h-')
      ? this.healthy.find((h) => h.id === lockedId) : null;

    // Drift everything; the locked cancer cell focus-slows so it stays trackable.
    for (const c of this.cells) {
      c.mover = stepMover(c.mover, deltaMs, {
        speedMultiplier: speedMult, focused: c === lockedCancer,
      });
      c.sprite.setPosition(c.mover.x, c.mover.y);
    }
    for (const h of this.healthy) {
      h.mover = stepMover(h.mover, deltaMs, {});
      h.sprite.setPosition(h.mover.x, h.mover.y);
    }
    for (const a of this.ambience) {
      a.mover = stepMover(a.mover, deltaMs, {});
      a.sprite.setPosition(a.mover.x, a.mover.y);
    }

    // Dwell keys ONLY on cancer: dwell-only players can never be forced into
    // a healthy hit (their only path to a combo reset would be a click).
    const dwellState = this.dwell.update(deltaMs, lockedCancer ? lockedCancer.id : null);
    this.reticle.update(p, dwellState.progress);

    // Keep the field topped up to maxConcurrent EVERY frame: the instant a cell
    // dies its replacement fades in (the 600ms alpha tween softens the pop-in),
    // so a cleared field can never read as "no respawns". Spawning stops only
    // once the full mission total has been spawned (tracker.canSpawn caps it).
    while (this.tracker.canSpawn(this.cells.length)) this._spawnCancer();

    const clicked = this.controller.justPressed();
    if ((dwellState.completed || clicked) && lockedCancer) {
      this._hitCancer(lockedCancer);
    } else if (clicked && lockedHealthy) {
      this._hitHealthy(lockedHealthy);
    }

    if (!this._advancing && this.tracker.isComplete()) {
      this._advancing = true;
      this.time.delayedCall(BEAT_SETTLE_MS, () => this._advance());
    }
  }

  _hitCancer(cell) {
    cell.hp -= 1;
    const gained = this.score.hitCancer();
    this.hud.setScore(gained.total);
    this.hud.setCombo(gained.multiplier);
    this.hud.popup(cell.mover.x, cell.mover.y, `+${gained.points}`);
    this.fx.tone('hit');
    if (cell.hp <= 0) {
      this.fx.killBurst(cell.mover.x, cell.mover.y, 0xff5c7a);
      this.fx.shake(90, 0.003);
      cell.sprite.destroy();
      this.cells = this.cells.filter((c) => c !== cell);
      this.tracker.recordKill();
      this.hud.setMission(this.tracker.killed(), this.tracker.missionTotal());
      // Kill pace feeds the easing difficulty: slow pace -> cells drift slower.
      const now = this.time.now;
      this.flow.difficulty.recordWaveTime(now - this._lastKillAt, this._huntConfig.killTargetMs);
      this._lastKillAt = now;
    } else {
      this.fx.burst(cell.mover.x, cell.mover.y, 0xff5c7a);
      if (cell.maxHp > 1) {
        cell.sprite.setTexture(SPRITES.cancerCracked);
        this.tweens.add({
          targets: cell.sprite, scale: cell.sprite.scale * 0.9, duration: 140, yoyo: true,
        });
      }
    }
  }

  _hitHealthy(h) {
    // Gentle, no-fail consequence: the healthy cell shrugs it off unharmed;
    // only the combo resets. No damage, no score loss, no cooldown.
    this.score.hitHealthy();
    this.hud.setCombo(1);
    this.fx.burst(h.mover.x, h.mover.y, 0x7fb8ff);
    this.hud.cue(h.mover.x, h.mover.y - 60, 'That one\'s healthy — it\'s safe.');
    this.tweens.add({
      targets: h.sprite,
      displayWidth: h.radius * 2.3, displayHeight: h.radius * 2.3,
      duration: 130, yoyo: true,
    });
  }

  // ---------------- shared flow ----------------

  _advance() {
    const elapsed = this.time.now - this.beatStart;
    const next = this.flow.onBeatComplete(elapsed);
    this._enterBeat(next);
  }

  _finish() {
    const end = this.levelBeats.find((b) => b.type === 'resolution');
    const score = this.score ? this.score.state().total : null;
    this.scene.start('Result', { levelId: this.levelId, text: end.config.text, score });
  }

  update(_time, deltaMs) {
    this.controller.update();

    if (this._huntActive) {
      this._updateHunt(deltaMs);
      return;
    }

    const p = this.controller.pointer;

    const targets = this.cells.map((c) => ({
      id: c.id, x: c.sprite.x, y: c.sprite.y, radius: c.radius,
    }));
    const supportTargets = this.supports.map((s) => ({
      id: s.id, x: s.x, y: s.y, radius: s.radius,
    }));
    const assist = this.flow.difficulty.assistRadius();
    const { supportId, targetId } = resolveInteraction(p, targets, supportTargets, assist);

    // Support patches use dwell-to-restore.
    const overSupport = supportId ? this.supports.find((s) => s.id === supportId) : null;
    const effectiveTargetId = targetId;
    const dwellKey = overSupport ? overSupport.id : effectiveTargetId;

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

    if (!this._advancing && this.cells.length === 0 && this.supports.length === 0
        && this.flow.current() && this.flow.current().type !== 'hunt') {
      this._advancing = true;
      this.time.delayedCall(BEAT_SETTLE_MS, () => this._advance());
    }
  }
}
