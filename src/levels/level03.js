// Level 3 — The Core. High: all mechanics + a big boss.
export const level03Beats = [
  { id: 'l3-scan', type: 'scan', config: {
    label: 'The tumor core. Find it.',
    cells: [{ x: 360, y: 330, radius: 26, hp: 2 }],
  } },
  { id: 'l3-wave1', type: 'wave', config: {
    targetMs: 9000,
    enemies: [
      { x: 270, y: 320, radius: 26, hp: 1 },
      { x: 450, y: 320, radius: 26, hp: 1 },
      { x: 300, y: 430, radius: 26, hp: 1 },
      { x: 430, y: 430, radius: 26, hp: 1 },
    ],
  } },
  { id: 'l3-support', type: 'support', config: {
    label: 'Hold the line — restore the tissue.',
    dimPatches: [
      { x: 255, y: 360, radius: 44 },
      { x: 465, y: 360, radius: 44 },
      { x: 360, y: 470, radius: 44 },
    ],
  } },
  { id: 'l3-ally', type: 'chemoAlly', config: {
    label: 'Treatment surge — ride it through them.',
    cluster: [
      { x: 300, y: 300, radius: 22, hp: 1 },
      { x: 420, y: 300, radius: 22, hp: 1 },
      { x: 300, y: 420, radius: 22, hp: 1 },
      { x: 420, y: 420, radius: 22, hp: 1 },
      { x: 360, y: 360, radius: 22, hp: 1 },
    ],
  } },
  { id: 'l3-boss', type: 'boss', config: {
    mass: { x: 360, y: 350, radius: 78, hp: 8 },
    label: 'The core. Strike with everything.',
  } },
  { id: 'l3-end', type: 'resolution', config: {
    text: 'You reached the core — and cleared it.\nYou fought the whole way.',
  } },
];
