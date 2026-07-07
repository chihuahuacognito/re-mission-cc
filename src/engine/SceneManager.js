import { Image, Text, Circle } from './objects.js';
import { Graphics } from './Graphics.js';

export class SceneManager {
  constructor({ scenes, tweens, clock, camera, input, textures, renderer }) {
    this.tweens = tweens;
    this.clock = clock;
    this.camera = camera;
    this.input = input;
    this.textures = textures;
    this.renderer = renderer;
    this.displayList = [];
    this.active = null;
    this._pending = null;
    this._byKey = new Map();
    for (const s of scenes) this._byKey.set(s.key, s);
  }

  start(key, data) { this._pending = { key, data }; }

  step() {
    if (!this._pending) return;
    const { key, data } = this._pending;
    this._pending = null;
    this._teardown();
    const scene = this._byKey.get(key);
    this.active = scene;
    this._inject(scene);
    if (scene.init) scene.init(data || {});
    if (scene.create) scene.create();
  }

  compact() {
    if (this.displayList.some((o) => o.destroyed)) {
      this.displayList = this.displayList.filter((o) => !o.destroyed);
    }
  }

  _teardown() {
    this.tweens.clear();
    this.clock.clear();
    this.displayList.length = 0;
    // textures, sound, cache are engine-global and deliberately survive.
  }

  _inject(scene) {
    const list = this.displayList;
    const textures = this.textures;
    const add = {
      image: (x, y, key) => {
        const f = textures.getFrame(key);
        const o = new Image(x, y, key, f.width, f.height);
        list.push(o); // destroy() sets .destroyed; compact() drops it next frame
        return o;
      },
      text: (x, y, str, style) => { const o = new Text(x, y, str, style); list.push(o); return o; },
      circle: (x, y, r, color, alpha) => { const o = new Circle(x, y, r, color, alpha); list.push(o); return o; },
      graphics: () => { const g = new Graphics(); g._textures = textures; list.push(g); return g; },
    };
    scene.add = add;
    scene.tweens = this.tweens;
    scene.time = this.clock;
    scene.cameras = this.camera;
    scene.input = this.input;
    scene.textures = this.textures;
    scene.sound = { play: () => {} };
    scene.cache = { audio: { exists: () => false } };
    scene.scene = { start: (k, d) => this.start(k, d) };
  }
}
