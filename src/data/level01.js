// The vertical slice as data. Coordinates assume a 960x540 field.
export const level01 = [
  { id: 'intro', type: 'onboarding', config: {
    text: 'You are the Sentinel. This is your body.\nLet\'s clear it together.',
    practiceTarget: { x: 480, y: 300, radius: 46 },
  } },
  { id: 'scan1', type: 'scan', config: {
    fogRects: [{ x: 300, y: 120, w: 360, h: 220 }],
    reveal: 'cluster1',
  } },
  { id: 'wave1', type: 'wave', config: {
    targetMs: 8000,
    enemies: [
      { x: 360, y: 180, radius: 26, hp: 1, speed: 20 },
      { x: 520, y: 150, radius: 26, hp: 1, speed: 20 },
      { x: 470, y: 260, radius: 26, hp: 1, speed: 20 },
    ],
  } },
  { id: 'support1', type: 'support', config: {
    dimPatches: [{ x: 200, y: 400, radius: 44 }, { x: 760, y: 380, radius: 44 }],
    label: 'Clear the fog. Restore your body.',
  } },
  { id: 'ally1', type: 'chemoAlly', config: {
    label: 'A treatment pulse is here — aim it. It fights with you.',
    cluster: [
      { x: 620, y: 200, radius: 24, hp: 1 },
      { x: 680, y: 240, radius: 24, hp: 1 },
      { x: 640, y: 300, radius: 24, hp: 1 },
      { x: 720, y: 300, radius: 24, hp: 1 },
    ],
  } },
  { id: 'boss1', type: 'boss', config: {
    mass: { x: 480, y: 250, radius: 70, hp: 5 },
    chargeMs: 900,
    label: 'Charge your strike.',
  } },
  { id: 'end', type: 'resolution', config: {
    text: 'You restored this. Well done.',
  } },
];
