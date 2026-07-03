import { selectTarget } from './targeting.js';

// Pure resolution of "what is the pointer over" between two competing layers
// (support patches vs. enemy cells). Extracted from GameScene.update so the
// closer-of-two tie-break is unit-testable outside of Phaser.
export function resolveInteraction(pointer, cells, supports, assistRadius) {
  const targetId = selectTarget(pointer, cells, assistRadius);
  let overSupport = supports.find(
    (s) => Math.hypot(s.x - pointer.x, s.y - pointer.y) <= s.radius) || null;
  let effectiveTargetId = targetId;

  if (overSupport && targetId) {
    // Both a support patch and a cell target are under the pointer: act on
    // whichever is spatially closer rather than always preferring the support.
    const cell = cells.find((c) => c.id === targetId);
    const supportDist = Math.hypot(overSupport.x - pointer.x, overSupport.y - pointer.y);
    const targetDist = cell
      ? Math.hypot(cell.x - pointer.x, cell.y - pointer.y)
      : Infinity;
    if (targetDist < supportDist) {
      overSupport = null;
    } else {
      effectiveTargetId = null;
    }
  }

  return {
    supportId: overSupport ? overSupport.id : null,
    targetId: effectiveTargetId || null,
  };
}
