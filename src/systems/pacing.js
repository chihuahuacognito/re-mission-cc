// Single source of truth for interaction pace.
//
// Sentinel's players may be fatigued, on chemo, or one-handed with an IV. The
// pace must feel calm and identical everywhere — the body learns the tempo from
// the very first touch (Landing), not from the first fight. Tune here once.
export const DWELL_MS = 1100;      // hover-to-lock fill: unhurried, hard to trigger by accident
export const BEAT_SETTLE_MS = 950; // pause after a beat clears, so success lands before the next

// During active play (the tutorial's aim/strike + the hunt levels) the lock-on
// fill is deliberately slower still — a calmer, less twitchy commit before a
// cell is destroyed. Menus keep DWELL_MS so navigation never drags. Tune the
// play-vs-menu ratio here, never with a literal in a scene.
export const PLAY_DWELL_MS = DWELL_MS * 2; // 2200ms — 50% slower reticle lock in levels
