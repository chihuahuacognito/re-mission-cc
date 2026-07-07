// Level 3 — The Core. Fastest drift; every 4th cell is a tougher 2-HP cell
// that shows a cracked state after the first hit.
export const level03Beats = [
  { id: 'l3-hunt', type: 'hunt', config: {
    label: 'The tumor core.\nClear every last one — the blue cells are yours.',
    missionTotal: 20,
    maxConcurrent: 6,
    healthyCount: 5,
    baseSpeed: 45,
    killTargetMs: 8000,
    cellRadius: 26,
    twoHpEvery: 4,
  } },
  { id: 'l3-end', type: 'resolution', config: {
    text: 'You reached the core — and cleared it.\nYou fought the whole way.',
  } },
];
