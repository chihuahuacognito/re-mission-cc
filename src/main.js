import Phaser from 'phaser';
import { createGameConfig } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { LandingScene } from './scenes/LandingScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { FTUEScene } from './scenes/FTUEScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultScene } from './scenes/ResultScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  ...createGameConfig([BootScene, LandingScene, LevelSelectScene, FTUEScene, GameScene, ResultScene]),
});
