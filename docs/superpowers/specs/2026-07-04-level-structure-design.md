# Level Structure & Navigation Design

**Date**: 2026-07-04
**Content Type**: Design Specification (Spec)

---

## 1. Summary

Extend the single-slice game into a navigable structure: **Landing → Level Select
(circular body-map) → FTUE tutorial → 3 levels of increasing complexity → Result →
back to Level Select** (with progression unlocking). Everything stays inside the
circular porthole and uses the existing dwell/click input model. Progress is saved
locally, no PII.

## 2. Scene & navigation flow

```
Boot → Landing → LevelSelect → (ftue → FTUE) ─────────────→ LevelSelect
                              → (l1|l2|l3 → Game(levelId)) → Result → LevelSelect
```

- `BootScene` now starts `Landing` (was `Onboarding`).
- `LandingScene`: title "SENTINEL", tagline, dwell/click "Begin" → `LevelSelect`.
- `LevelSelectScene`: circular body-map of level nodes; dwell/click a node to enter.
- `FTUEScene`: staged tutorial; on complete marks `ftue` done → `LevelSelect`.
- `GameScene`: generalized via `init({ levelId })`; on finish → `Result` with `{ levelId, text }`.
- `ResultScene`: heal-bloom + check-in; on continue, marks the level complete → `LevelSelect`.

## 3. Level manifest (single source of truth)

`src/levels/index.js`:
```js
export const LEVELS = [
  { id: 'ftue', order: 0, title: 'Training',   region: 'Calibration',    subtitle: 'Learn the controls',        unlockedBy: null,  scene: 'FTUE', beats: null },
  { id: 'l1',   order: 1, title: 'Bloodstream',region: 'The Bloodstream',subtitle: 'Find your footing',         unlockedBy: 'ftue',scene: 'Game', beats: level01Beats },
  { id: 'l2',   order: 2, title: 'The Lungs',  region: 'The Lungs',      subtitle: 'Treatment joins the fight', unlockedBy: 'l1',  scene: 'Game', beats: level02Beats },
  { id: 'l3',   order: 3, title: 'The Core',   region: 'The Tumor Core', subtitle: 'End it',                    unlockedBy: 'l2',  scene: 'Game', beats: level03Beats },
];
export function getLevel(id) { return LEVELS.find((l) => l.id === id) || null; }
```

Beats live in `src/levels/ftue.js` (unused for now — FTUE is bespoke), `level01.js`,
`level02.js`, `level03.js`. Coordinates fit the 720 circle (center 360,360, safe r≈330).

## 4. The three levels — variety & complexity

| | **L1 Bloodstream** | **L2 Lungs** | **L3 Core** |
|---|---|---|---|
| Beats | scan → wave → support → end | scan → wave → chemoAlly → wave → miniboss → end | scan → wave → support → chemoAlly → boss → end |
| Signature | fight→heal loop | treatment-as-ally + 2nd wave | all skills + big phased boss |
| Complexity | Low | Medium | High |

Always winnable; `DifficultySystem` only eases. Progression arc is emotional
(control → support → triumph), reusing existing beat types (no new engine; the
"mini/phased boss" is the `boss` type with tuned hp/radius).

## 5. Progress persistence

`src/systems/ProgressStore.js` — injectable localStorage, no PII:
- `markComplete(id)` — append id to a stored set.
- `completedIds()` — array of completed level ids.
- `isUnlocked(id)` — true if the level's `unlockedBy` is null or completed.
- `clearedCount()` — number of completed non-ftue levels.

## 6. Level Select UI — circular body-map

Nodes from `LEVELS` placed around the porthole, linked by a faint path:
- ftue (360,520), l1 (220,400), l2 (500,320), l3 (360,200) — all within safe circle.
- Node states: **locked** (dim, no entry), **next/unlocked** (pulsing cyan), **completed** (bright + check).
- Focused node shows its title + region + subtitle; center shows "N of 3 cleared".
- Dwell or click an unlocked node → start its scene (`FTUE` or `Game` with `levelId`).

## 7. FTUE (tutorial)

Bespoke `FTUEScene`, staged, never fails:
1. Aim — move onto a marker.
2. Fire — destroy a first cell (click or dwell).
3. Restore — dwell to heal dim tissue.
4. Reassurance — "You can't lose here." → mark `ftue` complete → `LevelSelect`.

## 8. Code changes

- New scenes: `LandingScene`, `LevelSelectScene`, `FTUEScene`. `GameScene` generalized to
  `init({ levelId })` reading beats from the manifest (no direct `level01` import; `_finish`
  reads resolution from `this.beats`). `ResultScene.init({ levelId, text })` marks progress
  and returns to `LevelSelect`. `BootScene` starts `Landing`.
- New data: `src/levels/` (manifest + 3 beat files). Retire `src/data/level01.js` usage.
- New system: `ProgressStore` (+ tests). Reuse: beat renderer, input model, reticle,
  circular chrome, check-in, resolveInteraction.
- Tests: update `beat-sequencer` level-shape test to validate the manifest instead of the
  old single level01 shape; add `ProgressStore` tests.

## 9. Out of scope

- Real multi-phase boss AI (approximated by hp); moving enemies; audio; server sync.
- Pre-session check-in (still `pre:3` placeholder).
