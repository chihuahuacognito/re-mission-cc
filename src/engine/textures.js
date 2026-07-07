export class Textures {
  constructor() { this._map = new Map(); }

  register(key, canvas, frameWidth, frameHeight) {
    this._map.set(key, { canvas, width: frameWidth, height: frameHeight });
  }

  exists(key) { return this._map.has(key); }

  get(key) { return this._map.get(key); }

  getFrame(key) {
    const t = this._map.get(key);
    if (!t) throw new Error(`Texture not found: ${key}`);
    return { width: t.width, height: t.height };
  }

  // Browser-only: allocates an offscreen canvas the caller draws into,
  // mirroring Phaser's textures.createCanvas(...).getContext()/refresh().
  createCanvas(key, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.register(key, canvas, w, h);
    const ctx = canvas.getContext('2d');
    return { getContext: () => ctx, refresh: () => {} };
  }
}
