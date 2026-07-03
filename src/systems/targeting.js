export function selectTarget(pointer, targets, assistRadius) {
  let best = null;
  let bestEdge = Infinity;
  for (const t of targets) {
    const dx = t.x - pointer.x;
    const dy = t.y - pointer.y;
    const edge = Math.sqrt(dx * dx + dy * dy) - t.radius;
    if (edge <= assistRadius && edge < bestEdge) {
      bestEdge = edge;
      best = t.id;
    }
  }
  return best;
}
