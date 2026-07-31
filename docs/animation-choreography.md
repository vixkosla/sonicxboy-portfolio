# Hero animation choreography

## Creative direction

The hero is a single evolving voxel system, not a sequence of unrelated effects.
Its visual story is:

1. three blocky anomalies establish a close third-person chase;
2. one conductive cube reveals the exact 3x3x3 Rubik-like lattice already inside
   it, then its 26 outer cubelets disconnect and scatter;
3. the default assembly shot rebuilds the same 3x3x3 cube in the same screen-space
   framing; portrait receives the remote cubelets from the left, while desktop
   receives them from beyond the right edge;
4. the cube acquires mechanical momentum and rolls onto an edge/corner;
5. the rigid lattice separates into orbital symmetry classes;
6. orbital motion gradually yields to a spherical voxel shell;
7. its nucleus becomes an emissive grid cage and ignites into a volumetric energy
   source;
8. the shell morphs and divides into a dense reactor covering;
9. blue ionization waves release the covering while one plate crosses from WebGL
   into interface;
10. flying plates dematerialize into the cage's lattice language while the
   temporary grid cage disintegrates and the source expands into the volume
   left behind as an upright flame.

Mathematics must remain invisible. It provides collision constraints, continuity,
and repeatability, but the viewer should see momentum, attraction, and available
space rather than perfect geometric construction steps.

## Phase 0: rigid cube with a molten surface front

**Currently unhooked from the live scene (2026-07-28)** - not enough capacity
to finish it, per the user. `PrologueSequence.ts` still implements everything
described below and is still directly seekable/testable on its own; it is
just not imported or rendered from `HeroScene.tsx` right now, so the site
starts directly at "the default assembly shot" (item 3 above). See
`docs/deferred-features.md` for what exactly was unhooked and how to revive
it.

`PrologueSequence` opens on a tight trailing camera, not a distant establishing
view. Three black-hole voxels pass the ordinary conductive cube, attention transfers
to it, and the camera pushes through a close contact frame before settling on the
exact lock angle used by the later completed assembly.

The cube is the visual grammar of the entire story, not merely the final result.
Its geometry and material therefore remain hard: neither the parent nor any child
uses vertex waves, non-uniform stretch, or soft-body scaling. The parent outer
extent is exactly the extent of the assembled 3x3x3 lattice. At `4.00s`, a separate
narrow molten-metal contour touches the near upper corner and travels continuously
across the three connected faces. Ahead of that contour the ordinary solid shell
remains visible; behind it the shell is clipped away and the exact structural
cubelet material and seams are exposed. The liquid is only the moving boundary,
never the body of a cube.

At `5.15s` the contour has cleared the object and the divided cube holds in the
final lock camera. The 26 children occupy
`MORPH_CENTER + LayeredAssembly.target`, so this first Rubik-like cube is the final
assembly translated to the launch area, not a separate approximate layout. Each
cubelet, its local orientation, the camera offset, the target offset, and therefore
its screen-space projection match the later completed assembly.

At `6.00s` the 26 rigid cubelets disconnect and spread along bowed trajectories to
the original time-zero `LayeredAssembly` starts. Their travel remains deliberately
long, but the duration is expressed through the path and camera rather than rubbery
geometry; every local scale stays exactly cubic. At `8.00s` the camera begins its
last `1.30s` move to the untouched default assembly-arrival shot while the central
nucleus appears. At `9.30s` ownership swaps invisibly between two instances using
the same positions and structural material. The normal camera story then owns
assembly from its first frame: on portrait the remote cubelets enter from the left;
on desktop the reverse-Z camera projects those same negative-X starts beyond the
right edge. Both viewport tracks converge on their authored lock composition.

The prologue follow rig measures every descendant in camera-right, camera-up, and
depth. It solves the minimum perspective distance for the live vertical FOV, aspect
ratio, composition offset, and each rigid cubelet's bounding extent while the
divided cube travels outward. It deliberately releases ownership at the exact default
arrival pose; it no longer replaces the authored assembly camera. All vectors are
preallocated, and the sequence remains directly seekable with
`?prologue-preview=<seconds>` for deterministic storyboard review.

## Desktop camera story

Wide desktop uses two assembly points and eleven motion points through the same
allocation-free `MobileCameraStory` director as portrait. It does not use continuous
background drift.

The first view is deliberately almost empty: all 26 moving cubelets begin beyond the
right viewport edge, and the solid seed enters from that same right-side line at its
original screen height. The entire desktop assembly root receives the shared offset
`[-34.71, 0, -9.53]`, aligned to the arrival camera's screen-right basis rather than
to world up: the path is a long horizontal drive, never a diagonal reveal. A seventh-
power remainder removes that offset by assembly progress `0.48`: the seed cuts
through the frame edge around `0.13`, is fully visible around `0.16`, crosses more
than 45% of the screen width during its initial burst, and then loses distance in
every equal time interval while the other cubelets catch it. Moving the shared root
preserves every relative trajectory, timing, and collision relationship; portrait
receives no entrance offset.

The camera holds the normal `43deg` FOV and makes one uninterrupted move from
`arrival` to `lock`, adding a restrained leftward drift after the seed's fast
horizontal entrance. The assembly clock is compressed uniformly rather than by
changing one cubelet in isolation, so the arrivals keep their collision-authored
order while reading as a decisive burst instead of a slow parade. The complete
moving-cube bounds stay outside the left copy safe area throughout assembly.

The edge-roll camera move lasts exactly `EDGE_ROLL_DURATION`; the following lift move
lasts exactly `CORNER_LIFT_DURATION`. Consequently camera and object start and land
together at both boundaries. When full spin begins, the reverse-flank offset
`[-5, 5, -5]` resolves into an isometric view: three faces and the first separation
gaps remain readable instead of being flattened against a perpendicular Z shot.

From `orbit` onward, the camera returns toward positive Z along one monotonic arc
instead of making unrelated cuts. The first orbital-disassembly shot is deliberately
about `1.6x` larger than the former overview: extreme cubelets may cross the viewport
edge so the system feels more expansive than the frame. Capture then recovers enough
context for the shell and reactor points to continue the same arc. The camera and
shell both hold still for the post-rotation engraving farewell; the next camera arc
starts together with the clean-plate morph. During the later post-division hold the
camera pulls back into a positive-flank isometry around the unchanged outer plate
shell and inner nucleus grid. The existing handoff then moves directly to camera
`[5.28, 4.42, 9.36]`, target `[0.6, 0, 0]`, arriving at motion time `18.875`.
That single medium-close rig is held through plate release and final idle. There is
no second dolly after the last plate disappears, so the remaining plasma, nucleus,
three retained cubes, and rising strands never pass through a small intermediate
state after the physical choreography has ended.

### Final-idle flourish

The three retained black-hole cubes begin only after the last released plate is gone
and another `0.45s` quiet beat has passed; the camera is already fixed at its final
handoff rig. Their positions are authored in that camera's screen plane, then
transformed back into the tumbling nucleus group's local frame. This
keeps the composition independent of residual group rotation: on desktop one
cube sits at the plume's upper-left shoulder, one below the language switch,
and one above the reactor card. They rotate independently and use restrained
vertical bobbing; the lower cube has the smallest amplitude so it cannot cross
into the card. The trio must remain a separated diagonal constellation in the
open right field, never a cluster around the nucleus or an obstruction over
the hero copy.

Portrait uses its own screen-plane placement, well above the card rather than
around the plasma: `.reactor-card` is a fixed-height strip pinned to the
bottom of the viewport that on short/wide phones covers the plasma and core
entirely, so a desktop-style placement judged relative to the plasma would
often render invisible behind opaque DOM. The trio is visible on every
viewport now; only the placement set differs (`BLACK_HOLE_SCREEN_*_COMPACT`
vs. `_DESKTOP` in `HeroScene.tsx`, selected by `portraitCompact` specifically,
since the offsets are relative to whichever camera is actually live and
compact-landscape still runs the desktop camera track).

## Portrait-mobile camera story

Portrait screens use a deterministic waypoint director from
`src/lib/MobileCameraStory.ts`. It turns the same uninterrupted simulation into a
sequence of authored views: an off-screen swarm entrance and cube lock (ported
from the desktop opening - see below), roll and balance, the three orbital
symmetry classes, ignition, spherical capture, reactor surface, division, and
the final panel handoff. C2 `smootherstep` interpolates the target and
camera radius while the view direction follows the shortest spherical arc; shots
hold between moves and allocate nothing in `useFrame`.

The opening no longer holds on a close, still core before the swarm becomes
visible. Like desktop, it is one continuous `arrival -> lock` move at a
constant aim; the "empty frame, then a fast burst" read comes from
`PORTRAIT_ASSEMBLY_LEAD_START` in `HeroScene.tsx`, which translates the whole
assembly root along the portrait `arrival` camera's own screen-right axis and
decays it out with the same `desktopAssemblyLeadRemaining` curve the desktop
lead-in uses. `lock`'s offset is identical to the following `weight` motion
point, so assembly hands off to motion with no camera jump.

Each shot is chosen for what the object is physically doing at that beat rather than
for keeping the whole object in frame: low, near-ground framing for the edge roll,
a tight shot at the spin axis for the torque impulse, a push into the aperture for
ignition, a close-to-macro push-in on the reactor surface. `outer-orbit` and `shell`
are the only deliberately wide/high shots, so they read as accents against the
closer beats around them rather than blending into a row of similar overview
compositions. Distance swings from roughly `3.2` (the reactor push-in) to `14.5`
(the `outer-orbit` reveal) instead of holding a flat `9–11` range, and consecutive
flanks now turn `56–99deg` as a consequence of genuinely different framing, not as
a goal pursued on its own. The director changes only the view. Object timing,
geometry, physics, and capture math remain shared with desktop.

The last move reaches the original compact camera `0.08s` before signal-plate
selection and then remains exactly still through the waves and UI launch. This is
an invariant: the camera-relative plate choice and captured Bezier route must never
be evaluated against a moving endpoint. Short portrait screens may widen and raise
earlier shots, but must converge to this same handoff frame.

The complete plot, point table, timing clocks, debug links, reduced-motion behavior,
and final-second audit are documented in `docs/mobile-camera-story.md`.

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

The original collision-authored schedule is uniformly time-scaled by `0.78`; the
live schedule therefore lasts about `4.3686s`. Because every delay and duration uses
the same factor, spacetime ordering and path geometry are unchanged. A dense 600 FPS
AABB check still leaves at least `0.006` world units beyond the `0.5` cube side. At
the runtime LUT resolution, the largest
direction change between adjacent path samples fell from about `35.1deg` in the old
piecewise path to about `3.29deg`.

During the last `0.10s` of assembly, a short cold-white synergy pulse appears in
the contact gaps. One 26-instance additive pass reuses the actual rounded cubelet
geometry and traces each surface bevel; adjacent bevels combine into the assembled
cube's face seams. There is no large sharp overlay or illuminated center instance,
so the pulse follows the material's rounded corners without producing an extra cube
inside the structure. The beat reads as energy released inside the closed cube:
an internal point light at the cube center lights the inward-facing bevels through
the gaps and dies out just past the shell, while the still-solid nucleus flares
toward cold white as the physical source of that light, its hot slivers leaking
through the same cracks. The lock pulse keeps its `0.12s`
attack, `0.06s` hold, and `0.46s` release. From 34% of the unchanged edge roll, a
second restrained envelope moves the remaining energy into a world-space band at
the virtual contact plane: upper seams dim, the support edge turns mint-white, and
the band reaches the first seam row and peaks as the next face lands. Its `0.22s`
release begins at 92% of the roll and dies during the first `0.16s` of corner lift.
The internal light and the nucleus flare follow the same two envelopes and share
the contact mint shift, so all three channels rise and clear together.
The shared structural material's
global emissive pulse is suppressed as this contact envelope grows, preventing the
new metallic cubelets from reading as one uniformly glowing box. The overlay is
still one transient instanced mesh and is hidden outside these two envelopes. In
development, `?assembly-glow-preview` freezes the lock peak; values `roll` and
`landing` expose the two new contact states.

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

The structural circuit engraving survives every moving orbit and capture. At
`ORBIT_END = 10.825s` of main-spin time, relative capture, detached scale, group
rotation, and the desktop camera all stop. After a `0.12s` still hold, the engraving
receives one last mint-white surface sweep (`0.22s` attack, `0.12s` hold); engraving
depth, conductor response, and energy emission then fade together over `0.55s` while
the geometry remains frozen. A clean shell holds for another `0.14s`, then the
reactor morph and its matching camera move begin together at `11.975s`. This makes
the material farewell a separate action after rotation, never a texture dissolve
during motion. The change is latched: the later 104 reactor plates and selected
signal plate inherit the clean surface and never reveal the textolite weave,
engraving, or gold conductor pattern again. Their shared shader remains attached
only because its separate cell-lattice branch performs the final dematerialization.

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
Every lattice element shares one color recipe — a mint emissive shoulder around
a thin white-hot filament — so bars, crossings, and the frame read as one
material. Every bar carries that filament inside its antialiased bright core,
a restrained emerald shoulder bleeds around it, and a tight bright pin anchors
every line crossing like a welded knot. Only the
camera-facing sides are rendered; instead of transmitted rear structure, the
cube receives its three-dimensional read from an analytic key-light response —
each face takes one stable brightness from its world normal against the scene
key direction — and from a grazing-angle quieting of the inner grid, which
keeps steep faces from compressing the pattern into a moire carpet while the
silhouette frame survives. The lattice never switches fully off at any angle.
The three internal separators are paired with one thin controlled outer frame.
Boundary suppression is orientation-aware: only bars running parallel to a face
boundary are quieted, since they would double the frame into the heavy
nested-cube silhouette rejected during lookdev, while perpendicular bars keep
their tips and weld visibly into the frame. The grid now uses a deeper teal-emerald
derivative of the reactor's `#18d383`, with a saturated mint filament rather than
the former near-white/cyan peak. The same three-color recipe is reused by flying
plates during dematerialization, so it remains one material language instead of a
separate translucent palette. Expansion waits until `2.45s`, when the last and
closest octahedral class
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

That rising machinery is gated by the shader's `uExpansion`, which only the
much-later reactor blowout pushes to `1.0`. Ignition opens the same machinery
early through its own envelope in `plasmaIgnitionScale.ts`:
`PLASMA_PLUME_START` (0.8s after the warm phase begins) ramps over
`PLASMA_PLUME_DURATION` up to `PLASMA_IGNITION_PLUME_MAX = 0.6`, and the scene
feeds `max(finalExpandProgress, plumeProgress * 0.6)` to the volume as its
expansion. The ignition proxy is already enlarged to `4.8x` radial / `11x`
vertical, so once the warm layer exists the flame actually fills that vessel:
the fireball grows its rising column and the up-left tendril claims the free
upper screen instead of the plasma staying a compact ember beside the cubes.
The cap of `0.6` keeps the later reactor blowout a visibly larger event, and
the `max()` hand-off to `finalExpandProgress` is continuous.

Above the bright body, three height dissolves keep the climb clean. The wide
orange/red mantles carry density but almost no emission once tapered; the
hollow ionization column shows two bright tangent walls around a dark
interior. Left unfaded, all three read as one rigid sooty chimney with hard
rails climbing to the frame edge. The unlit mantle, the shell's occlusion
term, and the hollow blue shell itself therefore dissolve with height, so
only the luminous strand filaments continue past the blue halo — the
"hair-thin lines high above" the streams were designed to become.

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
covering. At `ORBIT_END + 0.18s`, every visible cube is handed to a third instanced
mesh at the exact same position, scale, orientation, color, metalness, and roughness.
The source instance disappears on the same frame, so the mesh swap itself is
invisible.

Over `0.9s`, each replacement cube is compressed into a shield instead of shrinking
as a cube and being visually replaced. Its tangential `0.5 x 0.5` footprint is held
at first while radial thickness drops toward `0.07`; tangential width begins its
slower move to `0.30` only after 16% of the morph. Radial orientation follows from
8%, so the wafer silhouette is established before the cells fan around the core.
Every plate receives the same deterministic spherical tangent/bitangent frame,
rather than only aligning its normal and inheriting an arbitrary in-plane roll.
Neighbouring squares therefore follow the curvature coherently, including the three
plates bordering the upper camera aperture. Metalness rises while roughness falls on
the same morph envelope.

The plates then divide like cells in two generations:

- an `0.08s` punctuation separates morph from each division generation;
- generation one: `26 -> 52` over `1.15s`;
- generation two: `52 -> 104` over `1.30s`;
- final tiles measure `0.27 x 0.27 x 0.022`.

In both generations direction separation starts at 3.5% and the sibling becomes a
visible material seam from 6%. Its area then grows over 78% / 82% of the generation,
so separation retains a small geometric lead without the former long interval in
which one full plate travelled alone. The result reads as a parent shield opening
into two sides and passing the same impulse into the second generation.

After the second generation has formed, the system holds for `1.15s` without
exchanging the spatial roles of its layers. All 104 plates remain on the outer
`1.22` shell established by capture; the nucleus grid remains inside at `1.7x`.
There is no inward plate contraction, global inversion twist, grid expansion, or
counter-rotation. The desktop camera alone backs away into a positive-flank
isometric overview, and the spectator waves start `0.18s` after that quiet hold.
OBB audits cover all 104 plates both at rest and under the conservative maximum
wave deformation; neither state has intersections.

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

After the post-division overview, the completed 104-plate outer shell receives
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
rotation, speed, and up to `0.72s` of stagger. Each instance keeps its geometric
size while one allocation-free attribute advances a seeded surface transition:
solid cells switch off, exposing the nucleus cage's `4 x 4` bars and welded nodes;
those lattice cells then extinguish in their own order with a short ion-blue edge
beat. The instance collapses only after the visible lattice is gone. Leaving the
viewport, entering dense fog, passing the camera, and the `4.4s` maximum flight
remain earlier safety exits. Shadow casting stops at release, preventing invisible
plate boxes from leaving opaque shadows. The selected signal plate is exempt.

The signal plate owns a different route. After the same recoil, it follows one
cubic Bezier path around the left side, rotates until its face is camera-aligned,
and stretches toward the proportions of an interface panel. Near the left viewport
edge, the WebGL mesh fades while a fixed DOM card enters from the same side and
settles downward into the lower-left composition. Its arrival edge flashes warm gold,
then settles into the card's green-resin and pale-gold material family. Existing
technology badges fade out
at this handoff so the new information surface has a clean landing area. The hero
subtitle fades with them. On desktop the card is a true viewport-wide lower layout
strip: it is anchored to all three lower edges, has no side radius, and uses the
same responsive page gutters as the hero text. Compact portrait keeps the identity
block above it: the card's top edge is derived from the same eyebrow/title sizing
formula and lands one rem below the headline. Its three copy slabs become three
native horizontal scroll-snap pages: one page is readable at a time, a narrow piece
of the next remains visible as the swipe cue, and `01 / 03` labels preserve position.
The header and contact row stay fixed inside the card; the card itself never scrolls
vertically. On short portrait phones (`<=680px` high) the card starts immediately
below the persistent brand rail so each page still has enough height. Short
landscape screens (`<=1180 x 800`) keep identity in a 44%
left rail and turn the card into a safe-area-aware right panel. Neither compact
layout may enlarge the document viewport; the technology ribbon is
width-constrained and scrolls inside its own box.

The stable palette is deliberately material: plates and the card share green
textolite/resin, while card copy, borders, contact tiles, and primary circuit routes
use varied pale-gold and antique-gold values. The `18px` microgrid, restrained `72px`
major lines, darker grooves, mint secondary routes, and sparse gold flecks produce
depth without introducing a separate UI palette. The card circuit layer uses many
short fine routes and small varied pads from the same conductor family as the plates.
Gold paths draw with staggered starts, then their grooves and diagonal resin-grid
reveal settle behind them. Red remains only the WebGL signal plate's temporary launch
state; the DOM card signal rail enters in gold and settles to a lighter gold after
three pulses rather than becoming a permanent third accent.

Only once the covering releases does the inner grid expand from `1.7x` toward the
temporary `4.35x` demolition volume. Every face is already divided into a
deterministic `4 x 4` grid; cells disappear at staggered thresholds while their
lines briefly emit a blue breakup glow. The cage is fully gone before the large
final view, so it never competes with the plasma as the main subject.

On desktop the plasma raises its ray-march budget continuously from 38 to 64 samples
during this expansion; the compact/mobile tier stays at 32 samples with a
step-aware minimum shell thickness. The visible warm lower source grows uniformly
to `2.78x` and remains a real sphere; in particular, the white core is never scaled
independently on Y. The blue ionization envelope is a separate field and expands to
`1.95x` the warm source radius. Until 35% of final expansion the ray-entry proxy is
a compact 24x16 sphere matching the early source. The former axis-aligned box was
removed because its nearly transparent hull read as a second dark cube inside the
rotating grid cage. The sphere then switches to a preallocated 24-segment lathed
flame silhouette, scaled to the same `6.05x` radial and `13.5x` vertical reach. That
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

### 9. Electric discharges

The flame carries periodic lightning strikes — the electric signature that
ties the plasma to the reactor's circuit world. Strikes are scheduled by the
deterministic `DischargeScheduler` (story time and hashed event indices,
never frame deltas). Two families coexist at two scales, all with flat
brightness through the strike — there is deliberately no sinusoidal strobing
anywhere in the effect:

- **Surface strikes** dart across the blue ionization shell with the same
  jagged lightning read as the stream family, on a cadence borrowed from
  real storms rather than a metronome: one irregular flash clock fires
  long-tailed intervals (mostly `2.6..6s`, skewed low), quick cluster
  follow-ups (`18%`, `1.0..1.8s` later, like real storm series), and
  occasional lulls (`12%`, `8..12s` of breathing room). One flash is a
  multi-stroke event more often than not — solo `20%`, two strokes `35%`,
  three strokes `45%`: forked branches share the main hub, diverge by a
  rotated endpoint, and light `0.12..0.5s` after the main stroke, so the
  group reads as one organized branched network. **Independent flashes
  never cross**: every main or chain-grounded path is picked from up to
  four hashed candidates with an angular clearance check (mid-arc
  direction beyond the summed half-spans plus `0.3` rad, hub separation
  `0.45` rad) against every active arc and every committed pending
  branch; network members are exempt only versus their own group, and a
  branch whose fork would cross a foreign arc flips to the other side or
  is dropped. A flash with no clear corridor defers `0.5s` and retries
  with re-seeded candidates. They begin while the core is still
  revving up behind the reactor covering (`10.55s` of main-spin time,
  right after rim ignition completes) and continue through the settled
  flame. The lane strikes — a near-instant `0.03s` attack, a `10/s`
  exponential afterglow, and a darting head that accelerates over `0.45s`
  with a `t^1.35` curve. The course carries hashed piecewise-linear
  zigzag kinks (per-event frequency `7..11` per radian, out-of-plane
  amplitude `±0.045..0.08` of the envelope scale, radial `±0.015..0.025`),
  all derived from the event seed in-shader, so no extra uniforms are
  spent; per-cell brightness crackle (`0.0625`-radian cells, `×0.62..1.17`)
  keeps the channel reading as a live discharge rather than a drawn
  ribbon. The lane radius is a
  factor of the blue envelope scale hashed in a `0.94..1.01` band riding
  the shell and its outer crest: dipping lower would drag the arc across
  the warm orange body where the blue impulse loses its read, and higher
  would detach it into empty space. The same code hugs the compact
  pre-expansion shell — visible through the camera aperture — and the
  enlarged outer envelope, the largest visible surface. Each event rolls
  a hashed start point, a hashed endpoint `60..140°` away, and a hashed
  travel direction, so arcs cross the envelope from different sides in
  different directions. The trail is a comet: a fixed-length window
  behind the head (dark at the head, full a quarter radian behind, gone
  beyond one and a half radians), so the visible segment grows gradually
  with the head and never leaves a dying stub at the origin. Far-side arcs
  are attenuated naturally by the flame's own transmittance. (The earlier
  smooth-glide surface treatment moved off the scene onto the DOM title
  oval described below.)
  Each surface strike also carries a **thunderclap illumination** that
  follows the real lightning order: the strike first travels a stretch of
  path in the dark, then a circular gradient flash ignites around the
  midpoint of the visible channel once the head is a third along its
  travel (`0.09s` ramp), and the glow lingers with a slow `3.2/s` afterglow
  while the strike travels on. The gradient is centered halfway along the
  currently traveled channel (so it trails the head), spans about `0.55`
  radians with a squared shoulder, and is confined to the shell by a
  radial band at the lane's radius. The flash field is **injected into
  the blue shell's own emission** (`shellColor`), so its visible shape
  comes from the shell's real density — neighboring blocks of the blue
  shell light from within, volumetric and occluded by the same
  transmittance as the rest of the flame, instead of a projected disc.
  The scheduler passes the illumination envelope in the previously
  unused `uSurfParam.w`; the active window per event extends to
  `travel + 0.8s` so the afterglow is never clipped.
- **Stream strikes** begin at 70% of the final expansion (`19.84s`) and
  propagate up the seven existing stream centerlines in deterministic bursts.
  Each burst contains two or three hits. Starts inside the burst are spaced
  `0.64s` apart, beyond the prior hit's complete `0.54s` visible window, so
  the hits are perceived in order and never concurrently. Burst starts repeat
  every `3.55s ± 0.35s`; a hashed 58% gate decides whether the third hit is
  present. Consecutive hits are assigned to different streams. The lane follows
  the stream's braid but carries
  hashed per-event zigzag kinks (about one kink per `0.08` normalized
  height units), and one short diagonal branch spur lights at a hashed
  height once the head has traveled past it. A bright white-hot head leads;
  behind it, a strengthened glowing channel trails far down the strand
  (spatial decay `0.85`) like a lightning leader's lit path. The head
  travels from height `0.3` to a hashed `3.4..3.9` over `0.3s` with a slight
  `t^1.25` acceleration.
- **Causal chains** bind the two families without metronome alternation: a
  surface arc cues the next complete upper burst early with 55% probability
  after `0.22..0.62s`; it never inserts a fourth or overlapping stream hit.
  A stream strike grounds back as a surface arc
  with 35% probability after `0.25..0.6s`. Chains never chain further, fire
  only when the destination sequence is clear, and are dropped deterministically
  otherwise. During the revving phase (before stream strikes exist), surface
  arcs fire alone.

Each strike attacks effectively instantly (`0.02s` stream, `0.03s`
surface), holds flat
brightness, then releases with a lingering exponential afterglow. Strikes render as a
core tube plus a soft halo, reuse the established ionization palette
(electric blue plus a white-hot head), add emission only — never density —
so the flame silhouette is untouched, and slightly thicken the ridden strand
beneath stream strikes. No new hue, texture, geometry, or draw call is
introduced; all strike math sits behind per-lane uniform branches that are
skipped whenever the lane is idle. The warm point light receives a small
intensity lift and a restrained blue tint driven by the peak envelope across
all lanes. Development previews: `?plasma-preview=arc` freezes a mid-column
stream strike, `?plasma-preview=arcsurf` freezes a surface strike on the
enlarged envelope, `?plasma-preview=arcrev` freezes one on the revving shell
behind the plates, and `?arc-baseline` disables the scheduler for paired A/B
measurements.

## Title air-support oval

The headline and the tech-stack list rest on a horizontal oval of smooth
impulse pulses — a DOM/SVG element in `src/layouts/HomePage.astro`, not a
scene object. It inherits the retired smooth surface-arc envelope (soft
attack, ease-in-out travel, lingering release), which the user asked to keep
alive as a separate graphic figure while the on-sphere arcs returned to the
jagged electric read.

- Nine nested cylindrical tubes (`1200 x 400` viewBox, `pathLength=100`):
  the first draft's concentric arrangement (larger outside, smaller
  inside, never crossing by construction), with each original ellipse
  extruded upward by `52` units into a continuous translucent wall
  (`560 x 132` outermost down to `382 x 68`). Each wall is a closed SVG
  strip between matching half-ellipses at the base and top; it is a real
  surface, not a fence of disconnected vertical lines. A restrained
  horizontal alpha falloff gives the strip cylindrical curvature. The
  far half-surface lives in the svg painted before the text and the near
  half-surface in the mirrored svg painted after it, so the flat copy
  occludes the far wall while the near wall passes in front — the text
  stands inside the tubes. All geometry is generated once at build time
  from a small
  lane table in the layout's frontmatter. Desktop width matches the
  measured headline width (`75vh`, the `11vh` font cap) and is
  left-aligned with the hero gutter. The compressed profile is raised to
  `bottom: 22vh`: its upper wall edge sits directly beneath
  `DEVELOPER`, while its near wall panels wrap the tech-stack
  badges instead of forming a separate portal below the copy. Compact portrait uses
  a different stage composition: the oval is `84vw` wide, horizontally centred,
  and starts at `57.2svh`. Its upper glow meets the settled shell near `62svh`, so
  the figure reads as a low pedestal attached directly beneath the sphere rather
  than as another layer behind the mobile headline.
- The old moving stripe was not kept as a second layer. Each synchronized
  top/base stripe pair was extruded into one `60`-unit wall panel on the
  lane's middle ellipse. It preserves the original `13%` length, lane count,
  duration, negative phase offset, peak, alternating direction, and green
  depth grade (`#0a5236` outside through `#18d383` to `#4be8b3` inside).
  The former halo, white-hot filament, reverse echo, experimental extra
  colours, and nested core are removed. Thus every active mark is the old
  stripe itself transformed into a panel, never a panel plus a line. Forced
  square caps and miter joins give each material face a hard cut. Clip paths
  and strokes are generated once in SVG; this adds no frame-loop work.
- Depth of field follows the actual DOM depth split. The complete far SVG
  (the half behind the copy plane) uses one composited `3.2px` blur with
  reduced saturation/brightness; the near SVG and all typography remain
  unfiltered and sharp. This makes the subtitle and tech-stack read as the
  focal plane against the rear panels without softening the viewer-side
  edge geometry.
- Every panel runs one lap per cycle: it fades in over the first 7%,
  glides with a `cubic-bezier(0.37, 0, 0.63, 1)` ease-in-out, and fades
  out through the last quarter. Per-lane durations (`5.7..9.1s`), negative
  delays, peak opacities (`0.62..1.0`), and alternating directions are
  fixed constants — pure CSS, no JavaScript, no per-frame cost — so
  segments of the oval keep appearing and disappearing in places and the
  figure stays loosely filled.
- The oval is hidden until the first orbit title wave
  (`data-orbit-title-wave='outer-approach'`) reaches the headline:
  `HeroScene` sets the persistent `data-oval-on` body attribute at that
  one beat — the energy wave that first paints the title also powers its
  support. The entrance is a compact depth sequence, not one global fade:
  each continuous wall grows upward from its base, outside-in (`55ms`
  lane offsets); its moving panels follow `160ms` later; the near halves
  start `280ms` after the far halves so the final action is the front panel
  wrapping the tech stack. With the final near-wall delay included, the
  complete depth sequence settles in about `1.7s`, leaving the rest of its
  short act fully active instead of spending it on a long dissolve.
- `HeroScene` raises `data-oval-leaving` exactly `1.25s` before
  `HERO_CARD_REVEAL`. CSS reverses both orders — near before far and inner
  before outer — while collapsing the wall groups back toward their base;
  only then does the shared parent opacity finish the release. The existing
  `reactor-card-visible` selector is retained as a fallback terminal state.
  This lifecycle costs two one-shot body-attribute writes and keeps all
  per-lane timing in build-generated CSS variables; no work or allocation
  was added to the frame hot path. Reduced-motion mode skips the staged
  transitions and leaves restrained static wall panels.

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
  The cube material keeps `MeshStandardMaterial` lighting but now extends it through
  the shared analytic surface hook. Every planar part of the six rounded-box faces
  carries a quiet same-color circuit engraving from the first assembly frame. The
  channels alter diffuse response, roughness, and the derivative-built surface
  normal; they add no early gold or second material. The existing main/orbit/reactor
  mesh handoffs remain.
- The reactor plates extend `MeshStandardMaterial` once through `onBeforeCompile`.
  Their UV-space surface is a modern analytic reactor circuit: a subtle `28..36`
  alternating glass-fibre weave under four independently distributed trace
  corridors. Three corridors are consistently spaced differential-style pairs and
  one is a restrained triple; horizontal/vertical runs meet through 45-degree
  segments, with sparse octagonal vias, edge terminals, and two short registration
  rails instead of a closed frame. Instance seeds vary corridor placement, pair
  gaps, trace width, weave density, axis swap, and mirrors without changing the
  balanced zoning. A diagonal shell wave reveals each plate at a different time;
  within a plate the monochrome cuts become textolite and gold from the closest
  corridor endpoint. The reveal overlaps morph and both divisions instead of adding
  a new choreography pause. Energy still inherits each instance color during the
  blue shutdown wave and loses most of its current as the covering releases. One
  dynamic instanced scalar then drives the solid-cell-to-lattice-to-empty transition
  inside that same shader; no new geometry, draw call, texture, per-frame allocation,
  or per-instance material is used.
- Cubelets use a one-segment rounded box whose duplicate vertices are merged from
  324 to 92. The 104 covering and standalone signal plate retain the original
  lightweight unit box. The standalone plate shares the same circuit shader so its
  conductors follow the established emerald-to-red signal transition.
- Interface plate: one standalone unit-box mesh and one short-range red point light;
  both remain hidden until the selected reactor instance hands off.
- Nucleus: one normal mesh.
- Assembly pulse: one 26-instance overlay sharing the rounded cubelet geometry,
  invisible outside the lock/contact envelopes and therefore adding no persistent
  draw call. Its shader derives light from each real bevel and focuses the roll tail
  against the virtual support plane; there is no sharp enclosing box, illuminated
  center instance, or added light.
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
- The plasma starts on a compact spherical ray-entry proxy and expands onto a
  silhouette-shaped proxy rather than rasterizing an axis-aligned or viewport-sized
  box. Each ray-march step first performs a cheap sphere/plume
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

1. The shell enters reactor morph only `0.18s` after capture. Thickness compresses
   first while the tangential footprint remains full; width and radial orientation
   follow after the plate silhouette is readable. Aperture steering is still
   delayed until 52% of `REACTOR_MORPH_DURATION`.
2. Both divisions expose the sibling as a small seam almost immediately, then grow
   it behind the shared separation envelope. `0.08s` phase punctuation and longer
   division envelopes preserve the total transform end time while removing the old
   stop/restart rhythm and one-sided budding gesture.
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
