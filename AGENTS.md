# Portfolio — WebGL Developer

Personal one-page portfolio for a Three.js / WebGL developer. A single full-screen
3D hero animation sits fixed behind a left-aligned text overlay. Page language: `ru`.
The 3D scene is the centerpiece and where nearly all active work happens.

## Stack

- **Astro 7** (`astro.config.mjs`) with the **React** integration — Astro ships the HTML,
  the hero is a React island (`client:load`).
- **React 19** + **Three.js 0.185** via **@react-three/fiber 9**, **@react-three/drei 10**,
  **@react-spring/three 10**.
- **TypeScript strict** (`astro/tsconfigs/strict`). **pnpm**. Node ≥ 22.12.

## Commands

```bash
pnpm dev        # dev server → http://localhost:4321
pnpm build      # production build → ./dist
pnpm preview    # serve the built site locally
```

For agent work prefer running the dev server in the background so it doesn't block:
`astro dev --background`, then `astro dev status` / `astro dev logs` / `astro dev stop`.

Gotcha: the Vite watcher on this machine misses **full-file rewrites** (Write-tool
style replaces) — the dev server keeps serving the old compiled CSS/JS for that
module while picking up small in-place edits fine. If the browser shows stale
styles/markup after a rewrite, restart: `astro dev stop && astro dev --background`.

Gotcha: Astro-scoped selectors in `index.astro` never reach the React-rendered
markup of `HeroScene.tsx` (no `data-astro-cid` there). Any style meant for the
reactor card or other island markup — including universal resets like
`* { box-sizing: border-box }` — must be wrapped in `:global()`.

## File map

```
src/
  pages/index.astro            # page shell: <head>/styles, text overlay, mounts <HeroScene client:load>
  components/HeroScene.tsx      # the r3f Canvas + AssemblyCube; drives everything via useFrame
  lib/LayeredAssembly.ts        # phase 1: cubelets fly in along precomputed bezier trajectories
  lib/SpinSimulation.ts         # phase 3: physics-based spinning-top simulation
  lib/trajectoryData.ts         # precomputed data: per-cubelet curve controls + velocity profiles
public/                         # favicons only
```

## The hero animation (read this before touching the scene)

A Rubik's-cube-style **3×3×3 assembly** (a solid center box + `CUBELET_COUNT = 26`
cubelets) performs a one-shot choreography and settles as a spherical voxel shell.
The creative and mathematical specification is in
`docs/animation-choreography.md`. The latest cross-session state and validation
results are in `docs/session-handoff.md`; read both before changing motion code.

Main phases, driven frame-by-frame in `HeroScene.tsx`'s `useFrame`:

1. **Assemble** (`LayeredAssembly`) — the 26 cubelets fly in from far away along one
   quintic Bezier curve each. Curves are spatially smooth and never perform local
   avoidance maneuvers; collision avoidance between movers lives only in the
   precomputed timing. Each cubelet has an arc-length path LUT and a "spacetime"
   velocity profile (cruise waves + launch impulse + brake). Position is sampled by
   time; `assembly.complete` when all have arrived.
2. **Roll & lift** — the finished cube edge-rolls one step (`EDGE_ROLL_DURATION`) then
   tips up onto a corner into a diamond orientation (`CORNER_LIFT_DURATION`).
3. **Spin** (`SpinSimulation`) — a fixed-step (`MAX_STEP = 1/240`) top simulation: a torque
   drive spins it up, then linear + quadratic + Coulomb drag and a final brake bring it to
   rest. Layered on top: precession + nutation wobble for a "spinning top" feel.
4. **Orbital disassembly** — the 26 shell cubelets detach as three rigid symmetry
   classes: 8 corners remain a cube, 12 edge centers remain a cuboctahedron, and 6
   face centers remain an octahedron around the nucleus. Each class has one shared
   radius and orientation; opposite pairs remain exactly opposite.
5. **Symmetric capture** — the three polyhedra use valid cube-group rotations while
   their radii, orientation, local self-spin, and detached scale converge into the
   spherical voxel shell. There must be no per-cube correction phase.

### Rendering

- **InstancedMesh** for the 26 cubelets (one draw call) + a second 26-instance mesh for
  detached orbiters + one solid center `<mesh>`. Matrices are rewritten every frame via
  `setMatrixAt` + `instanceMatrix.needsUpdate = true`.
- Emerald `#18d383` `meshStandardMaterial` (metalness 0.24, roughness 0.28); dark `#050907`
  background + fog; ambient/hemisphere/directional/two point lights; shadows on.
- `OrbitControls` with pan/zoom disabled and clamped polar angle (decorative drag only).
- Responsive: `compact = width < 720` shrinks `sceneScale` (1.3 → 0.82).

### How to tune it

- **Timing / feel** lives in module-level constants: durations (`*_DURATION`), speeds
  (`ORBIT_SPEED`), physics (`DRIVE_TORQUE`, `*_DRAG`, `FINAL_BRAKE_*`), phase boundaries.
  Adjust these, not the per-frame math.
- **Trajectories** are data in `trajectoryData.ts` (`TRAJECTORY_DATA` = curve control points,
  `SPACETIME_DATA` = `[delay, duration, brakeStart, waveA, phaseA, waveB, phaseB, launchImpulse]`).
- Keep the animation logic (`LayeredAssembly`, `SpinSimulation`) framework-agnostic — plain
  classes with an `update(delta)` step. `HeroScene.tsx` only reads their state and writes matrices.

## Conventions & gotchas

- **Never allocate in `useFrame`.** All THREE objects (`Vector3`, `Quaternion`, `Object3D`,
  `Euler`, `Color`) are preallocated once via `useMemo` / module scope and mutated in place.
  Follow this — per-frame `new Vector3()` in the hot path causes GC churn and frame drops.
- **Prefer `InstancedMesh`** for any repeated geometry; don't spawn N `<mesh>` for N cubes.
- Relative imports use explicit extensions where the code already does (`./trajectoryData.ts`).
  Match the surrounding file.
- Fixed-step integrators (`SpinSimulation`) clamp `delta` to `1/20` so a stutter or tab-switch
  can't explode the simulation — preserve that clamp in any new physics.
- TypeScript is strict — no implicit `any`, keep types tight.

## Docs

Astro: https://docs.astro.build · r3f: https://r3f.docs.pmnd.rs · drei: https://drei.docs.pmnd.rs
