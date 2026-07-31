import type { CameraPointTemplate } from './MobileCameraStory.ts'
import {
  CORNER_LIFT_DURATION,
  EDGE_ROLL_DURATION,
} from './SpinSimulation.ts'

// The whole assembly frame, not only the solid nucleus, enters from beyond
// the right edge on the same screen-height line as the original arrival.
// This is the arrival camera's screen-right basis multiplied by 36, so it
// produces a long horizontal drive instead of a decorative diagonal. Applying
// one shared translation keeps every precomputed cubelet path and collision
// relationship intact. The steep remainder makes the lead surge hard, then
// lose momentum as the first waves catch it; the offset is gone before lock.
export const DESKTOP_ASSEMBLY_LEAD_START = [-34.71, 0, -9.53] as const
export const DESKTOP_ASSEMBLY_LEAD_SETTLE_PROGRESS = 0.48
export const desktopAssemblyLeadRemaining = (progress: number) => {
  const travel = Math.min(
    1,
    Math.max(0, progress / DESKTOP_ASSEMBLY_LEAD_SETTLE_PROGRESS),
  )
  return (1 - travel) ** 7
}

// Desktop reuses the portrait CameraStory engine with a restrained authored
// track. Assembly is photographed from the reverse-Z flank, so the precomputed
// negative-X launches begin beyond the right edge and chase the visible seed
// into the open field. One continuous arrival-to-lock move lets the seed drift
// left while the rest of the system catches and joins it in flight. Roll and
// corner-lift moves use the exact physics durations so camera and subject start
// and land together. The spin shot resolves into a stable reverse-flank
// isometric view, exposing three faces and the first separation gaps instead
// of flattening the system against a perpendicular Z-axis view. From orbit onward
// the camera follows one clockwise arc around the subject, then settles into a
// positive-flank overview before the existing UI handoff brings the system to
// its final medium-close framing. That framing is then held through plate
// release and idle; there is no second camera move after the action has ended.
// `driftEnabled: false` is set in HeroScene.tsx, so there is no unbounded idle
// orbit. This restores the final system's visual weight without enlarging the
// assembly, changing sceneScale, or adding anything to the mobile story.

export const DESKTOP_ASSEMBLY_POINTS: readonly CameraPointTemplate[] = [
  {
    id: 'arrival',
    clock: 'assembly',
    at: 0,
    move: 0,
    anchor: 'assembly',
    target: [4.8, 0.2, 0],
    offset: [2.8, 3.2, -10.2],
    title: 'Точка отсчёта',
    story: 'Почти пустой кадр встречает ведущий куб справа; остальные скрыты за границей и догоняют его коротким гиперпрыжком.',
  },
  {
    id: 'lock',
    clock: 'assembly',
    at: 1,
    move: 1,
    anchor: 'assembly',
    target: [3.1, 0.2, 0],
    offset: [2.4, 2.9, -8.8],
    title: 'Замыкание',
    story: 'Один синхронный пролёт удерживает сборку справа и заканчивается вместе с последним присоединившимся кубиком.',
  },
]

export const DESKTOP_MOTION_POINTS: readonly CameraPointTemplate[] = [
  {
    id: 'weight',
    clock: 'motion',
    at: 0,
    move: 0,
    anchor: 'assembly',
    target: [3.1, 0.2, 0],
    offset: [2.4, 2.9, -8.8],
    title: 'Появление веса',
    story: 'Собранная система получает вес без разрыва ракурса после последнего прилетевшего кубика.',
  },
  {
    id: 'roll',
    clock: 'motion',
    at: 'roll',
    move: EDGE_ROLL_DURATION,
    anchor: 'settled',
    target: [3, 0.32, 0],
    offset: [1.5, 2.3, -8],
    title: 'Перекат',
    story: 'Камера трекает перенос центра и садится ниже ровно от первого касания до конца переката.',
  },
  {
    id: 'diamond',
    clock: 'motion',
    at: 'diamond',
    move: CORNER_LIFT_DURATION,
    anchor: 'settled',
    target: [3, 0.72, 0],
    offset: [1.25, 2.7, -8.4],
    title: 'Баланс',
    story: 'Подъём камеры длится ровно столько же, сколько подъём куба на угол, и вместе с ним приходит в точку баланса.',
  },
  {
    id: 'spin',
    clock: 'motion',
    at: 'spin',
    move: 0.55,
    anchor: 'settled',
    target: [2.5, -0.5, 0],
    offset: [-5, 5, -5],
    title: 'Импульс',
    story: 'К началу полного вращения камера приходит в изометрию с обратного фланга: одновременно читаются три грани и будущие зазоры разлёта.',
  },
  {
    id: 'orbit',
    clock: 'motion',
    at: 'orbit',
    move: 0.5,
    anchor: 'settled',
    target: [3.15, -0.8, 0],
    offset: [-5.4, 5.4, -5.4],
    title: 'Раскрытие порядка',
    story: 'Разлёт остаётся крупным: камера даёт лишь небольшой запас, а крайние элементы намеренно перерастают границы кадра.',
  },
  {
    id: 'ignition',
    clock: 'motion',
    at: 'ignition',
    move: 1.2,
    anchor: 'settled',
    target: [4.23, 1, 1.54],
    offset: [4.6, 4.5, -12.65],
    title: 'Источник',
    story: 'Первый участок круговой дуги раскрывает глубину роя, не теряя ни крайние элементы, ни источник.',
  },
  {
    id: 'capture',
    clock: 'motion',
    at: 'capture',
    move: 1.1,
    anchor: 'settled',
    target: [2.828, 0.55, 2.828],
    offset: [9.2, 3.9, -9.2],
    title: 'Новая форма',
    story: 'Камера продолжает ту же дугу до диагонали и удерживает стягивающуюся форму целиком справа.',
  },
  {
    id: 'shell',
    clock: 'motion',
    at: 'shell',
    move: 1,
    anchor: 'settled',
    target: [0.95, 0.65, 2.85],
    offset: [9, 4.1, -3],
    title: 'Сферическая оболочка',
    story: 'Дуга проходит боковой ракурс и даёт завершённой оболочке широкий витринный кадр.',
  },
  {
    id: 'reactor',
    clock: 'motion',
    at: 'reactor',
    move: 0.62,
    anchor: 'settled',
    target: [-1.16, 0.5, 2.33],
    offset: [8, 2.65, 4],
    title: 'Поверхность становится технологией',
    story: 'Камера дожидается полной остановки и исчезновения текстолита; новая дуга начинается ровно вместе с морфом чистых плит.',
  },
  {
    id: 'overview',
    clock: 'motion',
    at: 'inversion',
    move: 1.15,
    anchor: 'settled',
    target: [-1.508, 0.434, 3.029],
    offset: [9.2, 9.2, 9.2],
    title: 'Собранная система',
    story: 'Камера отходит в чистую изометрию: внешняя оболочка плит остаётся вокруг сердцевины и внутренней сетки перед волной сигнала.',
  },
  {
    id: 'handoff',
    clock: 'motion',
    at: 'handoff',
    // Starts exactly when the overview arrives; a longer window overlaps the
    // previous move and makes the director enter this path partway through.
    move: 0.6,
    anchor: 'settled',
    target: [-2.5864, 0, 0],
    offset: [4.68, 4.42, 9.36],
    title: 'Выход в интерфейс',
    story: 'Существующий handoff сразу приводит систему к финальному крупному кадру и удерживает его во время исчезновения плит и последующего idle.',
  },
]
