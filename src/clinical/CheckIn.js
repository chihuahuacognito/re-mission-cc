export function computeDelta(pre, post) {
  return post - pre;
}

export class CheckInStore {
  constructor(storage, key = 'sentinel.checkins') {
    this._storage = storage;
    this._key = key;
  }

  all() {
    const raw = this._storage.getItem(this._key);
    return raw ? JSON.parse(raw) : [];
  }

  // `preIsPlaceholder` marks a record whose `pre` is a stand-in, not a real
  // pre-session capture (the slice has no pre-scene yet). Such a record must
  // never yield a pre/post delta — a delta off a fake baseline is fiction and
  // could be mistaken for clinical evidence. We store delta: null and flag the
  // baseline so any later export/analysis can exclude it honestly.
  save({ pre, post, ts, preIsPlaceholder = false }) {
    const record = {
      pre,
      post,
      ts,
      baseline: preIsPlaceholder ? 'placeholder' : 'measured',
      delta: preIsPlaceholder ? null : computeDelta(pre, post),
    };
    const list = this.all();
    list.push(record);
    this._storage.setItem(this._key, JSON.stringify(list));
    return record;
  }
}
