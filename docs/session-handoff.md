# Session handoff

Updated: 2026-07-27

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

## 2026-07-27 desktop camera story shipped + prologue cold-open shipped

Supersedes the "Desktop camera story — experimental dev preview, rejected" section
below: the desktop story is back on by default and the prologue plays before it.

- **Desktop camera race — closed.** The user-reported "camera sits wrong every
  other reload" was reproduced as the pre-tuning scatter captures
  (`/tmp/scatter-*.png`, cubes crossing the text column). After the
  `desktopCameraPoints.ts` tuning, four CDP-driven reloads at `1440x900` produced
  the identical authored track and the exact designed final frame
  (`pos [4.8, 3.4, 7.2]`, `target [1.2, 0,0]`, shot `handoff`) - no mode race
  remains at desktop sizes. Residual nondeterminism is only wall-clock boot
  pacing (±0.5-1s of mid-move phase), invisible once the track settles.
  Viewports that fall out of the scripted modes (`resolveSceneViewport`:
  landscape ≤1180x800, portrait >720 non-compact) keep the static fallback rig
  with the old wide framing by design.
- **Prologue (phase 0) — shipped default-on.** `PrologueSequence` plays before
  `LayeredAssembly` in every viewport that has a scripted camera story
  (`portraitCompact || desktopCameraViewport`), with `?no-prologue` as the escape
  hatch, reduced-motion excluded, and all lookdev `*-preview`/`viewport-lab`
  params opting out automatically. Static-fallback viewports get no prologue:
  nothing would own the camera after it there (frozen chase pose regression,
  caught and gated before shipping).
- **Text-column overlap fixed.** The chase cam now aims left of its subject via
  an analytic `cross(followDirection, up)` screen-right shift
  (`screenRight` constructor arg, `2.0` desktop / `1.0` portrait compact), so the
  cast cube lands and explodes in the right third of the frame. Verified live at
  `1440x900` and `390x844`: headline and subtitle stay clear for the whole
  sequence. Desktop value pushed the hero cube out of the narrow mobile FOV,
  hence the split value.
- **Hard cut replaced with a blend.** The first `PROLOGUE_CAMERA_BLEND` (0.6s) of
  assembly time smootherstep-lerps the camera from the captured chase-cam end
  pose to the live story sample (position and target), inside
  `applyCameraStory`. The explode flash covers the swing start; mid-blend the
  swarm streaks across the headline for ~0.5s, which reads as explosion debris
  and was accepted. Capture refs reset when the sequence instance is rebuilt
  (viewport-class change mid-prologue).
- **Verification rig** (works where the agent's one-shot headless screenshots
  hang): warm headless Brave at `127.0.0.1:9223` driven over CDP by plain
  node-22 scripts with the built-in WebSocket - `/tmp/camera-race-check.mjs`
  (N reloads + camera state + settle frame) and `/tmp/prologue-verify.mjs`
  (timed frames + page exceptions; size/prefix args). The dev server needed a
  restart after HMR served a stale `PrologueSequence` module (known watcher
  gotcha); it now runs detached from the dead hermes supervisor
  (`pnpm exec astro dev --port 4321`, log at `/tmp/astro-dev.log`).
- Build: `pnpm build` and `git diff --check` pass after this set. Everything
  above is **uncommitted**, together with the card-decoration work below.

## Green resin and gold-stone card restoration

Completed on 2026-07-24 and supersedes the light ivory card experiment documented
later in this file:

- The latest OpenCode material discussion and the scene itself agree on one physical
  language: green FR4/solder mask with pale-gold conductors. The lower card is again a
  layered deep-green resin surface; Old Standard TT copy, Ponomar ornament, rules,
  circuit routes, pads, and controls now read as varied warm-gold pieces sitting on
  that green field. The successful manuscript typography, independent paragraph
  fitting, mobile pager, and contact geometry were retained.
- The heading facets were lifted into a brighter gold range so the title does not
  merge with the background circuit paths. Gold contact tiles use forest-green icons
  and type; dark grooves, mint secondary traces, resin depth, sparse gold flecks, and
  non-uniform highlights keep the result material rather than flat yellow-on-green UI.
- `?viewport-lab=grid&plasma-preview=card` no longer depends on an r3f frame to reveal
  the final DOM card. An early document flag, SSR-safe final-state CSS, and a measured
  RU/EN font-size fallback let all six extension iframes render the same finished card
  even when Vivaldi suspends WebGL or React. Hydrated pages still use the exact
  `ResizeObserver` binary-search fit and normal visits keep the authored reveal.
- Two competing development processes were consolidated. One fresh Astro background
  server now owns `http://localhost:4321/`; the old stale `4321` process and temporary
  `4322` background process are gone. Viewport Lab is pointed at the new `4321` URL.

Visual validation covered RU `390 x 844`, EN `390 x 844`, desktop `1440 x 900`, short
portrait, and short landscape. At `390 x 844`, every pager leaf still reports equal
scroll/client height, the first RU leaf fits at `23.899px`, the next-page edge remains
visible, and the action row ends at `832px`. The six-frame Viewport Lab phone grid
(`390`, `375`, `414`, `393`, `360`, and `384` CSS pixels wide) now shows the final card
in every frame. `pnpm build` passes; the only warning remains the existing large
Three.js chunk. Current captures are `/tmp/chrome-card-final-green-gold-390x844.png`,
`/tmp/chrome-card-final-green-gold-1440x900.png`, and
`/tmp/vivaldi-typography-grid-late.png`.

## Public source release

Published on 2026-07-24 at
https://github.com/vixkosla/sonicxboy-portfolio as a public MIT repository:

- The card's formerly duplicated Telegram icon is now a localized GitHub source
  link; the large Telegram CTA remains the contact action, so mobile row geometry
  does not change.
- `README.md`, `docs/recreate.md`, `public/source-kit.json`, and the expanded
  `public/llms.txt` provide human and machine-readable reconstruction context.
- `.vscode/mcp.json` starts the pinned official Filesystem MCP server with only the
  cloned workspace allowed. `AGENTS.md` remains the coding-agent implementation map.
- A `SoftwareSourceCode` JSON-LD node, repository meta tag, and alternate JSON link
  connect the live site to the repository and `/source-kit.json`.
- The public package includes an MIT license, current preview, and reproducible build
  commands. The working tree and full pre-publication Git history were scanned for
  common credential/private-key patterns before push; none were found.
- Astro was updated to `7.1.3`, SVGO resolves to `4.0.2`, and the workspace override
  pins PostCSS to `8.5.22`; Node is constrained to `>=22.12 <23` so Vercel cannot
  silently move this build onto a future major. `pnpm audit --prod --audit-level high`
  reports no known vulnerabilities, and `pnpm build` passes with only the existing
  chunk-size warning.

## Portrait-mobile camera story

Completed on 2026-07-24 without changing scene-object choreography:

- `src/lib/MobileCameraStory.ts` now owns a deterministic two-clock camera track:
  four assembly views and eleven motion views lead from the nucleus through swarm,
  cube, orbit, ignition, capture, reactor, division, and UI handoff. Every destination
  has an authored target, offset, arrival time, move window, Russian chapter title,
  and story line.
- Portrait mobile no longer mounts `OrbitControls`; C2 `smootherstep` drives the
  target and radius while the view direction follows a spherical arc around the
  subject. The authored flanks alternate through `41–57deg` turns, with shorter move
  windows and one same-side reactor push as a breathing beat. Shots still hold between
  moves and allocate nothing per frame. Dynamic fog compensation keeps wide shots
  from darkening. Desktop and landscape retain their existing static framing and
  decorative drag.
- Screens up to `680px` high use a wider, raised intermediate-shot tier so action
  remains between the persistent title and subtitle. The final `handoff` point
  deliberately ignores that tier and returns to the exact previous compact camera.
  Reduced-motion users keep a static portrait camera.
- Development query `?camera-story=<point>` freezes any named point; exact transition
  samples use `?camera-story=assembly:<0..1>` or `?camera-story=motion:<seconds>`.
  The active destination is also exposed as `body[data-camera-shot]`, and the track
  is available as `window.__mobileCameraStory` in development.

The sharper orbit pass was visually validated at every one of the 15 named points
and all 13 move midpoints in headed GPU Brave at real `390 x 844` and short
`320 x 568` viewports. Active geometry stays in the available band without touching
the headline, subtitle, or pedestal; Canvas/document dimensions remain identical to
the viewport and neither runtime nor console errors appeared. A separate final-second
audit sampled motion times `15.635`, `16.025`, `16.414`, `16.415`, `16.495`, `16.915`,
and `17.415`: the camera reaches its exact endpoint at `16.415` and remains identical
in every later sample. Signal-plate selection begins `0.08s` after that endpoint.

The full plot and all direct preview links are in
`docs/mobile-camera-story.md`.

## Desktop camera story — experimental dev preview, rejected as the default

Built across 2026-07-25/26 on top of the portrait-mobile work above, still
entirely uncommitted (see `git status`). `MobileCameraStory` was generalized
to accept custom `assemblyPoints`/`motionPoints` (constructor option, default
falls back to the original portrait-mobile track, which is byte-for-byte
unchanged). `src/lib/desktopCameraPoints.ts` is a new file holding desktop's
own 12-point shot list (`DESKTOP_ASSEMBLY_POINTS` x2, `DESKTOP_MOTION_POINTS`
x10) on that same engine.

**2026-07-26 live audit:** the default-on integration was rejected after a
clean Vivaldi replay. It replaced the established desktop rig, produced bad
framing in normal playback, and a later default-on chase-camera prologue made
a hard, unblended cut into the `arrival` shot. The normal desktop/landscape
path now uses the last stable static rig plus `OrbitControls` again. The
12-point desktop story remains available only through explicit dev
`?camera-story=...` links; portrait mobile keeps its established scripted
story unchanged. The chase prologue is likewise quarantined behind
`?prologue-preview` until its framing and handoff are redesigned and reviewed.

Three real bugs were found and fixed this session, each the same way: derive
a numeric replay of the *actual* classes (bundle the real `.ts` files with
esbuild's JS API — `require('esbuild').buildSync` pointed at
`node_modules/.pnpm/esbuild@<version>/node_modules/esbuild/lib/main.js` with
`nodePaths: [.../node_modules]` so bare imports like `three` resolve; the
`node_modules/.bin/esbuild` CLI binary was broken/unusable in this repo,
use the JS API instead) rather than reasoning about camera math verbally.
Full detail and the exact numbers are in the auto-memory lesson file this
produced (`camera-choreography-lessons`, referenced from Claude's own
memory system, not this repo) — summarized here for anyone without access
to that:

1. **Unbounded background drift defeated the fixed-azimuth design.** Every
   point in `desktopCameraPoints.ts` keeps `offset.x = 0.5 * offset.z`
   specifically so azimuth never varies (matches the mobile portrait fix
   documented above under "sharper orbit pass"). The engine's own
   continuous "levitating" drift (`CAMERA_DRIFT_SPEED`,
   `CAMERA_DRIFT_SPIN_COUPLING`) accumulates every frame with no reset,
   though — a replay showed azimuth drifting ~29deg by the end of assembly
   alone and past 100deg by the "capture" shot, since every previous check
   had only ever used the `?camera-story=<id>` frozen preview links, and
   the preview path (`sampleClock`) intentionally zeroes drift for
   reproducibility. Fixed with a new `driftEnabled` option on
   `MobileCameraStoryConfig` (default `true`; portrait-mobile passes
   nothing, so it is unaffected), set `false` for the desktop story.
2. **A wide pull-back during assembly exposes more of the scattered incoming
   swarm than a closer shot does**, independent of azimuth. The 26
   cubelets start scattered up to ~13 world units from origin (vs. a ~1-unit
   final cluster) — pulling the camera back widens the frustum's coverage
   of that scatter. A first cinematic draft (per user direction: "play up
   movement with the cubes, then show from the side") opened wide and
   nearly doubled how often cubelets projected into the approximate
   text-column screen region versus the untouched static baseline in an
   800-step/26-cubelet replay. The shipped assembly track instead stays
   within roughly +-20% of home distance (two points: `arrival` holds a
   calm, slightly elevated view; `lock` is one long continuous ease into
   the exact home rig) — replay-verified as statistically comparable to
   baseline exposure.
3. **`camera.lookAt(target)` rotates the view around `target`, not around
   the object — a target that's merely offset from the object's true world
   position is invisible for a static shot but becomes a visible,
   unmotivated swing the instant that shot's azimuth actually rotates.**
   Every `'settled'`-anchored desktop point resolves `target.x` from
   `INITIAL_X` (1.2) rather than the object's true post-roll position
   (`INITIAL_X + rollDistance` ≈ 3.19, i.e. what `settledCenterX(scale)`
   computes — portrait-mobile already gets this right via
   `settledX: settledCenterX(COMPACT_SCENE_SCALE)`, desktop's story does
   not, and was left that way deliberately: see the "so the settled reactor
   sits right of the text column" comment in `desktopCameraPoints.ts`).
   That's a fine, deliberate static composition everywhere except the one
   point that rotates: the `diamond` shot (a deliberate ~60deg side-angle
   swing during the roll→diamond→spin single-rigid-body window, the one
   place azimuth is allowed to vary — see point 2's user-requested "show
   from the side"). With the old approximate target `[0, 0.85, 0]`, a
   continuous replay of the object's *true* position (`group.position`,
   computed the same way the render loop does: rolling per
   `EDGE_ROLL_DURATION`, then fixed at
   `(INITIAL_X + rollDistance, diamondLift, 0)`) through that exact camera
   track showed the object's screen position dipping hard from NDC
   `(0.39, -0.07)` to `(0.02, -0.37)` and back over ~0.6s, while the object
   itself was essentially stationary — a pure pivot-location artifact.
   Fixed by targeting the object's exact resting point instead:
   `[rollDistance, diamondLift, 0]` = `[1.9864, 0.72707, 0]`. Re-verified:
   the dip is gone (max deviation now matches the plain non-rotating roll
   reveal) and the azimuth lock outside the diamond window is still exactly
   `0deg` for the full ~22s sequence.

Also folded into this pass, from direct user review of the assembly/motion
pacing (not a bug, a cut of taste): the assembly track was simplified from
4 bespoke stops to 2 (see point 2), the `orbit` and `shell` wide shots were
pulled in from ~1.7x/1.5x home distance to ~1.35x/1.15x ("too generic/wide,
loses the magic of our cube"), and the `division` motion point was removed
entirely — `shell`(12.335s) → `reactor`(13.185s) → `division`(14.265s) was
landing as three camera cuts in about two seconds ("too many changes, too
frequent"); `reactor` now holds through that beat (the plates visibly
multiplying while the camera stays put) all the way to `handoff`'s own move
window. Motion points: 11 → 10; total points across both tracks: 15 → 12.

**Validation status (as of the prior session):** all of the above was
`pnpm build`-clean and verified only numerically, never a live render — the
browser automation tab's `document.visibilityState` had stayed `"hidden"`,
pausing `requestAnimationFrame` entirely.

**2026-07-26 follow-up — live browser confirmation worked this time** (the
`visibilityState`-hidden issue above did not recur; the real remaining
friction was that each `?camera-story=<id>` preview does a full page
reload, and WebGL context + shader compile can take anywhere from ~2s to
~18s before the canvas paints — screenshotting too early just shows the
static DOM behind an empty canvas, not a real bug. Waiting it out, or
retrying once, resolved every case). Live screenshots at all 12 desktop
points (1440x900) found two real framing bugs neither numeric replay nor
the frozen previews had caught, because both only manifest at the exact
authored instant with the real orbiting/exploding geometry in frame:

- **`ignition`** (mainElapsed = `PLASMA_CORE_START`, orbital departure in
  full swing): the original 4.4-unit push-in put the camera inside the
  orbiting shell — the corner class alone orbits at
  `contactHalfExtent * 3.35` ≈ 3.3 world units from the nucleus at full
  expansion, so pieces loomed past the frame edge and one swung directly
  over the headline. A first retry at ~1.8x distance was still short.
  Pulled back to ~3x the original (same `X = 0.5*Z` ray) — roughly
  `orbit`'s own distance order — to comfortably contain that shell radius
  at a 43deg FOV. This trades away the originally-intended tight "source
  fills the frame" macro for a wider "watch it ignite" shot; whether
  `ignition` and `orbit` now read too similar is an open question for the
  next visual pass.
- **`reactor`** (just after `REACTOR_TRANSFORM_START`, 26→104 plate
  explosion mid-flight): same failure shape, smaller scale — the 3.7-unit
  push-in put the camera inside the still-exploding plate cloud, clipping
  plates at the frame edges and landing one on the RU/EN language switch.
  Pulled back to ~2x the original distance; this one fixed cleanly into a
  contained rosette around the glowing core with no further tension (the
  reactor-plate explosion radius is much smaller than a full orbit shell).

Both fixes live in `src/lib/desktopCameraPoints.ts` with inline comments
explaining the exact numbers; `pnpm build` passes.

**The user also asked to bring the `diamond`-style azimuth swing into the
assembly "beginning" (`arrival`/`lock`)**, explicitly accepting the lesson-1
risk (independently-authored per-cubelet flight paths, not one rigid body)
in order to watch the fixed studio lights/nebula glow paint across the
scene as the view turns. Verified with the same esbuild-replay technique
before shipping: baseline (no rotation) scored 7468/20826 samples inside
the approximate text-column NDC box; a 60deg swing on `arrival` alone
(unwinding smoothly to the unchanged home-ratio `lock` over the same long
assembly ease, so there's no seam into `weight`) scored 6265/20826 —
*better* than the unrotated baseline, not just within tolerance. Spot-
checked live at `?camera-story=assembly:0.05/0.5/0.9` with no broken-looking
frames. This is now the *third* deliberate azimuth exception in the file
(`arrival`, `diamond`) — both are exceptions to the lesson-1 default, not a
retraction of it; any further widening should re-run the same replay
rather than eyeballing it.

Useful spot-checks that don't need live playback: `?camera-story=<id>` for
any named point (`arrival`, `lock`, `weight`, `roll`, `diamond`, `spin`,
`orbit`, `ignition`, `capture`, `shell`, `reactor`, `handoff`) freezes that
exact frame — give it several seconds after navigation before judging a
blank canvas to be a real bug, per the note above.

All of the experimental point data remains uncommitted and must not be
promoted back to the normal desktop path without a complete live playback and
user review. **Still open if the experiment is revisited:** `arrival` shows
cubelets occasionally crossing the "WEBGL" headline (present in the
unrotated baseline too), and `orbit` reads as a fairly chaotic scatter rather
than a clear "three symmetries opening up" — flagged, not yet addressed.

## Discharge backlight — verified, art-directed idle-only (2026-07-27)

The uncommitted `src/lib/DischargeBacklight.ts` (soft additive halo billboard,
`#b8f6ff`, halo² + wide shoulder, `toneMapped: false`) is real and works: each
frame the strongest surface arc (`max illum` in `discharge.surfaces`) places one
camera-facing plane at its illumination midpoint projected onto the camera
plane, offset `0.4 x shellRadius` behind the plasma; opacity `illum x 0.68`.
No `useFrame` allocations; material/mesh created once. The same uncommitted diff
**removed** the previous `plasmaLight` spark response (`discharge.peak * 2.4` +
`ARC_LIGHT_TINT #8fb4ff`), and the billboard is gated to
`mainElapsed >= IDLE_CORE_FLOURISH_START` (~24.3s). **User decision 2026-07-27:
keep it idle-only** — the scatter/card beats intentionally have no spark
lighting; do not restore the point-light response or widen the gate without a
new art direction. `?backlight-preview` freezes a max-illum surface strike and
(now) bypasses the idle gate so it works at any `?plasma-preview` stage.
Verified 2026-07-27 with headed-shell screenshot pairs at 1440x900
(`/tmp/opencode/backlight-on/off.png`, `backlight-arcsurf.png`): the diffused
patch reads clearly at the struck side; zero console errors.

## Hydration mismatch fix (2026-07-27)

Every page load logged a React hydration mismatch from the reactor-card bark
styles: `deterministicNoise` is `Math.sin`-based, which is not bit-stable
between Node SSR and the browser (10th-decimal drift), and `toFixed(2)` emitted
`0.20` where CSSOM normalizes to `0.2`. SSR-visible styles now use
`ssrStableNoise` (integer/imul hash, bit-identical across engines) and round to
plain numbers instead of `toFixed` strings. The scene-only scatter hash is
untouched (client-side, validated trajectories unchanged). Post-fix load shows
zero hydration warnings and zero console errors; `pnpm build` + `pnpm test`
pass.

## Historical: illuminated heading, light inversion and maximum copy fit

Completed on 2026-07-24, then superseded by the green-resin restoration above. This
historical pass extended the Slavic typography work without changing the dome,
sphere, or scene choreography:

- That pass made the whole information surface a light inversion: layered pearl white and
  warm ivory paper carry dark forest-green copy, malachite circuitry, and antique-gold
  rules and contacts. The pager leaves, social controls, Telegram CTA, signal rail,
  circuit traces, pads, shadows, and arrival colour settle all use the same local card
  palette; the former red and blue manuscript accents are gone.
- The Ponomar heading remains a full manuscript composition. Its enlarged initial is
  a white glyph with green edging over a faceted ivory, malachite, and gold plaque;
  the remaining title alternates those three colour families across the letterforms
  and segmented ornamental rule. The original string remains the heading's accessible
  name, so splitting the painted glyphs does not change what assistive technology reads.
- Each paragraph now measures its own bounded leaf and binary-searches for the largest
  font size that fits after the local fonts load and whenever the card resizes. The fit
  is independent per paragraph, driven by `ResizeObserver`, and capped at `30px` on the
  horizontal mobile pager and `20px` on wide desktop. Short landscape and intermediate
  tablet layouts retain their explicit CSS sizes instead of creating a circular
  auto-height measurement.
- At `390 x 844`, the three Russian leaves settle at `24.216px`, `19.575px`, and
  `20.735px`; all remain inside the `434px` page viewport, the snap positions stay
  `0 / 332 / 645`, and the fixed contact row remains visible. `320 x 568` still fits
  its wrapped two-line heading, first page, next-page edge, and all actions. The English
  `390 x 844` card also fills its page without clipping.
- At `1440 x 900`, the three-column card remains only `307px` high and all text plus
  actions fit without horizontal overflow. A fresh isolated Vivaldi restart cleared a
  stale GPU/CDP tile left by repeated viewport switching; one clean Viewport Lab grid
  is open again and all six frames render the enlarged copy.

The inverted palette was visually rechecked at RU `390 x 844`, EN `390 x 844`, and
desktop `1440 x 900`. Vivaldi's six-frame mobile grid has no horizontal document
overflow; every pager leaf reports `scrollHeight == clientHeight`, fonts remain loaded,
and the fixed action row stays visible. Validation: `pnpm build` and
`git diff --check` pass. Current clean captures are
`/home/vixkosla/.cache/portfolio-palette-390x844.png`,
`/home/vixkosla/.cache/portfolio-palette-en-390x844.png`,
`/home/vixkosla/.cache/portfolio-palette-1440x900.png`, and
`/tmp/vivaldi-typography-grid.png`.

## Slavic typography pass

Completed on 2026-07-24; the dome/sphere geometry and choreography were deliberately
left unchanged:

- The reactor card no longer uses Rubik Mono One. `Ponomar` now carries the heading
  and mobile folio numbers; it is the OFL Church-Slavonic display face based on the
  Russian Synodal printing tradition. Long copy uses OFL `Old Standard TT`, which
  keeps the old-book Cyrillic texture without turning three dense paragraphs into a
  decorative cipher. Both fonts are self-hosted through Fontsource `5.3.0` and require
  no request to Google Fonts at runtime.
- Uppercase conversion was removed from the heading and paragraphs so the historical
  Cyrillic forms remain visible. Ligatures are enabled where the font supplies them.
  Desktop body copy was raised to `13.12px` at `1440 x 900`; the card grows by only
  `3.8px` and every column plus the contact row still fits. Short landscape uses a
  slightly larger `11.52px` book face and retains its scrollable right-panel layout.
- Mobile keeps the completed three-page horizontal pager. At `390 x 844`, Ponomar
  renders at `16.96px`, body copy at `12px`, all three pages fit their `437px` content
  area, and the measured snap positions are `0`, `332`, and `645`. The document has
  no horizontal overflow and all contact actions remain visible.
- A clean Vivaldi pass used the isolated Viewport Lab profile. Direct captures passed
  at `390 x 844`, `1440 x 900`, and `1024 x 768`; `document.fonts` confirmed both new
  families loaded in each case. Viewport Lab was then reopened in grid mode and all
  six common mobile frames reached the visible final card. Two stale diagnostic grids
  from earlier sessions were closed first; the personal Vivaldi profile was untouched.
  The English card also passed a `390 x 844` software-WebGL capture with all copy inside
  its first page and the second-page edge visible.

Validation: `pnpm build` and `git diff --check` pass. The only build warning remains
the existing large Three.js chunk. Current audit images are in `/tmp` as
`vivaldi-typography-390x844.png`, `vivaldi-typography-1440x900.png`,
`vivaldi-typography-1024x768.png`, and `vivaldi-typography-grid-late.png`.

## Mobile sphere pedestal and horizontal card pager

Completed on 2026-07-24; this section supersedes the older mobile card notes below:

- Compact portrait now has its own scene composition. The title oval is centred at
  `84vw` and starts at `57.2svh`; in both `390 x 844` and `320 x 568` captures its
  upper glow joins the bottom of the settled sphere, so the feature reads as the
  sphere's low pedestal instead of sitting behind the headline.
- The final reactor copy is no longer one vertical mobile stack. The existing three
  paragraphs are three native horizontal scroll-snap pages, with a visible next-page
  edge and `01 / 03`, `02 / 03`, `03 / 03` labels. Meta/title and all four contact
  actions stay pinned inside the card while only the page rail moves horizontally.
- Short portrait screens (`<=680px` high) start the card below the brand rail. At
  `320 x 568` every Russian page fits its fixed page viewport without internal text
  overflow, the contact row remains visible, and the document does not need vertical
  card scrolling. The existing landscape right-panel composition remains separate.
- The pager is a focusable labelled region and relies on native overflow plus
  `scroll-snap-type: x mandatory`, so touch, trackpad, wheel/keyboard scrolling keep
  browser-native inertia rather than adding a frame-loop controller.

Validation: Chromium/SwiftShader screenshots passed at `390 x 844` and `320 x 568`
for both `?plasma-preview=tiles` and `?plasma-preview=card`. A CDP layout audit measured
three reachable snap positions at each size; all three page `scrollHeight` values fit
inside their `offsetHeight`. `pnpm build` and `git diff --check` pass; only the existing
large Three.js chunk warning remains.

## Viewport Lab / Vivaldi mobile pass

Completed on 2026-07-24:

- The unpacked Viewport Lab source at
  `/home/vixkosla/projects/main/browser-extensions/viewport-lab/extension` is
  connected to an isolated Vivaldi profile at
  `/home/vixkosla/.cache/vivaldi-viewport-lab`. The main personal Vivaldi profile
  was not restarted or modified. Use the desktop entry `Vivaldi — Viewport Lab`
  or `/home/vixkosla/.local/bin/vivaldi-viewport-lab` to reopen the same setup.
- A real Vivaldi grid audit found that the previous card still needed `61px` of
  internal scroll at `360 x 800` and `22px` at `375 x 812`. The new `380px`
  breakpoint keeps all copy, all four actions, and the existing single-column
  composition, while tightening only the card's internal rhythm. The action row
  now ends at `791px` and `803px` respectively, with zero card scroll.
- Vivaldi suspends CSS transitions in some offscreen extension iframes. Frozen
  `viewport-lab=grid` previews now opt into a stable final card frame through an
  early document data attribute; normal visits and normal card animation are
  unchanged.

Validation: Viewport Lab in Vivaldi passed all six common mobile sizes
(`360 x 800`, `375 x 812`, `384 x 832`, `390 x 844`, `393 x 873`, and
`414 x 896`). Every iframe reached a full-size Canvas and visible final card;
all four actions fit, card scroll is zero, and neither horizontal nor document
vertical overflow appears. `pnpm build` and `git diff --check` pass; only the
existing large Three.js chunk warning remains.

## Next session start point

Fable card completion pass on 2026-07-24 (finished):

- The interrupted Devin session `gleaming-gorgonzola` was recovered. Its
  `claude-5-fable-xhigh` work had already introduced Rubik Mono One and the
  three uppercase, justified text slabs, but quota exhaustion stopped it
  after capture generation and before responsive review or final handoff.
- The RU/EN copy and all commercial search terms remain unchanged. Desktop
  keeps three length-weighted columns; the slabs now stretch to one common
  lower edge, use a restrained dark surface over the circuit engraving, and
  render slightly larger without leaving the original compact card range.
- The broken `1100px` state no longer collapses into two columns plus one
  full-width ribbon. Three slabs remain intact above `960px`; below that,
  the intentional tablet composition is two columns with a centered third
  slab, and at `720px` it becomes a single vertical stack.
- Mobile spacing was tightened without deleting text. At `390 x 844`, all
  three paragraphs and every contact action fit inside the first card view.
  At `320 x 568` and short landscape sizes, only the card scrolls and its
  actions remain reachable; the document itself never gains horizontal
  overflow. Thin branded scrollbars replace the default wide track.

Validation: isolated Brave/CDP captures passed for RU at `1600 x 1000`,
`1100 x 900`, `900 x 900`, `768 x 1024`, `390 x 844`, `320 x 568`,
`667 x 375`, and `1024 x 768`, plus EN at `1600 x 1000` and `430 x 932`.
Rubik Mono One was loaded in every run, all actions were reachable, and no
runtime, layout-overflow, or horizontal-scroll errors appeared. `pnpm build`
and `git diff --check` pass; the existing large Three.js chunk warning remains.

Fourth pass on 2026-07-24 (continuous walls + staged oval lifecycle + Canvas audit),
implementation complete; awaiting only the user's visual sign-off in the normal browser:

- The last OpenCode/Kimi exchange was recovered from the local session DB.
  The user's repeated direction was to **extrude the circumference lines
  themselves into walls**. Commit `1be0135` still interpreted that as a
  fence of twelve detached vertical posts per ellipse, so it was not the
  requested result.
- The fence and its live risers are now removed. Each of the nine approved
  nested ellipses is represented by two closed SVG half-surfaces: the strip
  between the base and the same half-ellipse raised `52` units. Together
  they form one continuous translucent cylindrical wall. A soft horizontal
  alpha falloff supplies curvature without reintroducing wireframe posts.
- The established depth split remains exact: far wall halves and rims are
  below the copy; near wall halves and rims are above it. The original
  green lane grade, paired top/base comet timing, ignition beat, layout,
  and card fade are unchanged.
- User follow-up: the active title-colored rims were lifted and the whole
  construction compressed vertically. The viewBox is now `1200 x 400`,
  wall rise `52` (was `80`), and lane radii grade from `132` to `68`
  (previously `209` to `104`). Desktop placement moved from `14vh` to
  `22vh`: the upper wall edge sits under `DEVELOPER`, the far wall stays
  behind the subtitle, and the near panels cross around the tech-stack row.
  Compact placement was raised by `1.2rem` to preserve that same attachment
  after the height compression. Horizontal scale, lane colors, and pulse
  cadence are unchanged.
- The oval now uses its short screen time as one authored mini-scene. On the
  first title wave, far walls unfold from their lower circumference
  outside-in, moving wall panels follow, and the near walls/panels arrive
  last around the tech stack. Entry settles in about `1.7s`; the established
  panel laps are already phase-offset and remain active for the full hold.
  `HeroScene` emits a one-shot `data-oval-leaving` state `1.25s` before the
  card: near/inner panels release first, then far/outer walls fold into their
  base and the parent fade closes the act. The card-visible state remains a
  hard fallback. No objects or arrays are allocated in `useFrame`.
- Final clarification: panels and stripes must not coexist. Each original
  synchronized top/base stripe pair is now replaced one-for-one by a single
  clipped wall panel with the same `13%` length, nine-lane count, original
  green colour, timing, phase, peak, and direction. All separate halo/body/
  hot rim paths, the reverse echo, experimental blue/red/amber palette, and
  the rejected nested core are removed. Ends remain forced square/mitered.
  The entire far SVG behind the copy plane is composited
  through `blur(3.2px) saturate(0.72) brightness(0.76)` while the near wall,
  subtitle, and tech stack stay sharp. Desktop and `390 x 844` captures
  confirm a readable focal plane and crisp viewer-side panel edges.
- The dev server had been started in foreground mode while Astro's status
  file still reported a stale PID. It was replaced with a clean background
  server at `http://localhost:4321/` (manage it with the commands above).
  A fresh Chromium runtime reports one visible full-viewport Canvas at
  `1400 x 1000` and `390 x 844`, opacity `1`, with no runtime errors. An
  old repeatedly-reloaded Chromium process reproduced a default `300 x 150`
  canvas after its WebGL surface went stale; if Brave still shows no scene,
  close/reopen that tab (or Brave) after the server restart rather than
  changing scene code.

Validation: `pnpm build` and `git diff --check` pass. Fresh Brave/CDP
sequences at `1400 x 1000` and `390 x 844` sampled early/mid/settled entry
and early/mid/completed exit: computed lane/rim opacity confirms both depth
orders, screenshots preserve the compressed placement and copy occlusion,
and Canvas remains full-size. The isolated software-WebGL audit only emitted
SwiftShader/readback warnings; the persistent dev log also retains earlier
failed-context messages from stale browser/test WebGL surfaces documented
above. A final isolated Chromium integration pass also sampled the real
`?plasma-preview=waves`, `=scatter`, and `=card` states at `1400 x 900`:
the oval is fully visible in `waves`, fully released before the card state,
and the visible card has `inert` removed with all actions inside the viewport.

Third pass on 2026-07-23 (storm behavior + ring-wall depth illusion),
historical baseline; its wireframe-wall item is superseded by the fourth
pass above:

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
- **Oval v5 — superseded wireframe-cylinder attempt**
  (user's follow-up, "complete the lines into walls"): each of the nine
  approved nested ellipses is now a true tube — a top rim (same ring
  raised `80` units) plus a fence of twelve vertical wall lines sitting
  ON the circumference (six static hairlines carrying the wall, six live
  risers at `10..15s`). Rim pulses on both rings share timing
  (vertically aligned comets). The far/near split covers both rims AND
  the wall lines, so the text stands inside the tubes. Geometry is
  generated once at build time from a lane table in the layout
  frontmatter. viewBox `1200 x 530`. (v4's two-tip-lines draft read as
  floating rings, not walls; v3's identical-ring stack and v2's
  deliberate crossings were both rejected earlier.)
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

### Materials prototype — engraved cube-to-textolite pass awaiting visual approval

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
unit-box geometry. The cubelet material now uses the circuit hook in a monochrome,
all-face engraving mode: it changes base-color shading, roughness, and the analytic
surface normal but introduces no gold before the reactor handoff. A trial procedural
roughness texture was removed: it was barely visible at the scene scale but pushed
the large orbit/104-plate software-WebGL tests across the frame boundary.

After review showed that PBR value changes alone left the plates too plain, the
covering received a dedicated analytic circuit surface. It extends the existing
`MeshStandardMaterial` through `onBeforeCompile`, preserving all current lighting
and shadows while adding:

- a subdued per-instance `28..36`-cell alternating warp/weft texture that reads as
  fine glass-fibre textolite instead of graph paper;
- four independent paired/triple trace corridors with constant lane spacing,
  horizontal/vertical runs, 45-degree transitions, sparse octagonal vias, and
  small edge terminals;
- deterministic layouts from `gl_InstanceID`: seeds vary corridor placement, pair
  gaps, trace width, weave density, axis swap, and mirrors while preserving the
  same deliberate distribution across the whole square;
- a diagonal shell reveal spanning morph and both divisions: a bright gold trace
  develops from the nearest corridor endpoint, followed by the resin weave and etch;
- one slow emissive packet that inherits the current instance color, so it becomes
  blue under the ionization wave and red on the selected signal plate;
- a current-strength envelope that drops through shutdown and scattering.

The surface uses only analytic UV math: no image textures, texture reads, geometry,
draw calls, per-frame allocations, or per-instance materials were added. The same
hook is shared by the 104-instance covering and standalone signal plate; the
selected plate's instance index is copied to the standalone shader so its exact
layout survives the handoff. Random parameters are evaluated in the vertex shader
and sent with `flat` interpolation; this prevents pixel-level seed noise and avoids
rehashing in every fragment. The horizontal, vertical, and 45-degree segments use
specialized square/rotated-square cap math without per-pixel square roots. Cubelets
reuse the same language in an engraving-only configuration, so the handoff changes
material state rather than introducing an unrelated pattern.

Densified 2026-07-20 at the user's art direction (`reactor-circuit-surface-v8`):
per plate the etch now adds two extra microvias, hashed breakout stubs from the
first two vias to the frame, a second hub branch with its own pad, a second
component footprint, corner fiducial pads on roughly half the plates, and a
finer micro grid (`11..16` cells, was `8..12`). The flow pulses run over the
new conductors automatically, and the plates themselves were thinned
(`0.055 -> 0.03`). Software-WebGL parity was re-measured (old vs new shader
within machine noise); this pass awaits the user's visual review.

Reworked 2026-07-24 at the user's art direction
(`reactor-circuit-surface-v9`): the former single-hub layout was removed. Three
spatially separated nodes now own local edge branches and detail groups, while only
two orthogonal trunks connect the groups. This removes the crowded star/empty-corner
read. The same topology is visible from the beginning on every planar cubelet face
as a restrained same-color cut; derivative-based normal perturbation gives the cut
a shallow physical response. During reactor morph the existing reveal turns those
cuts into green textolite and pale gold without a shader swap or choreography change.

Reworked again 2026-07-24 at the user's direction
(`reactor-circuit-surface-v10`): v9 still read as an archival PCB because its closed
frame, square modules, visible grid, and many right-angle branches dominated the
surface. The production layout now uses four independently placed high-speed-style
corridors made from consistently spaced pairs (plus one restrained triple), with
45-degree transitions and much fewer vias. The closed frame became two short corner
registration rails, and the grid became a quiet alternating glass-fibre weave.
Engraving depth and conductor lift were raised slightly (`0.22 -> 0.28` normal
strength, with a stronger signed relief height). A visually correct generic segment
SDF was rejected after profiling; v10 uses a specialized axis/45-degree SDF that
keeps the same shape without repeated fragment `sqrt` work.

Release dematerialization added 2026-07-24
(`reactor-circuit-surface-v11`): ordinary plates no longer remain solid until fog or
the viewport hides them. Each flying instance receives one dynamic scalar (stored in
an `InstancedBufferAttribute`, updated without allocation) that turns its solid
surface into the nucleus cage's `4 x 4` lattice. Solid cells shut off in a seeded
order, the exposed emerald/mint bars and welded nodes linger, then those lattice
cells extinguish with a short ion-blue edge beat before the instance collapses.
The selected red interface plate is intentionally exempt. Reactor shadow casting
ends at release so vanished boxes cannot leave opaque shadows. The nucleus cage and
plate lattice now share a deeper teal-emerald base, saturated mint filament, and
ion-blue breakup accent; the previous near-white/cyan blowout was reduced.

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

The v10 follow-up was checked in Brave 150 at `1400 x 1000` on the actual NVIDIA
GTX 1060 Vulkan/ANGLE renderer. Cubelet, mid-morph, and 104-tile captures produced
no shader compile/runtime errors. A short paired rAF sample held `60 FPS` for both
engraved cubelets and `material-baseline`; a ten-frame sample of the already-heavy
tile preview measured `30.00 FPS` for both the modern circuit and baseline in the
same concurrently loaded desktop session. This establishes paired parity, not an
absolute performance certification. `pnpm build` passes. The screenshots were
inspected at full frame and close crop; this pass still awaits the user's
normal-browser review.

The v11 release pass was captured in isolated Brave 150 at `1400 x 1000` on the
actual NVIDIA GTX 1060 Vulkan/ANGLE renderer for the nucleus-grid and scatter
stages. The scatter frame shows solid plates, exposed `4 x 4` lattices, and
partially extinguished cells together; the grid frame confirms the darker
emerald/mint balance. A short post-capture sample held `59.99 FPS` at scatter and
`29.99 FPS` at the already-heavy tile stage, matching the previous v10 tile sample;
these are smoke samples, not a formal benchmark. No GLSL or runtime errors were
emitted beyond existing Three.js/readback warnings. `pnpm build` and
`git diff --check` pass.

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

Original scope chosen by the user: the lattice cube only — the plasma core, motion,
timings, and the discharge system were untouched. The work lives entirely in
the existing `gridFragmentShader` in `src/lib/FireEffect.ts`; no uniforms,
varyings, geometry, draw calls, textures, or per-frame allocations were
added, and the `4 x 4` density, single thin outer frame, suppressed UV
0/1 doubling, and FrontSide rendering are preserved. The later v11 release pass
rebalanced its color to the same deeper teal-emerald/mint recipe used by flying
plate lattices, reducing the former near-white highlight without changing geometry.
The surface-quality changes are:

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
`ORBIT_END + 0.18s`. The first 26 active instances initially reproduce the old cubes
exactly. Over `0.9s`, depth compresses first while the full tangential footprint is
held; width reduction and radial orientation follow once the shield silhouette is
readable. The shared material moves from the cube's surface response toward a
slightly more metallic reactor finish on the same continuous object.

Replication is hierarchical and deterministic:

- `26 -> 52` over `1.15s`;
- `52 -> 104` over `1.30s`;
- only `0.08s` of punctuation remains between morph and each generation;
- final tile size `0.27 x 0.27 x 0.03` (thinned 2026-07-20 from `0.055` at the
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
- plates keep their geometric size while their solid cells expose a `4 x 4`
  lattice, then the lattice cells extinguish and the instance collapses; scene fog,
  a viewport exit, or passage behind the camera can still conceal one earlier.

The signal plate begins its own release at `17.545s` of main-spin time. It follows a
lower world-space cubic Bezier route toward the lower-left viewport, rotates face-on,
and widens before fading at the left edge. At `18.965s`, a DOM card enters from the
same edge, then settles into the emerald layout palette.
The existing tech badges and hero subtitle fade at that point to prevent overlap.
The card is a viewport-wide bottom strip with responsive hero gutters and a
`220px..292px` responsive minimum height. It has no side/bottom border or radius.
Placeholder Russian copy currently describes interactive WebGL systems.
Its top border, `18px` microgrid with restrained `72px` major divisions, labels,
and solid reactor plates derive from the same `#18d383` reactor color. The nucleus
cage and dematerialized plates use deeper teal/mint spectral derivatives of it.
The former few oversized SVG routes are replaced by short fine traces and smaller
varied pads. Gold draws first with per-route stagger; recessed grooves and the
diagonal resin-grid reveal settle behind it. Red remains only the launch warning;
after three pulses its vertical signal edge settles to emerald over `2.4s`.

The final source expansion overlaps the release. Ordinary plates now expose a
per-instance `4 x 4` lattice while flying and disappear cell-by-cell from that
matrix; trajectory concealment remains only an earlier safety exit. The grid cage
still follows the `4.35x` scale envelope, but only as a transient demolition
volume: its deterministic
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
compresses local thickness while preserving the cube's full tangential footprint;
width and radial orientation follow once the geometry reads as a wafer.
Camera-facing aperture steering waits until 52% of the morph. This preserves the
spherical voxel shell and makes the shield a visible state change of the same
material instead of a small-cube-to-plate asset swap.

### Division clearance — completed

Both division stages now separate before their children become visually large.
Direction/orientation interpolation begins at 3.5%; sibling material appears as a
small seam at 6% and grows over 78% / 82% of the phase. This gives clearance a lead
without the former long one-sided travel. The systemic ordering removes the repeated
compressed cluster without per-instance offsets and keeps tangent-facing lineage
motion.

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

## 2026-07-24 cube-to-plate story refinement

The reactor handoff now reads as one physical state change. During the `0.9s` morph,
local depth compresses from `0.50` to `0.07` before tangential width settles from
`0.50` to `0.30`; radial orientation begins after the compression is visible. This
removes the former intermediate image of 26 small cubes and makes every shield a
credible descendant of its original shell cube.

The two division pauses were reduced from `0.18s` to `0.08s`, while generation
durations increased to `1.15s` and `1.30s`. The resulting
`REACTOR_TRANSFORM_END` is unchanged, so waves, signal selection, scatter, card
handoff, and the mobile camera story keep their established downstream timing.
Sibling material appears from 6% of each generation and grows gradually behind the
separation curve instead of staying absent while a full parent travels alone.

The final desktop Brave storyboard was sampled at 16 points from `10.900s` through
`14.450s`. The mesh handoff remained invisible, plate identity preceded spherical
opening, both generations carried continuous outward momentum, and the final 104
tiles resumed the established shell state. The isolated browser reported no runtime
or shader-console errors. A 0.001-step OBB audit of both generation envelopes found
that each paired footprint cleared before half of its phase, while the new sibling
was still only about 51% / 55% of full scale; no per-frame Three.js allocations or
downstream timing constants were added.
