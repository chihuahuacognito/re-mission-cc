export function safeLocalStorage() {
  try {
    window.localStorage.getItem('probe');
    return window.localStorage;
  } catch {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  }
}
