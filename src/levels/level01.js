// Level 1 — Bloodstream. Low complexity: the core fight -> heal loop.
export const level01Beats = [
  { id: 'l1-scan', type: 'scan', config: {
    label: 'Sweep the fog. Reveal what\'s hidden.',
    cells: [{ x: 360, y: 330, radius: 28, hp: 1 }],
  } },
  { id: 'l1-wave', type: 'wave', config: {
    targetMs: 9000,
    enemies: [
      { x: 290, y: 330, radius: 28, hp: 1 },
      { x: 430, y: 320, radius: 28, hp: 1 },
      { x: 360, y: 435, radius: 28, hp: 1 },
    ],
  } },
  { id: 'l1-support', type: 'support', config: {
    label: 'Restore your body. Hold over the dim tissue.',
    dimPatches: [{ x: 265, y: 410, radius: 46 }, { x: 455, y: 410, radius: 46 }],
  } },
  { id: 'l1-end', type: 'resolution', config: {
    text: 'The bloodstream is clear.\nWell done.',
  } },
];
