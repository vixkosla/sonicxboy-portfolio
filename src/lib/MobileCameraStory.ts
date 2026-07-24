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
    offset: [5.2, 4.3, 10.5],
    title: 'Точка отсчёта',
    story: 'Один неподвижный элемент ждёт материал, из которого соберётся система.',
  },
  {
    id: 'swarm',
    clock: 'assembly',
    at: 0.44,
    move: 0.18,
    anchor: 'assembly',
    target: [-2.1, 0.85, 0],
    offset: [8.2, 6.8, 16],
    title: 'Общий ритм',
    story: 'Камера встречает основной поток там, где его траектории пересекаются.',
  },
  {
    id: 'gather',
    clock: 'assembly',
    at: 0.72,
    move: 0.18,
    anchor: 'assembly',
    target: [-0.8, 0.78, 0],
    offset: [7.1, 5.8, 13.8],
    title: 'Кристаллизация',
    story: 'Взгляд возвращается к центру, когда разрозненное становится структурой.',
  },
  {
    id: 'lock',
    clock: 'assembly',
    at: 1,
    move: 0.26,
    anchor: 'assembly',
    target: [0, 0.44, 0],
    offset: [4.25, 3.55, 8.65],
    title: 'Замыкание',
    story: 'Последний элемент превращает рой в одно тяжёлое тело.',
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
    offset: [4.25, 3.55, 8.65],
    title: 'Появление веса',
    story: 'Собранная система впервые отвечает на опору и гравитацию.',
  },
  {
    id: 'roll',
    clock: 'motion',
    at: 'roll',
    move: 0.62,
    anchor: 'settled',
    target: [0, 0.48, 0],
    offset: [4.55, 3.65, 9],
    title: 'Перекат',
    story: 'Взгляд проходит путь вместе с телом, не ожидая его в финальной точке.',
  },
  {
    id: 'diamond',
    clock: 'motion',
    at: 'diamond',
    move: 0.64,
    anchor: 'settled',
    target: [0, 0.58, 0],
    offset: [3.95, 4, 8.8],
    title: 'Баланс',
    story: 'Механический куб поднимается на угол и становится танцующим волчком.',
  },
  {
    id: 'spin',
    clock: 'motion',
    at: 'spin',
    move: 0.4,
    anchor: 'settled',
    target: [0, 0.62, 0],
    offset: [4.25, 3.85, 8.85],
    title: 'Импульс',
    story: 'Короткий близкий план отдаёт вращению главную роль.',
  },
  {
    id: 'outer-orbit',
    clock: 'motion',
    at: 'orbit',
    move: 1.8,
    anchor: 'settled',
    target: [0, 1, 0],
    offset: [5.95, 5.2, 11.75],
    title: 'Раскрытие порядка',
    story: 'Камера отходит, чтобы три симметрии могли раскрыться целиком.',
  },
  {
    id: 'ignition',
    clock: 'motion',
    at: 'ignition',
    move: 1.15,
    anchor: 'settled',
    target: [0, 1.25, 0],
    offset: [3.6, 3.9, 10.2],
    title: 'Источник',
    story: 'Взгляд входит в открытую апертуру и обнаруживает живое ядро.',
  },
  {
    id: 'capture',
    clock: 'motion',
    at: 'capture',
    move: 1.25,
    anchor: 'settled',
    target: [0, 0.56, 0],
    offset: [4.5, 4, 9.45],
    title: 'Новая форма',
    story: 'Отступ показывает, что орбиты возвращаются уже не в куб, а в сферу.',
  },
  {
    id: 'shell',
    clock: 'motion',
    at: 'shell',
    move: 1.1,
    anchor: 'settled',
    target: [0, 0.62, 0],
    offset: [4.65, 4.15, 9.65],
    title: 'Сферическая оболочка',
    story: 'Камера удерживает завершённую оболочку до следующей метаморфозы.',
  },
  {
    id: 'reactor',
    clock: 'motion',
    at: 'reactor',
    move: 0.7,
    anchor: 'settled',
    target: [0, 0.5, 0],
    offset: [3.35, 3, 7.75],
    title: 'Поверхность становится технологией',
    story: 'Макроплан делает читаемыми уплощение кубов и проявление проводников.',
  },
  {
    id: 'division',
    clock: 'motion',
    at: 'division',
    move: 1,
    anchor: 'settled',
    target: [0, 0.65, 0],
    offset: [4.75, 4.25, 9.95],
    title: 'Размножение функции',
    story: 'Общий план возвращает масштаб двум поколениям деления клеток.',
  },
  {
    id: 'handoff',
    clock: 'motion',
    at: 'handoff',
    move: 1.05,
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

  return {
    id: template.id,
    clock: template.clock,
    at,
    move: template.move,
    title: template.title,
    story: template.story,
    target: new Vector3(targetX, targetY, targetZ),
    position: new Vector3(
      targetX + template.offset[0] * distanceScale,
      targetY + template.offset[1] * distanceScale,
      targetZ + template.offset[2] * distanceScale,
    ),
  }
}

/**
 * A deterministic portrait-mobile camera track. Each point is a destination
 * with an arrival time and a move window; the camera holds the previous shot
 * until that window begins, then uses a C2 smootherstep into the next point.
 * All vectors and point records are created once in the constructor. Sampling
 * only mutates the two public output vectors and never allocates per frame.
 */
export class MobileCameraStory {
  readonly assemblyPoints: readonly MobileCameraPoint[]
  readonly motionPoints: readonly MobileCameraPoint[]
  readonly points: readonly MobileCameraPoint[]
  readonly position = new Vector3()
  readonly target = new Vector3()
  activePoint: MobileCameraPoint

  constructor(config: MobileCameraStoryConfig) {
    this.assemblyPoints = ASSEMBLY_POINTS.map((point) =>
      resolvePoint(point, config),
    )
    this.motionPoints = MOTION_POINTS.map((point) =>
      resolvePoint(point, config),
    )
    this.points = [...this.assemblyPoints, ...this.motionPoints]
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

  sample(assemblyProgress: number, motionElapsed: number) {
    if (assemblyProgress < 1) {
      this.sampleTrack(this.assemblyPoints, assemblyProgress)
    } else {
      this.sampleTrack(this.motionPoints, motionElapsed)
    }
  }

  sampleClock(clock: MobileCameraClock, time: number) {
    this.sampleTrack(
      clock === 'assembly' ? this.assemblyPoints : this.motionPoints,
      time,
    )
  }

  samplePoint(point: MobileCameraPoint) {
    this.activePoint = point
    this.position.copy(point.position)
    this.target.copy(point.target)
  }

  private sampleTrack(points: readonly MobileCameraPoint[], time: number) {
    let previous = points[0]

    for (let index = 1; index < points.length; index += 1) {
      const next = points[index]
      const moveStart = next.at - next.move

      if (time < moveStart) {
        this.activePoint = previous
        this.position.copy(previous.position)
        this.target.copy(previous.target)
        return
      }

      if (time <= next.at) {
        const progress = smootherstep((time - moveStart) / next.move)
        this.activePoint = next
        this.position.lerpVectors(previous.position, next.position, progress)
        this.target.lerpVectors(previous.target, next.target, progress)
        return
      }

      previous = next
    }

    this.activePoint = previous
    this.position.copy(previous.position)
    this.target.copy(previous.target)
  }
}
