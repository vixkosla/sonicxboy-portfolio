# Session handoff

Updated: 2026-07-14

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

1. Twenty-six distant cubelets assemble around a static center into a 3x3x3 cube.
2. The cube rolls over a virtual edge and lifts onto a corner.
3. It receives a strong spin with precession and nutation, then brakes.
4. The shell separates into three nested rotating polyhedra around the nucleus.
5. The polyhedra converge into the final spherical voxel shell.
6. The nucleus becomes glass-like and ignites a volumetric plasma core.
7. The 26 scaffold cubes morph and divide into 104 radial reactor plates.
8. Two blue ionization waves shut down the covering; the plates release, one becomes
   an interface card, the glass vessel disintegrates, and an upright plasma flame
   fills the vacated reactor volume.

The current closing stage now needs visual approval as one uninterrupted sequence.
Do not redesign earlier approved plasma beats while tuning the release or card.

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

## Roll, lift, and spin

Implementation: `src/components/HeroScene.tsx` and `src/lib/SpinSimulation.ts`.

- Edge roll duration: `0.72s` using the documented no-slip center relation.
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

- one invisible ray proxy with a 38-step initial density integration;
- three-octave advected value noise plus a ridged detail field for deterministic
  plasma flow;
- white core, warm filament layers, a density gap, and an electric blue rim;
- custom premultiplied-style blending with depth testing preserved;
- a separate glass edge/Fresnel cube rendered after the volume;
- one warm point light whose intensity flickers without allocating in `useFrame`.

The nucleus now changes during orbital departure. Transparency begins at `0.65s` of
main spin time. Expansion begins at `2.45s`, synchronized with launch of the closest
octahedral/face-center class, and reaches `1.7x` (`0.85` side length) over `2.5s`.
At the final shell this leaves about `0.05` local radial clearance to corner
cubelets.

Plasma is staged rather than faded in as one finished asset:

- cold-white screen flash and core ignition at `5.8s`;
- a short isolated pulse state for the white core;
- warm filament ignition at `7.55s`;
- blue ionization-rim ignition at `8.8s`.

Development URL `/?plasma-preview` jumps to the final state and freezes rotation.
Values `glass`, `flash`, `core`, and `warm` preview the intermediate beats; numeric
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
- precession decelerates with an integrated smoothstep velocity envelope and is
  stationary before release;
- one camera-relative left-front plate is handed to a standalone mesh and pulses
  red three times;
- the other 103 plates recoil, then eject near their radial normals with up to
  `0.72s` of deterministic stagger, tangent drift, and spin;
- plates keep their physical size until scene fog, a viewport exit, or passage
  behind the camera has already concealed them; only then is the instance collapsed.

The signal plate begins its own release at `17.545s` of main-spin time. It follows a
world-space cubic Bezier route toward the lower-left viewport, rotates face-on, and
widens before fading at the left edge. At `18.965s`, a DOM card enters from the same
edge with the same red signal accent, then settles into the emerald layout palette.
The existing tech badges and hero subtitle fade at that point to prevent overlap.
The card is a viewport-wide bottom strip with responsive hero gutters and a
`220px..292px` responsive minimum height. It has no side/bottom border or radius.
Placeholder Russian copy currently describes interactive WebGL systems.

The final source expansion overlaps the release. The glass frame still follows the
`4.35x` scale envelope, but only as a transient demolition volume: a deterministic
`5 x 5` cell grid on every face dissolves in staggered pieces with a short blue edge
flash, leaving no oversized glass cube in the settled composition.

The plasma changes quality and anatomy with the same progress. Ray-march samples
rise from 38 to 80 only in the enlarged state. The visible base and white core stay
spherical and grow uniformly to `2.78x`; a surface-less `BoxGeometry` ray proxy
extends to `13.5x` vertically and above the viewport. The plume now overlaps the
upper hemisphere using the sphere's own cross-section before narrowing
exponentially, so the source and column have no pinched seam. A shared domain-warped
medium contains seven independent tube streams, two thin angular ribbon families,
and a low-density blue-grey mist. The streams launch from different points in the
upper source, braid at separate speeds, break and reconnect through ridged noise,
then converge toward the two-frequency wandering centerline. The base shifts down
by `0.17` local units and light distance rises with the expansion.

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
  rendered frames for glass growth, flash, isolated core, warm plasma, and final
  ionization rim with no shader or runtime errors; only the two known upstream
  Three.js deprecation warnings remain.
- Reactor morph, first division, 104-tile covering, and resumed stable rotation were
  captured in Firefox/BiDi with no additional runtime or shader errors.
- The corrected emerald base plates, blue wave frames, red signal handoff, staggered
  glass breakup, fog/viewport-gated plate removal, spherical core with an offscreen
  plume, full-width DOM strip, and settled final composition were captured in
  Firefox/BiDi. Only the same upstream `Clock` and shadow-map deprecation warnings
  were emitted.
- The upgraded plasma was captured as four consecutive final-state frames. The
  spherical core stays intact while its seven warm/white/blue streams move
  independently inside the shared plume; Firefox reported no GLSL errors.

These values are coupled to class axes, radii, speeds, symmetry quaternions, capture
offsets, easing functions, and scale envelopes. Rerun equivalent validation after
changing any of them.

## Files and constraints

- `src/components/HeroScene.tsx`: R3F scene and phases 2-8, plus the React card.
- `src/lib/LayeredAssembly.ts`: phase 1 path and time sampling.
- `src/lib/trajectoryData.ts`: phase 1 curve and spacetime data.
- `src/lib/SpinSimulation.ts`: angular physics.
- `docs/animation-choreography.md`: full creative and mathematical specification.
- `AGENTS.md`: repository workflow and architecture.

Do not allocate Three.js objects inside `useFrame`. Keep the main 26-instance mesh,
the detached 26-instance mesh, the reactor 104-instance mesh, the standalone signal
plate, and the normal nucleus meshes. The directory is a Git repository (branch
`main`); the baseline of the approved animation is the initial commit.

## Next session

1. Begin with the user's visual feedback on the blue-wave amplitude, selected-plate
   route, card landing position, and final flame silhouette.
2. If the signal plate needs another route, preserve the exact instance-to-mesh
   handoff and the world-space cubic continuity; change its camera-relative scoring
   or controls instead of adding a correction segment.
3. Treat the DOM card as the first reusable information surface. Replace placeholder
   copy and add interactions only after its motion is approved.
4. Keep the server running in Astro background mode for rapid visual iteration.
