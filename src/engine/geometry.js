// Replacement for Phaser.Math.Distance.Between.
export function distanceBetween(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
