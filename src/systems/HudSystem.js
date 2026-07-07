import { DISPLAY } from './CircularDisplay.js';

// Arcade HUD for hunt levels: score panel (top center), mission counter under
// it, combo badge (right), floating "+N" popups and calm cue lines.
// Everything sits inside the safe circle; all text >= 18px (patient-facing
// text floor); depths stay below the circular chrome at 3000.
//
// Deliberate exclusions from the reference image (constraint-driven):
// no countdown timer (time pressure), no hearts/health bar (reads as the
// body failing), no pause button (out of scope).
export class HudSystem {
  constructor(scene) {
    this.scene = scene;
    const cx = DISPLAY.cx;

    const panel = scene.add.graphics().setDepth(1000);
    panel.fillStyle(0x141031, 0.72);
    panel.fillRoundedRect(cx - 92, 34, 184, 76, 18);
    panel.lineStyle(2, 0x6f5fd6, 0.8);
    panel.strokeRoundedRect(cx - 92, 34, 184, 76, 18);

    this._scoreLabel = scene.add.text(cx, 52, 'SCORE', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#7fe7ff',
    }).setOrigin(0.5).setDepth(1001);
    this._scoreValue = scene.add.text(cx, 84, '0', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#eafff5', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    this._mission = scene.add.text(cx, 136, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd75e',
    }).setOrigin(0.5).setDepth(1001);
    this._combo = scene.add.text(595, 340, 'x1', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#9dff8a',
      backgroundColor: '#10241a', padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(1001).setAlpha(0);
    this._comboValue = 1;
    this._comboRevealed = false; // stays hidden until the first cancer hit
  }

  setScore(total) {
    this._scoreValue.setText(String(total));
  }

  setMission(done, total) {
    this._mission.setText(`Destroy the cancer cells · ${done}/${total}`);
  }

  setCombo(multiplier) {
    const grew = multiplier > this._comboValue;
    this._comboValue = multiplier;
    // The badge doesn't exist until the player earns it: it appears only once a
    // cancer hit pushes the multiplier past x1, then stays for the rest of the
    // level (dimmed at x1 to show a broken combo).
    if (multiplier > 1) this._comboRevealed = true;
    if (!this._comboRevealed) { this._combo.setAlpha(0); return; }
    this._combo.setText(`x${multiplier}`);
    this._combo.setAlpha(multiplier === 1 ? 0.55 : 1);
    if (grew) {
      this.scene.tweens.add({ targets: this._combo, scale: 1.25, duration: 120, yoyo: true });
    }
  }

  popup(x, y, text, color = '#ffd75e') {
    const t = this.scene.add.text(x, y - 20, text, {
      fontFamily: 'sans-serif', fontSize: '20px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1200);
    this.scene.tweens.add({
      targets: t, y: y - 70, alpha: 0, duration: 900, ease: 'Sine.out',
      onComplete: () => t.destroy(),
    });
  }

  // A calm, non-scolding line near a point of interest, clamped so it always
  // stays legible inside the safe circle.
  cue(x, y, text, holdMs = 1600) {
    const px = Math.min(560, Math.max(160, x));
    const py = Math.min(560, Math.max(150, y));
    const t = this.scene.add.text(px, py, text, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#bcd9ff', align: 'center',
    }).setOrigin(0.5).setDepth(1200);
    this.scene.tweens.add({
      targets: t, alpha: 0, delay: holdMs, duration: 500,
      onComplete: () => t.destroy(),
    });
  }
}
