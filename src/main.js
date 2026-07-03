import Phaser from 'phaser';
import { createGameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { OnboardingScene } from './scenes/OnboardingScene.js';
import { GameScene } from './scenes/GameScene.js';
// TODO(Task 12): enable ResultScene
// import { ResultScene } from './scenes/ResultScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // TODO(Task 12): add ResultScene back into this list
  ...createGameConfig([BootScene, OnboardingScene, GameScene]),
});
