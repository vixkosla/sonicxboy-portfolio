# Session handoff

Updated: 2026-07-23

## Start here

Project root:

```text
/home/vixkosla/projects/library/portfolio/webpage
```

Read this file together with `docs/animation-choreography.md` before changing the
animation. The development server was last confirmed running in Astro background
mode at `http://localhost:4321/`. Manage it with:

```bash
pnpm astro dev status
pnpm astro dev logs
pnpm astro dev stop
pnpm astro dev --background
```

`pnpm build` currently passes. The only build warning is the existing bundle chunk
larger than 500 kB. Runtime logs also contain upstream Three.js deprecation warnings
for `THREE.Clock` and `PCFSoftShadowMap`; neither blocks the current work.

## Next session start point

Third pass on 2026-07-23 (storm behavior + ring-wall depth illusion),
awaiting the user's visual review in the normal browser:

- **Natural storm cadence for surface discharges** (user's art direction,
  "real facts from nature"): the three metronome lane clocks became one
  irregular flash clock — long-tailed `2.6..6s` intervals, `18%` quick
  cluster follow-ups (`1.0..1.8s`), `12%` lulls (`8..12s`). One flash is
  usually a multi-stroke network: solo `20%`, two strokes `35%`, three
  `45%` — forked branches share the main hub and light `0.12..0.5s`
  apart. Measured over `300s`: mean interval `4.79s`, groups `10/25/26`
  (solo/pair/triple), deterministic.
- **Independent arcs never cross**: hashed candidate paths pass an
  angular clearance check (mid-arc beyond summed half-spans `+0.3` rad,
  hub `0.45` rad) against active arcs AND committed pending branches;
  network members are exempt only versus their own group; colliding
  branch forks flip side or drop; blocked flashes defer `0.5s` and retry
  re-seeded. Sim: **zero** independent crossings in `300s`.
- **Volumetric thunderclap flash** (user's note): the flash field moved
  from flat additive emission into the blue shell's own `shellColor`
  emission — the glow is shaped by the shell's real density and occluded
  by its transmittance, so blocks light from within.
- **Oval v3 — the depth illusion**: every ring split into a far arc
  (svg before the text) and a near arc (mirrored svg after it), so the
  flat copy occludes far halves while near halves pass in front. Storeys
  `7 -> 11`, tighter stack, whole wall raised (`bottom: 14vh`) so the
  subtitle and badges sit inside it. Paired arcs share timing
  (diametrically opposite pulses).
- New dev preview `?plasma-preview=arcnet` freezes a three-stroke
  branched network with the thunderclap glow.

Validation: `pnpm build` and `git diff --check` pass; headless Chromium
captures of `arcnet`/`arcsurf`/`arcrev` show the volumetric patchy glow
and the forked network; oval captured at two desktop moments (near arcs
cross in front of the badges, far arcs hidden behind the subtitle) and
`390 x 844` compact; zero console errors.

Follow-up on the same day (2026-07-23), also awaiting the user's visual
review in the normal browser:

- **Thunderclap shell illumination** (user's art direction, "like a real
  lightning flash"): each surface strike now lights the neighboring blocks
  of the blue shell with a circular gradient around the midpoint of the
  visible channel. It ignites only after the head has traveled a third of
  its path, ramps over `0.09s`, and lingers with a `3.2/s` afterglow while
  the strike travels on. The gradient trails the head (centered at half
  the traveled angle), spans ~`0.55` rad with a squared shoulder, is
  radially confined to the lane's shell band, and is broken into patches
  by the shell's own noise. The envelope travels in `uSurfParam.w`
  (previously unused); the per-event active window extends to
  `travel + 0.8s`. Numerics re-measured: duty `71.5%`, two-or-more
  `23.7%`, radius band `[0.941, 1.009]`, deterministic.
- **Oval v2 (revised same day after user correction, superseded by v3
  above)**: one ellipse line (`560 x 70`) repeated in vertical storeys —
  the lanes stand as **walls of an elliptical cylinder**; crossings
  emerge only in the viewer's projection, never by construction (the
  first v2 draft's deliberately crossing ellipses were rejected). Greens
  grade vertically (`#0f6e4a` base → `#18d383` mid → `#7dffc9` top rim),
  size matches the measured headline width (`75vh` desktop / `84vw`
  compact). The oval is hidden until the first orbit title wave reaches
  the headline — `HeroScene` sets `data-oval-on` at that beat (`1.6s`
  fade-in) — and still fades with `reactor-card-visible`.

Validation: `pnpm build` and `git diff --check` pass; headless Chromium
captures of `?plasma-preview=arcsurf`/`=arcrev` show the thunderclap glow
patch on both shell states; the oval was captured at two moments on
desktop (full headline width, visible lane crossings) and `390 x 844`
compact; zero console errors. The live ignition beat rides the proven
title-wave trigger (headless story-clock throttling prevents a wall-clock
timing check in this environment; the mechanism is one added line inside
the existing wave loop).

The earlier pass (2026-07-23) split the surface-arc treatment in two at the
user's art direction and awaits the user's visual review in the normal
browser:

- **On-sphere arcs returned to the jagged electric read** ("2-3 iterations
  after their introduction", before the smoothing pass): hashed
  piecewise-linear zigzag kinks (`7..11` per radian, `±0.045..0.08`
  out-of-plane, `±0.015..0.025` radial), per-cell brightness crackle
  (`0.0625`-radian cells, `×0.62..1.17`), thin `0.03` white-hot core with a
  `0.11` halo, near-instant `0.03s` attack, `10/s` afterglow, and a darting
  `t^1.35` head. The approved macro-structure is untouched: three
  independent lanes at `2.8s ± 0.8s`, the `0.94..1.01` radius band, the
  `10.55s` revving-phase start, the comet trail window, and all causal
  chains. Numerics over `111s`: duty `75.8%`, two-or-more `29.1%`, radius
  band `[0.941, 1.009]`, fully deterministic (35 events in 40s, identical
  across runs).
- **The retired smooth glide moved onto a new DOM figure**: a horizontal
  air-support oval of smooth impulse pulses under the headline and the
  tech-stack list (`src/layouts/HomePage.astro`). Seven concentric ellipse
  lanes carry layered halo/body/white-hot-filament dashes plus reverse
  echo pulses; per-lane durations, delays, peaks, and directions are fixed
  CSS constants (no JS), so segments keep appearing and disappearing while
  the band stays loosely filled. It fades out with `reactor-card-visible`.
  Documented in `docs/animation-choreography.md` ("Title air-support
  oval").

Validation: `pnpm build` and `git diff --check` pass; headless Chromium
captures of `?plasma-preview=arcsurf` and `=arcrev` show the jagged
electric channel on both the enlarged envelope and the revving shell; the
oval was captured on desktop (two moments, pulses travel and re-fill),
`390 x 844` compact (anchored under the headline, clear of the scene
stage), and the `card` preview (faded out). Zero console errors. This
remains a visual proposal until the user reviews it in the normal browser.

The earlier visual-refinement pass is user-approved. Treat the following as the baseline:

- the blue upper plasma grows out of the lower sphere and keeps its irregular noisy
  contour; it must not return to a smooth enveloping dome;
- the cold-white assembly pulse reaches its peak as the last cubelets lock, then
  contracts into a mint-white support-edge band while the unchanged `0.72s` edge
  roll is moving; a restrained contact beat peaks as the next face lands;
- the pulse adds no pause, phase offset, or change to the roll/lift/spin behavior;
- compact/mobile rendering stays at DPR `1` and 32 ray steps, with the current
  texture-backed noise and culling bounds.

The next planned art pass is materials and lighting. Begin there without retuning
motion or reopening the two effects above unless a new visual regression is found.
Useful development URLs are `/?assembly-glow-preview` for the pulse peak,
`/?assembly-glow-preview=roll` and `=landing` for the contact states, and
`/?plasma-preview` for the settled final plasma.

### Materials prototype — plate circuit pass awaiting visual approval

The first materials-only lookdev pass is now implemented without changing the
lighting rig or choreography. `src/lib/ReactorMetamaterial.ts` treats the visible
solid system as one programmable emerald composite:

- distant cubelets begin darker, less metallic, and more matte;
- crystallization raises the established `#18d383` surface while roughness falls;
- orbital conductivity adds a restrained metal/emissive response;
- reactor morph raises metalness from `0.38 -> 0.58` and lowers roughness from
  `0.31 -> 0.22` continuously rather than swapping shaders;
- the standalone signal plate sharpens while charged and softens slightly as it
  becomes the DOM card.

Cubelets and the solid nucleus use a small one-segment rounded-box bevel so the
surface catches a readable edge highlight. Duplicate rounded-box vertices are
merged (`324 -> 92`); the 104 reactor plates deliberately keep the original light
unit-box geometry. A trial procedural roughness texture was removed: it was barely
visible at the scene scale but pushed the large orbit/104-plate software-WebGL
tests across the frame boundary.

After review showed that PBR value changes alone left the plates too plain, the
covering received a dedicated analytic circuit surface. It extends the existing
`MeshStandardMaterial` through `onBeforeCompile`, preserving all current lighting
and shadows while adding:

- a subdued per-instance `8..12`-cell composite microgrid and fine inset frame;
- recessed circuit paths with pale-gold ENIG-like inner conductors, microvias,
  compact module outlines, and smaller terminal pads;
- deterministic random layouts from `gl_InstanceID`: three routing families vary
  hub location, branch count, endpoints, trace width, grid density, axis swap, and
  mirrors;
- a diagonal shell reveal spanning morph and both divisions: a bright gold trace
  leads locally from each hub, followed by the resin microgrid and recessed etch;
- one slow emissive packet that inherits the current instance color, so it becomes
  blue under the ionization wave and red on the selected signal plate;
- a current-strength envelope that drops through shutdown and scattering.

The surface uses only analytic UV math: no image textures, texture reads, geometry,
draw calls, per-frame allocations, or per-instance materials were added. The same
hook is shared by the 104-instance covering and standalone signal plate; the
selected plate's instance index is copied to the standalone shader so its exact
layout survives the handoff. Random parameters are evaluated in the vertex shader
and sent with `flat` interpolation; this prevents pixel-level seed noise and avoids
rehashing in every fragment. Orthogonal trace distance uses square-cap math without
square roots. Cubelets keep their cheaper standard material.

Densified 2026-07-20 at the user's art direction (`reactor-circuit-surface-v8`):
per plate the etch now adds two extra microvias, hashed breakout stubs from the
first two vias to the frame, a second hub branch with its own pad, a second
component footprint, corner fiducial pads on roughly half the plates, and a
finer micro grid (`11..16` cells, was `8..12`). The flow pulses run over the
new conductors automatically, and the plates themselves were thinned
(`0.055 -> 0.03`). Software-WebGL parity was re-measured (old vs new shader
within machine noise); this pass awaits the user's visual review.

The upper `WEBGL` line receives a static dark-metal/emerald CSS gradient; the lower
`DEVELOPER` line and its three orbit waves are unchanged. In development,
`?material-baseline` restores the original box geometry, material values, and
plain upper title. It can be combined with any existing preview, for example
`/?plasma-preview=tiles&material-baseline`.

A final same-session `1400 x 1000` headless Firefox A/B at the 104-tile stage
measured `47.88 FPS` for the randomized gold circuit surface and `47.79 FPS` for
`material-baseline` on the available GTX-980-class renderer. The absolute number
varied with the headless environment during the session, while the paired result
showed parity. The compact `500 x 759` viewport held `60.25 FPS`. Morph, tiles,
blue-wave, signal, scatter, and compact captures produced no shader compile or
scene errors. `pnpm build` passes. This pass remains a visual proposal until the
user reviews it in the normal browser.

The follow-up micro-detail/wave pass held the `60 FPS` display cap in a 180-frame
headless Firefox sample at both `1400 x 1000` and `500 x 759`. Static captures at
`12.2s`, `13.25s`, and the completed tile stage confirmed the intended ordering:
isolated gold leaders first, varied resin/circuit detail behind them, then a fully
etched 104-plate shell. This was a cap check rather than a paired benchmark.

### Lighting prototype — awaiting visual approval

The material pass is now paired with a local reactor/studio rig; motion, material
math, fog, background, plasma light, signal light, and shadow-casting behavior are
unchanged:

- ambient intensity falls from `0.48` to `0.10`;
- hemisphere fill falls from `1.10` to `0.36`, using a muted cool sky and nearly
  black ground so gaps between covering layers stay deep;
- the shadow-casting directional key becomes neutral `#edfdf7`, intensity `2.45`,
  at `[5.8, 7.8, 5.2]`;
- the former emerald point light becomes a cyan rear contour at
  `[0.5, 3, -3.4]`, intensity `44`;
- the former cyan point light is replaced by one warm `#ffb653` spotlight at
  `[5.4, -0.8, 4.6]`, intensity `72`, aimed once at `[2.8, 0.5, 0]` with angle
  `0.52` and penumbra `0.78`.

The shell's established rotation moves the gold conductors through the fixed warm
beam, producing traveling highlights without light animation. The persistent light
count is unchanged, no HDR/environment asset or post-processing pass was added, and
the spotlight target is allocated once outside `useFrame`. In development,
`?lighting-baseline` restores the previous ambient, hemisphere, directional, and
two-point rig; it can be combined with `material-baseline`.

A same-session `1400 x 1000` headless Firefox comparison at the finished tile stage
measured `47.40 FPS` for the proposal and `47.29 FPS` for `lighting-baseline`.
The compact `500 x 759` viewport held `60.25 FPS`. Assembly, orbit, morph, finished
tiles, blue wave, and compact views were checked without new runtime or shader
errors. This remains a visual proposal pending normal-browser review.

The implementation is included in current `HEAD` (`0703b20`). The final
session-close wording in `docs/session-handoff.md` and
`docs/animation-choreography.md` is a small uncommitted follow-up; preserve or
commit those two documentation edits when the next session starts.

### Electric-discharge pass — awaiting visual approval

Motivation: the user art-directed that the electric (reactor plates) and the
living flame read as two separate worlds, and asked for periodic electric
discharges that organically belong to the flame without overloading the scene.
Two earlier iterations were rejected in review: a subtle strobing bead was
"almost unnoticeable", and its sinusoidal flicker plus a rim crackle on the
contained sphere read as an unmotivated stroboscope. The approved direction
removes all sinusoidal strobing and the sphere crackle entirely, and goes
bold. After the single-lane version landed, the user asked for groups of two
or three strikes at a shorter interval plus arcs crawling across the big
sphere from different sides. The final clarification was that hits inside
each group must run in sequence, not concurrently; an earlier pass applied
that sequencing only to the surface arcs and was the source of the last
review mismatch. Implemented as phase 9 in
`docs/animation-choreography.md`:

- `src/lib/DischargeScheduler.ts` (new plain class, no per-frame allocation):
  one deterministic upper burst clock starting at 70% of the final expansion
  (`19.84s`). A burst contains two or three stream strikes, spaced `0.64s`
  apart after the previous visible window has closed; burst starts repeat at
  `3.55s ± 0.35s`. Consecutive hits select different members of the seven
  streams and never overlap. The surface family was rolled back on user
  request to the earlier approved state ("the moment the zone was shifted
  up"): three independent lanes (`2.8s ± 0.8s` each) starting at `10.55s`
  while the core is still revving behind the plates — concurrent arcs are
  possible again (79.2% duty, 35.6% with two or more, measured over `111s`).
  Cross-family causal chains: a surface arc cues the next complete stream
  burst early with 55% probability after `0.22..0.62s` rather than adding an
  unscheduled fourth hit; a stream strike grounds back as a surface arc with
  35% probability after `0.25..0.6s`; chains never chain further. The
  scheduler exposes `peak` (max envelope across lanes) for the scene light.
- `src/lib/FireEffect.ts`: uniform arrays (`uArcStream[3]`, `uSurfAxis/Tan/
  Param[3]`); stream lanes reuse the seven stream centerlines with hashed
  zigzag kinks, a white-hot head, a strengthened glowing channel (spatial
  decay `0.85`), one diagonal branch spur, core tube plus halo; surface
  lanes returned to the jagged electric read on 2026-07-23 (see "Next
  session start point" above) — the smooth glide they had at this point
  moved onto the DOM title oval. A `0.94..1.01` radius band
  rides the blue shell instead of crossing the warm orange body (where the
  blue impulse lost its read) or drifting into empty space. Emission only —
  silhouette untouched; every lane is gated behind its own uniform branch.
- `src/components/HeroScene.tsx`: scheduler wiring, `SURFACE_AUTO_START`,
  frozen previews, light lift/tint driven by `discharge.peak`.
- Development URLs: `?plasma-preview=arc` (frozen stream strike),
  `?plasma-preview=arcsurf` (frozen surface strike, enlarged envelope),
  `?plasma-preview=arcrev` (frozen surface strike on the revving shell),
  `?arc-baseline` (scheduler disabled for paired A/B).

Validation after the surface rollback: `pnpm build` and `git diff --check`
pass; the surface lanes measure 79.2% duty with 35.6% two-or-more concurrent
across `111s`, radius band `[0.941, 1.009]`; headless Chromium captures of
the enlarged-envelope and revving-phase surface strikes show the restored
smooth glide with no shader or runtime errors; a 30s live full-timeline run
produced no console errors. The stream side keeps the earlier verified burst
behavior (77 hits in 32 complete bursts, minimum spacing `0.637s`, zero
strand repeats, run-to-run identical). This remains a visual proposal until
the user reviews it in the normal browser.

### Grid-cage surface quality pass — awaiting visual approval

Scope chosen by the user: the lattice cube only — the plasma core, motion,
timings, and the discharge system are untouched. The work lives entirely in
the existing `gridFragmentShader` in `src/lib/FireEffect.ts`; no uniforms,
varyings, geometry, draw calls, textures, or per-frame allocations were
added, and the `4 x 4` density, single thin outer frame, suppressed UV
0/1 doubling, emerald `#18d383` palette, and FrontSide rendering are all
preserved. Four changes:

- an analytic key-light response gives every visible face one stable
  brightness from its world normal against the scene key direction
  (`0.62..1.18`), so the emissive-only cage reads as a lit object instead of
  a flat decal;
- the inner grid quiets at grazing view angles (`0.22` floor, never off),
  ending the moire-like compressed-pattern noise on steep faces while the
  silhouette frame survives;
- every bar gained a thin white-hot filament (`0.016` UV) inside the bright
  core, and every line crossing a tight welded-knot pin, both suppressed at
  face boundaries like the other inner masks;
- bars, knots, and the frame share one color recipe (the same mint shoulder
  plus the same white-hot filament), so the frame no longer reads as a
  duller, greener element next to the whiter inner lines;
- boundary suppression is orientation-aware: only bars running parallel to a
  face boundary are quieted (they would double the thin frame), while
  perpendicular bars keep their tips and weld visibly into the frame —
  inner lines no longer stop short of the edges;
- modest presence increases: core alpha `0.42 -> 0.58` with the existing
  scan modulation, glow reach `0.105 -> 0.12`, frame alpha `0.31 -> 0.42`,
  fresnel weight lowered `0.42 -> 0.30` so it no longer fights the grazing
  quieting.

Validation: `pnpm build` passes; headless Chromium captures of the
`grid`, `core`, and `warm` previews at `1400 x 1000` (full frame and 3x
crops), a `390 x 844` compact pass, and the `19.2s` breakup stage show the
intended response with zero console or shader errors. This remains a visual
proposal until the user reviews it in the normal browser.

### Internal lock/roll glow — awaiting visual approval

The user asked for the internal glow of the lock/roll beat to read clearly
again after the materials pass had left it nearly invisible (the cubelet
emissive pulse contributes only `0.035` intensity of the dark `#063d2b`, and
the seam overlay was a thin line). No timing, motion, or envelope changes —
the beat lives in the same `0.10s`-lead pulse, the unchanged `0.72s` roll,
and the same attack/hold/release constants. Three reinforcing channels, all
driven by the existing `assemblyGlow`/`contactGlow` envelopes:

- a new internal point light at the cube center (`distance 1.35`, `decay 2`,
  peak intensity `3.5` with the seam's `10.5 rad/s` flicker), cold white
  shifting to the contact mint. It lives inside the rolling group, lights
  the inward-facing bevels through the gaps, and dies out past the shell —
  outward faces turn away from it, so the glow stays internal;
- the still-solid nucleus flares as the physical source of that light:
  emissive lerps `#6cf3b3 -> #d1f0ff` by `assemblyGlow * 0.55` and gains
  `innerGlow * 1.5` intensity, so hot slivers of the core show through the
  bevel cracks;
- the seam overlay is bolder: core `0.005..0.010 -> 0.007..0.013`, shoulder
  `0.014..0.029 -> 0.022..0.055` with weight `0.19 -> 0.30`, contact-band
  energy `1.50 -> 2.15`, mint mix `0.28 -> 0.40`, driver weights
  `0.28/0.44 -> 0.34/0.60` with the cap `0.52 -> 0.68`.

Validation: `pnpm build` and `git diff --check` pass. Headless Chromium
captures of `?assembly-glow-preview`, `=roll`, and `=landing` (2x crops and
a `1400 x 1000` full frame) show the intended internal glow with zero
console errors; both envelopes are zero outside the beat, so the light costs
nothing after the lift. This remains a visual proposal until the user
reviews it in the normal browser.

## Collaboration contract

- The user art-directs and does not edit the code; the agent owns implementation.
- Explain the mathematical basis of meaningful motion changes before or while
  implementing them so the user can coordinate the result.
- Mathematics must enforce continuity, symmetry, and collision constraints without
  making the animation resemble a geometry lesson.
- Never solve a visual problem with a short correction phase, late docking move,
  abrupt direction change, or hidden snap.
- Random-looking motion may be deterministic. Reproducibility is preferred while
  art direction is still changing.
- Validate numerically and in the browser. A passing numeric check does not replace
  the user's visual approval.

## Current visual sequence

1. Twenty-six distant cubelets assemble around a static center into a 3x3x3 cube;
   their contact seams emit one short cold-white synergy pulse.
2. The cube rolls over a virtual edge and lifts onto a corner.
3. It receives a strong spin with precession and nutation, then brakes.
4. The shell separates into three nested rotating polyhedra around the nucleus.
5. The polyhedra converge into the final spherical voxel shell.
6. The nucleus becomes an emissive emerald grid cage and ignites a volumetric
   plasma core.
7. The 26 scaffold cubes morph and divide into 104 radial reactor plates.
8. Two blue ionization waves shut down the covering; the plates release, one becomes
   an interface card, the grid cage disintegrates, and an upright plasma flame
   fills the vacated reactor volume. Lightning lives at two scales: arcs crawl
   the blue shell from the revving phase onward, jagged strikes propagate up
   the seven rising streams once expanded, and causal chains let each family
   trigger the other.

The full sequence and the latest plasma/glow refinements are approved as the current
baseline. The next session starts with materials and lighting.

## Phase 1: smooth assembly

Implementation: `src/lib/LayeredAssembly.ts` and `src/lib/trajectoryData.ts`.

- Every cubelet follows one degree-five Bezier polynomial using six controls:
  `start`, `launchControl`, `pivot`, `settleControlA`, `settleControlB`, `target`.
- The old piecewise quadratic / fillet / cubic construction was removed because its
  short fillet produced visible avoidance turns.
- The arc-length LUT only inverts traveled distance back to Bezier parameter time.
  Runtime positions are evaluated directly on the quintic, not on a polyline.
- Moving-cube collision avoidance is implemented only through delays, durations,
  and velocity profiles in `SPACETIME_DATA`. Curves do not dodge other cubelets.
- One broad control point for cubelet 17 clears the static nucleus; this is a smooth
  environmental path constraint rather than a local moving-cube correction.
- Total assembly duration: `5.6008s`.
- Dense 600 FPS AABB validation: zero intersections; minimum extra axis clearance
  is approximately `0.00606` world units.
- At the runtime path sampling resolution, the largest adjacent tangent change fell
  from about `35.1deg` in the removed piecewise model to about `3.29deg`; the actual
  evaluated polynomial remains spatially continuous.
- The final `0.10s` of assembly starts the cold-white additive lock pulse. One
  26-instance shader pass reuses the rounded cubelet geometry; neighboring bevel
  highlights form the face seams without a sharp enclosing box or illuminated
  center instance. From 34% of the original roll, the same shader focuses its tail
  against the virtual contact plane and peaks mint-white as the next face lands;
  its `0.22s` release ends about `0.16s` into corner lift.
- The global material emissive contribution is attenuated as the contact band grows,
  so the metallic cubelets do not flatten into one bright box. The pulse mesh is
  invisible outside the two envelopes, avoiding a permanent draw call. Development
  URL `/?assembly-glow-preview` freezes the peak; `=roll` and `=landing` freeze the
  new states.

## Roll, lift, and spin

Implementation: `src/components/HeroScene.tsx` and `src/lib/SpinSimulation.ts`.

- Edge roll duration: `0.72s` using the documented no-slip center relation. The
  assembly glow does not delay or otherwise alter it.
- Corner lift duration: `0.84s`, using one relative quaternion axis transition.
- Do not add an independent yaw during the lift.
- Spin is a fixed-step angular simulation with drive torque and linear, quadratic,
  Coulomb, and final braking terms.
- Peak spin is approximately `1.79 revolutions/s`.
- The intended composition is `precession * nutation * spin * diamond`.

## Current orbital model

Implementation: `src/components/HeroScene.tsx`.

The 26 shell positions are the three non-trivial point orbits of cube symmetry:

- 8 corners remain the vertices of an expanding outer cube;
- 12 edge centers remain a rotating cuboctahedron;
- 6 face centers remain an octahedron around the nucleus;
- the center cube remains the nucleus.

For every vertex in class `k`:

```text
p_i(t) = center + r_k(t) * Q_k(t) * normalize(v_i)
```

All members of a class share `r_k` and `Q_k`, so the class cannot shear. Indices are
ordered in opposite pairs, giving exact `p_opposite(t) = -p_i(t)`. Opposite pairs
also share the same restrained local self-spin profile.

Current class parameters:

| Class | Indices | Radius scale | Start | Angular speed | Capture offset |
| --- | --- | ---: | ---: | ---: | ---: |
| Cube | `18,19,20,22,25,23,21,24` | `3.35` | `0.45` | `PI * 0.28` | `0` |
| Cuboctahedron | `6,7,8,9,10,11,13,14,15,17,16,12` | `2.35` | `1.45` | `-PI * 0.24` | `0.15` |
| Octahedron | `0,1,3,2,4,5` | `1.35` | `2.45` | `PI * 0.32` | `0.3` |

Departure lasts `2.05s`. Radius and class orientation use one quintic envelope.
Detached cubelets shrink from full size to `0.79` over a separate `0.35s` quintic
clearance envelope, then remain at that scale while orbiting.

Capture begins at `7.15s` with a nominal `3.75s` window per class. Relative position
and class rotation settle at 80% of that window. Scale recovers from 80% to 90%, and
the global orbit-mesh handoff occurs at `10.825s`. Class final orientations are valid
members of the cube's 24 proper rotational symmetries, so the same final shell set is
reached while each polyhedron remains rigid.

The capture envelope is unchanged smootherstep through 50%. From 50% to 80%, a
quintic Hermite continuation matches position, velocity, and acceleration at the
join, then reaches zero velocity and acceleration. This is specifically intended to
remove the previously visible micro-docking motion in the final second.

Local cubelet rotation aligns through a spherical cubic Bezier curve. Alignment
starts `2.1s` before class capture and completes at 80% of positional capture. Its
first control quaternion matches incoming angular velocity; its final two controls
are identity, producing zero relative angular velocity at completion.

## Plasma nucleus

Implementation: `src/lib/FireEffect.ts` and `src/components/HeroScene.tsx`.

The earlier screen-aligned plane was removed. Its radial masks extended beyond the
quad's reachable UV radius, so the blue ring and edge fade were clipped and the
effect visibly remained a square. Disabling depth testing also made it composite in
front of unrelated cubelets.

The replacement is a real three-dimensional volume inside the center cube:

- one invisible ray proxy with a 38-step desktop / 32-step compact density
  integration;
- two-octave broad FBM plus one detail read from a deterministic `32^3` 3D noise
  texture; micro and ridged fields are derived cheaply from those samples;
- white core, warm filament layers, a density gap, and an electric blue rim;
- custom premultiplied-style blending with depth testing preserved;
- a separate four-cell-per-axis grid cage rendered after the volume, with
  derivative-based line antialiasing and dimmed rear faces;
- one warm point light whose intensity flickers without allocating in `useFrame`.

The nucleus now changes during orbital departure. At `0.65s` of main spin time the
solid cube crossfades into a surface-less `4 x 4` face grid whose main color is the
same `#18d383` used by the reactor plates. The face-boundary UV lines and the former
heavy `outerEdge` are suppressed. One thinner explicit frame remains around the
three internal separators; do not restore the doubled border or any filled inner
volume. Expansion begins at `2.45s`, synchronized with launch of the closest
octahedral/face-center class, and reaches `1.7x` (`0.85` side length) over `2.5s`.
At the final shell this leaves about `0.05` local radial clearance to corner
cubelets.

Plasma is staged rather than faded in as one finished asset:

- cold-white screen flash and core ignition at `5.8s`;
- a short isolated pulse state for the white core;
- warm filament ignition at `7.55s`;
- blue ionization-rim ignition at `8.8s`.

From `PLASMA_CORE_START - 0.62s`, all three rigid orbit classes steer toward a
camera-relative aperture and then roll around the camera-to-core ray. This keeps
the core readable while preserving each class, opposite pairs, and shared radii;
the normal capture slerp remains responsible for the final handoff. Heading color
is synchronized to the widest orbit instead of ignition: its horizontal phases at
about `5.81s` and `9.38s` drive two long diagonal waves through only the lower
outlined `DEVELOPER` line (emerald, then ion blue), after which the white outline
returns.

Development URL `/?plasma-preview` jumps to the final state and freezes rotation.
Values `grid`, `flash`, `core`, and `warm` preview the intermediate beats; numeric
values select an exact main-spin time. The preview branch is gated behind
`import.meta.env.DEV`.

## Reactor covering

Implementation: `src/components/HeroScene.tsx`.

The final 26-cube sphere now hands off to a 104-instance reactor mesh at
`ORBIT_END + 0.55s`. The first 26 active instances initially reproduce the old cubes
exactly. They then rotate radially and flatten to square shield plates over `0.9s`,
while the shared material moves from the cube's surface response toward a slightly
more metallic reactor finish.

Replication is hierarchical and deterministic:

- `26 -> 52` over `1.05s`;
- `52 -> 104` over `1.2s`;
- final tile size `0.28 x 0.28 x 0.03` (thinned 2026-07-20 from `0.055` at the
  user's art direction — flat PCB read; parent/lineage morph thickness scaled
  to `0.07`/`0.05` to match);
- final centers use a 104-point Fibonacci sphere at `SHELL_RADIUS`;
- balanced nearest assignment gives every original cube exactly four descendants;
- paired descendants share an intermediate lineage direction.

The main precession is held at a fixed angle during the complete morph/division and
continues only after all final tiles have formed. Preview values `reactor`, `divide`,
and `tiles` expose these stages.

The camera aperture now survives the cube-to-reactor handoff. A deterministic
4096-sample spherical search finds the largest empty direction for the active 26,
52, and 104 element distributions. Those directions interpolate with the two
division envelopes while one global quaternion aligns the opening with the camera
and rolls slowly around the view ray. The handoff begins at identity and eases over
`0.68s`; no individual plate is displaced, and the orientation freezes before
scatter. This keeps the plasma visible during morph, both divisions, and the signal
pulse without damaging family structure.

Plate roll is now deterministic as well as plate normal. Parent, lineage, and final
orientations are built from one spherical tangent/bitangent/normal frame, so nearby
square edges follow the same curvature instead of acquiring unrelated in-plane
angles around the aperture.

The shared reactor material must remain neutral white because the visible emerald is
stored per instance. Three.js multiplies `material.color * instanceColor`; using
emerald for both was the cause of the unintended dark-green mutation seen in the
first release version.

## Reactor release and UI handoff

Implementation: `src/components/HeroScene.tsx` and `src/pages/index.astro`.

The previously deferred closing beat is now implemented:

- the 104-plate sphere holds its stable rotation for `0.7s`;
- two `0.72s` spectator waves travel around different axes and directions;
- each wave combines radial lift, scale/thickness response, and a restrained blend
  toward the saturated blue of the plasma's outer ionization layer;
- each wave center begins one pulse-width before its first pole and exits one
  pulse-width past the last pole, eliminating the old final-row cutoff;
- precession decelerates with an integrated smoothstep velocity envelope and is
  stationary before release;
- one camera-relative left-front-lower plate is handed to a standalone mesh, eases
  to saturated `#f2383f`, breathes outward, and pulses three times without covering
  the source;
- the other 103 plates recoil, then eject near their radial normals with up to
  `0.72s` of deterministic stagger, tangent drift, and spin;
- plates keep their physical size until scene fog, a viewport exit, or passage
  behind the camera has already concealed them; only then is the instance collapsed.

The signal plate begins its own release at `17.545s` of main-spin time. It follows a
lower world-space cubic Bezier route toward the lower-left viewport, rotates face-on,
and widens before fading at the left edge. At `18.965s`, a DOM card enters from the
same edge, then settles into the emerald layout palette.
The existing tech badges and hero subtitle fade at that point to prevent overlap.
The card is a viewport-wide bottom strip with responsive hero gutters and a
`220px..292px` responsive minimum height. It has no side/bottom border or radius.
Placeholder Russian copy currently describes interactive WebGL systems.
Its top border, `18px` microgrid with restrained `72px` major divisions, labels,
reactor plates, and nucleus grid all derive from the same `#18d383` reactor color.
The former few oversized SVG routes are replaced by short fine traces and smaller
varied pads. Gold draws first with per-route stagger; recessed grooves and the
diagonal resin-grid reveal settle behind it. Red remains only the launch warning;
after three pulses its vertical signal edge settles to emerald over `2.4s`.

The final source expansion overlaps the release. The grid cage still follows the
`4.35x` scale envelope, but only as a transient demolition volume: its deterministic
`4 x 4` face cells disappear with staggered timing and a short blue line flash,
leaving no oversized cage in the settled composition.

The plasma changes quality and anatomy with the same progress. Desktop ray-march
samples rise from 38 to 64 in the enlarged state; the compact/mobile tier remains
at 32 and uses a step-aware minimum shell thickness. The visible warm base and white
core stay spherical and grow uniformly to `2.78x`; the blue field is sized from
that lower block rather than surrounding it. At full expansion the blue rise starts
`0.45` normalized units inside the upper hemisphere, uses a `1.38` shoulder, and
blends into its column over heights `1.35..3.10`. Independent broad/detail/ridged/
micro perturbation breaks the radial contour, so the top stays plasma-like instead
of following the smooth lathe silhouette. A compact 24x16 `SphereGeometry` proxy is
used through 35% of final expansion; the former axis-aligned box was removed after
its transparent hull read as a second dark cube inside the rotating grid. The mesh
then switches to a preallocated 24-segment `LatheGeometry` silhouette reaching the
same `6.05x` radial and `13.5x` vertical extent. A shared domain-warped medium contains seven independent
tube streams, two thin angular ribbon families, and a low-density blue-grey mist.
The streams launch from different points in the upper source, braid at separate
speeds, break and reconnect through ridged noise, then converge toward the
two-frequency wandering centerline. The base shifts down by `0.17` local units and
light distance rises with the expansion.

The performance pass keeps that anatomy while reducing wasted fragment work. The
source-relative blue shoulder stays inside the conservative exponential plume bound;
the previous profile/bound mismatch clipped the shell between normalized heights
`1.25..2.25` and caused the unintended dark upper gap. A second fine bound uses the
independently perturbed blue radius to reject empty samples after the shared warp is
known. Broad FBM uses two octaves,
all seven secondary strand oscillations share four trigonometric values via
angle-addition constants, Gaussian strand tubes use compact cubic kernels, and
ribbon powers use exact multiplication chains. In a
`1400 x 1000` Chromium software-WebGL run, the settled preview improved from about
`225.7 ms/frame` (`4.4 FPS`) to `33.5 ms/frame` (`29.8 FPS`). The later approved
upper-envelope widening deliberately spent part of that margin: the
pre-noise-texture final shape measured about `41.5 ms/frame` (`24.1 FPS`) in the
same `1400 x 1000` SwiftShader run, still roughly `5.4x` faster than the original.
At
`1856 x 1080` the narrower optimized baseline measured about `55 ms/frame`
(`18.2 FPS`). The compact source, expanded source, proxy handoff, and the
then-current broad blue envelope were visually checked with no clipping or visible
silhouette edge; the latest source-relative contour is recorded in the validation
section below.

The latest pass replaces each procedural trilinear noise read (`8 hashes`) with a
sample from a deterministic repeating `32^3` single-channel 3D texture. FBM anatomy
is unchanged, but interpolation runs in texture hardware. In a same-session
`1400 x 857` Chrome/ANGLE A/B on a GTX 1060, the settled preview improved from about
`53.3 ms/frame` (`18.8 FPS`) to the `60 FPS` display cap (`16.7 ms/frame`). Compact
viewports also set only the WebGL renderer to DPR `1` and use 32 steps; the DOM stays
at native resolution. After the source-relative contour edit, removing its obsolete
`0.16` coarse-bound safety padding changed the compact `390 x 844` preview from
about `40.1` to `19.4 ms/frame` in one headless Chromium A/B, with no visible return
of the clipped band.

Development previews add `waves`, `signal`, `scatter`, and `card`; an empty value
shows the fully settled final composition.

## Validation status

The current three-polyhedron model was sampled at 600 FPS with two checks:

- Center-distance check: zero collisions, exact central symmetry, full-sequence
  minimum center clearance `0.0182`, which is the assembled scene-scaled gap.
- Exact OBB SAT check: zero intersections using the real animated cube orientation,
  local self-spin, scale-out, orbit motion, and scale recovery.
- Final orbit-mesh to main-mesh handoff mismatch: below `4e-9` world units.
- The plasma version passes `pnpm build`. Headless Firefox/BiDi validation produced
  rendered frames for grid growth, flash, isolated core, warm plasma, and final
  ionization rim with no shader or runtime errors; only the two known upstream
  Three.js deprecation warnings remain.
- Reactor morph, first division, 104-tile covering, and resumed stable rotation were
  captured in Firefox/BiDi with no additional runtime or shader errors.
- The corrected emerald base plates, blue wave frames, red signal handoff, staggered
  grid breakup, fog/viewport-gated plate removal, spherical core with an offscreen
  plume, full-width DOM strip, and settled final composition were captured in
  Firefox/BiDi. Only the same upstream `Clock` and shadow-map deprecation warnings
  were emitted.
- The upgraded plasma was captured as four consecutive final-state frames. The
  spherical core stays intact while its seven warm/white/blue streams move
  independently inside the shared plume; Firefox reported no GLSL errors.
- The tangent-framed second division was captured at `14.58s`, the lower saturated
  signal handoff at `17.0s`, and the enlarged plasma at `20.5s` and `23.1s` in a
  `1856 x 1080` Chromium viewport. The three upper aperture plates follow one
  coherent spherical frame, the core remains unobstructed, and all ordinary plates
  are already concealed before their instances collapse. `pnpm build` and
  `git diff --check` pass after these changes.
- The plasma performance pass was measured in Chromium/SwiftShader before and after
  the shader/proxy changes. It produced roughly a `6.7x` frame-time improvement at
  `1400 x 1000`; shader compilation and the compact-to-lathed proxy handoff were also
  captured without new WebGL errors or visible clipping.
- The noise-texture/mobile-quality pass was captured in Chromium at the settled
  desktop composition and the compact `warm` stage. GLSL 3 / `sampler3D` compiled
  without runtime errors, the blue shoulder no longer contains the clipped
  height band, the seven streams remain visible, and `pnpm build` passes.
- The latest source-relative blue contour and assembly pulse were captured in
  Chromium. The upper layer emerges from inside the lower sphere with an irregular
  edge. The pulse now follows the real rounded cubelet bevels; their adjacent rims
  form readable cold-white seams without an enclosing or internal cube silhouette.
- The final assembly timing was captured as an eight-frame Chromium sequence: the
  grid peaks when the cube closes and the original edge roll starts immediately.
  The material-aware follow-up focuses that glow at the virtual support edge from
  34% of the roll, peaks at landing, and clears during the first `0.16s` of corner
  lift. The original spin-delta formula remains unchanged; no choreography phase is
  delayed. Final `pnpm build` and `git diff --check` pass.
- Compact framing was revalidated in a hydrated Firefox iframe with an exact
  `390 x 844` viewport (not a wide `compact-preview` approximation). The Canvas
  measured `390 x 844`; at `tiles` the reactor center projected to `x = 195px`
  exactly and `y = 385.8px`, while `scatter` remained horizontally centered. A
  six-frame live pass kept the complete assembly visible as it began slightly left
  and rolled into the settled center. The earlier Fable browser failure exposed an
  unhydrated default `300 x 150` canvas, so screenshots from that failed tab are not
  valid evidence of camera framing. `?compact-preview` forces compact camera/scale
  parameters but does not reproduce a phone aspect ratio by itself.
- The follow-up real-mobile regression exposed what the iframe could not: the
  no-wrap technology ribbon had `max-width: none`, so its `938px` intrinsic width
  expanded a `390px` mobile layout viewport to roughly `959px`; the fixed Canvas
  followed that width and R3F selected desktop mode. The ribbon now stretches only
  to its parent (`width/max-width: 100%`, `min-width: 0`) and scrolls internally.
  Mobile Chromium validation passed at `390 x 844`, `320 x 568`, and `430 x 932`
  (English card), plus landscape `667 x 375`, `844 x 390`, and `1024 x 768`:
  document and Canvas dimensions exactly matched every viewport, horizontal page
  overflow stayed zero, and compact rendering remained enabled. Portrait camera
  aim is biased upward by `0.72` world units so the reactor projects into the clear
  middle band; at `390 x 844` the card begins at `y = 284.8px`, after the headline's
  `y = 268.7px` bottom, and all contacts remain visible. Short portrait cards and
  narrow landscape panels scroll internally to reachable actions. Landscape uses a
  44% identity rail/right information panel and never introduces document scroll.
  Safe-area insets and `viewport-fit=cover` now protect all four edges. Final
  `pnpm build` and `git diff --check` pass.

These values are coupled to class axes, radii, speeds, symmetry quaternions, capture
offsets, easing functions, and scale envelopes. Rerun equivalent validation after
changing any of them.

## Files and constraints

- `src/components/HeroScene.tsx`: R3F scene and phases 2-9, plus the React card.
- `src/lib/AssemblyGlow.ts`: transient rounded-bevel seam shader; no enclosing or
  inset box.
- `src/lib/DischargeScheduler.ts`: deterministic sequential stream bursts and
  independent-lane surface-arc timing.
- `src/lib/LayeredAssembly.ts`: phase 1 path and time sampling.
- `src/lib/trajectoryData.ts`: phase 1 curve and spacetime data.
- `src/lib/SpinSimulation.ts`: angular physics.
- `docs/animation-choreography.md`: full creative and mathematical specification.
- `AGENTS.md`: repository workflow and architecture.

Do not allocate Three.js objects inside `useFrame`. Keep the main 26-instance mesh,
the detached 26-instance mesh, the reactor 104-instance mesh, the standalone signal
plate, and the normal nucleus meshes. The directory is a Git repository (branch
`main`); the baseline of the approved animation is the initial commit.

## Completed visual-refinement pass

### Current baseline

- Keep the spherical lower source, the blue layer emerging from its upper volume,
  the irregular noisy silhouette, seven rising streams, and the silhouette-proxy
  performance pass as the starting point.
- Historical software-WebGL measurements improved from `225.7` to `41.5 ms/frame`
  before the 3D-noise-texture pass; the texture-backed version subsequently reached
  the `60 FPS` display cap on the local GTX 1060 test. Keep the GLSL loop's static
  upper bound at `80`:
  desktop `uStepCount` still tops out at `64`, while compact viewports use `32`.
  A direct A/B test showed that changing the static loop bound to `64` made that
  driver's compiler almost twice as slow.
- The typography/copy in `src/pages/index.astro` is parallel Fable work. Preserve it
  unless the next task explicitly targets the title animation or page layout.

### Title waves — completed

The lower `DEVELOPER` line now receives three distinct one-shot paint waves at the
widest orbit's consecutive horizontal-plane crossings: phases `pi/2`, `3pi/2`, and
`5pi/2`. The dataset values are `outer-approach`, `outer-near`, and `outer-return`,
so every CSS animation reliably retriggers. The passes use emerald/mint, cyan, and
ion-blue accents, remain restricted to the lower line, and restore its original
outlined state before reactor morphing starts.

### Cube-to-plate handoff — completed

`REACTOR_TRANSFORM_START` now follows capture by only `0.18s`. The morph first
performs a fast, symmetric size reduction over the first 24% and only then flattens
the geometry. Camera-facing aperture steering waits until 52% of the morph, when the
objects already read as plates. This preserves the spherical voxel shell, avoids a
new invented intermediate solid, and removes the former full-size arbitrary pile
around the nucleus.

### Division clearance — completed

Both division stages now separate before their children become visually large.
Direction/orientation interpolation uses a dedicated early separation curve, parent
sizes fall immediately, and child birth is delayed (`0.30` in division one, `0.34`
in division two). This systemic ordering removes the repeated three-plate compressed
cluster without per-instance offsets and keeps tangent-facing lineage motion.

### Assembly synergy pulse — completed

Starting `0.10s` before the last cubelet locks, a cold-white additive 26-instance
shader reuses the real rounded cubelet geometry. Its bevel highlights join into the
contact seams while retaining curved corners. No center instance or enclosing glow
box is rendered, preventing a nested-cube silhouette. The original roll
begins without a pause or timing change. The original `0.46s` lock release remains,
but from 34% of the roll a second envelope spatially contracts the overlay toward
the virtual support plane. Upper seams dim, the contact edge turns mint-white, and
the response reaches the first seam row and peaks as the next face lands before
clearing over `0.22s`. At the same
time the uniform emissive/roughness pulse on the structural material is suppressed,
so the more metallic cubelets retain their individual form. The same transient
instanced mesh is marked invisible outside both envelopes and adds no steady-state
draw call.

### Final blue plasma contour — source-relative

The latest art direction supersedes the former smooth enveloping dome. The expanded
blue rise begins `0.45` normalized units inside the lower sphere, uses a `1.38`
shoulder based on that source, and transitions to the upper column over
`1.35..3.10`. Its radial distance receives stronger broad, detail, ridged, and micro
perturbations, so it inherits the lower plasma's organic contour instead of exposing
the smooth lathe proxy. The white core and warm lower source remain spherical.

### Plasma performance and upper-gap correction — completed

The dark band in the upper blue shoulder was a culling defect caused by a visible
profile/coarse-bound mismatch. The new source-relative shoulder remains inside the
conservative exponential bound, while the fine cull compares the independently
perturbed blue radius. This covers the formerly clipped `1.25..2.25` height band
without evaluating FBM across the proxy's empty corners.

The plasma material now uses GLSL 3 and a deterministic `32^3` `Data3DTexture` for
hardware-filtered noise. Seven streams and the current source-relative silhouette
remain. Compact
viewports render the WebGL canvas at DPR `1` with 32 ray steps; desktop retains the
`38 -> 64` ramp and DPR ceiling `1.5`. The production build and `git diff --check`
pass after this set. The next visual stage can proceed to materials and lighting
from this source-relative contour.
