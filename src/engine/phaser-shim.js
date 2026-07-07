import { Scene } from './Scene.js';
import { SceneManager } from './SceneManager.js';
import { Tweens } from './Tweens.js';
import { Clock } from './Clock.js';
import { Camera } from './Camera.js';
import { Textures } from './textures.js';
import { Renderer } from './Renderer.js';
import { InputManager } from './InputManager.js';
import { Loop } from './Loop.js';
import { distanceBetween } from './geometry.js';

// Boots the harness from a Phaser-style config (width, height, parent, scene[]).
class Game {
  constructor(config) {
    const size = config.width || 720;
    const parent = document.getElementById(config.parent || 'game') || document.body;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = config.height || size;
    canvas.style.width = 'min(100vw, 100vh)';
    canvas.style.height = 'min(100vw, 100vh)';
    canvas.style.display = 'block';
    if (config.backgroundColor) canvas.style.background = config.backgroundColor;
    parent.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const textures = new Textures();
    const tweens = new Tweens();
    const clock = new Clock();
    const camera = new Camera({ width: size });
    const input = new InputManager(canvas, size);
    const renderer = new Renderer(ctx, textures, size);

    // Scene registry expects instances; config.scene is an array of classes.
    const scenes = config.scene.map((SceneClass) => new SceneClass());
    const manager = new SceneManager({ scenes, tweens, clock, camera, input, textures, renderer });

    manager.start(scenes[0].key);
    new Loop({ manager, clock, tweens, camera, renderer }).start();
  }
}

const Phaser = {
  Scene,
  Game,
  AUTO: 'AUTO',
  Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  Math: { Distance: { Between: distanceBetween } },
};

export default Phaser;
