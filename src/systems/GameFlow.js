import { BeatSequencer } from './BeatSequencer.js';
import { DifficultySystem } from './DifficultySystem.js';

export class GameFlow {
  constructor(beats) {
    this._seq = new BeatSequencer(beats);
    this.difficulty = new DifficultySystem();
  }
  current() { return this._seq.current(); }
  onBeatComplete(elapsedMs) {
    const beat = this._seq.current();
    if (beat && beat.config && typeof beat.config.targetMs === 'number') {
      this.difficulty.recordWaveTime(elapsedMs, beat.config.targetMs);
    }
    return this._seq.advance();
  }
}
