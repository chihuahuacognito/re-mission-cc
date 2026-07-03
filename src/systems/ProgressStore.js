import { LEVELS, getLevel } from '../levels/index.js';

// Local-only, no PII: tracks which levels the player has completed and derives unlocks.
export class ProgressStore {
  constructor(storage, key = 'sentinel.progress') {
    this._storage = storage;
    this._key = key;
  }

  completedIds() {
    const raw = this._storage.getItem(this._key);
    return raw ? JSON.parse(raw) : [];
  }

  markComplete(id) {
    const set = new Set(this.completedIds());
    set.add(id);
    this._storage.setItem(this._key, JSON.stringify([...set]));
  }

  isUnlocked(id) {
    const level = getLevel(id);
    if (!level) return false;
    if (!level.unlockedBy) return true;
    return this.completedIds().includes(level.unlockedBy);
  }

  clearedCount() {
    const done = this.completedIds();
    return LEVELS.filter((l) => l.id !== 'ftue' && done.includes(l.id)).length;
  }
}
