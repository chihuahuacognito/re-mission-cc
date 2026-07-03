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
