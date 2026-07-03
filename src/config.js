export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 720;

// Phaser-free on purpose: this stays unit-testable in Node without loading
// the engine. main.js merges in the Phaser-specific fields (type, scale).
export function createGameConfig(sceneList) {
  return {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05060f',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    scene: sceneList,
  };
}
