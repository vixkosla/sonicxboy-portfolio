import { Quaternion, Vector3 } from 'three'
import { CUBE_GAP, CUBE_SIZE, GRID } from './LayeredAssembly.ts'
import { TRAJECTORY_DATA } from './trajectoryData.ts'

// Phase 0 is a deterministic cinematic handoff into LayeredAssembly. It is
// deliberately a pure function of time: preview seeks, real playback, and
// numeric framing tests all produce the same shot. All vectors used by the
// hot path are allocated at module/class construction, never in update().

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smootherstep = (value: number) => {
  const progress = clamp01(value)
  return progress ** 3 * (progress * (progress * 6 - 15) + 10)
}

interface LinearPath {
  readonly start: Vector3
  readonly end: Vector3
  readonly direction: Vector3
  readonly delay: number
  readonly duration: number
}

interface FragmentProfile {
  readonly source: Vector3
  readonly target: Vector3
  readonly tangent: Vector3
  readonly orientation: Quaternion
  readonly arc: number
  readonly lift: number
}

function createPath(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  delay: number,
  duration: number,
): LinearPath {
  const startVector = new Vector3(...start)
  const endVector = new Vector3(...end)
  return {
    start: startVector,
    end: endVector,
    direction: endVector.clone().sub(startVector).normalize(),
    delay,
    duration,
  }
}

function samplePath(path: LinearPath, time: number, output: Vector3) {
  const progress = smootherstep((time - path.delay) / path.duration)
  return output.lerpVectors(path.start, path.end, progress)
}

function deterministicNoise(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const ASSEMBLY_STARTS = TRAJECTORY_DATA.map(
  (path) => new Vector3(path[3], path[4], path[5]),
)
const ASSEMBLY_TARGETS = TRAJECTORY_DATA.map(
  (path) => new Vector3(path[0], path[1], path[2]),
)
const MORPH_CENTER = ASSEMBLY_STARTS.reduce(
  (center, position) => center.add(position),
  new Vector3(),
).multiplyScalar(1 / ASSEMBLY_STARTS.length)

// The opening trio flies as a loose formation along one dominant heading.
// Their offsets are intentionally small: this is a close third-person shot,
// not the former distant overview.
const ORB_PATHS: readonly LinearPath[] = [
  createPath([-16.8, 0.95, -1.35], [-10.3, -0.25, 0.2], 0, 2.2),
  createPath([-16.55, -0.15, 0.95], [-10.05, -0.55, 0.05], 0.1, 2.15),
  createPath([-17.05, -0.9, -0.15], [-10.45, -0.05, -0.55], 0.2, 2.25),
]

const HERO_PATH = createPath(
  [-15.0, 2.6, 3.25],
  [MORPH_CENTER.x, MORPH_CENTER.y, MORPH_CENTER.z],
  1,
  2.35,
)

export const PROLOGUE_TIMES = {
  heroArrival: HERO_PATH.delay,
  monolith: HERO_PATH.delay + HERO_PATH.duration,
  subdivide: 4,
  rubik: 5.15,
  scatter: 6,
  handoff: 8,
  end: 9.3,
} as const

const ORB_DISSOLVE_START = 1.65
const ORB_DISSOLVE_DURATION = 1.25
export const PROLOGUE_CUBE_EXTENT =
  GRID * CUBE_SIZE + (GRID - 1) * CUBE_GAP
const HERO_BASE_SCALE = 1
const SUBDIVIDE_DURATION = PROLOGUE_TIMES.rubik - PROLOGUE_TIMES.subdivide
const SCATTER_DURATION = 3.05
const CAMERA_HERO_BLEND_START = 1.05
const CAMERA_HERO_BLEND_DURATION = 1.15
const CAMERA_MATCH_BLEND_START = 2.65
const CAMERA_MATCH_BLEND_DURATION = 1.15
const CAMERA_SWARM_BLEND_START = PROLOGUE_TIMES.rubik + 0.05
const CAMERA_SWARM_BLEND_DURATION = 0.85
const CAMERA_HANDOFF_BLEND_START = PROLOGUE_TIMES.handoff
const CAMERA_HANDOFF_BLEND_DURATION =
  PROLOGUE_TIMES.end - CAMERA_HANDOFF_BLEND_START
const CAMERA_LOOKAHEAD = 0.42
const ORB_FOLLOW_DISTANCE = 4.45
const HERO_FOLLOW_DISTANCE = 7.2
const ORB_FOLLOW_HEIGHT = 0.74
const HERO_FOLLOW_HEIGHT = 0.82
// Desired horizontal NDC placement for the followed subject. 0 is centre;
// positive values reserve the left side for the page copy.
const DEFAULT_TARGET_SCREEN_RIGHT = 0.48
const DEFAULT_ASPECT = 16 / 9
const DEFAULT_VERTICAL_FOV = 43
const DEFAULT_FRAME_FRACTION = 0.78
const DEFAULT_MATCH_CAMERA_OFFSET: readonly [number, number, number] = [
  2.77, 2.62, 5.54,
]
const DEFAULT_MATCH_TARGET_OFFSET: readonly [number, number, number] = [0, 0, 0]
const FIT_UP_AXIS = new Vector3(0, 1, 0)
const LOCAL_TRAVEL_AXIS = new Vector3(1, 0, 0)
const IDENTITY_ORIENTATION = new Quaternion()
const SWARM_START_FORWARD = new Vector3(1, -0.1, -0.22).normalize()
const FRAGMENT_BOUNDING_RADIUS = CUBE_SIZE * Math.sqrt(3) * 0.5
const HERO_ORIENTATION = new Quaternion().setFromUnitVectors(
  LOCAL_TRAVEL_AXIS,
  HERO_PATH.direction,
)

const FRAGMENT_PROFILES: readonly FragmentProfile[] = ASSEMBLY_STARTS.map(
  (target, index) => {
    // The first divided cube is the final 3x3x3 shell translated to the
    // left-hand launch area. This makes the breakup and the later assembly
    // the same object-space frame rather than two merely similar shapes.
    const source = MORPH_CENTER.clone().add(ASSEMBLY_TARGETS[index])
    const travelDirection = target.clone().sub(source).normalize()
    const tangent = new Vector3().crossVectors(
      travelDirection,
      Math.abs(travelDirection.y) > 0.78
        ? new Vector3(1, 0, 0)
        : new Vector3(0, 1, 0),
    )
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, 1)
    tangent
      .normalize()
      .multiplyScalar(deterministicNoise(index, 2) < 0.5 ? -1 : 1)
    return {
      source,
      target,
      tangent,
      orientation: new Quaternion().setFromUnitVectors(
        LOCAL_TRAVEL_AXIS,
        travelDirection,
      ),
      arc: 0.38 + deterministicNoise(index, 3) * 0.68,
      lift: 0.16 + deterministicNoise(index, 5) * 0.28,
    }
  },
)

export interface PrologueSequenceConfig {
  readonly screenRight?: number
  readonly aspect?: number
  readonly verticalFov?: number
  readonly frameFraction?: number
  readonly closeDistanceScale?: number
  readonly matchCameraOffset?: readonly [number, number, number]
  readonly matchTargetOffset?: readonly [number, number, number]
  readonly handoffCameraPosition?: readonly [number, number, number]
  readonly handoffCameraTarget?: readonly [number, number, number]
}

export class PrologueSequence {
  time = 0
  readonly endTime = PROLOGUE_TIMES.end
  readonly orbPositions = [new Vector3(), new Vector3(), new Vector3()]
  readonly orbScales = [0, 0, 0]
  readonly heroPosition = new Vector3()
  readonly heroOrientation = HERO_ORIENTATION.clone()
  heroVisible = false
  heroScale = 0
  readonly fragmentPositions = FRAGMENT_PROFILES.map(() => new Vector3())
  readonly fragmentOrientations = FRAGMENT_PROFILES.map(() => new Quaternion())
  readonly fragmentScales = FRAGMENT_PROFILES.map(() => 1)
  readonly fragmentCrystalScales = FRAGMENT_PROFILES.map(() => 0)
  surfaceSweepProgress = -0.08
  readonly cameraPosition = new Vector3()
  readonly cameraTarget = new Vector3()
  handoffProgress = 0
  phase: 'chase' | 'monolith' | 'division' | 'travel' | 'handoff' = 'chase'

  private readonly orbCentroid = new Vector3()
  private readonly orbHeading = new Vector3()
  private readonly subjectPosition = new Vector3()
  private readonly followDirection = new Vector3()
  private readonly cameraRight = new Vector3()
  private readonly closeCameraPosition = new Vector3()
  private readonly closeCameraTarget = new Vector3()
  private readonly matchCameraPosition = new Vector3()
  private readonly matchCameraTarget = new Vector3()
  private readonly swarmCameraPosition = new Vector3()
  private readonly swarmCameraTarget = new Vector3()
  private readonly fitCenter = new Vector3()
  private readonly fitForward = new Vector3()
  private readonly fitRight = new Vector3()
  private readonly fitUp = new Vector3()
  private readonly pointOffset = new Vector3()
  private readonly fragmentBoundingScales = FRAGMENT_PROFILES.map(() => 0)
  private readonly screenRight: number
  private readonly aspect: number
  private readonly verticalFov: number
  private readonly frameFraction: number
  private readonly closeDistanceScale: number
  private readonly matchCameraOffset: Vector3
  private readonly matchTargetOffset: Vector3
  private readonly handoffCameraPosition: Vector3 | null
  private readonly handoffCameraTarget: Vector3 | null

  constructor(config: PrologueSequenceConfig = {}) {
    this.screenRight = config.screenRight ?? DEFAULT_TARGET_SCREEN_RIGHT
    this.aspect = config.aspect ?? DEFAULT_ASPECT
    this.verticalFov = config.verticalFov ?? DEFAULT_VERTICAL_FOV
    this.frameFraction = config.frameFraction ?? DEFAULT_FRAME_FRACTION
    this.closeDistanceScale = config.closeDistanceScale ?? 1
    this.matchCameraOffset = new Vector3(
      ...(config.matchCameraOffset ?? DEFAULT_MATCH_CAMERA_OFFSET),
    )
    this.matchTargetOffset = new Vector3(
      ...(config.matchTargetOffset ?? DEFAULT_MATCH_TARGET_OFFSET),
    )
    this.handoffCameraPosition = config.handoffCameraPosition
      ? new Vector3(...config.handoffCameraPosition)
      : null
    this.handoffCameraTarget = config.handoffCameraTarget
      ? new Vector3(...config.handoffCameraTarget)
      : null
    this.sample(0)
  }

  get complete() {
    return this.time >= this.endTime
  }

  update(delta: number) {
    this.seek(this.time + Math.min(delta, 1 / 20))
  }

  seek(time: number) {
    this.time = Math.min(this.endTime, Math.max(0, time))
    this.sample(this.time)
  }

  private fitSwarmCamera(
    positions: readonly Vector3[],
    extentScales?: readonly number[],
  ) {
    this.fitCenter.set(0, 0, 0)
    for (let index = 0; index < positions.length; index += 1) {
      this.fitCenter.add(positions[index])
    }
    this.fitCenter.multiplyScalar(1 / Math.max(1, positions.length))

    this.fitForward.copy(SWARM_START_FORWARD)
    this.fitRight.crossVectors(this.fitForward, FIT_UP_AXIS)
    if (this.fitRight.lengthSq() < 1e-6) this.fitRight.set(1, 0, 0)
    this.fitRight.normalize()
    this.fitUp.crossVectors(this.fitRight, this.fitForward).normalize()

    const verticalTangent = Math.tan((this.verticalFov * Math.PI) / 360)
    const horizontalTangent = verticalTangent * this.aspect
    const desiredScreenX = this.screenRight
    const rightAllowance = Math.max(
      0.08,
      this.frameFraction - desiredScreenX,
    )
    const leftAllowance = Math.max(
      0.08,
      this.frameFraction + desiredScreenX,
    )
    let requiredDistance = 3.35

    for (let index = 0; index < positions.length; index += 1) {
      this.pointOffset.copy(positions[index]).sub(this.fitCenter)
      const depth = this.pointOffset.dot(this.fitForward)
      const horizontal = this.pointOffset.dot(this.fitRight)
      const vertical = this.pointOffset.dot(this.fitUp)
      const fragmentRadius =
        FRAGMENT_BOUNDING_RADIUS * (extentScales?.[index] ?? 1)
      requiredDistance = Math.max(
        requiredDistance,
        (horizontal +
          fragmentRadius -
          this.frameFraction * depth * horizontalTangent) /
          (horizontalTangent * rightAllowance),
        (-horizontal +
          fragmentRadius -
          this.frameFraction * depth * horizontalTangent) /
          (horizontalTangent * leftAllowance),
        (Math.abs(vertical) +
          fragmentRadius -
          this.frameFraction * depth * verticalTangent) /
          (verticalTangent * this.frameFraction),
      )
    }

    requiredDistance += 0.28
    const compositionShift =
      desiredScreenX * requiredDistance * horizontalTangent
    this.swarmCameraTarget
      .copy(this.fitCenter)
      .addScaledVector(this.fitRight, -compositionShift)
    this.swarmCameraPosition
      .copy(this.swarmCameraTarget)
      .addScaledVector(this.fitForward, -requiredDistance)
  }

  private sample(time: number) {
    const orbDissolve = smootherstep(
      (time - ORB_DISSOLVE_START) / ORB_DISSOLVE_DURATION,
    )
    this.orbCentroid.set(0, 0, 0)
    this.orbHeading.set(0, 0, 0)
    let orbWeight = 0

    for (let index = 0; index < ORB_PATHS.length; index += 1) {
      const path = ORB_PATHS[index]
      samplePath(path, time, this.orbPositions[index])
      const reveal = smootherstep((time - path.delay) / 0.16)
      const scale = reveal * (1 - orbDissolve) * (1.32 - index * 0.12)
      this.orbScales[index] = scale
      if (scale > 0.001) {
        this.orbCentroid.addScaledVector(this.orbPositions[index], scale)
        this.orbHeading.addScaledVector(path.direction, scale)
        orbWeight += scale
      }
    }

    if (orbWeight > 0) {
      this.orbCentroid.multiplyScalar(1 / orbWeight)
      this.orbHeading.normalize()
    } else {
      this.orbCentroid.copy(MORPH_CENTER)
      this.orbHeading.copy(HERO_PATH.direction)
    }

    samplePath(HERO_PATH, time, this.heroPosition)
    const subdivide = smootherstep(
      (time - PROLOGUE_TIMES.subdivide) / SUBDIVIDE_DURATION,
    )
    this.surfaceSweepProgress = -0.08 + subdivide * 1.16
    const orientationLock = smootherstep(
      (time - (PROLOGUE_TIMES.monolith - 0.52)) / 0.52,
    )
    this.heroOrientation
      .copy(HERO_ORIENTATION)
      .slerp(IDENTITY_ORIENTATION, orientationLock)
    this.heroVisible =
      time >= HERO_PATH.delay && this.surfaceSweepProgress < 1.04
    this.heroScale = HERO_BASE_SCALE

    const scatter = smootherstep(
      (time - PROLOGUE_TIMES.scatter) / SCATTER_DURATION,
    )
    const arcEnvelope = Math.sin(Math.PI * scatter)
    const structuralHandoff = time >= PROLOGUE_TIMES.end ? 1 : 0

    for (let index = 0; index < FRAGMENT_PROFILES.length; index += 1) {
      const profile = FRAGMENT_PROFILES[index]
      const position = this.fragmentPositions[index]
      position.lerpVectors(profile.source, profile.target, scatter)
      position.addScaledVector(profile.tangent, arcEnvelope * profile.arc)
      position.y += arcEnvelope * profile.lift
      this.fragmentOrientations[index]
        .copy(IDENTITY_ORIENTATION)
        .slerp(profile.orientation, arcEnvelope)
      this.fragmentScales[index] = 1 - structuralHandoff
      this.fragmentCrystalScales[index] = structuralHandoff
      this.fragmentBoundingScales[index] = 1
    }

    const heroCameraBlend = smootherstep(
      (time - CAMERA_HERO_BLEND_START) / CAMERA_HERO_BLEND_DURATION,
    )
    this.subjectPosition.lerpVectors(
      this.orbCentroid,
      this.heroPosition,
      heroCameraBlend,
    )
    this.followDirection
      .copy(this.orbHeading)
      .lerp(HERO_PATH.direction, heroCameraBlend)
      .normalize()
    this.cameraRight
      .set(-this.followDirection.z, 0, this.followDirection.x)
      .normalize()
    this.closeCameraTarget
      .copy(this.subjectPosition)
      .addScaledVector(this.followDirection, CAMERA_LOOKAHEAD)
    const closeDistance =
      (ORB_FOLLOW_DISTANCE +
        heroCameraBlend * (HERO_FOLLOW_DISTANCE - ORB_FOLLOW_DISTANCE)) *
      this.closeDistanceScale
    const closeHeight =
      ORB_FOLLOW_HEIGHT +
      heroCameraBlend * (HERO_FOLLOW_HEIGHT - ORB_FOLLOW_HEIGHT)
    const horizontalTangent =
      Math.tan((this.verticalFov * Math.PI) / 360) * this.aspect
    this.closeCameraTarget.addScaledVector(
      this.cameraRight,
      -this.screenRight * closeDistance * horizontalTangent,
    )
    this.closeCameraPosition
      .copy(this.subjectPosition)
      .addScaledVector(this.followDirection, -closeDistance)
    this.closeCameraPosition.y += closeHeight

    this.matchCameraTarget
      .copy(this.heroPosition)
      .add(this.matchTargetOffset)
    this.matchCameraPosition
      .copy(this.matchCameraTarget)
      .add(this.matchCameraOffset)
    const matchCameraBlend = smootherstep(
      (time - CAMERA_MATCH_BLEND_START) / CAMERA_MATCH_BLEND_DURATION,
    )
    this.cameraPosition.lerpVectors(
      this.closeCameraPosition,
      this.matchCameraPosition,
      matchCameraBlend,
    )
    this.cameraTarget.lerpVectors(
      this.closeCameraTarget,
      this.matchCameraTarget,
      matchCameraBlend,
    )

    this.fitSwarmCamera(this.fragmentPositions, this.fragmentBoundingScales)
    const swarmCameraBlend = smootherstep(
      (time - CAMERA_SWARM_BLEND_START) / CAMERA_SWARM_BLEND_DURATION,
    )
    this.cameraPosition.lerp(this.swarmCameraPosition, swarmCameraBlend)
    this.cameraTarget.lerp(this.swarmCameraTarget, swarmCameraBlend)

    if (this.handoffCameraPosition && this.handoffCameraTarget) {
      const handoffCameraBlend = smootherstep(
        (time - CAMERA_HANDOFF_BLEND_START) / CAMERA_HANDOFF_BLEND_DURATION,
      )
      this.handoffProgress = handoffCameraBlend
      this.cameraPosition.lerp(
        this.handoffCameraPosition,
        handoffCameraBlend,
      )
      this.cameraTarget.lerp(this.handoffCameraTarget, handoffCameraBlend)
    } else {
      this.handoffProgress = 0
    }

    this.phase =
      time < HERO_PATH.delay
        ? 'chase'
        : time < PROLOGUE_TIMES.subdivide
          ? 'monolith'
          : time < PROLOGUE_TIMES.scatter + 0.24
            ? 'division'
            : time < PROLOGUE_TIMES.handoff
              ? 'travel'
              : 'handoff'
  }
}
