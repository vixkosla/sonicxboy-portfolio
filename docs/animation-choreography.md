# Hero animation choreography

## Creative direction

The hero is a single evolving voxel system, not a sequence of unrelated effects.
Its visual story is:

1. distant particles crystallize into a 3x3x3 cube;
2. the cube acquires mechanical momentum and rolls onto an edge/corner;
3. the rigid lattice separates into orbital symmetry classes;
4. orbital motion gradually yields to a spherical voxel shell;
5. its nucleus becomes an emissive grid cage and ignites into a volumetric energy
   source;
6. the shell morphs and divides into a dense reactor covering;
7. blue ionization waves release the covering while one plate crosses from WebGL
   into interface;
8. the temporary grid cage disintegrates while the source expands into the
   volume left behind as an upright flame.

Mathematics must remain invisible. It provides collision constraints, continuity,
and repeatability, but the viewer should see momentum, attraction, and available
space rather than perfect geometric construction steps.

## Current phases

All times below are relative to the beginning of their owning simulation.

### 1. Assembly

`LayeredAssembly` moves 26 cubelets along fixed, single-segment quintic Bezier
curves. Each curve uses six controls (`start`, `launch`, `pivot`, two settling
controls, and `target`) in one degree-five polynomial. There is no piecewise pivot
or short avoidance fillet, so direction and every derivative remain continuous.

Paths are arc-length parameterized and use individual velocity profiles with a
launch impulse, cruise modulation, and final braking. The LUT is used only to invert
arc length back to Bezier parameter time; final positions are evaluated directly on
the quintic rather than interpolated across a polyline. Moving-cube conflicts are
resolved only by the precomputed delays and durations in `SPACETIME_DATA`; path
geometry does not react to other cubelets. The static center is handled by one broad
control-point arc rather than a local correction.

The schedule lasts `5.6008s`. A dense 600 FPS AABB check leaves at least `0.006`
world units beyond the `0.5` cube side. At the runtime LUT resolution, the largest
direction change between adjacent path samples fell from about `35.1deg` in the old
piecewise path to about `3.29deg`.

During the last `0.10s` of assembly, a short cold-white synergy pulse appears in
the contact gaps. A six-sided additive overlay traces the assembled cube's outer
edge and its `3 x 3` face seams, while a dimmer inset box supplies light from behind
the gaps. The attack lasts `0.12s`, the full-strength hint lasts `0.06s`, and the
`0.46s` release follows the cube through the first `0.54s` of its existing edge
roll. It is gone before the corner lift. Both overlay materials are hidden outside
the `0.64s` envelope, so the beat adds no persistent draw calls. In development,
`?assembly-glow-preview` freezes the cube at the pulse peak.

### 2. Edge roll and corner lift

Immediately after assembly, the cube rolls right through a virtual contact edge for
`0.72s`.
The center follows the no-slip relation:

```text
x = h(1 + sin(phi) - cos(phi))
y = h(sin(phi) + cos(phi) - 1)
```

It then moves from the rolled face to the diamond pose for `0.84s`. This transition
is a single relative quaternion rotation. Do not add an independent yaw/spin during
the lift; that previously made the movement look multi-axis and artificial.

### 3. Spinning top

`SpinSimulation` integrates angular velocity with fixed substeps:

```text
d(omega)/dt = driveTorque
              - linearDrag * omega
              - quadraticDrag * omega * abs(omega)
              - coulombDrag
```

The current peak is about `1.79 revolutions/s`. The orientation composition is:

```text
Q = Q_precession * Q_nutation * Q_spin * Q_diamond
```

The motion stops; there is no permanent idle rotation.

### 4. Orbital disassembly

The original cubic shell is divided by symmetry:

- 8 corners: the vertices of a cube;
- 12 edge centers: the vertices of a cuboctahedron;
- 6 face centers: the vertices of an octahedron;
- 1 center cube: nucleus.

These are the three non-trivial point orbits of the cube's rotational symmetry
group. Each class expands to its own radius and rotates rigidly around a distinct
axis. Every vertex therefore follows an orbit, but the class remains a recognizable
polyhedron instead of dissolving into unrelated planar lanes.

For every member of class `k`, position is evaluated as:

```text
p_i(t) = center + r_k(t) * Q_k(t) * normalize(v_i)
```

The radius and quaternion are shared across the whole class. Opposite vertices are
stored half a group apart, so `p_opposite(t) = -p_i(t)` holds exactly throughout
departure, orbit, and capture. Paired cubelets also share their restrained local
self-spin profile.

Departure lasts `2.05s`. Radius and class orientation use the same quintic envelope,
so there is no `outward -> rotate -> insert` staging.

### 5. Spiral capture

Capture starts around `7.15s`, with class offsets of `0`, `0.15`, and `0.3s`.
Its normalized timing window is `3.75s`, but relative position and class rotation
settle at 80% (`3s`). Scale recovers from 80% to 90%, and the global orbit-mesh
handoff now occurs at `10.825s`.

Class orientation and radius use the same C2 capture envelope. Up to 50% it is the
previous collision-validated smootherstep. From 50% to 80%, a quintic Hermite branch
matches its position, velocity, and acceleration, then reaches the destination with
zero velocity and acceleration. This removes the visible final-second docking tail
without changing the earlier spacetime crossing. The final orientations are selected
from the cube's 24 proper rotational symmetries, so each polyhedron remains rigid
while reaching exactly the same set of 26 shell positions.

Detached cubelets shrink continuously from full size to 79% over a `0.35s` quintic
envelope while their polyhedron begins its slower expansion. This releases clearance
before the classes rotate through one another, creates negative space between the
nested forms, and avoids a launch pop. They remain reduced during the dense capture,
then recover from 80% to 90% after their centers and class rotation have settled.
Scale recovery therefore cannot read as a positional correction.

Orientation alignment begins `2.1s` before positional capture and is complete at
80% of the positional capture. It follows a spherical cubic Bezier curve from the
free-spin orientation to identity in the main group's local frame. The first control
quaternion is extrapolated from the cubelet's incoming angular velocity, while the
last two controls are identity. This preserves the previous angular velocity at the
entrance and reaches the destination with zero relative angular velocity, so the
alignment reads as part of the orbital motion rather than a separate turn.

At completion, all 26 shell cubelets swap back to the main instanced mesh at the
same positions and orientations. Their final positions are the normalized original
cube directions at `SHELL_RADIUS = 1.22`.

### 6. Plasma ignition

The nucleus transformation begins during orbital departure rather than after the
handoff. At `0.65s` of main spin time its opaque material starts dissolving into an
emissive `4 x 4` grid on every face. The larger cells expose more of the source.
Each line has an antialiased bright core plus a restrained emissive shoulder, and
rear faces are deliberately dimmed so overlapping sides do not turn into moire.
The grid uses the same `#18d383` base color as
the reactor plates, with a brighter same-hue highlight rather than a separate
translucent palette. Expansion waits until `2.45s`, when the last and closest octahedral class
launches, then grows the grid cube to `1.7x` over `2.5s`.

The final grid side is `0.85`. This is close to the largest axis-aligned cube that
fits inside the spherical shell: its corner radius is about `0.736`, leaving roughly
`0.05` before the inner radial support of a final corner cubelet. Delaying expansion
until the face-center class departs avoids growing through the still-assembled inner
neighbors.

Ignition is deliberately staged after the grid has reached full size:

- `5.8s`: a fast cold-white full-viewport flash reveals the white core;
- after the flash, the lone core remains visible and pulses gently;
- `7.55s`: yellow, orange, and red filaments begin forming during capture;
- `8.8s`: the noisy blue ionization rim closes around the warm volume.

Just before core ignition, each rigid orbital symmetry class eases into a
camera-relative aperture orientation. The view ray passes through a polyhedral
face gap rather than a cubelet center; continued rotation happens around that same
view ray, so the projected clearance remains open without any per-cube correction.
The existing capture curve still blends the whole class into its final cube-group
orientation. The heading response is tied to the widest orbit itself rather than to
ignition: its horizontal phase at `3pi/2`, and the return crossing one half-turn
later, launch two broad diagonal paint waves at about `5.81s` and `9.38s`. Only the
lower outlined `DEVELOPER` line is filled, first with reactor emerald and then with
ion blue. Each pass remains readable for roughly two seconds and fades back to the
original white outline.

The conversion itself uses cold emerald/white energy, not yellow. Warm light only
appears once the warm plasma layer exists.

The core is not a billboard. A fragment shader ray-marches 38 samples on desktop
and 32 in the compact/mobile tier through a small sphere
(`PLASMA_RADIUS = 0.235`) and integrates a flowing three-dimensional density field.
Two broad FBM octaves and one detail read sample a deterministic repeating `32^3`
noise texture through hardware trilinear filtering. Decorrelated micro and ridged
fields are then derived arithmetically from those reads, preserving narrow channels
without rebuilding trilinear value noise from eight hashes at every sample. The
intended anatomy is:

- a moving amorphous white-hot center;
- translucent yellow, orange, and red plasma filaments;
- a low-density dark gap;
- a thin noisy blue ionization rim, strengthened at grazing view angles.

In the enlarged state the upper flow is not one textured tube. Seven analytic
streams follow separate rising centerlines inside a shared domain-warped medium.
Two additional angular ribbon families produce thin sheets between them, and a
low-density blue-grey mist keeps the gaps volumetric instead of empty. The stream
offsets are already separated inside the upper hemisphere, so visible lines grow
out of different parts of the source before braiding and converging overhead.

The plasma mesh keeps depth testing enabled and only disables depth writes. Opaque
shell cubelets can therefore occlude the core correctly; it is visible through the
real gaps instead of being composited over the whole assembly. A small warm point
light flickers with the plasma and produces matching illumination on nearby
cubelets. The grid cage is rendered after the volume as a separate transparent
line layer; non-grid face fragments are discarded.

In development, `?plasma-preview` starts directly at the completed shell and freezes
its rotation. Named values (`grid`, `flash`, `core`, `warm`) expose each story beat,
and a numeric value jumps to that main-spin time. This branch is removed from
production by `import.meta.env.DEV`.

### 7. Reactor-cell coverage

The 26-cube spherical shell is an intermediate scaffold, not the final reactor
covering. At `ORBIT_END + 0.55s`, every visible cube is handed to a third instanced
mesh at the exact same position, scale, orientation, color, metalness, and roughness.
The source instance disappears on the same frame, so the mesh swap itself is
invisible.

Over `0.9s`, each replacement cube rotates until its local normal is radial and its
radial dimension flattens from `0.5` to `0.12`. Tangential dimensions settle near
`0.43`, producing a square reactor shield plate as a direct geometric descendant of
the cube. Every plate receives the same deterministic spherical tangent/bitangent
frame, rather than only aligning its normal and inheriting an arbitrary in-plane
roll. Neighbouring squares therefore follow the curvature coherently, including the
three plates bordering the upper camera aperture. Metalness rises while roughness
falls on the same morph envelope.

The plates then divide like cells in two generations:

- generation one: `26 -> 52` over `1.05s`;
- generation two: `52 -> 104` over `1.2s`;
- final tiles measure `0.28 x 0.28 x 0.055`.

The core aperture continues across this mesh handoff. At the first morph frame the
reactor orientation is still identity, then over `0.68s` the covering turns as one
rigid object so its largest natural gap faces the camera. The gap direction is
computed separately for the 26 parent cells, 52 lineages, and 104 final tiles from a
4096-direction spherical search, then interpolated with the division envelopes.
A slow roll around the camera-to-core ray keeps the covering visibly moving without
closing the opening. This is a single global orientation, not per-tile correction,
so family geometry and the cell-division paths remain intact. It freezes before
scatter so detached trajectories stay inertial.

Final directions are a 104-point Fibonacci sphere. Assignment is capacity-balanced:
each original cube owns exactly four nearby final directions. Each family is paired
into two intermediate lineage directions, so the second generation grows from the
first rather than teleporting independently to a global point set.

The permanent precession angle is frozen from the first morph frame through the
second division. Once all 104 tiles reach their target transforms, constant rotation
resumes from the same angle with no discontinuity. The spectator-wave signal and
normal-vector evaporation are implemented in the following final handoff stage.

The reactor material itself is deliberately neutral white. The established emerald
surface color lives in `instanceColor`; setting both layers to emerald multiplies the
two colors in Three.js and incorrectly turns the plates dark green.

Development previews add `reactor`, `divide`, and `tiles` values for the morph,
first division, and completed covering.

### 8. Reactor release and interface handoff

The completed 104-plate covering rotates undisturbed for `0.7s`. It then receives
two short stadium waves. The first travels almost vertically around the sphere; the
second crosses diagonally in the opposite direction. A wave is a real deformation,
not just a tint: each plate lifts up to `0.085` along its radial normal, grows
tangentially by 18%, thickens briefly, and shifts from emerald toward the saturated
blue of the plasma's ionization rim. Each traversal lasts `0.72s`, with a `0.14s`
gap. The color response is intentionally restrained so it reads as energy passing
through the existing material rather than a replacement green palette. The pulse
center travels from one wave-width before the first pole to one wave-width beyond
the opposite pole; the last row therefore fades behind the sphere instead of being
cut off on the final active frame.

Stable precession brakes throughout both waves. Its time mapping integrates a
smoothstep velocity envelope, so angular speed is continuous at the start and
reaches exactly zero at the end. This makes the subsequent release inertial rather
than making detached plates continue to orbit with a rotating parent.

During the second wave, one plate is selected from the visible left-front-lower
quadrant relative to the current camera. Selection favors a face that can be read by
the viewer while leaving both the source and a leftward maneuver unobstructed. At
`16.495s` of main-spin time, that instance is handed to one standalone mesh at the
exact same world transform. It eases from emerald to saturated warning crimson
`#f2383f`, breathes outward along its normal, grows and thickens three times over
`1.15s`, and uses a restrained matching point light. Brightness pulses no longer
wash the surface into pale coral.

The release begins with a `0.15s` inward compression, like a plate loading against
the reactor frame. The ordinary 103 plates then accelerate outward along directions
that remain close to their radial normals, with deterministic tangent drift,
rotation, speed, and up to `0.72s` of stagger. They remain full-size while readable.
An instance is collapsed only after its projected center has left the viewport, it
has passed the camera plane, or its camera distance has entered the nearly opaque
end of the scene fog. A `4.4s` maximum flight is only a safety bound after the same
accelerated path has already carried it beyond the visible composition.

The signal plate owns a different route. After the same recoil, it follows one
cubic Bezier path around the left side, rotates until its face is camera-aligned,
and stretches toward the proportions of an interface panel. Near the left viewport
edge, the WebGL mesh fades while a fixed DOM card enters from the same side and
settles downward into the lower-left composition. Its coral-red arrival edge decays back
to the established emerald interface palette. Existing technology badges fade out
at this handoff so the new information surface has a clean landing area. The hero
subtitle fades with them. The card is now a true viewport-wide lower layout strip:
it is anchored to all three lower edges, has no side radius, and uses the same
responsive page gutters as the hero text.

The stable palette is deliberately singular: plates, cage lines, card border,
labels, and its `36px` layout grid all use `#18d383` or transparent/darker derivatives
of it. The red signal remains a temporary launch state and transitions to emerald
after three pulses rather than becoming a permanent third accent.

While the covering releases, the grid nucleus follows the old `1.7x -> 4.35x`
expansion envelope only as a temporary demolition volume. Every face is already
divided into a deterministic `4 x 4` grid; cells disappear at staggered thresholds
while their lines briefly emit a blue breakup glow. The cage is fully gone before
the large final view, so it never competes with the plasma as the main subject.

On desktop the plasma raises its ray-march budget continuously from 38 to 64 samples
during this expansion; the compact/mobile tier stays at 32 samples with a
step-aware minimum shell thickness. The visible warm lower source grows uniformly
to `2.78x` and remains a real sphere; in particular, the white core is never scaled
independently on Y. The blue ionization envelope is a separate field and expands to
`1.95x` the warm source radius. Until 35% of final expansion the ray-entry proxy is
the compact source box. It then switches to a preallocated 24-segment lathed flame
silhouette, scaled to the same `6.05x` radial and `13.5x` vertical reach. That
surface shifts upward with the plume, has no visible material or Fresnel edge, and
eliminates most empty corner fragments from the former enlarged box.

Inside that proxy, the warm source keeps its spherical cross-section. The blue upper
layer is now sized from that lower sphere: at full expansion its rise begins `0.45`
normalized units inside the upper hemisphere, uses a restrained `1.38` shoulder,
and blends into the rising column over heights `1.35..3.10`. It therefore grows out
of the source instead of wrapping around it as a second shell. Broad, detail,
ridged, and micro noise perturb the blue radial distance independently, so the
upper silhouette inherits the lower plasma's irregular edge instead of becoming a
straight lathed contour. Seven independent warm/white/blue streams and two thin
ribbon systems continue through this shared medium. Their offsets and widths narrow
exponentially toward a two-frequency centerline, while ridged noise interrupts and
reconnects them. A weak blue-grey mist occupies the remaining volume without
closing it into one opaque silhouette. The proxy and density continue beyond the
top of the viewport, so the flame never terminates in a rounded cap. The base center
still moves down by `0.17` local units and the point-light reach expands with the
same envelope.

Development previews add `waves`, `signal`, `scatter`, and `card`. The empty
`?plasma-preview` value now shows the settled interface handoff.

## Collision and continuity invariants

- Cube geometry side length is `0.5`; the assembled gap is `0.014`.
- No moving cube may intersect the static center.
- The cube, cuboctahedron, and octahedron use nested radii and whole-class capture
  offsets; individual members never perform avoidance corrections.
- Class axes, radii, speeds, and final symmetry quaternions are coupled to the exact
  motion function. Changing them invalidates the numerical validation.
- Position, orientation, and scale must reach the destination with zero derivative;
  never multiply an accumulated rotation angle by a shrinking envelope, because it
  creates fast reverse unwinding near docking.
- Avoid discrete correction phases. Prefer one curve with overlapping degrees of
  freedom and a constraint check over a visibly staged solution.

The latest full validation sampled the choreography at 600 FPS. A center-distance
pass found exact central symmetry and a maximum handoff mismatch below `4e-9` world
units. A second SAT pass using the actual oriented cube boxes, local self-spin, and
animated scale found zero intersections. The smallest center clearance over the full
sequence is the assembled cube's existing `0.0182` scene-scaled gap.
Any motion change requires rerunning an equivalent dense check and then validating
the result visually in the browser; numeric non-intersection does not prove natural
motion.

## Rendering and performance

- Main shell: one 26-instance `InstancedMesh` inside the rotating group.
- Detached particles: a second 26-instance mesh in world space.
- Reactor covering: a third 104-instance mesh, hidden until the final handoff.
- The solid cubelets now share one phase-driven emerald metamaterial. Their color,
  metalness, roughness, and restrained emissive response move continuously from a
  dormant composite through crystallization/conductivity into the reactor state.
  The cube material remains an ordinary `MeshStandardMaterial`; the existing
  main/orbit/reactor mesh handoffs remain.
- The reactor plates extend `MeshStandardMaterial` once through `onBeforeCompile`.
  Their UV-space surface is an analytic reactor circuit: a five-cell composite
  microgrid, inset frame, recessed traces, pale-gold ENIG-like conductors, square
  terminal pads, and one restrained traveling current. Each instance seed produces
  a stable random hub position, two-to-four orthogonal branches, endpoints,
  mirroring, and axis swap. The structure grows radially during the cube-to-plate
  morph; its energy inherits each instance color during the blue shutdown wave and
  loses most of its current as the covering releases. No image textures, new
  geometry, extra draw calls, or per-instance materials are used.
- Cubelets use a one-segment rounded box whose duplicate vertices are merged from
  324 to 92. The 104 covering and standalone signal plate retain the original
  lightweight unit box. The standalone plate shares the same circuit shader so its
  conductors follow the established emerald-to-red signal transition.
- Interface plate: one standalone unit-box mesh and one short-range red point light;
  both remain hidden until the selected reactor instance hands off.
- Nucleus: one normal mesh.
- Assembly pulse: one seam-overlay box and one inset additive box; both materials
  are invisible outside the `0.64s` pulse envelope and therefore produce no
  persistent draw calls.
- All scratch vectors/quaternions/object transforms are preallocated. Do not allocate
  Three.js objects inside `useFrame`.
- The external Drei `Environment` preset was removed because HDR loading delayed the
  first visible frame. Lighting is local, plus one procedural PMREM studio
  environment (`StudioEnvironment` in `HeroScene.tsx`): four emissive panels
  mirroring the analytic rig (cool key, blue rim, warm gold accent, emerald floor
  wash) rendered once at startup — no network fetch. It exists because metallic
  surfaces (reactor plates, gold traces) need an environment map for real specular
  response; `scene.environmentIntensity = 0.32` keeps the dark mood. Disabled under
  `?lighting-baseline` so the A/B comparison stays meaningful.
- The lighting lookdev proposal keeps the existing light count but changes its
  hierarchy: low ambient/hemisphere fill preserves dark gaps, a neutral upper
  directional light remains the shadow-casting key, the former emerald point light
  becomes a restrained cyan rear contour, and the former cyan point light becomes
  a warm soft-edged spotlight aimed at the reactor center. The fixed spotlight
  creates moving gold highlights because the shell rotates through its beam; no
  light animation, environment map, post-processing pass, or choreography change
  is required. `?lighting-baseline` restores the previous local rig in development.
- The final plasma uses a silhouette-shaped ray-entry proxy rather than rasterizing
  a viewport-sized box. Each ray-march step first performs a cheap sphere/plume
  bounds test and skips FBM outside both fields. The blue layer's source-relative
  shoulder remains inside the conservative exponential plume bound; the former
  profile/bound mismatch clipped the shell between normalized heights `1.25..2.25`
  and caused the dark upper gap. A second fine bound uses the independently warped
  blue radius to reject the remaining empty samples after the shared warp is known.
  The seven strand trajectories are unchanged, but their secondary sine/cosine
  terms are shared through angle-addition identities, their Gaussian tubes use a
  compact cubic kernel, and integer powers use multiplication chains.
- Procedural trilinear noise (`8 hashes` per read) was replaced by a deterministic
  `32^3` single-channel 3D texture. The FBM still has two broad octaves plus one
  detail read, but interpolation now runs in texture hardware. In a same-session
  `1400 x 857` Chrome/ANGLE run on a GTX 1060, the settled texture-backed preview
  moved from about `53.3 ms/frame` (`18.8 FPS`) to the `60 FPS` display cap
  (`16.7 ms/frame`).
- A software-WebGL Chromium benchmark at `1400 x 1000` improved from about
  `225.7 ms/frame` (`4.4 FPS`) to `33.5 ms/frame` (`29.8 FPS`) before the final
  contour widening. The pre-noise-texture wider-envelope baseline measured about
  `41.5 ms/frame` (`24.1 FPS`) in that CPU renderer, still about `5.4x` faster than
  the original. At `1856 x 1080` the narrower optimized state measured about
  `55 ms/frame` (`18.2 FPS`).
- Mobile uses `sceneScale = 0.82`, renderer DPR `1`, and 32 ray steps. Desktop uses
  scale `1.3`, DPR up to `1.5`, and the existing `38 -> 64` step ramp. DOM text stays
  at the device's native resolution because only the WebGL canvas DPR is reduced.
  With the source-relative contour, dropping the obsolete `0.16` coarse-cull padding
  reduced one same-session compact `390 x 844` headless Chromium result from about
  `40.1` to `19.4 ms/frame` without restoring the dark upper band.

## Completed handoff corrections

The last pass resolved the four items that were previously queued for another
session:

1. The shell enters reactor morph only `0.18s` after capture. It shrinks
   symmetrically during the first 24% before flattening, while aperture steering is
   delayed until 52% of `REACTOR_MORPH_DURATION`. The result keeps the spherical
   arrangement but removes the unattractive full-size cube pile.
2. Both divisions now move along their target directions before child plates become
   large. Separate early-clearance and delayed-birth envelopes eliminate the three
   compressed plates after the second division without bespoke instance offsets.
3. The lower `DEVELOPER` line receives three emerald/cyan/ion-blue paint passes at
   consecutive horizontal crossings of the widest orbit (`pi/2`, `3pi/2`, `5pi/2`),
   then returns to its outlined state before morphing.
4. The final blue plasma envelope follows the latest source-relative direction: it
   begins inside the lower sphere, uses a `1.38` shoulder, blends over
   `1.35..3.10`, and receives a stronger multi-band contour perturbation. The round
   lower source remains the sizing reference, while the upper blue field reads as
   material emerging from it rather than an outer wrapping.

This shape, the assembly glow fading through the unchanged edge roll, and the
existing timing are the user-approved baseline for the next materials-and-lighting
pass. Do not reintroduce a smooth enveloping blue dome, early aperture steering, or
hand-authored division offsets.
