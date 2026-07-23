// Deterministic electric-discharge scheduler for the plasma core.
//
// Two discharge families tie the living flame to the reactor's electric
// world, both with flat brightness through the strike — no strobing:
// - stream strikes: jagged lightning lanes propagating up the seven rising
//   streams in short two-or-three-hit bursts; hits inside a burst are
//   strictly sequential rather than simultaneous;
// - surface strikes: smooth arcs gliding across the outer blue ionization
//   envelope from a hashed side to a hashed side, on independent lanes.
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
}

const STRIKE_ATTACK = 0.02
const STRIKE_RELEASE_DECAY = 15
// Surface arcs glide: soft attack, slow release, ease-in-out travel — a
// calm counterpoint to the sharp stream strikes.
const SURFACE_ATTACK = 0.22
const SURFACE_RELEASE_DECAY = 7
const STREAM_TRAVEL_DURATION = 0.3
const SURFACE_TRAVEL_DURATION = 0.45
const STREAM_ACTIVE_WINDOW = STREAM_TRAVEL_DURATION + 0.24
const SURFACE_ACTIVE_WINDOW = SURFACE_TRAVEL_DURATION + 0.5

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
// Surface arcs glide on three independent lanes.
const SURFACE_LANE_PERIOD = 2.8
const SURFACE_LANE_JITTER = 0.8

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

function strikeEnvelope(elapsed: number, travelDuration: number) {
  const attack = clamp01(elapsed / STRIKE_ATTACK)
  const release = Math.exp(
    -Math.max(elapsed - travelDuration, 0) * STRIKE_RELEASE_DECAY,
  )
  return attack * release
}

function surfaceEnvelope(elapsed: number) {
  const attack = clamp01(elapsed / SURFACE_ATTACK)
  const attackSmooth = attack * attack * (3 - 2 * attack)
  const release = Math.exp(
    -Math.max(elapsed - SURFACE_TRAVEL_DURATION, 0) * SURFACE_RELEASE_DECAY,
  )
  return attackSmooth * release
}

function surfaceTravelEase(progress: number) {
  const clamped = clamp01(progress)
  return clamped * clamped * (3 - 2 * clamped)
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

  private readonly streamLanes: {
    next: number
    index: number
    start: number
    endHeight: number
  }[] = []
  private readonly surfaceLanes: {
    next: number
    index: number
    start: number
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
      })
      this.surfaceLanes.push({
        next: Number.NaN,
        index: lane * 53 + 11,
        start: Number.NaN,
      })
    }
    for (let slot = 0; slot < CHAIN_SLOT_COUNT; slot += 1) {
      this.pendingChains.push({ time: Number.NaN, surface: false, seed: 0 })
    }
  }

  update(now: number) {
    this.peak = 0
    if (!this.enabled) {
      for (const stream of this.streams) stream.envelope = 0
      for (const surface of this.surfaces) surface.envelope = 0
      return
    }
    if (this.previewStream) Object.assign(this.streams[0], this.previewStream)
    if (this.previewSurface) {
      Object.assign(this.surfaces[0], this.previewSurface)
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

    this.processChains(now)

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
      if (Number.isNaN(state.next)) {
        state.next = this.surfaceStart + 0.4 + lane * 0.9
      }
      if (now >= state.next) {
        this.fireSurface(lane, state.next, state.index)
        // A surface arc may cue the next complete upper burst early.
        if (hash(state.index, 79) < SURFACE_TO_STREAM_CHANCE) {
          this.pushChain(
            state.next + 0.22 + hash(state.index, 83) * 0.4,
            false,
            state.index,
          )
        }
        state.next +=
          SURFACE_LANE_PERIOD +
          (hash(state.index, 23 + lane * 17) * 2 - 1) * SURFACE_LANE_JITTER
        state.index += 1
      }
      const elapsed = now - state.start
      if (
        Number.isNaN(state.start) ||
        elapsed < 0 ||
        elapsed > SURFACE_ACTIVE_WINDOW
      ) {
        output.envelope = 0
      } else {
        output.envelope = surfaceEnvelope(elapsed)
        output.headAngle =
          output.span * surfaceTravelEase(elapsed / SURFACE_TRAVEL_DURATION)
      }
      this.peak = Math.max(this.peak, output.envelope)
    }
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
        for (let lane = 0; lane < this.surfaceLanes.length; lane += 1) {
          const state = this.surfaceLanes[lane]
          const idle =
            Number.isNaN(state.start) ||
            time - state.start > SURFACE_ACTIVE_WINDOW
          const noClash =
            Number.isNaN(state.next) ||
            state.next > time + SURFACE_ACTIVE_WINDOW
          if (idle && noClash) {
            this.fireSurface(lane, time, seed)
            state.next = Number.isNaN(state.next)
              ? time + SURFACE_LANE_PERIOD * 0.6
              : Math.max(state.next, time + SURFACE_LANE_PERIOD * 0.6)
            break
          }
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

  private fireSurface(lane: number, time: number, seed: number) {
    const state = this.surfaceLanes[lane]
    state.start = time
    this.rollSurfacePath(seed, this.surfaces[lane])
  }

  // A hashed start point on the sphere and a hashed endpoint 60..140 degrees
  // away; travel direction flips per event, so arcs cross the envelope from
  // different sides in different directions.
  private rollSurfacePath(index: number, output: SurfaceDischargeState) {
    const z = hash(index, 31) * 2 - 1
    const phi = hash(index, 37) * Math.PI * 2
    const radial = Math.sqrt(Math.max(1 - z * z, 0))
    const start = normalize3([radial * Math.cos(phi), z, radial * Math.sin(phi)])
    const helper: [number, number, number] = [
      hash(index, 41) - 0.5,
      hash(index, 43) - 0.5,
      hash(index, 47) - 0.5,
    ]
    const perp = normalize3([
      start[1] * helper[2] - start[2] * helper[1],
      start[2] * helper[0] - start[0] * helper[2],
      start[0] * helper[1] - start[1] * helper[0],
    ])
    const span = (60 + hash(index, 51) * 80) * (Math.PI / 180)
    const end = normalize3([
      start[0] * Math.cos(span) + perp[0] * Math.sin(span),
      start[1] * Math.cos(span) + perp[1] * Math.sin(span),
      start[2] * Math.cos(span) + perp[2] * Math.sin(span),
    ])
    const flip = hash(index, 57) < 0.5
    const from = flip ? end : start
    const to = flip ? start : end
    output.axis = normalize3([
      from[1] * to[2] - from[2] * to[1],
      from[2] * to[0] - from[0] * to[2],
      from[0] * to[1] - from[1] * to[0],
    ])
    output.tanA = from
    output.span = span
    // Radius is a factor of the blue envelope scale, so the same lane hugs
    // the compact pre-expansion shell and the enlarged outer envelope alike.
    // The band rides the blue shell (~0.92) and its outer crest: dipping
    // lower would drag the arc across the warm orange body, where the blue
    // impulse loses its read; higher would detach it into empty space.
    output.radius = 0.94 + hash(index, 61) * 0.07
    output.seed = hash(index, 67) * 100
  }
}
