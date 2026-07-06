// Single source of truth for interaction pace.
//
// Sentinel's players may be fatigued, on chemo, or one-handed with an IV. The
// pace must feel calm and identical everywhere — the body learns the tempo from
// the very first touch (Landing), not from the first fight. Tune here once.
export const DWELL_MS = 1100;      // hover-to-lock fill: unhurried, hard to trigger by accident
export const BEAT_SETTLE_MS = 950; // pause after a beat clears, so success lands before the next
