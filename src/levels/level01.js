// Level 1 — Bloodstream. The gentlest hunt: few cells, slowest drift.
export const level01Beats = [
  { id: 'l1-hunt', type: 'hunt', config: {
    label: 'Clear the bloodstream.\nThe blue cells are yours — let them be.',
    missionTotal: 12,
    maxConcurrent: 4,
    healthyCount: 3,
    baseSpeed: 20,      // px/s — deliberately slow for fatigued players
    killTargetMs: 9000, // pace-of-kills target feeding DifficultySystem easing
    cellRadius: 28,
    twoHpEvery: 0,
  } },
  { id: 'l1-end', type: 'resolution', config: {
    text: 'The bloodstream is clear.\nWell done.',
  } },
];
