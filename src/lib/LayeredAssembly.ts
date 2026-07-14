import { Vector3 } from 'three'
import { SPACETIME_DATA, TRAJECTORY_DATA } from './trajectoryData.ts'

export const GRID = 3
export const CUBE_SIZE = 0.5
export const CUBE_GAP = 0.014
export const CUBE_STEP = CUBE_SIZE + CUBE_GAP
export const CUBELET_COUNT = GRID ** 3 - 1

const PATH_STEPS = 480
const TIME_STEPS = 320

interface CurveControls {
  target: Vector3
  start: Vector3
  launchControl: Vector3
  pivot: Vector3
  settleControlA: Vector3
  settleControlB: Vector3
}

interface CubeletMotion {
  target: Vector3
  controls: CurveControls
  pathPoints: Vector3[]
  pathLengths: number[]
  timeDistances: number[]
  delay: number
  duration: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (value: number) => value * value * (3 - 2 * value)

function quinticBezier(
  controls: CurveControls,
  progress: number,
  output: Vector3,
) {
  const remaining = 1 - progress
  const startWeight = remaining ** 5
  const launchWeight = 5 * remaining ** 4 * progress
  const pivotWeight = 10 * remaining ** 3 * progress ** 2
  const settleAWeight = 10 * remaining ** 2 * progress ** 3
  const settleBWeight = 5 * remaining * progress ** 4
  const targetWeight = progress ** 5

  return output.set(
    controls.start.x * startWeight +
      controls.launchControl.x * launchWeight +
      controls.pivot.x * pivotWeight +
      controls.settleControlA.x * settleAWeight +
      controls.settleControlB.x * settleBWeight +
      controls.target.x * targetWeight,
    controls.start.y * startWeight +
      controls.launchControl.y * launchWeight +
      controls.pivot.y * pivotWeight +
      controls.settleControlA.y * settleAWeight +
      controls.settleControlB.y * settleBWeight +
      controls.target.y * targetWeight,
    controls.start.z * startWeight +
      controls.launchControl.z * launchWeight +
      controls.pivot.z * pivotWeight +
      controls.settleControlA.z * settleAWeight +
      controls.settleControlB.z * settleBWeight +
      controls.target.z * targetWeight,
  )
}

function createPathLut(controls: CurveControls) {
  const points: Vector3[] = []

  for (let index = 0; index <= PATH_STEPS; index += 1) {
    const progress = index / PATH_STEPS
    points.push(quinticBezier(controls, progress, new Vector3()))
  }

  const lengths = [0]
  for (let index = 1; index < points.length; index += 1) {
    lengths.push(lengths[index - 1] + points[index].distanceTo(points[index - 1]))
  }

  const totalLength = lengths[lengths.length - 1]
  return {
    pathPoints: points,
    pathLengths: lengths.map((length) => length / totalLength),
  }
}

function createTimeLut(profile: (typeof SPACETIME_DATA)[number]) {
  const brakeStart = profile[2]
  const velocityWaveA = profile[3]
  const wavePhaseA = profile[4]
  const velocityWaveB = profile[5]
  const wavePhaseB = profile[6]
  const launchImpulse = profile[7]
  const distances = [0]
  let previousVelocity = 0
  let distance = 0

  for (let index = 0; index <= TIME_STEPS; index += 1) {
    const progress = index / TIME_STEPS
    const brakeProgress = clamp01(
      (progress - brakeStart) / (1 - brakeStart),
    )
    const brakeEnvelope =
      progress <= brakeStart ? 1 : 1 - smoothstep(brakeProgress)
    const cruiseVelocity = Math.max(
      0.32,
      1 +
        velocityWaveA * Math.sin(Math.PI * 2 * (progress + wavePhaseA)) +
        velocityWaveB * Math.sin(Math.PI * 4 * (progress + wavePhaseB)),
    )
    const velocity =
      (cruiseVelocity + launchImpulse * Math.exp(-progress * 13)) *
      brakeEnvelope

    if (index > 0) {
      distance += (previousVelocity + velocity) / (2 * TIME_STEPS)
      distances.push(distance)
    }
    previousVelocity = velocity
  }

  return distances.map((value) => value / distance)
}

function createMotions() {
  return TRAJECTORY_DATA.map((path, index): CubeletMotion => {
    const controls = {
      target: new Vector3(path[0], path[1], path[2]),
      start: new Vector3(path[3], path[4], path[5]),
      launchControl: new Vector3(path[6], path[7], path[8]),
      pivot: new Vector3(path[9], path[10], path[11]),
      settleControlA: new Vector3(path[12], path[13], path[14]),
      settleControlB: new Vector3(path[15], path[16], path[17]),
    }
    const profile = SPACETIME_DATA[index]

    return {
      target: controls.target,
      controls,
      ...createPathLut(controls),
      timeDistances: createTimeLut(profile),
      delay: profile[0],
      duration: profile[1],
    }
  })
}

function sampleTimeDistance(distances: number[], progress: number) {
  const scaled = clamp01(progress) * TIME_STEPS
  const lowerIndex = Math.min(TIME_STEPS - 1, Math.floor(scaled))
  const remainder = scaled - lowerIndex

  return (
    distances[lowerIndex] +
    (distances[lowerIndex + 1] - distances[lowerIndex]) * remainder
  )
}

function samplePath(motion: CubeletMotion, distance: number, output: Vector3) {
  let lowerIndex = 0
  let upperIndex = motion.pathLengths.length - 1

  while (lowerIndex + 1 < upperIndex) {
    const middleIndex = (lowerIndex + upperIndex) >> 1
    if (motion.pathLengths[middleIndex] < distance) {
      lowerIndex = middleIndex
    } else {
      upperIndex = middleIndex
    }
  }

  const span = motion.pathLengths[upperIndex] - motion.pathLengths[lowerIndex]
  const remainder = span
    ? (distance - motion.pathLengths[lowerIndex]) / span
    : 0

  return quinticBezier(
    motion.controls,
    (lowerIndex + remainder) / PATH_STEPS,
    output,
  )
}

export class LayeredAssembly {
  readonly motions = createMotions()
  readonly endTime = Math.max(
    ...this.motions.map((motion) => motion.delay + motion.duration),
  )
  time = 0

  update(delta: number) {
    this.time += Math.min(delta, 1 / 20)
  }

  get complete() {
    return this.time >= this.endTime
  }

  getPosition(index: number, output: Vector3) {
    const motion = this.motions[index]
    const timeProgress = (this.time - motion.delay) / motion.duration
    const distance = sampleTimeDistance(motion.timeDistances, timeProgress)
    return samplePath(motion, distance, output)
  }
}
