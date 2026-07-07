export class FeedbackSystem {
  constructor(scene) {
    this.scene = scene;
  }

  burst(x, y, color = 0x7fe7ff) {
    const g = this.scene.add.graphics().setDepth(900);
    let r = 4;
    const tick = this.scene.time.addEvent({
      delay: 16, repeat: 12, callback: () => {
        r += 6;
        g.clear();
        g.lineStyle(3, color, Math.max(0, 1 - r / 80));
        g.strokeCircle(x, y, r);
        if (tick.getRepeatCount() === 0) g.destroy();
      },
    });
  }

  // Destroy feedback: the ripple ring plus 8 particle dots flying outward.
  killBurst(x, y, color = 0xff5c7a) {
    this.burst(x, y, color);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dot = this.scene.add.circle(x, y, 4, color, 0.9).setDepth(900);
      this.scene.tweens.add({
        targets: dot, x: x + Math.cos(a) * 64, y: y + Math.sin(a) * 64,
        alpha: 0, duration: 450, ease: 'Sine.out', onComplete: () => dot.destroy(),
      });
    }
  }

  shake(ms = 120, intensity = 0.004) {
    this.scene.cameras.main.shake(ms, intensity);
  }

  tone(kind) {
    // Check the audio CACHE (was the key loaded?), not sound.get() which only
    // finds already-instantiated Sound objects and would never become truthy.
    const audioCache = this.scene.cache && this.scene.cache.audio;
    if (audioCache && audioCache.exists(kind)) {
      this.scene.sound.play(kind);
    }
    // else: no-op until audio assets are added
  }
}
