import { Vector3 } from 'three'

export type MobileCameraClock = 'assembly' | 'motion'

export interface MobileCameraStoryTimings {
  roll: number
  diamond: number
  spin: number
  orbit: number
  ignition: number
  capture: number
  shell: number
  reactor: number
  division: number
  handoff: number
}

export interface MobileCameraStoryConfig {
  assemblyX: number
  settledX: number
  timings: MobileCameraStoryTimings
  distanceScale?: number
  targetYBias?: number
}

export interface MobileCameraPoint {
  readonly id: string
  readonly clock: MobileCameraClock
  readonly at: number
  readonly move: number
  readonly title: string
  readonly story: string
  readonly position: Vector3
  readonly target: Vector3
  readonly offset: Vector3
  readonly direction: Vector3
  readonly distance: number
}

export interface MobileCameraPreview {
  readonly clock: MobileCameraClock
  readonly time: number
  readonly point: MobileCameraPoint | null
}

type CameraAnchor = 'assembly' | 'settled'

interface CameraPointTemplate {
  id: string
  clock: MobileCameraClock
  at: number | keyof MobileCameraStoryTimings
  move: number
  anchor: CameraAnchor
  target: readonly [number, number, number]
  offset: readonly [number, number, number]
  title: string
  story: string
}

const ASSEMBLY_POINTS: readonly CameraPointTemplate[] = [
  {
    id: 'arrival',
    clock: 'assembly',
    at: 0,
    move: 0,
    anchor: 'assembly',
    target: [0, 0.58, 0],
    offset: [2.6, 1.8, 4.4],
    title: 'Точка отсчёта',
    story: 'Близкий план держит неподвижное ядро прямо у камеры, пока рой ещё не виден.',
  },
  {
    id: 'swarm',
    clock: 'assembly',
    at: 0.44,
    move: 0.16,
    anchor: 'assembly',
    target: [-2.1, 0.85, 0],
    offset: [-3.4, 2.1, 6.6],
    title: 'Общий ритм',
    story: 'Камера стоит внутри потока — элементы проносятся мимо неё к центру пересечения.',
  },
  {
    id: 'gather',
    clock: 'assembly',
    at: 0.72,
    move: 0.16,
    anchor: 'assembly',
    target: [-0.8, 0.78, 0],
    offset: [3.2, 2.4, 6.1],
    title: 'Кристаллизация',
    story: 'Дистанция сокращается вместе со сходящимся роем — структура собирается прямо перед камерой.',
  },
  {
    id: 'lock',
    clock: 'assembly',
    at: 1,
    move: 0.2,
    anchor: 'assembly',
    target: [0, 0.44, 0],
    offset: [-2.7, 1.5, 4.6],
    title: 'Замыкание',
    story: 'Самый близкий план — последний элемент впечатывается в тело прямо перед камерой.',
  },
]

const MOTION_POINTS: readonly CameraPointTemplate[] = [
  {
    id: 'weight',
    clock: 'motion',
    at: 0,
    move: 0,
    anchor: 'assembly',
    target: [0, 0.44, 0],
    offset: [-2.7, 1.5, 4.6],
    title: 'Появление веса',
    story: 'Собранная система впервые отвечает на опору и гравитацию.',
  },
  {
    id: 'roll',
    clock: 'motion',
    at: 'roll',
    move: 0.46,
    anchor: 'settled',
    target: [0, 0.32, 0],
    offset: [3.6, 0.9, 5.4],
    title: 'Перекат',
    story: 'Низкий, почти уличный план у самой опоры читает вес и контакт с гранью.',
  },
  {
    id: 'diamond',
    clock: 'motion',
    at: 'diamond',
    move: 0.44,
    anchor: 'settled',
    target: [0, 0.85, 0],
    offset: [-2.9, 0.35, 4.3],
    title: 'Баланс',
    story: 'Камера почти на уровне вершины — балансирующий на угле волчок читается снизу, без страховки.',
  },
  {
    id: 'spin',
    clock: 'motion',
    at: 'spin',
    move: 0.3,
    anchor: 'settled',
    target: [0, 0.68, 0],
    offset: [3.1, 1.4, 3.6],
    title: 'Импульс',
    story: 'Плотный близкий план у самой оси вращения — импульс читается кинетически, не издалека.',
  },
  {
    id: 'outer-orbit',
    clock: 'motion',
    at: 'orbit',
    move: 1.2,
    anchor: 'settled',
    target: [0, 1, 0],
    offset: [-12.36, 5.35, 5.45],
    title: 'Раскрытие порядка',
    story: 'Камера отходит, чтобы три симметрии могли раскрыться целиком.',
  },
  {
    id: 'ignition',
    clock: 'motion',
    at: 'ignition',
    move: 0.72,
    anchor: 'settled',
    target: [0, 1.1, 0],
    offset: [2.6, 0.9, 3.9],
    title: 'Источник',
    story: 'Камера протискивается в саму апертуру — источник заполняет кадр, а не просматривается издали.',
  },
  {
    id: 'capture',
    clock: 'motion',
    at: 'capture',
    move: 0.82,
    anchor: 'settled',
    target: [0, 0.5, 0],
    offset: [-4.6, 1.8, 6.9],
    title: 'Новая форма',
    story: 'Средний план держит стягивающееся движение орбит в кадре, не отступая до полного обзора.',
  },
  {
    id: 'shell',
    clock: 'motion',
    at: 'shell',
    move: 0.68,
    anchor: 'settled',
    target: [0, 0.6, 0],
    offset: [4.6, 5.6, 8.3],
    title: 'Сферическая оболочка',
    story: 'Единственный по-настоящему высокий план — завершённая форма получает кадр витрины.',
  },
  {
    id: 'reactor',
    clock: 'motion',
    at: 'reactor',
    move: 0.42,
    anchor: 'settled',
    target: [0, 0.48, 0],
    offset: [1.8, 0.6, 2.6],
    title: 'Поверхность становится технологией',
    story: 'Резкий наезд почти вплотную — уплощение и проводники читаются как макросъёмка материала.',
  },
  {
    id: 'division',
    clock: 'motion',
    at: 'division',
    move: 0.62,
    anchor: 'settled',
    target: [0, 0.62, 0],
    offset: [-3.6, 2.4, 5.2],
    title: 'Размножение функции',
    story: 'Камера держится ближе к паре поколений, не отходя до общего плана.',
  },
  {
    id: 'handoff',
    clock: 'motion',
    at: 'handoff',
    move: 0.78,
    anchor: 'settled',
    target: [0, 0.72, 0],
    offset: [5.22, 4.93, 10.44],
    title: 'Выход в интерфейс',
    story: 'Камера заранее замирает: одна панель покидает сцену и становится страницей.',
  },
]

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smootherstep = (value: number) => {
  const progress = clamp01(value)
  return progress ** 3 * (progress * (progress * 6 - 15) + 10)
}

// A held shot is never perfectly static: the camera keeps a slow continuous
// orbit around the world Y axis at every point, arrival and transition alike,
// so decisive arrivals at an authored vantage read as punctuation on top of
// motion that never fully stops, rather than freeze-then-snap. ~0.09 rad/s
// works out to roughly a third of a turn across the full ~22s sequence.
const CAMERA_DRIFT_SPEED = 0.09

function driftOffsetAroundY(output: Vector3, offset: Vector3, angle: number) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return output.set(
    offset.x * cos + offset.z * sin,
    offset.y,
    offset.z * cos - offset.x * sin,
  )
}

function resolvePoint(
  template: CameraPointTemplate,
  config: MobileCameraStoryConfig,
): MobileCameraPoint {
  const anchorX =
    template.anchor === 'assembly' ? config.assemblyX : config.settledX
  // The final signal framing is coupled to plate selection and its captured
  // camera-relative Bezier route, so responsive shot scaling must converge
  // back to that exact authored camera before the handoff begins.
  const preserveHandoff = template.id === 'handoff'
  const distanceScale = preserveHandoff ? 1 : (config.distanceScale ?? 1)
  const targetYBias = preserveHandoff ? 0 : (config.targetYBias ?? 0)
  const targetX = anchorX + template.target[0]
  const targetY = template.target[1] + targetYBias
  const targetZ = template.target[2]
  const at =
    typeof template.at === 'number'
      ? template.at
      : config.timings[template.at]

  const target = new Vector3(targetX, targetY, targetZ)
  const offset = new Vector3(
    template.offset[0] * distanceScale,
    template.offset[1] * distanceScale,
    template.offset[2] * distanceScale,
  )
  const distance = offset.length()
  const direction = offset.clone().multiplyScalar(1 / distance)

  return {
    id: template.id,
    clock: template.clock,
    at,
    move: template.move,
    title: template.title,
    story: template.story,
    target,
    position: target.clone().add(offset),
    offset,
    direction,
    distance,
  }
}

function slerpDirection(
  output: Vector3,
  start: Vector3,
  end: Vector3,
  progress: number,
) {
  const dot = Math.min(1, Math.max(-1, start.dot(end)))

  if (dot > 0.9995) {
    return output.lerpVectors(start, end, progress).normalize()
  }

  const angle = Math.acos(dot)
  const inverseSine = 1 / Math.sin(angle)
  const startWeight = Math.sin((1 - progress) * angle) * inverseSine
  const endWeight = Math.sin(progress * angle) * inverseSine
  return output
    .copy(start)
    .multiplyScalar(startWeight)
    .addScaledVector(end, endWeight)
    .normalize()
}

/**
 * A deterministic portrait-mobile camera track. Each point is a destination
 * with an arrival time and a move window; the camera holds the previous shot
 * until that window begins, then uses a C2 smootherstep along a spherical arc
 * into the next point.
 * All vectors and point records are created once in the constructor. Sampling
 * only mutates the two public outputs plus one private scratch vector and never
 * allocates per frame.
 */
export class MobileCameraStory {
  readonly assemblyPoints: readonly MobileCameraPoint[]
  readonly motionPoints: readonly MobileCameraPoint[]
  readonly points: readonly MobileCameraPoint[]
  readonly position = new Vector3()
  readonly target = new Vector3()
  private readonly orbitOffset = new Vector3()
  activePoint: MobileCameraPoint

  constructor(config: MobileCameraStoryConfig) {
    this.assemblyPoints = ASSEMBLY_POINTS.map((point) =>
      resolvePoint(point, config),
    )
    this.motionPoints = MOTION_POINTS.map((point) =>
      resolvePoint(point, config),
    )
    this.points = [...this.assemblyPoints, ...this.motionPoints]
    if (import.meta.env.DEV) {
      for (const track of [this.assemblyPoints, this.motionPoints]) {
        for (let index = 1; index < track.length; index += 1) {
          if (track[index].at <= track[index - 1].at) {
            console.warn(
              `MobileCameraStory: "${track[index].id}" arrives at or before ` +
                `"${track[index - 1].id}" (${track[index].at} <= ` +
                `${track[index - 1].at}). Points need strictly increasing ` +
                'arrival times or the earlier one becomes unreachable.',
            )
          }
        }
      }
    }
    this.activePoint = this.assemblyPoints[0]
    this.position.copy(this.activePoint.position)
    this.target.copy(this.activePoint.target)
  }

  findPoint(id: string | null) {
    if (!id) return null
    return this.points.find((point) => point.id === id) ?? null
  }

  resolvePreview(value: string | null): MobileCameraPreview | null {
    if (!value) return null

    const point = this.findPoint(value)
    if (point) {
      return { clock: point.clock, time: point.at, point }
    }

    const separator = value.indexOf(':')
    if (separator < 0) return null
    const clock = value.slice(0, separator)
    const numericTime = Number(value.slice(separator + 1))
    if (
      (clock !== 'assembly' && clock !== 'motion') ||
      !Number.isFinite(numericTime)
    ) {
      return null
    }

    return {
      clock,
      time:
        clock === 'assembly'
          ? clamp01(numericTime)
          : Math.max(0, numericTime),
      point: null,
    }
  }

  sample(assemblyProgress: number, motionElapsed: number, driftTime: number) {
    const driftAngle = driftTime * CAMERA_DRIFT_SPEED
    if (assemblyProgress < 1) {
      this.sampleTrack(this.assemblyPoints, assemblyProgress, driftAngle)
    } else {
      this.sampleTrack(this.motionPoints, motionElapsed, driftAngle)
    }
  }

  // Frozen for preview/debug links: an authored frame should stay exactly
  // reproducible, so these skip the continuous drift entirely (angle 0).
  sampleClock(clock: MobileCameraClock, time: number) {
    this.sampleTrack(
      clock === 'assembly' ? this.assemblyPoints : this.motionPoints,
      time,
      0,
    )
  }

  samplePoint(point: MobileCameraPoint) {
    this.activePoint = point
    this.position.copy(point.position)
    this.target.copy(point.target)
  }

  private sampleTrack(
    points: readonly MobileCameraPoint[],
    time: number,
    driftAngle: number,
  ) {
    let previous = points[0]

    for (let index = 1; index < points.length; index += 1) {
      const next = points[index]
      const moveStart = next.at - next.move

      if (time < moveStart) {
        this.activePoint = previous
        this.target.copy(previous.target)
        driftOffsetAroundY(this.orbitOffset, previous.offset, driftAngle)
        this.position.copy(previous.target).add(this.orbitOffset)
        return
      }

      if (time <= next.at) {
        const progress = smootherstep((time - moveStart) / next.move)
        this.activePoint = next
        if (progress <= 0) {
          this.target.copy(previous.target)
          driftOffsetAroundY(this.orbitOffset, previous.offset, driftAngle)
          this.position.copy(previous.target).add(this.orbitOffset)
          return
        }
        if (progress >= 1) {
          this.target.copy(next.target)
          driftOffsetAroundY(this.orbitOffset, next.offset, driftAngle)
          this.position.copy(next.target).add(this.orbitOffset)
          return
        }

        this.target.lerpVectors(previous.target, next.target, progress)
        const distance =
          previous.distance + (next.distance - previous.distance) * progress
        slerpDirection(
          this.orbitOffset,
          previous.direction,
          next.direction,
          progress,
        ).multiplyScalar(distance)
        driftOffsetAroundY(this.orbitOffset, this.orbitOffset, driftAngle)
        this.position.copy(this.target).add(this.orbitOffset)
        return
      }

      previous = next
    }

    this.activePoint = previous
    this.target.copy(previous.target)
    driftOffsetAroundY(this.orbitOffset, previous.offset, driftAngle)
    this.position.copy(previous.target).add(this.orbitOffset)
  }
}
