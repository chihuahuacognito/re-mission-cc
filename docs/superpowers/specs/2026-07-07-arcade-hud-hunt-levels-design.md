# Design: Arcade HUD + Moving-Cell Hunt Levels

**Date**: 2026-07-07
**Content Type**: Design Specification

## Goal

Bring the game closer to the reference UI (`refer3nce_ui.png`): an arcade-style HUD
(score panel, floating score popups, mission progress counter, combo multiplier) and a
rich, living playfield — while reworking levels 1–3 into "destroy the moving cancer
cells, avoid the healthy blue cells" hunts with speed-based difficulty. The FTUE
tutorial is untouched.

All of it stays inside the product's non-negotiables: no fail state, dwell-or-click
input everywhere, safe circle (center 360,360 / radius ~330), ≥18px patient-facing
text, local-only data.

## Decisions made during brainstorming

| Question | Decision |
| --- | --- |
| Healthy-cell hit consequence | Combo resets to x1 + gentle cue. No damage, no score loss, no cooldown. |
| Aiming vs moving cells | Lock-on dwell (fill follows the cell) + focus-slow (locked cell drifts at ~25% speed). Click always fires instantly. |
| Level structure | One continuous hunt per level, then the existing resolution beat. |
| Chemo-ally beat | **Dropped from playable levels for now** — see Flagged Regression below. |
| Score scope | Per-level, transient. Shown on Result screen; never persisted (no session-to-session self-comparison). |
| Art pipeline | Procedural canvas textures now, keyed through a sprite lookup so PNG art can swap in later without scene changes. |
| Architecture | Approach A: add a `hunt` beat type to the existing GameScene; old beat types stay in the renderer (unused, available for future levels). |

## 1. Hunt gameplay (levels 1–3)

Each level's data file becomes one `hunt` beat + the existing `resolution` beat
(current resolution texts kept verbatim).

Hunt config per level:

| Field | L1 Bloodstream | L2 The Lungs | L3 The Core |
| --- | --- | --- | --- |
| `missionTotal` (cancer cells to clear) | 12 | 16 | 20 |
| `maxConcurrent` cancer on field | 4 | 5 | 6 |
| `healthyCount` (blue cells drifting) | 3 | 4 | 5 |
| `baseSpeed` (px/s, tunable) | 20 | 32 | 45 |
| `killTargetMs` (struggle measure) | 9000 | 8000 | 8000 |
| 2-HP cracked-state cancer cells | none | none | some (~1 in 4) |

- **Spawning**: a few cancer cells at start, then a gentle trickle (fade-in) until
  `missionTotal` have appeared; the field never exceeds `maxConcurrent`. New cells
  never spawn under the player's reticle. Healthy cells are present throughout.
- **Movement**: every cell drifts with a slow wander (velocity + gentle direction
  noise) and stays inside the safe circle (radius 330 minus cell radius) by bouncing
  softly off the boundary.
- **Difficulty**: per-level `baseSpeed` × `DifficultySystem.enemySpeedMultiplier()`.
  Struggle is fed by time-between-kills vs `killTargetMs` via the existing
  `recordWaveTime(elapsed, target)`. Slow pace → cells ease down toward the 0.4
  speed floor. Difficulty only ever eases; there is still no failure concept.
- **Lock-on + focus-slow**: the nearest cell inside the assist radius
  (`DifficultySystem.assistRadius()`) is the lock. The dwell fill keys on that cell's
  id, so the fill follows the cell as it moves. While locked, the cell's speed is
  multiplied by `FOCUS_SLOW` (~0.25). Click (`justPressed`) fires instantly.
- **Cancer hit**: HP −1; burst + ring + floating score popup; 2-HP cells swap to the
  cracked texture at 1 HP. On destroy, the mission counter increments.
- **Healthy hit**: the blue cell wobbles unharmed, a soft blue ripple plays, a calm
  one-line cue appears ("That one's healthy — it's safe.", ≥18px, brief), and the
  combo resets to x1. Nothing else — no cooldown, no score loss.
- **No fail state**: cells never harm the player, nothing counts down, the mission
  counter only ascends, and every level is always completable.

## 2. Score & combo — `ScoreSystem` (pure logic)

Phaser-free module in `src/systems/`, fully unit-tested.

- Each cancer hit scores `50 × multiplier`, then the multiplier increments (x1 → x8 cap).
- Healthy hit resets the multiplier to x1.
- **No time decay** — the combo waits patiently; slow play is never punished, only
  imprecision resets it.
- API: `hitCancer() -> { points, multiplier, total }`, `hitHealthy()`,
  `state() -> { total, multiplier }`.
- Score is transient: passed to ResultScene via `scene.start('Result', {...})` data
  for a celebration line; never written to ProgressStore.

## 3. HUD — `HudSystem`

Phaser module owning all overlay chrome; all elements inside the safe circle, all
text ≥18px, depth above the playfield.

- **Top center**: score panel — "SCORE" label + large value.
- **Below it**: mission banner — "Destroy the cancer cells · 4/12".
- **Right side**: combo badge ("x6") that flashes the points just gained.
- **Floating popups**: "+100" rises and fades at the hit point.
- **Healthy-hit cue**: the calm one-liner, rendered by the HUD near the cell.
- **Deliberately excluded** from the reference image: countdown timer (time
  pressure), hearts/health bar (implies the body failing), pause button (not in
  scope). These are constraint-driven exclusions, not omissions.

## 4. Playfield art — `sprites.js` + BootScene upgrade

- New `src/systems/sprites.js`: a `SPRITES` lookup mapping logical names
  (`cancer`, `cancerCracked`, `healthy`, `rbc`, `bokeh`, `boss`) to texture keys.
  Scenes reference logical names only, so PNG assets can replace procedural textures
  later without touching scene code.
- BootScene draws richer canvas textures: spiky red cancer blob (+ cracked variant
  with fissure lines), translucent blue healthy cell (membrane ring + nucleus),
  biconcave red blood cell, soft bokeh dot, and a deep blue-violet multi-stop
  radial background replacing the teal `bgGlow`.
- **Ambience layer** (in GameScene, below gameplay depth): a few non-interactive
  RBCs drifting slowly + low-alpha bokeh particles.
- **Juice**: ripple ring on lock acquisition, particle burst + expanding ring on
  destroy (extending the existing `FeedbackSystem`).

## 5. Motion — `motion.js` (pure logic)

Phaser-free helpers, unit-tested: wander step (velocity + direction noise),
safe-circle containment/bounce, focus-slow application, speed-multiplier
application. GameScene calls these per frame; the module never touches Phaser.
Shared feel constants (`FOCUS_SLOW`, wander rate, spawn interval) live here;
per-level speeds live in level data.

## 6. What changes where

| File | Change |
| --- | --- |
| `src/levels/level01/02/03.js` | Rewritten: one `hunt` beat + existing resolution beat. |
| `src/levels/index.js` | Unchanged (ids, titles, unlock chain intact). |
| `src/scenes/GameScene.js` | New `hunt` case + hunt update path (motion, spawn, scoring, HUD wiring). Old beat types remain. |
| `src/scenes/BootScene.js` | Richer procedural textures + new background. |
| `src/scenes/ResultScene.js` | Shows the final score + combo celebration line (transient, from scene data). |
| `src/systems/ScoreSystem.js` | New, pure logic. |
| `src/systems/motion.js` | New, pure logic. |
| `src/systems/HudSystem.js` | New, Phaser. |
| `src/systems/sprites.js` | New, lookup table. |
| `src/scenes/FTUEScene.js`, `LevelSelectScene.js`, ProgressStore, pacing.js dwell values | Untouched. |
| `docs/playtest-checklist.md` | New items (see Testing). |

## 7. Testing & verification

- **Unit (Vitest)**: ScoreSystem (points math, combo increment/cap/reset), motion
  (stays inside circle, bounces, focus-slow and speed multiplier applied), spawn
  logic (never exceeds `maxConcurrent`, totals `missionTotal`), level data shape
  (each level = hunt + resolution, speeds ascend L1→L3). Existing 33 tests stay
  green.
- **Scenes/HUD**: `npm run build` + manual in-browser playtest. New checklist items:
  healthy-hit cue reads calm (not scolding), cell speeds feel slow enough for a
  fatigued player, popup/HUD legibility at bedside distance, combo reset does not
  feel like punishment, dwell-only play can complete every level.
- Scene visuals and felt pace cannot be fully verified without a browser; the human
  playtests.

## 8. Flagged regression (deliberate, to revisit)

Constraint #5 — **treatment framed as ally** — was carried by the `chemoAlly` beat,
which no playable level uses after this rework. This is a deliberate, user-approved
scope cut for this iteration, not an accident. The beat type and its renderer remain
in GameScene so a treatment-pulse moment can return (e.g. scripted into L2, whose
subtitle is still "Treatment joins the fight"). Revisit before any clinical-facing
milestone.

## Out of scope

Timer/hearts/pause UI, PNG art assets, audio, score persistence, ability buttons
(shield/booster/focus from the reference), gesture input, FTUE changes.
