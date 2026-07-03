import Phaser from 'phaser';
import { createGameConfig } from './config.js';

class BootPlaceholder extends Phaser.Scene {
  constructor() { super('BootPlaceholder'); }
  create() {
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Sentinel — boot OK', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#7fe7ff',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  ...createGameConfig([BootPlaceholder]),
});
