// The vertical slice as data. Coordinates fit a 720x720 circular display,
// center (360,360), safe radius ~330.
export const level01 = [
  { id: 'intro', type: 'onboarding', config: {
    text: 'You are the Sentinel.\nThis is your body. Let\'s clear it together.',
    practiceTarget: { x: 360, y: 360, radius: 46 },
  } },
  { id: 'scan1', type: 'scan', config: {
    label: 'Sweep the fog. Reveal what\'s hidden.',
    cells: [{ x: 360, y: 340, radius: 26, hp: 1 }],
  } },
  { id: 'wave1', type: 'wave', config: {
    targetMs: 8000,
    enemies: [
      { x: 285, y: 330, radius: 26, hp: 1 },
      { x: 435, y: 320, radius: 26, hp: 1 },
      { x: 360, y: 440, radius: 26, hp: 1 },
    ],
  } },
  { id: 'support1', type: 'support', config: {
    dimPatches: [{ x: 255, y: 415, radius: 44 }, { x: 465, y: 415, radius: 44 }],
    label: 'Clear the fog. Restore your body.',
  } },
  { id: 'ally1', type: 'chemoAlly', config: {
    label: 'A treatment pulse is here — aim it. It fights with you.',
    cluster: [
      { x: 420, y: 315, radius: 24, hp: 1 },
      { x: 470, y: 355, radius: 24, hp: 1 },
      { x: 430, y: 405, radius: 24, hp: 1 },
      { x: 490, y: 395, radius: 24, hp: 1 },
    ],
  } },
  { id: 'boss1', type: 'boss', config: {
    mass: { x: 360, y: 350, radius: 68, hp: 5 },
    label: 'Strike the mass — keep firing.',
  } },
  { id: 'end', type: 'resolution', config: {
    text: 'You restored this. Well done.',
  } },
];
