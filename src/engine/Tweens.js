const EASES = {
  Linear: (k) => k,
  'Sine.in': (k) => 1 - Math.cos((k * Math.PI) / 2),
  'Sine.out': (k) => Math.sin((k * Math.PI) / 2),
  'Sine.inOut': (k) => -(Math.cos(Math.PI * k) - 1) / 2,
};
function easeFn(name) { return EASES[name] || EASES.Linear; }

const RESERVED = new Set(['targets', 'duration', 'ease', 'yoyo', 'delay', 'repeat', 'onComplete', 'hold']);

export class Tweens {
  constructor() { this._tweens = []; }

  add(cfg) {
    const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
    const props = {};
    for (const k in cfg) if (!RESERVED.has(k)) props[k] = cfg[k];
    const tw = {
      targets, props,
      duration: cfg.duration || 0,
      ease: easeFn(cfg.ease),
      yoyo: !!cfg.yoyo,
      delayLeft: cfg.delay || 0,
      repeat: cfg.repeat || 0,
      remaining: cfg.repeat || 0,
      onComplete: cfg.onComplete,
      elapsed: 0,
      dir: 1,
      from: null,
      done: false,
    };
    this._tweens.push(tw);
    return tw;
  }

  update(dt) {
    for (const tw of this._tweens) {
      if (tw.done) continue;
      if (tw.targets.some((t) => t && t.destroyed)) { tw.done = true; continue; } // no onComplete
      if (tw.delayLeft > 0) { tw.delayLeft -= dt; continue; }
      if (!tw.from) tw.from = tw.targets.map((t) => { const o = {}; for (const p in tw.props) o[p] = t[p]; return o; });

      tw.elapsed += dt;
      const k = tw.duration > 0 ? Math.min(1, tw.elapsed / tw.duration) : 1;
      const e = tw.ease(k);
      const f = tw.dir === 1 ? e : 1 - e;
      tw.targets.forEach((t, i) => {
        for (const p in tw.props) { const a = tw.from[i][p]; t[p] = a + (tw.props[p] - a) * f; }
      });

      if (k >= 1) {
        if (tw.yoyo && tw.dir === 1) { tw.dir = -1; tw.elapsed = 0; }
        else if (tw.repeat === -1 || tw.remaining > 0) {
          if (tw.repeat !== -1) tw.remaining -= 1;
          tw.elapsed = 0; tw.dir = 1;
        } else {
          // settle exactly on the final values, then complete
          tw.targets.forEach((t, i) => { for (const p in tw.props) t[p] = tw.dir === 1 ? tw.props[p] : tw.from[i][p]; });
          tw.done = true;
          if (tw.onComplete) tw.onComplete();
        }
      }
    }
    this._tweens = this._tweens.filter((t) => !t.done);
  }

  clear() { this._tweens = []; } // teardown: never fires onComplete
}
