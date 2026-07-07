export class Clock {
  constructor() {
    this.now = 0;
    this._events = [];
  }

  update(dt) {
    this.now += dt;
    for (const ev of this._events) {
      if (ev.removed) continue;
      ev._acc += dt;
      // Fire per elapsed delay; getRepeatCount() returns remaining repeats.
      while (!ev.removed && (ev.delay <= 0 || ev._acc >= ev.delay)) {
        if (ev.delay > 0) ev._acc -= ev.delay;
        ev.callback();
        if (ev._remaining <= 0) ev.removed = true;
        else ev._remaining -= 1;
        if (ev.delay <= 0) break; // zero-delay one-shot guard
      }
    }
    this._events = this._events.filter((e) => !e.removed);
  }

  addEvent({ delay, repeat = 0, callback }) {
    const ev = {
      delay, _remaining: repeat, _acc: 0, removed: false, callback,
      getRepeatCount() { return this._remaining; },
    };
    this._events.push(ev);
    return ev;
  }

  delayedCall(ms, cb) { return this.addEvent({ delay: ms, repeat: 0, callback: cb }); }

  clear() { this._events = []; }
}
