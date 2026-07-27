import { Vector3 } from 'three'

// A short "third-person chase cam" prologue that plays before Phase 1
// (LayeredAssembly) begins: three black-hole orbs streak past the future
// assembly point, then one solid ("cast", not yet divided) cube flies in
// and explodes - handing off directly into the existing far-away swarm
// start. Every path here is a straight line with an eased progress, so
// each has a constant, analytically-known direction; the camera composes
// its position/target from those directions instead of differentiating a
// curve or accumulating velocity, keeping the whole sequence a pure
// function of `time` (reproducible, same spirit as SpinSimulation/
// LayeredAssembly). No THREE object is allocated after construction -
// `update`/`sample` only mutate preallocated scratch vectors.

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

// Three orbs cross the future assembly point from different directions,
// staggered so they never read as one rigid formation.
const ORB_PATHS: readonly LinearPath[] = [
  createPath([-6.4, 3.0, -4.2], [5.6, -1.6, 4.6], 0.0, 1.3),
  createPath([-5.4, -2.9, 5.1], [6.1, 2.1, -3.2], 0.12, 1.35),
  createPath([-6.8, 0.4, 0.9], [5.1, -0.6, -5.2], 0.22, 1.4),
]

// The solid "cast" cube arrives after the orbs and comes to rest exactly
// at local origin - the same point LayeredAssembly's cubelets converge on.
const HERO_PATH = createPath([7.4, 4.2, 6.1], [0, 0, 0], 0.95, 1.55)

const EXPLODE_START = HERO_PATH.delay + HERO_PATH.duration
const EXPLODE_DURATION = 0.36
const PROLOGUE_END = EXPLODE_START + EXPLODE_DURATION + 0.06

const HERO_BLEND_WINDOW = 0.5
const CAMERA_FOLLOW_LOOKAHEAD = 1.6
const CAMERA_FOLLOW_DISTANCE_FAR = 9
const CAMERA_FOLLOW_DISTANCE_NEAR = 5.5
const CAMERA_FOLLOW_HEIGHT_FAR = 3.5
const CAMERA_FOLLOW_HEIGHT_NEAR = 2.2
// The chase cam aims left of the subject so the subject itself projects
// into the right third of the frame, clear of the left-hand text column,
// for the whole prologue instead of sitting on the headline. Analytic
// screen-right of the follow direction: cross(direction, up), y dropped.
// Narrow portrait viewports take a smaller shift - the same world offset
// would push the hero cube out of the tight horizontal FOV.
const DEFAULT_TARGET_SCREEN_RIGHT = 2.0

interface PrologueSequenceConfig {
  readonly screenRight?: number
}

export class PrologueSequence {
  time = 0
  readonly endTime = PROLOGUE_END
  readonly orbPositions = [new Vector3(), new Vector3(), new Vector3()]
  readonly orbVisible = [false, false, false]
  readonly heroPosition = new Vector3()
  heroVisible = false
  heroScale = 1
  explodeFlash = 0
  readonly cameraPosition = new Vector3()
  readonly cameraTarget = new Vector3()

  private readonly orbCentroid = new Vector3()
  private readonly orbHeading = new Vector3()
  private readonly subjectPosition = new Vector3()
  private readonly followDirection = new Vector3()
  private readonly cameraRight = new Vector3()
  private readonly screenRight: number

  constructor(config: PrologueSequenceConfig = {}) {
    this.screenRight = config.screenRight ?? DEFAULT_TARGET_SCREEN_RIGHT
    this.sample(0)
  }

  get complete() {
    return this.time >= this.endTime
  }

  update(delta: number) {
    this.time += Math.min(delta, 1 / 20)
    this.sample(this.time)
  }

  private sample(time: number) {
    for (let index = 0; index < ORB_PATHS.length; index += 1) {
      const path = ORB_PATHS[index]
      this.orbVisible[index] =
        time >= path.delay && time <= path.delay + path.duration + 0.15
      samplePath(path, time, this.orbPositions[index])
    }

    const heroClampedTime = Math.min(
      time,
      HERO_PATH.delay + HERO_PATH.duration,
    )
    samplePath(HERO_PATH, heroClampedTime, this.heroPosition)
    const explodeProgress = clamp01((time - EXPLODE_START) / EXPLODE_DURATION)
    this.explodeFlash =
      time >= EXPLODE_START ? Math.sin(Math.PI * explodeProgress) : 0
    this.heroVisible =
      time >= HERO_PATH.delay && time < EXPLODE_START + EXPLODE_DURATION
    this.heroScale = 1 + explodeProgress * (1 - explodeProgress) * 1.6

    this.orbCentroid.set(0, 0, 0)
    this.orbHeading.set(0, 0, 0)
    for (let index = 0; index < ORB_PATHS.length; index += 1) {
      this.orbCentroid.add(this.orbPositions[index])
      this.orbHeading.add(ORB_PATHS[index].direction)
    }
    this.orbCentroid.multiplyScalar(1 / ORB_PATHS.length)
    this.orbHeading.normalize()

    // Third-person chase cam: the camera trails behind whichever object is
    // currently the "hero" (the orb swarm's centroid, then the incoming
    // solid cube), offset back along the direction of travel and looking
    // slightly ahead of it - not a set of authored fixed points like the
    // main MobileCameraStory track, a continuous follow.
    const blend = smootherstep((time - HERO_PATH.delay) / HERO_BLEND_WINDOW)
    this.subjectPosition.lerpVectors(this.orbCentroid, this.heroPosition, blend)
    this.followDirection
      .copy(this.orbHeading)
      .lerp(HERO_PATH.direction, blend)
      .normalize()

    this.cameraTarget
      .copy(this.subjectPosition)
      .addScaledVector(this.followDirection, CAMERA_FOLLOW_LOOKAHEAD)

    // cross(followDirection, up) written out flat; never vertical here.
    this.cameraRight
      .set(-this.followDirection.z, 0, this.followDirection.x)
      .normalize()
    this.cameraTarget.addScaledVector(this.cameraRight, -this.screenRight)

    const followDistance =
      CAMERA_FOLLOW_DISTANCE_FAR -
      blend * (CAMERA_FOLLOW_DISTANCE_FAR - CAMERA_FOLLOW_DISTANCE_NEAR)
    const followHeight =
      CAMERA_FOLLOW_HEIGHT_FAR -
      blend * (CAMERA_FOLLOW_HEIGHT_FAR - CAMERA_FOLLOW_HEIGHT_NEAR)
    this.cameraPosition
      .copy(this.subjectPosition)
      .addScaledVector(this.followDirection, -followDistance)
    this.cameraPosition.y += followHeight
  }
}
