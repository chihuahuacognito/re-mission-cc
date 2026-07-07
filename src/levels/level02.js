// Level 2 — The Lungs. More cells, a little faster.
export const level02Beats = [
  { id: 'l2-hunt', type: 'hunt', config: {
    label: 'Clear the lungs.\nMind the healthy blue cells.',
    missionTotal: 16,
    maxConcurrent: 5,
    healthyCount: 4,
    baseSpeed: 32,
    killTargetMs: 8000,
    cellRadius: 26,
    twoHpEvery: 0,
  } },
  { id: 'l2-end', type: 'resolution', config: {
    text: 'The lungs can breathe again.',
  } },
];
