import { level01Beats } from './level01.js';
import { level02Beats } from './level02.js';
import { level03Beats } from './level03.js';

export const LEVELS = [
  { id: 'ftue', order: 0, title: 'Training',    region: 'Calibration',     subtitle: 'Learn the controls',         unlockedBy: null,   scene: 'FTUE', beats: null },
  { id: 'l1',   order: 1, title: 'Bloodstream', region: 'The Bloodstream', subtitle: 'Find your footing',          unlockedBy: 'ftue', scene: 'Game', beats: level01Beats },
  { id: 'l2',   order: 2, title: 'The Lungs',   region: 'The Lungs',       subtitle: 'Treatment joins the fight',  unlockedBy: 'l1',   scene: 'Game', beats: level02Beats },
  { id: 'l3',   order: 3, title: 'The Core',    region: 'The Tumor Core',  subtitle: 'End it',                     unlockedBy: 'l2',   scene: 'Game', beats: level03Beats },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || null;
}
