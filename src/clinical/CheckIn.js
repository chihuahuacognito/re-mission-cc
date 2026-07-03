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

  save({ pre, post, ts }) {
    const record = { pre, post, delta: computeDelta(pre, post), ts };
    const list = this.all();
    list.push(record);
    this._storage.setItem(this._key, JSON.stringify(list));
    return record;
  }
}
