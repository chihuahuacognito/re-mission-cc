# CLAUDE.md — Sentinel (cancer game)

Guidance for working in this repo. Read this before making changes.

## What this is

**Sentinel** is a 2D, web-based (Phaser 3) game where an **adult oncology patient** pilots a
microscopic "Sentinel" to fight and heal their body. Its therapeutic job is **psychological
support** delivered through an **empowerment / agency fantasy** — restoring a felt sense of
*control* over the disease. It is intended (long-term) as a real clinical product, retargeting
the validated *Re-Mission* insight.

**Deployment target:** a custom humanoid patient-care robot with a **circular display**, and the
game is **gesture-controlled**. The prototype uses a **mouse as a stand-in for the gesture
cursor** — so all input is a single pointer + one activate signal + a dwell alternative.

## Non-negotiable design constraints (enforced in code)

1. **No fail-state, ever.** No lose/game-over path may exist. Difficulty only eases
   (`src/systems/DifficultySystem.js` deliberately has no `isGameOver`/`hasLost`). A failure
   state would read as "your body failed" — the opposite of the therapy.
2. **One-handed, low-effort, forgiving input.** Players may be fatigued, have an IV in one arm,
   or have chemo neuropathy. **Every interactive affordance must accept dwell (hover-to-fill)
   OR click.** Aim-assist + generous hitboxes. No rapid or precise input.
3. **Circular display.** 720×720 canvas masked to a circle; all content must sit inside the safe
   circle: center **(360, 360)**, radius **~330**.
4. **Data local-only, no PII** (keeps the prototype out of HIPAA scope). No accounts/backend.
5. **Treatment framed as ally** (the "chemo pulse" beat helps the player, never an enemy).

When changing anything, do not violate these. They are the product.

## Commands

```bash
npm run dev     # Vite dev server — open the printed URL in a browser to playtest
npm run build   # production build (also the compile gate for scene changes)
npm test        # Vitest unit tests (pure-logic only)
```

## Tech stack

Phaser 3 (`^3.80`), plain JavaScript (ES modules), Vite, Vitest, Node 18+. No TypeScript.
Capacitor is intended later to wrap the same web build as a native app; not added yet.

## Architecture

**Input (the load-bearing abstraction).** All input flows through
`src/input/InputController.js`. Scene/game code NEVER reads `this.input.activePointer`
directly — only `src/input/MousePointerAdapter.js` does. A future `GestureAdapter` swaps in with
no other changes. `src/input/DwellTracker.js` provides hover-to-fill activation.
`InputController.justPressed()` ignores a button held on the controller's first frame (prevents
cross-scene click-bleed when `scene.start` lands with the button still down).

**Every interactive scene** follows the same pattern:
`applyCircularChrome(this)` + `new InputController(new MousePointerAdapter(this.input))` +
`DwellTracker` + `Reticle`, driven in `update(_t, deltaMs)`, activating on
`dwellState.completed || controller.justPressed()`.

**Levels are DATA.** `src/levels/index.js` is the manifest (`LEVELS`, `getLevel`) — the single
source of level order, titles, regions, unlock chain, and beats. `level01/02/03.js` are arrays of
beats. `GameScene` (`init({ levelId })`) renders beat types via a `switch`:
`scan | wave | support | chemoAlly | boss | resolution`. To add a level: add a data file + a
manifest entry + a `COORDS` entry in `LevelSelectScene`.

**Circular display.** `src/systems/CircularDisplay.js` (`applyCircularChrome`, `DISPLAY`) draws
the warm radial-glow background (`bgGlow` texture, generated in `BootScene`), a corner-covering
mask, and a glowing rim. Tune the background gradient in `BootScene.js`; the rim color in
`CircularDisplay.js`.

**Difficulty** (`src/systems/DifficultySystem.js`) only ever eases (widens aim-assist / — for
future moving-enemy levels — slows enemies). It has no failure concept by construction.

**Pacing is deliberately slow and centralized.** `src/systems/pacing.js` is the single source of
interaction tempo: `DWELL_MS` (hover-to-lock fill, 1100) and `BEAT_SETTLE_MS` (post-beat pause,
950). **Every scene imports these — never hardcode a `dwellMs` literal.** The pace must feel
identical everywhere: the patient learns the tempo from the first touch (Landing), so a fast menu
undoes a calm fight. Tune tempo in one place.

### Scene flow

```
Boot → Landing → LevelSelect (circular body-map)
                   → FTUE (tutorial)        → LevelSelect
                   → Game(levelId)          → Result → LevelSelect
```

`BootScene` generates all textures (`cell`, `boss`, `healthy`, `bgGlow`) and is never re-entered.
`ResultScene` marks the level complete via `ProgressStore` (local-only) and continues to
`LevelSelect`. `FTUEScene` is a staged, un-loseable tutorial (aim → fire → restore → reassurance).

### Directory map

```
src/
  main.js                # Phaser config + scene registry
  config.js              # createGameConfig (Phaser-free so it's Node-testable); 720x720
  input/                 # InputController, MousePointerAdapter, DwellTracker
  systems/               # DifficultySystem, targeting, GameFlow, BeatSequencer, Reticle,
                         # FeedbackSystem, CircularDisplay, resolveInteraction, ProgressStore,
                         # safeStorage
  levels/                # index.js (manifest) + level01/02/03.js (beat data)
  clinical/CheckIn.js    # local-only, no-PII pre/post "sense of control" check-in
  scenes/                # BootScene, LandingScene, LevelSelectScene, FTUEScene, GameScene, ResultScene
tests/                   # Vitest — pure logic only
docs/                    # specs, plans, playtest checklist (Date + Content Type header)
```

## Testing & verification

- **Pure logic is unit-tested** (Vitest): input, difficulty, targeting, dwell, beat-sequencer,
  game-flow, resolveInteraction, checkin, progress-store, level manifest, config.
- **Scenes have NO automated tests** (Phaser rendering). Their gate is `npm run build` + a
  **manual in-browser playtest** — see `docs/playtest-checklist.md`, whose items map directly to
  the therapeutic constraints above. When you change a scene, you cannot fully verify it without a
  browser; say so.

## Conventions & gotchas

- Match existing patterns; keep files focused and small.
- **Patient-facing text has an 18px floor.** Players may have chemo-related visual fatigue and
  read a circular panel at bedside distance. Don't add sub-18px copy. In `LevelSelectScene`, node
  detail (title/region/subtitle) lives in the large center panel on hover — nodes show only a
  glyph — rather than crammed small text under each node.
- **No fabricated clinical evidence.** The pre-session baseline is a placeholder (`pre:3`) until a
  real pre-scene exists. `CheckInStore.save({..., preIsPlaceholder: true})` therefore stores
  `delta: null` + `baseline: 'placeholder'` — a delta off a fake baseline must never be recorded
  as if real. Keep this honest when adding the real pre-scene.
- Docs go in `docs/` with a `**Date:**` + `**Content Type:**` header (user's global rule).
- In this dev environment, subagents cannot `git commit` (permission-blocked): they `git add`,
  and the controller commits.
- Repo is on branch `feature/vertical-slice`; there is no `main` and no remote yet.

## Current status (2026-07-07)

Playable vertical slice + full navigable structure. Levels 1–3 are now moving-cell
"hunt" levels (destroy drifting cancer cells, avoid healthy blue cells; difficulty =
drift speed, easing only) with an arcade HUD: transient per-level score, mission
counter, patient combo (no time decay; resets only on a healthy-cell hit), floating
popups. FTUE unchanged. New systems: `ScoreSystem`, `HuntTracker`, `motion.js`
(all pure + unit-tested), `HudSystem`, `sprites.js` (PNG-swappable procedural art).
Chemo-ally beat is currently unused by any level (deliberate scope cut — see
`docs/superpowers/specs/2026-07-07-arcade-hud-hunt-levels-design.md`); the beat
type still renders, so it can return. **All scene visuals + felt pace are
browser/device-verification-pending** — see `docs/playtest-checklist.md`.

## Out of scope so far

Real gesture integration, moving enemies, audio, backend/accounts, real PROMs/consent/IRB,
multi-phase boss AI (approximated by HP), pre-session check-in (currently a `pre:3` placeholder).
