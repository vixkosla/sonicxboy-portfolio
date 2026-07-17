# Session handoff

Updated: 2026-07-17

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

This visual-refinement pass is user-approved. Treat the following as the baseline:

- the blue upper plasma grows out of the lower sphere and keeps its irregular noisy
  contour; it must not return to a smooth enveloping dome;
- the cold-white assembly pulse reaches its peak as the last cubelets lock, then
  fades while the unchanged `0.72s` edge roll is already moving;
- the pulse adds no pause, phase offset, or change to the roll/lift/spin behavior;
- compact/mobile rendering stays at DPR `1` and 32 ray steps, with the current
  texture-backed noise and culling bounds.

The next planned art pass is materials and lighting. Begin there without retuning
motion or reopening the two effects above unless a new visual regression is found.
Useful development URLs are `/?assembly-glow-preview` for the pulse peak and
`/?plasma-preview` for the settled final plasma.

The implementation is currently an uncommitted working-tree change touching
`HeroScene.tsx`, `FireEffect.ts`, `AssemblyGlow.ts`, and both animation documents.
Preserve these files when the next session starts.

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
   fills the vacated reactor volume.

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
- The final `0.10s` of assembly starts a `0.64s` cold-white additive pulse. A box
  shader draws the outer edge plus the `3 x 3` face seams, and a dim inset box makes
  those gaps read as energy from inside. The original roll begins immediately; the
  pulse fades over its first `0.54s` and is gone before the corner lift.
- The two pulse materials are invisible outside the envelope, avoiding permanent
  draw calls. Development URL `/?assembly-glow-preview` freezes the peak frame.

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
same `#18d383` used by the reactor plates. Expansion begins at `2.45s`, synchronized
with launch of the closest
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
- final tile size `0.28 x 0.28 x 0.055`;
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
Its top border, `36px` CSS grid, labels, reactor plates, and nucleus grid all derive
from the same `#18d383` reactor color. Red remains only the launch warning; after
three pulses its vertical signal edge settles to emerald over `2.4s`.

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
of following the smooth lathe silhouette. The compact `BoxGeometry` proxy is
retained through 35% of final expansion, then the existing mesh switches to a
preallocated 24-segment `LatheGeometry` silhouette reaching the same `6.05x` radial
and `13.5x` vertical extent. A shared domain-warped medium contains seven independent
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
- The latest source-relative blue contour and the assembly seam pulse were captured
  in Chromium. The upper layer emerges from inside the lower sphere with an
  irregular edge, while the assembled cube briefly shows a readable cold-white
  `3 x 3` grid and outer edge without a runtime shader error.
- The final assembly timing was captured as an eight-frame Chromium sequence: the
  grid peaks when the cube closes, remains attached while the original edge roll
  starts immediately, fades through the roll, and is absent before corner lift.
  The original spin-delta formula was restored exactly; no choreography phase was
  delayed. Final `pnpm build` and `git diff --check` pass.

These values are coupled to class axes, radii, speeds, symmetry quaternions, capture
offsets, easing functions, and scale envelopes. Rerun equivalent validation after
changing any of them.

## Files and constraints

- `src/components/HeroScene.tsx`: R3F scene and phases 2-8, plus the React card.
- `src/lib/AssemblyGlow.ts`: transient six-face seam shader and inset assembly light.
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

Starting `0.10s` before the last cubelet locks, a cold-white additive box shader
traces the `3 x 3` contact grid and the big cube's outer edges; a lower-opacity inset
box makes the light read as coming from inside the gaps. The original roll begins
without a pause or timing change. The `0.46s` release travels with the cube through
the first `0.54s` of that roll, then disappears before corner lift. Both materials
are marked invisible outside the `0.64s` envelope, so they do not add steady-state
draw calls.

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
