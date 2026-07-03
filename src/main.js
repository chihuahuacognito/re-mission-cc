import Phaser from 'phaser';
import { createGameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { OnboardingScene } from './scenes/OnboardingScene.js';
// TODO(Task 11/12): enable GameScene/ResultScene
// import { GameScene } from './scenes/GameScene.js';
// import { ResultScene } from './scenes/ResultScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // TODO(Task 11/12): add GameScene, ResultScene back into this list
  ...createGameConfig([BootScene, OnboardingScene]),
});
