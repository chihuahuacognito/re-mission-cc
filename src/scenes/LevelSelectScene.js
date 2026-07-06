import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { MousePointerAdapter } from '../input/MousePointerAdapter.js';
import { DwellTracker } from '../input/DwellTracker.js';
import { Reticle } from '../systems/Reticle.js';
import { applyCircularChrome } from '../systems/CircularDisplay.js';
import { ProgressStore } from '../systems/ProgressStore.js';
import { safeLocalStorage } from '../systems/safeStorage.js';
import { LEVELS } from '../levels/index.js';
import { DWELL_MS } from '../systems/pacing.js';

const COORDS = {
  ftue: { x: 360, y: 520 },
  l1: { x: 220, y: 400 },
  l2: { x: 500, y: 320 },
  l3: { x: 360, y: 200 },
};

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create() {
    this.input.setDefaultCursor('none');
    applyCircularChrome(this);
    this.controller = new InputController(new MousePointerAdapter(this.input));
    this.dwell = new DwellTracker({ dwellMs: DWELL_MS });
    this.reticle = new Reticle(this);
    this.progress = new ProgressStore(safeLocalStorage());

    this.nodes = LEVELS.map((lvl) => ({ ...lvl, ...(COORDS[lvl.id] || { x: 360, y: 360 }), radius: 42 }));

    // Faint connecting path through the nodes in manifest order.
    const path = this.add.graphics().setDepth(0);
    path.lineStyle(3, 0x2a4a55, 0.5);
    path.beginPath();
    this.nodes.forEach((n, i) => {
      if (i === 0) path.moveTo(n.x, n.y);
      else path.lineTo(n.x, n.y);
    });
    path.strokePath();

    const completedIds = this.progress.completedIds();
    this.nodes.forEach((node) => {
      const completed = completedIds.includes(node.id);
      const unlocked = this.progress.isUnlocked(node.id);

      const g = this.add.graphics().setDepth(5);
      g.x = node.x;
      g.y = node.y;
      let labelColor = '#4a5a62';
      if (completed) {
        g.fillStyle(0x64ffb0, 0.9);
        g.fillCircle(0, 0, node.radius);
        labelColor = '#eafff5';
      } else if (unlocked) {
        g.lineStyle(4, 0x7fe7ff, 0.9);
        g.strokeCircle(0, 0, node.radius);
        labelColor = '#cfefff';
        this.tweens.add({
          targets: g, scaleX: 1.08, scaleY: 1.08,
          duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      } else {
        g.fillStyle(0x24323a, 0.5);
        g.fillCircle(0, 0, node.radius);
        labelColor = '#4a5a62';
      }
      node.graphic = g;

      // Node shows only a glyph; the full title/region/subtitle appears large in
      // the center panel on hover (below) rather than crammed in tiny text here.
      const orderLabel = completed ? '✓' : (node.id === 'ftue' ? 'T' : String(node.order));
      this.add.text(node.x, node.y, orderLabel, {
        fontFamily: 'sans-serif', fontSize: '22px', color: labelColor,
      }).setOrigin(0.5).setDepth(6);
    });

    this.infoTitle = this.add.text(360, 95, '', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#eafff5', align: 'center',
    }).setOrigin(0.5).setDepth(10);
    this.infoRegion = this.add.text(360, 130, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#9fdbe8', align: 'center',
    }).setOrigin(0.5).setDepth(10);
    this.infoSubtitle = this.add.text(360, 158, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#8fb3c9', align: 'center',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(360, 360, `${this.progress.clearedCount()} of 3 cleared`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#cfefff',
    }).setOrigin(0.5).setDepth(6);

    this.done = false;
  }

  update(_time, deltaMs) {
    this.controller.update();
    const p = this.controller.pointer;

    let hovered = null;
    for (const node of this.nodes) {
      if (Phaser.Math.Distance.Between(p.x, p.y, node.x, node.y) <= node.radius) {
        hovered = node;
        break;
      }
    }

    if (hovered) {
      this.infoTitle.setText(hovered.title);
      this.infoRegion.setText(hovered.region);
      this.infoSubtitle.setText(hovered.subtitle);
    } else {
      this.infoTitle.setText('');
      this.infoRegion.setText('');
      this.infoSubtitle.setText('');
    }

    const dwellKey = (hovered && this.progress.isUnlocked(hovered.id)) ? hovered.id : null;
    const dwellState = this.dwell.update(deltaMs, dwellKey);
    this.reticle.update(p, dwellState.progress);

    if (this.done) return;
    const activated = dwellKey && (dwellState.completed || this.controller.justPressed());
    if (activated) {
      this.done = true;
      if (hovered.id === 'ftue') {
        this.scene.start('FTUE');
      } else {
        this.scene.start('Game', { levelId: hovered.id });
      }
    }
  }
}
