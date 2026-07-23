// Deterministic electric-discharge scheduler for the plasma core.
//
// Two discharge families tie the living flame to the reactor's electric
// world, both with flat brightness through the strike — no strobing:
// - stream strikes: jagged lightning lanes propagating up the seven rising
//   streams in short two-or-three-hit bursts; hits inside a burst are
//   strictly sequential rather than simultaneous;
// - surface strikes: jagged electric arcs darting across the outer blue
//   ionization envelope. Their cadence follows real storm behavior rather
//   than a metronome: irregular long-tailed intervals, quick cluster
//   follow-ups, occasional lulls, and multi-stroke flashes — one flash is
//   often a branched network of two or three forked channels. Independent
//   flashes never cross: each picks its path from hashed candidates with
//   an angular clearance check against every active arc, while strokes of
//   one network are exempt — they ARE the coordinated group.
//
// All timing derives from story time and hashed event indices, never from
// frame deltas, so every run reproduces the same discharge choreography.

export interface StreamDischargeState {
  strand: number
  head: number
  envelope: number
  seed: number
}

export interface SurfaceDischargeState {
  axis: [number, number, number]
  tanA: [number, number, number]
  headAngle: number
  span: number
  radius: number
  seed: number
  envelope: number
  /**
   * Thunderclap shell illumination: lags the strike like a real lightning
   * flash (it ignites once the head has traveled a third of the path) and
   * outlives it with a slower afterglow while the strike travels on.
   */
  illum: number
  /** Path start point (unit vector) — hub input for clearance checks. */
  from: [number, number, number]
  /** Path midpoint direction (unit vector) — clearance input. */
  mid: [number, number, number]
  /** Strokes of one multi-stroke flash share this group id. */
  groupId: number
}

interface SurfacePath {
  from: [number, number, number]
  to: [number, number, number]
  mid: [number, number, number]
  span: number
  radius: number
  seed: number
}

const STRIKE_ATTACK = 0.02
const STRIKE_RELEASE_DECAY = 15
// Surface arcs strike like the streams: near-instant attack, a short live
// afterglow, and a darting head — the electric read the user asked to
// restore on the shell (the smooth glide now lives in the DOM title oval).
const SURFACE_ATTACK = 0.03
const SURFACE_RELEASE_DECAY = 10
// The thunderclap glow on the shell follows the real lightning order: the
// strike first travels a stretch of path in the dark, the flash around the
// channel's midpoint ignites by mid-travel, and the glow lingers after the
// strike itself has ended.
const SURFACE_ILLUM_LEAD = 0.33
const SURFACE_ILLUM_ATTACK = 0.09
const SURFACE_ILLUM_DECAY = 3.2
const STREAM_TRAVEL_DURATION = 0.3
const SURFACE_TRAVEL_DURATION = 0.45
const STREAM_ACTIVE_WINDOW = STREAM_TRAVEL_DURATION + 0.24
const SURFACE_ACTIVE_WINDOW = SURFACE_TRAVEL_DURATION + 0.8

const STREAM_COUNT = 7
const STREAM_HEAD_START = 0.3
const STRIKE_TRAVEL_EXPONENT = 1.25

export const STREAM_LANE_COUNT = 3
export const SURFACE_LANE_COUNT = 3
// The three uniform slots form one burst rather than three autonomous clocks.
// Adjacent hits are separated beyond the complete visible window, then the
// burst rests before the next two-or-three-hit group begins.
const STREAM_BURST_STAGGER = STREAM_ACTIVE_WINDOW + 0.1
const STREAM_BURST_PERIOD = 3.55
const STREAM_BURST_JITTER = 0.35
const STREAM_THIRD_HIT_CHANCE = 0.58

// Surface cadence borrows from real storms: flashes cluster (a quick
// follow-up 1.0..1.8s later), breathe (an 8..12s lull now and then), and
// otherwise arrive on irregular long-tailed 2.6..6s intervals. One flash
// is a multi-stroke event more often than not: solo 20%, one forked
// branch 35%, two branches 45% — the branched network the user asked for.
const FLASH_CLUSTER_CHANCE = 0.18
const FLASH_LULL_CHANCE = 0.12
const FLASH_SOLO_CHANCE = 0.2
const FLASH_TWO_BRANCH_CHANCE = 0.5625
// Independent flashes never cross: a candidate path must keep its mid-arc
// direction this far (in radians, beyond the two half-spans) from every
// active arc, and its hub this far from every active hub. Up to four
// hashed candidates are tried before the flash is deferred half a second.
const FLASH_CLEARANCE_MARGIN = 0.3
const FLASH_HUB_CLEARANCE = 0.45
const FLASH_CANDIDATES = 4
const FLASH_RETRY_DELAY = 0.5
const FLASH_PENDING_COUNT = 6

// Cross-family causal chains: a surface arc may cue the next stream burst
// early, while a stream strike may ground back as a surface arc. Chains never
// chain further, so bursts stay readable.
const SURFACE_TO_STREAM_CHANCE = 0.55
const STREAM_TO_SURFACE_CHANCE = 0.35
const CHAIN_SLOT_COUNT = 6

function hash(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

function normalize3(v: [number, number, number]) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  v[0] /= length
  v[1] /= length
  v[2] /= length
  return v
}

function cross3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function angleBetween(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
) {
  const dot = Math.min(
    1,
    Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
  )
  return Math.acos(dot)
}

function strikeEnvelope(elapsed: number, travelDuration: number) {
  const attack = clamp01(elapsed / STRIKE_ATTACK)
  const release = Math.exp(
    -Math.max(elapsed - travelDuration, 0) * STRIKE_RELEASE_DECAY,
  )
  return attack * release
}

function surfaceEnvelope(elapsed: number) {
  const attack = clamp01(elapsed / SURFACE_ATTACK)
  const release = Math.exp(
    -Math.max(elapsed - SURFACE_TRAVEL_DURATION, 0) * SURFACE_RELEASE_DECAY,
  )
  return attack * release
}

// The head darts like a stream strike: slow ignition, then an accelerating
// run along the arc — no ease-in-out gliding.
function surfaceTravelEase(progress: number) {
  return clamp01(progress) ** 1.35
}

export class DischargeScheduler {
  readonly streams: StreamDischargeState[] = []
  readonly surfaces: SurfaceDischargeState[] = []
  /** Peak envelope across all lanes; drives the scene light response. */
  peak = 0
  enabled = true
  autonomousStart = Number.POSITIVE_INFINITY
  /** Surface arcs begin earlier, while the core is still revving up. */
  surfaceStart = Number.POSITIVE_INFINITY
  previewStream: StreamDischargeState | null = null
  previewSurface: SurfaceDischargeState | null = null
  /** Extra frozen strokes for the network preview (slots 1..n). */
  previewSurfacesExtra: SurfaceDischargeState[] = []

  private readonly streamLanes: {
    next: number
    index: number
    start: number
    endHeight: number
  }[] = []
  private readonly surfaceLanes: {
    start: number
  }[] = []
  private readonly surfaceFlash = {
    next: Number.NaN,
    index: 0,
    attempt: 0,
  }
  private readonly pendingStrokes: {
    time: number
    seed: number
    groupId: number
    from: [number, number, number]
    to: [number, number, number]
    radius: number
  }[] = []
  private readonly pendingChains: {
    time: number
    surface: boolean
    seed: number
  }[] = []
  private lastStreamStrand = -1

  constructor() {
    for (let lane = 0; lane < STREAM_LANE_COUNT; lane += 1) {
      this.streams.push({ strand: 0, head: 0, envelope: 0, seed: 0 })
      this.streamLanes.push({
        next: Number.NaN,
        index: 0,
        start: Number.NaN,
        endHeight: 3.6,
      })
    }
    for (let lane = 0; lane < SURFACE_LANE_COUNT; lane += 1) {
      this.surfaces.push({
        axis: [0, 1, 0],
        tanA: [1, 0, 0],
        headAngle: 0,
        span: 1.6,
        radius: 1.7,
        seed: 0,
        envelope: 0,
        illum: 0,
        from: [1, 0, 0],
        mid: [1, 0, 0],
        groupId: -1,
      })
      this.surfaceLanes.push({ start: Number.NaN })
    }
    for (let slot = 0; slot < CHAIN_SLOT_COUNT; slot += 1) {
      this.pendingChains.push({ time: Number.NaN, surface: false, seed: 0 })
    }
    for (let slot = 0; slot < FLASH_PENDING_COUNT; slot += 1) {
      this.pendingStrokes.push({
        time: Number.NaN,
        seed: 0,
        groupId: -1,
        from: [1, 0, 0],
        to: [0, 1, 0],
        radius: 0.97,
      })
    }
  }

  update(now: number) {
    this.peak = 0
    if (!this.enabled) {
      for (const stream of this.streams) stream.envelope = 0
      for (const surface of this.surfaces) {
        surface.envelope = 0
        surface.illum = 0
      }
      return
    }
    if (this.previewStream) Object.assign(this.streams[0], this.previewStream)
    if (this.previewSurface) {
      Object.assign(this.surfaces[0], this.previewSurface)
      for (let index = 0; index < this.previewSurfacesExtra.length; index += 1) {
        const slot = this.surfaces[index + 1]
        const extra = this.previewSurfacesExtra[index]
        if (slot && extra) Object.assign(slot, extra)
      }
    }
    if (this.previewStream || this.previewSurface) {
      this.peak = 1
      return
    }

    // Seed the natural burst clock before processing causal responses so a
    // response cannot occupy the same window as the first scheduled hit.
    for (let lane = 0; lane < this.streamLanes.length; lane += 1) {
      const state = this.streamLanes[lane]
      if (Number.isNaN(state.next)) {
        state.next = this.autonomousStart + lane * STREAM_BURST_STAGGER
      }
    }
    if (Number.isNaN(this.surfaceFlash.next)) {
      this.surfaceFlash.next = this.surfaceStart + 0.4
    }

    this.processChains(now)
    this.processPendingStrokes(now)

    if (now >= this.surfaceFlash.next && now >= this.surfaceStart) {
      this.fireFlashGroup(this.surfaceFlash.next)
    }

    for (let lane = 0; lane < this.streamLanes.length; lane += 1) {
      const state = this.streamLanes[lane]
      const output = this.streams[lane]
      if (now >= state.next) {
        const eventIndex = state.index * STREAM_LANE_COUNT + lane
        const enabled =
          lane < 2 || hash(state.index, 101) < STREAM_THIRD_HIT_CHANCE
        if (enabled) {
          this.fireStream(lane, state.next, eventIndex)
          // A stream strike may ground back as a surface arc shortly after.
          if (hash(eventIndex, 71) < STREAM_TO_SURFACE_CHANCE) {
            this.pushChain(
              state.next + 0.25 + hash(eventIndex, 73) * 0.35,
              true,
              eventIndex,
            )
          }
        }
        state.next +=
          STREAM_BURST_PERIOD +
          (hash(state.index, 5) * 2 - 1) * STREAM_BURST_JITTER
        state.index += 1
      }
      const elapsed = now - state.start
      if (
        Number.isNaN(state.start) ||
        elapsed < 0 ||
        elapsed > STREAM_ACTIVE_WINDOW
      ) {
        output.envelope = 0
      } else {
        output.envelope = strikeEnvelope(elapsed, STREAM_TRAVEL_DURATION)
        const travel = clamp01(elapsed / STREAM_TRAVEL_DURATION)
        output.head =
          STREAM_HEAD_START +
          (state.endHeight - STREAM_HEAD_START) *
            travel ** STRIKE_TRAVEL_EXPONENT
      }
      this.peak = Math.max(this.peak, output.envelope)
    }

    for (let lane = 0; lane < this.surfaceLanes.length; lane += 1) {
      const state = this.surfaceLanes[lane]
      const output = this.surfaces[lane]
      const elapsed = now - state.start
      if (
        Number.isNaN(state.start) ||
        elapsed < 0 ||
        elapsed > SURFACE_ACTIVE_WINDOW
      ) {
        output.envelope = 0
        output.illum = 0
      } else {
        output.envelope = surfaceEnvelope(elapsed)
        output.headAngle =
          output.span * surfaceTravelEase(elapsed / SURFACE_TRAVEL_DURATION)
        output.illum =
          clamp01(
            (elapsed - SURFACE_TRAVEL_DURATION * SURFACE_ILLUM_LEAD) /
              SURFACE_ILLUM_ATTACK,
          ) *
          Math.exp(
            -Math.max(elapsed - SURFACE_TRAVEL_DURATION, 0) *
              SURFACE_ILLUM_DECAY,
          )
      }
      this.peak = Math.max(this.peak, output.envelope)
    }
  }

  // One irregular storm clock drives every surface flash. Each flash picks
  // a clearance-checked main path, fires its forked branches as a
  // coordinated network, then draws the next interval from the long-tailed
  // storm distribution (quick cluster follow-up, common mid range, rare
  // lull).
  private fireFlashGroup(time: number) {
    const index = this.surfaceFlash.index
    const path = this.pickClearPath(index, time)
    if (!path) {
      // No clear corridor right now: defer deterministically and retry
      // with re-seeded candidates once the active arcs have decayed.
      this.surfaceFlash.attempt += 1
      this.surfaceFlash.next = time + FLASH_RETRY_DELAY
      return
    }
    this.surfaceFlash.attempt = 0
    const slot = this.freeSurfaceSlot(time)
    if (slot >= 0) {
      this.applySurfacePath(slot, path, time, index)
      // A surface arc may cue the next complete upper burst early; only
      // the main stroke carries the chain, branches never chain further.
      if (hash(index, 79) < SURFACE_TO_STREAM_CHANCE) {
        this.pushChain(time + 0.22 + hash(index, 83) * 0.4, false, index)
      }
      const branches =
        hash(index, 61) < FLASH_SOLO_CHANCE
          ? 0
          : hash(index, 63) < FLASH_TWO_BRANCH_CHANCE
            ? 2
            : 1
      for (let branch = 1; branch <= branches; branch += 1) {
        this.queueBranchStroke(time, index, branch, path)
      }
    }
    const roll = hash(index, 5)
    let interval: number
    if (roll < FLASH_CLUSTER_CHANCE) {
      interval = 1.0 + hash(index, 7) * 0.8
    } else if (roll >= 1 - FLASH_LULL_CHANCE) {
      interval = 8.0 + hash(index, 9) * 4.0
    } else {
      interval = 2.6 + Math.pow(hash(index, 7), 1.6) * 3.4
    }
    this.surfaceFlash.next = time + interval
    this.surfaceFlash.index += 1
  }

  // Forked companion strokes of one flash: the branch shares the main
  // hub and diverges by a rotated endpoint, lighting shortly after the
  // main stroke like a real multi-stroke flash. Network membership only
  // exempts a branch from crossing ITS OWN group — it must still keep
  // clearance from every other active or committed arc; if the first
  // fork direction would cross one, the opposite side is tried before
  // the branch is dropped deterministically.
  private queueBranchStroke(
    time: number,
    groupId: number,
    branch: number,
    main: SurfacePath,
  ) {
    const seed = groupId * 7 + branch * 13
    const thetaBase = 0.35 + hash(seed, 3) * 0.35
    for (const sign of [branch % 2 === 1 ? 1 : -1, branch % 2 === 1 ? -1 : 1]) {
      const theta = thetaBase * sign
      const axis = main.from
      const cross = cross3(axis, main.to)
      const dot =
        axis[0] * main.to[0] + axis[1] * main.to[1] + axis[2] * main.to[2]
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const to = normalize3([
        main.to[0] * cos + cross[0] * sin + axis[0] * dot * (1 - cos),
        main.to[1] * cos + cross[1] * sin + axis[1] * dot * (1 - cos),
        main.to[2] * cos + cross[2] * sin + axis[2] * dot * (1 - cos),
      ])
      const candidate: SurfacePath = {
        from: [...main.from],
        to,
        mid: normalize3([
          main.from[0] + to[0],
          main.from[1] + to[1],
          main.from[2] + to[2],
        ]),
        span: angleBetween(main.from, to),
        radius: Math.min(
          1.01,
          Math.max(0.94, main.radius + (hash(seed, 9) - 0.5) * 0.03),
        ),
        seed: hash(seed, 11) * 100,
      }
      if (!this.pathIsClear(candidate, time, groupId)) continue
      for (const pending of this.pendingStrokes) {
        if (Number.isNaN(pending.time)) {
          pending.time =
            time +
            branch * (0.12 + hash(seed, 5) * 0.14) +
            hash(seed, 7) * 0.08
          pending.seed = seed
          pending.groupId = groupId
          pending.from = [...main.from]
          pending.to = to
          pending.radius = candidate.radius
          return
        }
      }
      return
    }
  }

  private processPendingStrokes(now: number) {
    for (const pending of this.pendingStrokes) {
      if (Number.isNaN(pending.time) || now < pending.time) continue
      const time = pending.time
      const path: SurfacePath = {
        from: [...pending.from],
        to: [...pending.to],
        mid: normalize3([
          pending.from[0] + pending.to[0],
          pending.from[1] + pending.to[1],
          pending.from[2] + pending.to[2],
        ]),
        span: angleBetween(pending.from, pending.to),
        radius: pending.radius,
        seed: hash(pending.seed, 11) * 100,
      }
      const groupId = pending.groupId
      pending.time = Number.NaN
      // Network members skip the clearance check — the fork is the point.
      const slot = this.freeSurfaceSlot(time)
      if (slot >= 0) this.applySurfacePath(slot, path, time, groupId)
    }
  }

  // Clearance test against every currently active arc and every committed
  // pending branch stroke. Strokes of the same flash group are exempt —
  // the forked network is meant to share space.
  private pathIsClear(path: SurfacePath, time: number, groupId: number) {
    for (let lane = 0; lane < this.surfaces.length; lane += 1) {
      const active = this.surfaces[lane]
      const start = this.surfaceLanes[lane].start
      if (
        Number.isNaN(start) ||
        time - start > SURFACE_ACTIVE_WINDOW ||
        time < start ||
        active.groupId === groupId
      ) {
        continue
      }
      if (
        angleBetween(path.mid, active.mid) <
        (path.span + active.span) * 0.5 + FLASH_CLEARANCE_MARGIN
      ) {
        return false
      }
      if (angleBetween(path.from, active.from) < FLASH_HUB_CLEARANCE) {
        return false
      }
    }
    for (const pending of this.pendingStrokes) {
      if (Number.isNaN(pending.time) || pending.groupId === groupId) {
        continue
      }
      const pendingMid = normalize3([
        pending.from[0] + pending.to[0],
        pending.from[1] + pending.to[1],
        pending.from[2] + pending.to[2],
      ])
      const pendingSpan = angleBetween(pending.from, pending.to)
      if (
        angleBetween(path.mid, pendingMid) <
        (path.span + pendingSpan) * 0.5 + FLASH_CLEARANCE_MARGIN
      ) {
        return false
      }
      if (angleBetween(path.from, pending.from) < FLASH_HUB_CLEARANCE) {
        return false
      }
    }
    return true
  }

  // Candidate path search with angular clearance from every active arc.
  // Returns null when all candidates would cross a live one.
  private pickClearPath(index: number, time: number): SurfacePath | null {
    for (let candidate = 0; candidate < FLASH_CANDIDATES; candidate += 1) {
      const path = this.rollSurfacePath(
        index * 13 + candidate * 97 + this.surfaceFlash.attempt * 911,
      )
      if (this.pathIsClear(path, time, -1)) return path
    }
    return null
  }

  private freeSurfaceSlot(time: number) {
    for (let lane = 0; lane < this.surfaceLanes.length; lane += 1) {
      const start = this.surfaceLanes[lane].start
      if (Number.isNaN(start) || time - start > SURFACE_ACTIVE_WINDOW) {
        return lane
      }
    }
    return -1
  }

  private applySurfacePath(
    lane: number,
    path: SurfacePath,
    time: number,
    groupId: number,
  ) {
    const output = this.surfaces[lane]
    this.surfaceLanes[lane].start = time
    output.axis = normalize3(cross3(path.from, path.to))
    output.tanA = [...path.from]
    output.from = [...path.from]
    output.mid = [...path.mid]
    output.span = path.span
    output.radius = path.radius
    output.seed = path.seed
    output.groupId = groupId
    output.headAngle = 0
  }

  private pushChain(time: number, surface: boolean, seed: number) {
    for (const slot of this.pendingChains) {
      if (Number.isNaN(slot.time)) {
        slot.time = time
        slot.surface = surface
        slot.seed = seed
        return
      }
    }
  }

  private processChains(now: number) {
    for (const slot of this.pendingChains) {
      if (Number.isNaN(slot.time) || now < slot.time) continue
      const time = slot.time
      const surface = slot.surface
      const seed = slot.seed
      // Consume the slot even when no lane is free: dropped chains keep the
      // pattern deterministic.
      slot.time = Number.NaN
      if (surface) {
        // A chain-grounded arc is an independent event: it takes the same
        // clearance check as any flash (fewer candidates, then dropped).
        const path = this.pickClearPath(seed, time)
        const target = path ? this.freeSurfaceSlot(time) : -1
        if (path && target >= 0) {
          this.applySurfacePath(target, path, time, -seed - 1)
        }
      } else if (time >= this.autonomousStart) {
        let sequenceClear = true
        for (let lane = 0; lane < this.streamLanes.length; lane += 1) {
          const state = this.streamLanes[lane]
          const idle =
            Number.isNaN(state.start) ||
            time - state.start > STREAM_ACTIVE_WINDOW
          const noClash =
            Number.isNaN(state.next) ||
            state.next > time + STREAM_ACTIVE_WINDOW
          if (!idle || !noClash) sequenceClear = false
        }
        // A lower arc cues the next complete burst early instead of adding
        // an unscheduled fourth hit. This preserves the causal read while
        // every visible upper event still belongs to a two-or-three-hit
        // sequential group.
        if (sequenceClear) {
          for (let lane = 0; lane < this.streamLanes.length; lane += 1) {
            this.streamLanes[lane].next =
              time + lane * STREAM_BURST_STAGGER
          }
        }
      }
    }
  }

  private fireStream(lane: number, time: number, seed: number) {
    const state = this.streamLanes[lane]
    const output = this.streams[lane]
    state.start = time
    output.strand = Math.floor(hash(seed, 3) * STREAM_COUNT)
    if (output.strand === this.lastStreamStrand) {
      output.strand =
        (output.strand + 1 + Math.floor(hash(seed, 17) * (STREAM_COUNT - 1))) %
        STREAM_COUNT
    }
    // Defensive de-confliction also protects the invariant if timing is
    // tuned later and two visible windows are ever brought closer together.
    for (const other of this.streams) {
      if (
        other !== output &&
        other.envelope > 0.001 &&
        output.strand === other.strand
      ) {
        output.strand = (output.strand + 2) % STREAM_COUNT
      }
    }
    this.lastStreamStrand = output.strand
    state.endHeight = 3.4 + hash(seed, 7) * 0.5
    output.seed = hash(seed, 11) * 100
  }

  // A hashed start point on the sphere and a hashed endpoint 60..140 degrees
  // away; travel direction flips per event, so arcs cross the envelope from
  // different sides in different directions.
  private rollSurfacePath(index: number): SurfacePath {
    const z = hash(index, 31) * 2 - 1
    const phi = hash(index, 37) * Math.PI * 2
    const radial = Math.sqrt(Math.max(1 - z * z, 0))
    const start = normalize3([radial * Math.cos(phi), z, radial * Math.sin(phi)])
    const helper: [number, number, number] = [
      hash(index, 41) - 0.5,
      hash(index, 43) - 0.5,
      hash(index, 47) - 0.5,
    ]
    const perp = normalize3(cross3(start, helper))
    const span = (60 + hash(index, 51) * 80) * (Math.PI / 180)
    const end = normalize3([
      start[0] * Math.cos(span) + perp[0] * Math.sin(span),
      start[1] * Math.cos(span) + perp[1] * Math.sin(span),
      start[2] * Math.cos(span) + perp[2] * Math.sin(span),
    ])
    const flip = hash(index, 57) < 0.5
    const from = flip ? end : start
    const to = flip ? start : end
    return {
      from,
      to,
      mid: normalize3([from[0] + to[0], from[1] + to[1], from[2] + to[2]]),
      span,
      // Radius is a factor of the blue envelope scale, so the same lane hugs
      // the compact pre-expansion shell and the enlarged outer envelope alike.
      // The band rides the blue shell (~0.92) and its outer crest: dipping
      // lower would drag the arc across the warm orange body, where the blue
      // impulse loses its read; higher would detach it into empty space.
      radius: 0.94 + hash(index, 61) * 0.07,
      seed: hash(index, 67) * 100,
    }
  }
}
