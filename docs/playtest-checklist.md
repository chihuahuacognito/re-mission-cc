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

## Hunt levels + arcade HUD (2026-07-07)

Therapeutic constraints under motion:
- [ ] Cell drift feels slow and trackable on L1 even when tired; L3 is livelier but never frantic.
- [ ] Dwell-only play (no clicking at all) can complete every level — dwell never fires at a healthy cell.
- [ ] Focus-slow is felt: a locked cell visibly settles under the reticle.
- [ ] Hitting a healthy cell reads calm, not scolding: soft blue ripple, "That one's healthy — it's safe.", combo quietly returns to x1. It must never feel like damage or failure.
- [ ] Combo reset does not sting — no harsh sound, no red flash, no lost points.
- [ ] Difficulty easing works: killing slowly for a while visibly slows the drift.

HUD & legibility (bedside distance, circular display):
- [ ] Score panel, mission counter, combo badge and popups all sit inside the safe circle.
- [ ] All HUD text legible at 18px+; floating "+N" popups readable while rising.
- [ ] Mission counter only ever counts up; nothing on screen counts down.
- [ ] No timer, no hearts/health bar, no fail imagery anywhere.

Playfield look:
- [ ] Cancer cells read as "wrong" (spiky red), healthy cells as "yours" (soft blue) at a glance.
- [ ] 2-HP cells (L3) visibly crack after the first hit.
- [ ] Background ambience (red blood cells, bokeh) reads as depth, not as targets.
- [ ] Result screen shows the score once, celebratory, with no comparison to past runs.
