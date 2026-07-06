# Sentinel Vertical Slice — Playtest Checklist
**Date:** 2026-07-03
**Content Type:** Test Checklist

Verify each against the therapeutic constraints (spec §2):

- [ ] No path reaches a "lose" / "game over" / "your body failed" state.
- [ ] Entire slice is completable one-handed using ONLY dwell (no clicks).
- [ ] Entire slice is completable using ONLY activate (clicks), no dwell.
- [ ] Coarse, jittery pointing still hits targets (aim-assist visibly forgiving).
- [ ] Deliberately stalling/missing widens the aim-assist radius (via DifficultySystem.assistRadius) — the game only ever gets more forgiving, never harder.
- [ ] Onboarding teaches pointer + activate + dwell before real gameplay.
- [ ] The chemo-pulse beat reads as "treatment helping me," not an enemy.
- [ ] Boss clear + region bloom lands as "I did that" (agency payoff).
- [ ] Post check-in saves locally with no PII; delta computed correctly for a real
      baseline, and recorded as `null` with `baseline: 'placeholder'` while the pre-scene
      is still a stand-in (no false delta presented as evidence).
- [ ] Full run takes ~3–5 minutes at a calm pace.

## Pace & legibility (added 2026-07-04 after design critique)

- [ ] **Pace is coherent across the WHOLE flow**, not just the fight: dwell fill feels
      the same unhurried speed on Landing → Level Select → FTUE → Game → Result (all now
      share `DWELL_MS` from `src/systems/pacing.js`). Nothing should snap.
- [ ] Beat-to-beat transitions in a level don't rush — success registers before the next
      beat begins (`BEAT_SETTLE_MS`).
- [ ] **On the actual circular display at bedside viewing distance**, all patient-facing
      text is comfortably readable (min 18px enforced) and no content is clipped by the
      circular mask (safe circle: center 360,360 / radius ~330). Check Level Select node
      glyphs, the center detail panel, and the Landing hint at y=600 specifically.
