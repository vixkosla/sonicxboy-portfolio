# Deferred features (shelved, 2026-07-28)

Two features built by other parallel agent sessions were unhooked from the
live scene at the user's request: not enough capacity right now to see them
through to a finished, well-integrated state. The implementation code is
**kept in place** (just no longer imported/rendered from `HeroScene.tsx`), so
either can be revived later without starting from scratch. This doc is the
map back in.

## 1. Cold-open prologue

**What it was:** a ~9.3s cinematic phase-0 shot that ran *before*
`LayeredAssembly`'s normal swarm-arrival: a close third-person chase behind
three small orb fragments and one "hero" cube monolith, which then subdivides
into the real 3×3×3 structural cubelets and hands off into the normal
choreography. Bundled with a "molten contour" material sweep
(`LiquidMorphMaterial.ts`) that revealed the structural surface as it passed.

**Files (still present, now unused):**
- `src/lib/PrologueSequence.ts` — the whole sequence, pure function of time
  (`update(delta)` / `seek(time)`), framework-agnostic like the other
  choreography classes. Exports `PrologueSequence`, `PROLOGUE_TIMES`,
  `PROLOGUE_CUBE_EXTENT`.
- `src/lib/LiquidMorphMaterial.ts` — the molten-front shell material used
  only by the prologue's sweep mesh.
- `tests/prologueCinematicCamera.test.mjs` — still passes standalone (tests
  `PrologueSequence` directly, doesn't touch `HeroScene.tsx`).

**What was removed from `HeroScene.tsx`:** the `prologueEnabled` gate, the
`prologue` instance (`useMemo`), the four prologue-only meshes/refs (orb
cluster, fragment swarm, hero cube, liquid sweep), `prologueShellMaterial`,
`prologueLiquidMaterial`, `prologueHeroGeometry`, the whole prologue branch at
the top of `useFrame` (early-returns before the normal assembly/spin path
while `!prologue.complete`), the prologue camera override
(`PROLOGUE_CAMERA_POSITION`/`TARGET`), and the `?prologue-preview=<seconds>`
dev preview plumbing (`PROLOGUE_PREVIEW_ENABLED`/`_TIME`,
`PROLOGUE_EXCLUDED_BY_PREVIEW`). The site now starts directly on the normal
swarm arrival, same as before this feature existed.

**To revive:** re-add the import, the `prologueEnabled` gate (was: on by
default in viewports with a scripted camera story, `?no-prologue` opt-out),
the meshes/materials, and the `useFrame` early-return block. Check
`docs/session-handoff.md`'s prior entries for this feature (search
"prologue") for the exact historical wiring and any open visual issues noted
there before deciding whether to just restore it verbatim or redesign it.

## 2. Core-lens filter cubes

**What it was:** five small "Minecraft-scale glass voxel" cubes clustered
just inside the plasma nucleus, each a screen-space refraction lens: one
framebuffer copy of the square behind the nucleus is captured right before
they draw, then each voxel's faces sample that captured image along their own
per-cell offset vector, producing a real chromatic-displacement "looking
through broken glass" effect over the plasma/background behind them. Timed to
open shortly after `PLASMA_CORE_START` via `computeCoreLensState`.

**Why it's gone from the live scene:** read by the user as "фильтры"
(filters) sitting oddly on top of the core rather than reading as part of the
core's own material — didn't land as intended.

**Files (still present, now unused):**
- `src/lib/CoreLensMaterial.ts` — the refraction `ShaderMaterial` +
  framebuffer-capture helpers (`createCoreLensMaterial`,
  `createCoreLensTexture`, `setCoreLensCapture`, `updateCoreLensMaterial`).
- `src/lib/coreLensLayout.ts` — the 5 voxels' local offsets/scales/rotations/
  spin rates, plus `computeCoreLensState` (shared timing formula) and
  `applyCoreLensInstanceTransform`.
- `scripts/sceneproof/core-lens.scene.ts` — still-working SceneProof lookdev
  fixture (isolates the lens cluster against the real plasma nucleus as
  refraction content). Useful for resuming this without touching the live
  scene first.

**What was removed from `HeroScene.tsx`:** the `coreLensMeshRef` instanced
mesh and its JSX, `coreLensMaterial`/`coreLensTexture` and their
`onBeforeRender` framebuffer-capture `useLayoutEffect`, the per-frame
`computeCoreLensState` call and instance-matrix update in the main `useFrame`,
and the various `coreLensMesh.visible = false` resets in other early-return
branches.

**To revive:** the isolated fixture (`scripts/sceneproof/core-lens.scene.ts`)
already renders the unchanged production material/layout code correctly, so
lookdev iteration doesn't require re-wiring the live scene at all. Once the
look is right in isolation, re-add the mesh, the capture effect, and the
`useFrame` update block (see git history around 2026-07-27/28 for the exact
prior wiring, or ask the agent that shelved it — this doc's author — to
reconstruct it from `coreLensLayout.ts`'s existing `applyCoreLensInstanceTransform`
signature, which hasn't changed).

## What replaced the core-lens cubes

The three big "black hole" cubes (`BLACK_HOLE_LOCAL_OFFSETS` in
`HeroScene.tsx`, material in `src/lib/BlackHoleMaterial.ts`) were kept and
are still live — see `docs/session-handoff.md` for their new chaotic-orbit
behavior (replacing the old "unfold once and freeze" idle flourish).
