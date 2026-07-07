// Spawn/kill bookkeeping for a hunt beat. Pure logic, no failure concept by
// construction: the mission counter only ever counts up, and the hunt is
// complete when every cancer cell has been cleared — always reachable.
export class HuntTracker {
  constructor({ missionTotal, maxConcurrent, twoHpEvery = 0 }) {
    this._total = missionTotal;
    this._max = maxConcurrent;
    this._every = twoHpEvery;
    this._spawned = 0;
    this._killed = 0;
  }

  canSpawn(activeCount) {
    return this._spawned < this._total && activeCount < this._max;
  }

  // Called once per spawn: advances the spawn counter and returns the new
  // cell's HP (every `twoHpEvery`-th spawn is a tougher 2-HP cell).
  nextHp() {
    this._spawned += 1;
    return this._every > 0 && this._spawned % this._every === 0 ? 2 : 1;
  }

  recordKill() { this._killed += 1; }
  killed() { return this._killed; }
  spawned() { return this._spawned; }
  missionTotal() { return this._total; }
  isComplete() { return this._killed >= this._total; }
}
