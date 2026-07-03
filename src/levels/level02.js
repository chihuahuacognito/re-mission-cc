// Level 2 — The Lungs. Medium: adds treatment-as-ally + a second wave + mini-boss.
export const level02Beats = [
  { id: 'l2-scan', type: 'scan', config: {
    label: 'Scan the lungs.',
    cells: [{ x: 360, y: 330, radius: 26, hp: 1 }],
  } },
  { id: 'l2-wave1', type: 'wave', config: {
    targetMs: 9000,
    enemies: [
      { x: 280, y: 340, radius: 26, hp: 1 },
      { x: 440, y: 330, radius: 26, hp: 1 },
      { x: 360, y: 250, radius: 26, hp: 1 },
      { x: 360, y: 445, radius: 26, hp: 1 },
    ],
  } },
  { id: 'l2-ally', type: 'chemoAlly', config: {
    label: 'A treatment pulse — aim it. It fights with you.',
    cluster: [
      { x: 415, y: 315, radius: 24, hp: 1 },
      { x: 470, y: 355, radius: 24, hp: 1 },
      { x: 425, y: 405, radius: 24, hp: 1 },
      { x: 485, y: 395, radius: 24, hp: 1 },
    ],
  } },
  { id: 'l2-wave2', type: 'wave', config: {
    targetMs: 9000,
    enemies: [
      { x: 250, y: 360, radius: 26, hp: 1 },
      { x: 470, y: 360, radius: 26, hp: 1 },
      { x: 360, y: 250, radius: 26, hp: 2 },
    ],
  } },
  { id: 'l2-boss', type: 'boss', config: {
    mass: { x: 360, y: 350, radius: 60, hp: 4 },
    label: 'Clear the infected mass — keep firing.',
  } },
  { id: 'l2-end', type: 'resolution', config: {
    text: 'The lungs can breathe again.',
  } },
];
