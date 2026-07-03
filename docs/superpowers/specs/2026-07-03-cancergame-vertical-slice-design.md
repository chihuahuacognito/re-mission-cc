# Cancer Game — Vertical Slice Design Spec

**Date**: 2026-07-03
**Content Type**: Design Specification (Spec)

---

## 1. Summary

A 2D, web-based (HTML) action game in which an **adult oncology patient** pilots a
microscopic vessel — the **Sentinel** — inside the body to fight their cancer. The
therapeutic goal is **psychological support**, delivered specifically through an
**empowerment / agency fantasy** that restores a felt sense of *control* and
*self-efficacy* over a disease that otherwise makes people feel powerless. It is a
retargeting of the validated core insight behind HopeLab's *Re-Mission*.

The game is **gesture-controlled** in its eventual deployment (a custom humanoid
patient-care robot's on-screen kiosk), but the **prototype is built and tested with a
mouse pointer** as a stand-in for the gesture cursor. All input flows through an
abstraction so the gesture source can be swapped in later without touching game code.

**First deliverable:** one polished, playable **vertical slice** (~3–5 min, single
level) that proves the empowerment feel end-to-end.

## 2. Context & Constraints

- **Product context:** intended to become a real clinical/health product. This spec
  covers only the buildable game (track 1) + a lightweight local measurement hook.
  Backend/accounts (track 2), privacy/HIPAA-GDPR (track 3), and clinical validation +
  regulatory (track 4) are parallel, largely non-engineering tracks flagged but out of
  scope for the slice.
- **Audience:** adults, general oncology.
- **Builder:** solo generalist developer, web/HTML background, not a game specialist.
- **Deployment target:** custom/DIY hardware (humanoid robot screen) running a browser
  kiosk. Design stays hardware-agnostic: generic browser + screen.

### Hard design constraints (therapeutic)

1. **Always empowering, never a demoralizing fail-state.** The player can never "lose"
   in a way that implies *their body failed*. Worst case is retrying a wave. Difficulty
   quietly eases; there is no hard game-over. Enforced structurally in `DifficultySystem`.
2. **Accessible to fatigued/impaired patients.** Players may be tired, weak, have an IV
   line in one arm, or have chemo-induced neuropathy (numb/clumsy hands). Controls must
   be **one-handed-friendly, low-effort, large-motion-optional, and forgiving** — no
   rapid or precise input, no sustained holds.
3. **Treatment framed as ally, not enemy.** At least one beat reframes real treatment
   (a "chemo pulse") as a teammate that helps the player.

## 3. Tech Stack

- **Phaser 3** — 2D game framework (sprites, input, physics, audio).
- **Plain JavaScript** to start (TypeScript optional later).
- **Vite** — dev server + build.
- **Capacitor** — later, to wrap the same codebase as native iOS/Android if needed.
- **Vitest** — unit tests for pure logic.

Rationale: web-first is the correct target (robot kiosks run browsers; every build is a
shareable URL for clinical partners), matches the builder's HTML background, and grows
into a clinical product cleanly.

## 4. Input Model — "Single Pointer + Activate"

Everything is driven by **one cursor position** + **one activation signal** — exactly
what a pointing hand + pinch provides.

| Concept | Prototype (now) | Gesture (later) |
|---|---|---|
| **Aim** — cursor position | Mouse move | Pointed hand / hand position |
| **Activate** — fire/select | Mouse button (click or hold) | Pinch or push |
| **Dwell** — no-effort alternative | Hover-to-fill a ring | Hold hand still over target |

- **`InputController` abstraction** sits between game and input. Game reads only
  "pointer + activate + dwell"; never touches the mouse directly. Gesture arrives later
  as a single new adapter (`GestureAdapter.js`); nothing else changes.
- **Dwell-to-act** (hover a ring until it fills, no click) is a first-class alternative
  to activate *everywhere* — serves fatigue accessibility and gesture reliability.
- **Aim-assist + generous hitboxes** — coarse pointing is enough; jitter/neuropathy/
  gesture-noise never cause a frustrating miss.

## 5. Core Loop (30–90s beats)

The fiction: *You are the Sentinel. This is your body. You hunt the disease.* The
reframing from passive patient to active agent **is** the therapy.

1. **Scan** — sweep fog off a region (dwell/activate to reveal) → hidden cancer becomes
   visible. ("I can see it; it's not a mysterious monster.")
2. **Target & fire** — move over tumor cells; activate or dwell-to-charge to destroy.
   Aim-assisted. Juicy feedback (particles, screen shake, rising audio tone).
3. **Support the body** — dwell on dimmed/healthy areas to restore them; clear a
   side-effect "fog." Teaches the *ally* relationship with one's own body.
4. **Clear & heal** — the region visibly brightens/recovers. Explicit "you restored
   this" payoff.

**Psychology mapping (what makes it clinical, not just a game):**

- Agency/self-efficacy → *you* aim and clear; field always responds to your action.
- Locus of control → the body heals *because of what you did*, made visually explicit.
- No dead-ends → cannot lose in a "your body failed" way.
- Treatment as ally → the chemo-pulse beat reframes real treatment as a teammate.

Session length: default ~3–5 min; extensible for long infusion-chair sits.

## 6. Vertical Slice — "Region 01" (one level, ~3–5 min)

A single self-contained experience with a beginning→middle→end arc that demonstrates
every pillar:

1. **Onboarding (~15s)** — "You are the Sentinel. This is your body. Let's clear it
   together." Teaches pointer + activate + dwell on one friendly first target.
2. **Scan** — reveal a small cancer cluster.
3. **Fight — wave 1** — a few slow tumor cells, big hitboxes, satisfying destruction.
4. **Support beat** — clear a "nausea fog" / re-light a dimmed patch by dwelling.
5. **Treatment-as-ally moment** — a "chemo pulse" sweeps in; the player aims/rides it to
   clear a larger cluster. The single most therapeutically clever beat.
6. **Boss-lite finale** — one larger tumor mass; dwell-to-charge a big shot; dramatic clear.
7. **Resolution** — the whole region blooms back to healthy light; "You restored this.
   Well done." + optional one-tap post check-in.

**Art/tone:** clean, hopeful, **bioluminescent sci-fi** — glowing, tactile, calming
palette. Deliberately not gory and not sterile-clinical. Victory feels like light
returning. Always winnable; adaptive slowdown if the player struggles.

## 7. Code Architecture

```
cancergame/
  index.html               # fullscreen kiosk canvas
  src/
    main.js                # Phaser config + scene registry
    scenes/
      BootScene.js         # load assets
      OnboardingScene.js   # teach pointer/activate/dwell
      GameScene.js         # runs a level's beats
      ResultScene.js       # heal payoff + check-in
    input/
      InputController.js    # abstraction (pointer + activate + dwell)
      MousePointerAdapter.js# NOW
      # GestureAdapter.js   # LATER — only file gesture needs
    systems/
      ScanSystem.js
      EnemySystem.js
      WeaponSystem.js
      SupportSystem.js
      DifficultySystem.js   # adaptive; structurally no fail-state
      FeedbackSystem.js     # juice: particles/shake/audio
      HealSystem.js         # region bloom/resolution
    data/
      level01.js            # vertical slice as a sequence of "beats"
    clinical/
      CheckIn.js            # pre/post one-tap measure + local logging
    ui/
      HUD.js
  assets/                   # placeholder art first
```

**Load-bearing principles:**

- `InputController` isolates all input (mouse now → gesture later).
- `level01.js` is **data** — a sequence of beats — so levels are content, not code.
- `DifficultySystem` structurally cannot produce a "your body failed" fail-state.
- Systems are decoupled and independently testable; each has one clear purpose.

## 8. Clinical Measurement Hook

- One-tap **pre-** and **post-**session check: *"How in control do you feel right now?"*
  (1–5), styled after validated single-item tools (e.g., Distress Thermometer).
- Log the **delta** locally (localStorage/JSON). **No PII, no accounts, local-only** —
  deliberately keeps the prototype out of HIPAA scope while proving the measurement loop.
- Gives the demo a real story ("sense of control 2 → 4 in one session") for
  partners/funders.
- **Flagged for later (not in slice):** full PROMs (STAI/GAD-7), informed consent, IRB,
  secure backend.

## 9. Testing

- **Vitest** unit tests for pure logic: difficulty easing, aim-assist target selection,
  beat sequencing, check-in delta computation. Deterministic; no Phaser needed. The
  input abstraction lets game logic be driven with a fake `InputController`.
- **Manual in-browser** playtest (Vite hot-reload) for game feel, against a checklist
  tied to the therapeutic principles:
  - No fail-state is reachable by any path.
  - Dwell-to-act works fully one-handed with no clicking.
  - Aim-assist makes coarse/jittery pointing succeed.
  - The heal/resolution payoff reads as "I did that."

## 10. Out of Scope (this slice)

- Gesture recognition integration (mouse stand-in only).
- Multiple levels / progression / meta systems.
- Accounts, backend, cloud sync, real PROMs, consent/IRB flows.
- Native app packaging (Capacitor) — deferred until after the slice proves out.
