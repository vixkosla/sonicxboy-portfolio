import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import {
  BackSide,
  BoxGeometry,
  Color,
  Euler,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Scene,
  Vector3,
} from 'three'
import type {
  Camera,
  Group,
  InstancedMesh,
  PointLight,
  SpotLight,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  CUBE_SIZE,
  CUBE_STEP,
  CUBELET_COUNT,
  LayeredAssembly,
} from '../lib/LayeredAssembly'
import {
  createAssemblyInnerMaterial,
  createAssemblySeamMaterial,
  updateAssemblySeamMaterial,
} from '../lib/AssemblyGlow'
import {
  FLASH_GEOMETRY,
  PLASMA_EXPANDED_GEOMETRY,
  PLASMA_GEOMETRY,
  PLASMA_RADIUS,
  createFlashMaterial,
  createGridMaterial,
  createPlasmaMaterial,
  updateFlashMaterial,
  updateGridMaterial,
  updatePlasmaMaterial,
} from '../lib/FireEffect'
import {
  CORNER_LIFT_DURATION,
  EDGE_ROLL_DURATION,
  MAIN_SPIN_START,
  SpinSimulation,
} from '../lib/SpinSimulation'
import {
  CONDUCTIVE_METALNESS,
  CONDUCTIVE_ROUGHNESS,
  REACTOR_METALNESS,
  REACTOR_ROUGHNESS,
  createMetamaterial,
  enableReactorCircuitSurface,
  updateReactorCircuitSurface,
  updateReactorMetamaterial,
  updateStructuralMetamaterial,
} from '../lib/ReactorMetamaterial'

const EMERALD = new Color('#18d383')
const WAVE_BLUE = new Color('#244cff')
const SIGNAL_RED = new Color('#f2383f')
const UP = new Vector3(0, 1, 0)
const ROLL_AXIS = new Vector3(0, 0, 1)
const PRECESSION_AXIS = new Vector3(1, 0, 0)
const IDENTITY_ORIENTATION = new Quaternion()
const CORNER = new Vector3(-1, 1, 1).normalize()
const ROLL_ORIENTATION = new Quaternion().setFromAxisAngle(
  ROLL_AXIS,
  -Math.PI / 2,
)
const DIAMOND_ORIENTATION = new Quaternion()
  .setFromAxisAngle(UP, -Math.PI / 6)
  .multiply(new Quaternion().setFromUnitVectors(CORNER, UP))

const INITIAL_X = 1.2
const CUBE_EDGE_RADIUS = 0.0225
const ASSEMBLY_OUTER_SIZE = CUBE_STEP * 2 + CUBE_SIZE
const ASSEMBLY_SEAM_SIZE = ASSEMBLY_OUTER_SIZE + 0.006
const ASSEMBLY_INNER_GLOW_SIZE = ASSEMBLY_OUTER_SIZE - 0.24
const ASSEMBLY_GLOW_LEAD = 0.1
const ASSEMBLY_GLOW_ATTACK = 0.12
const ASSEMBLY_GLOW_HOLD = 0.06
const ASSEMBLY_GLOW_RELEASE = 0.46
const SHELL_RADIUS = 1.22
const ORBIT_DEPART_DURATION = 2.05
const ORBIT_CAPTURE_START = 7.15
const ORBIT_CAPTURE_DURATION = 3.75
const ORBIT_CAPTURE_MAX_OFFSET = 0.3
const ORBIT_CAPTURE_SETTLE_PROGRESS = 0.8
const ORBIT_DETACHED_SCALE = 0.79
const ORBIT_SCALE_OUT_DURATION = 0.35
const ORBIT_SCALE_RECOVERY_END = 0.9
const ORBIT_ORIENTATION_LEAD = 2.1
const ORBIT_ORIENTATION_DURATION =
  ORBIT_ORIENTATION_LEAD +
  ORBIT_CAPTURE_DURATION * ORBIT_CAPTURE_SETTLE_PROGRESS
const ORBIT_ORIENTATION_TANGENT_SAMPLE = 1 / 1000
const ORBIT_END =
  ORBIT_CAPTURE_START +
  ORBIT_CAPTURE_MAX_OFFSET +
  ORBIT_CAPTURE_DURATION * ORBIT_SCALE_RECOVERY_END
const NUCLEUS_GRID_START = 0.65
const NUCLEUS_GRID_DURATION = 1.45
const NUCLEUS_EXPAND_START = 2.45
const NUCLEUS_EXPAND_DURATION = 2.5
const NUCLEUS_MAX_SCALE = 1.7
const PLASMA_CORE_START = 5.8
const PLASMA_CORE_DURATION = 0.24
const PLASMA_WARM_START = 7.55
const PLASMA_WARM_DURATION = 1.2
const PLASMA_RIM_START = 8.8
const PLASMA_RIM_DURATION = 1.25
const IGNITION_FLASH_ATTACK = 0.07
const IGNITION_FLASH_HOLD = 0.09
const IGNITION_FLASH_DECAY = 0.86
const ORBIT_APERTURE_START = PLASMA_CORE_START - 0.62
const ORBIT_APERTURE_DURATION = 0.82
const ORBIT_APERTURE_ROLL_SCALE = 0.72
const REACTOR_INSTANCE_COUNT = CUBELET_COUNT * 4
const REACTOR_TRANSFORM_START = ORBIT_END + 0.18
const REACTOR_MORPH_DURATION = 0.9
const REACTOR_APERTURE_START =
  REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION * 0.52
const REACTOR_APERTURE_DURATION = 0.68
const REACTOR_APERTURE_ROLL_SPEED = 0.24
const REACTOR_APERTURE_SAMPLE_COUNT = 4096
const REACTOR_DIVIDE_ONE_START =
  REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION + 0.18
const REACTOR_DIVIDE_ONE_DURATION = 1.05
const REACTOR_DIVIDE_TWO_START =
  REACTOR_DIVIDE_ONE_START + REACTOR_DIVIDE_ONE_DURATION + 0.18
const REACTOR_DIVIDE_TWO_DURATION = 1.2
const REACTOR_TRANSFORM_END =
  REACTOR_DIVIDE_TWO_START + REACTOR_DIVIDE_TWO_DURATION
const REACTOR_PARENT_WIDTH = 0.3
const REACTOR_PARENT_THICKNESS = 0.1
const REACTOR_LINEAGE_WIDTH = 0.285
const REACTOR_LINEAGE_THICKNESS = 0.08
const REACTOR_TILE_WIDTH = 0.27
const REACTOR_TILE_THICKNESS = 0.055
const REACTOR_WAVE_ONE_START = REACTOR_TRANSFORM_END + 0.7
const REACTOR_WAVE_DURATION = 0.72
const REACTOR_WAVE_GAP = 0.14
const REACTOR_WAVE_TWO_START =
  REACTOR_WAVE_ONE_START + REACTOR_WAVE_DURATION + REACTOR_WAVE_GAP
const REACTOR_WAVE_WIDTH = 0.2
const REACTOR_ROTATION_BRAKE_DURATION =
  REACTOR_WAVE_TWO_START + REACTOR_WAVE_DURATION - REACTOR_WAVE_ONE_START
const REACTOR_HERO_SELECT_TIME = REACTOR_TRANSFORM_END + 0.42
const REACTOR_SIGNAL_START = REACTOR_WAVE_TWO_START + 0.05
const REACTOR_SIGNAL_DURATION = 1.15
const REACTOR_SCATTER_START =
  REACTOR_SIGNAL_START + REACTOR_SIGNAL_DURATION + 0.05
const REACTOR_SCATTER_STAGGER = 0.72
const REACTOR_SCATTER_MAX_FLIGHT = 4.4
const HERO_PLATE_LAUNCH_START = REACTOR_SCATTER_START - 0.15
const HERO_PLATE_RECOIL_DURATION = 0.15
const HERO_PLATE_FLIGHT_DURATION = 1.55
const HERO_CARD_REVEAL =
  HERO_PLATE_LAUNCH_START + HERO_PLATE_RECOIL_DURATION + 1.27
const NUCLEUS_FINAL_EXPAND_START = REACTOR_SCATTER_START + 0.08
const NUCLEUS_FINAL_EXPAND_DURATION = 2.45
const NUCLEUS_REACTOR_SCALE = 4.35
const PLASMA_REACTOR_RADIAL_SCALE = 2.78
const PLASMA_REACTOR_PROXY_RADIAL_SCALE = 6.05
const PLASMA_REACTOR_PROXY_VERTICAL_SCALE = 13.5
const PLASMA_REACTOR_DROP = 0.17
const WAVE_AXIS_A = new Vector3(0.14, 0.98, 0.1).normalize()
const WAVE_AXIS_B = new Vector3(-0.74, 0.28, 0.61).normalize()
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface ReactorFamily {
  parentDirection: Vector3
  parentOrientation: Quaternion
  lineageDirections: Vector3[]
  lineageOrientations: Quaternion[]
  targetDirections: Vector3[]
  targetOrientations: Quaternion[]
}

interface ReactorAssignment {
  parentIndex: number
  targetIndex: number
  distance: number
}

interface ReactorTileProfile {
  direction: Vector3
  orientation: Quaternion
  ejectionDirection: Vector3
  spinAxis: Vector3
  delay: number
  speed: number
  angularSpeed: number
}

function deterministicNoise(index: number, salt: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function createRadialPlateOrientation(direction: Vector3) {
  const normal = direction.clone().normalize()
  const tangent = new Vector3().crossVectors(UP, normal)
  if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
  tangent.normalize()
  const bitangent = new Vector3().crossVectors(normal, tangent).normalize()
  const basis = new Matrix4().makeBasis(tangent, bitangent, normal)
  return new Quaternion().setFromRotationMatrix(basis)
}

function createReactorTileProfiles(families: readonly ReactorFamily[]) {
  const profiles: ReactorTileProfile[] = []

  for (let familyIndex = 0; familyIndex < families.length; familyIndex += 1) {
    const family = families[familyIndex]
    for (let slot = 0; slot < 4; slot += 1) {
      const index = familyIndex * 4 + slot
      const direction = family.targetDirections[slot]
      const tangent = new Vector3().crossVectors(direction, UP)
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
      tangent.normalize()
      const bitangent = new Vector3().crossVectors(direction, tangent).normalize()
      const tangentAmount = (deterministicNoise(index, 1) - 0.5) * 0.34
      const bitangentAmount = (deterministicNoise(index, 2) - 0.5) * 0.28
      const ejectionDirection = new Vector3()
        .copy(direction)
        .multiplyScalar(0.95)
        .addScaledVector(tangent, tangentAmount)
        .addScaledVector(bitangent, bitangentAmount)
        .normalize()
      const spinAxis = new Vector3()
        .copy(tangent)
        .multiplyScalar(0.65 + deterministicNoise(index, 3) * 0.35)
        .addScaledVector(bitangent, deterministicNoise(index, 4) - 0.5)
        .normalize()

      profiles.push({
        direction,
        orientation: family.targetOrientations[slot],
        ejectionDirection,
        spinAxis,
        delay: deterministicNoise(index, 5) * REACTOR_SCATTER_STAGGER,
        speed: 1.25 + deterministicNoise(index, 6) * 0.72,
        angularSpeed: 1.7 + deterministicNoise(index, 7) * 3.1,
      })
    }
  }

  return profiles
}

function createFibonacciDirections(count: number) {
  const directions: Vector3[] = []
  for (let index = 0; index < count; index += 1) {
    const vertical = 1 - (2 * (index + 0.5)) / count
    const horizontal = Math.sqrt(1 - vertical * vertical)
    const angle = GOLDEN_ANGLE * index
    directions.push(
      new Vector3(
        Math.cos(angle) * horizontal,
        vertical,
        Math.sin(angle) * horizontal,
      ),
    )
  }
  return directions
}

function createReactorFamilies(parentTargets: readonly Vector3[]) {
  const parents = parentTargets.map((target) => target.clone().normalize())
  const targets = createFibonacciDirections(REACTOR_INSTANCE_COUNT)
  const candidates: ReactorAssignment[] = []

  parents.forEach((parent, parentIndex) => {
    targets.forEach((target, targetIndex) => {
      candidates.push({
        parentIndex,
        targetIndex,
        distance: 1 - parent.dot(target),
      })
    })
  })
  candidates.sort((left, right) => left.distance - right.distance)

  const buckets = Array.from(
    { length: CUBELET_COUNT },
    () => [] as number[],
  )
  const assigned = new Uint8Array(REACTOR_INSTANCE_COUNT)

  for (const candidate of candidates) {
    if (
      assigned[candidate.targetIndex] === 0 &&
      buckets[candidate.parentIndex].length < 4
    ) {
      buckets[candidate.parentIndex].push(candidate.targetIndex)
      assigned[candidate.targetIndex] = 1
    }
  }

  return buckets.map((targetIndices, parentIndex): ReactorFamily => {
    const pairingOptions = [
      [targetIndices[0], targetIndices[1], targetIndices[2], targetIndices[3]],
      [targetIndices[0], targetIndices[2], targetIndices[1], targetIndices[3]],
      [targetIndices[0], targetIndices[3], targetIndices[1], targetIndices[2]],
    ]
    let orderedTargets = pairingOptions[0]
    let pairingDistance = Number.POSITIVE_INFINITY

    for (const option of pairingOptions) {
      const distance =
        2 - targets[option[0]].dot(targets[option[1]]) -
        targets[option[2]].dot(targets[option[3]])
      if (distance < pairingDistance) {
        pairingDistance = distance
        orderedTargets = option
      }
    }

    const targetDirections = orderedTargets.map((index) => targets[index])
    const lineageDirections = [
      new Vector3()
        .addVectors(targetDirections[0], targetDirections[1])
        .normalize(),
      new Vector3()
        .addVectors(targetDirections[2], targetDirections[3])
        .normalize(),
    ]
    const parentDirection = parents[parentIndex]

    return {
      parentDirection,
      parentOrientation: createRadialPlateOrientation(parentDirection),
      lineageDirections,
      lineageOrientations: lineageDirections.map((direction) =>
        createRadialPlateOrientation(direction),
      ),
      targetDirections,
      targetOrientations: targetDirections.map((direction) =>
        createRadialPlateOrientation(direction),
      ),
    }
  })
}

interface ReactorApertureDirections {
  parent: Vector3
  lineage: Vector3
  target: Vector3
}

function findLargestSphericalGap(
  directions: readonly Vector3[],
  candidates: readonly Vector3[],
) {
  let bestDirection = candidates[0]
  let bestNearestDot = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    let nearestDot = Number.NEGATIVE_INFINITY
    for (const direction of directions) {
      nearestDot = Math.max(nearestDot, candidate.dot(direction))
    }
    if (nearestDot < bestNearestDot) {
      bestNearestDot = nearestDot
      bestDirection = candidate
    }
  }

  return bestDirection.clone()
}

function createReactorApertureDirections(
  families: readonly ReactorFamily[],
): ReactorApertureDirections {
  const parentDirections: Vector3[] = []
  const lineageDirections: Vector3[] = []
  const targetDirections: Vector3[] = []

  for (const family of families) {
    parentDirections.push(family.parentDirection)
    lineageDirections.push(...family.lineageDirections)
    targetDirections.push(...family.targetDirections)
  }

  const candidates = createFibonacciDirections(REACTOR_APERTURE_SAMPLE_COUNT)
  return {
    parent: findLargestSphericalGap(parentDirections, candidates),
    lineage: findLargestSphericalGap(lineageDirections, candidates),
    target: findLargestSphericalGap(targetDirections, candidates),
  }
}

interface OrbitGroup {
  indices: readonly number[]
  axis: Vector3
  finalOrientation: Quaternion
  radiusScale: number
  start: number
  speed: number
  captureOffset: number
  apertureDirection: Vector3
  aperturePhase: number
}

function createOrbitGroup(
  indices: readonly number[],
  axis: Vector3,
  finalOrientation: Quaternion,
  radiusScale: number,
  start: number,
  speed: number,
  captureOffset: number,
  apertureDirection: Vector3,
  aperturePhase: number,
): OrbitGroup {
  return {
    indices,
    axis: axis.normalize(),
    finalOrientation: finalOrientation.normalize(),
    radiusScale,
    start,
    speed,
    captureOffset,
    apertureDirection: apertureDirection.normalize(),
    aperturePhase,
  }
}

const ORBIT_GROUPS = [
  createOrbitGroup(
    [18, 19, 20, 22, 25, 23, 21, 24],
    new Vector3(0.18, 0.94, 0.29),
    new Quaternion(0.5, -0.5, 0.5, -0.5),
    3.35,
    0.45,
    Math.PI * 0.28,
    0,
    new Vector3(0, 0, 1),
    0,
  ),
  createOrbitGroup(
    [6, 7, 8, 9, 10, 11, 13, 14, 15, 17, 16, 12],
    new Vector3(-0.62, 0.48, 0.62),
    new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2),
    2.35,
    1.45,
    -Math.PI * 0.24,
    0.15,
    new Vector3(0, 0, 1),
    Math.PI * 0.27,
  ),
  createOrbitGroup(
    [0, 1, 3, 2, 4, 5],
    new Vector3(0.71, 0.25, -0.66),
    new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2),
    1.35,
    2.45,
    Math.PI * 0.32,
    0.3,
    new Vector3(1, 1, 1),
    -Math.PI * 0.19,
  ),
]

// The title receives one paint pass at each horizontal crossing of the widest
// orbit. Starting at pi/2 gives three visible crossings before capture instead
// of skipping the first approach; every stage name is unique so CSS restarts.
const TITLE_ORBIT = ORBIT_GROUPS[0]
const TITLE_WAVE_FIRST_PHASE = Math.PI * 0.5
const TITLE_WAVE_PHASE_STEP = Math.PI
const TITLE_WAVE_TIMES = [
  TITLE_ORBIT.start + TITLE_WAVE_FIRST_PHASE / Math.abs(TITLE_ORBIT.speed),
  TITLE_ORBIT.start +
    (TITLE_WAVE_FIRST_PHASE + TITLE_WAVE_PHASE_STEP) /
      Math.abs(TITLE_ORBIT.speed),
  TITLE_ORBIT.start +
    (TITLE_WAVE_FIRST_PHASE + TITLE_WAVE_PHASE_STEP * 2) /
      Math.abs(TITLE_ORBIT.speed),
] as const
const TITLE_WAVE_STAGES = [
  'outer-approach',
  'outer-near',
  'outer-return',
] as const

const ORBIT_GROUP_BY_INDEX = new Map<number, OrbitGroup>()
for (const group of ORBIT_GROUPS) {
  for (const index of group.indices) ORBIT_GROUP_BY_INDEX.set(index, group)
}

interface OrbitOrientationCurve {
  start: Quaternion
  tangent: Quaternion
}

function setFreeOrbitOrientation(
  localTime: number,
  slot: number,
  euler: Euler,
  output: Quaternion,
) {
  euler.set(
    localTime * (0.16 + slot * 0.006),
    localTime * (0.24 + slot * 0.005),
    localTime * (0.13 + slot * 0.007),
  )
  return output.setFromEuler(euler)
}

function createOrbitOrientationCurves() {
  const curves: OrbitOrientationCurve[] = Array.from(
    { length: CUBELET_COUNT },
    () => ({ start: new Quaternion(), tangent: new Quaternion() }),
  )
  const euler = new Euler()
  const next = new Quaternion()
  const delta = new Quaternion()
  const controlDelta = new Quaternion()
  const axis = new Vector3()

  for (const orbitGroup of ORBIT_GROUPS) {
    const orientationStart =
      ORBIT_CAPTURE_START +
      orbitGroup.captureOffset -
      ORBIT_ORIENTATION_LEAD

    orbitGroup.indices.forEach((motionIndex, slot) => {
      const localTime = orientationStart - orbitGroup.start
      const curve = curves[motionIndex]
      const symmetrySlot = slot % (orbitGroup.indices.length / 2)

      setFreeOrbitOrientation(
        localTime,
        symmetrySlot,
        euler,
        curve.start,
      )
      setFreeOrbitOrientation(
        localTime + ORBIT_ORIENTATION_TANGENT_SAMPLE,
        symmetrySlot,
        euler,
        next,
      )
      delta.copy(curve.start).invert().multiply(next).normalize()
      if (delta.w < 0) {
        delta.set(-delta.x, -delta.y, -delta.z, -delta.w)
      }

      const angle = 2 * Math.acos(Math.min(1, Math.max(-1, delta.w)))
      const sinHalfAngle = Math.sqrt(Math.max(0, 1 - delta.w * delta.w))
      if (sinHalfAngle < 1e-8) {
        axis.set(1, 0, 0)
      } else {
        axis.set(
          delta.x / sinHalfAngle,
          delta.y / sinHalfAngle,
          delta.z / sinHalfAngle,
        )
      }

      controlDelta.setFromAxisAngle(
        axis,
        (angle * ORBIT_ORIENTATION_DURATION) /
          (3 * ORBIT_ORIENTATION_TANGENT_SAMPLE),
      )
      curve.tangent.copy(curve.start).multiply(controlDelta).normalize()
    })
  }

  return curves
}

const ORBIT_ORIENTATION_CURVES = createOrbitOrientationCurves()

function setOrbitOrientationCurve(
  curve: OrbitOrientationCurve,
  progress: number,
  output: Quaternion,
  scratch: Quaternion[],
) {
  const [levelA, levelB, levelC, levelD, levelE] = scratch

  levelA.slerpQuaternions(curve.start, curve.tangent, progress)
  levelB.slerpQuaternions(curve.tangent, IDENTITY_ORIENTATION, progress)
  levelC.copy(IDENTITY_ORIENTATION)
  levelD.slerpQuaternions(levelA, levelB, progress)
  levelE.slerpQuaternions(levelB, levelC, progress)
  return output.slerpQuaternions(levelD, levelE, progress)
}

const smoothstep = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  return progress * progress * (3 - 2 * progress)
}

const smootherstep = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  return (
    progress *
    progress *
    progress *
    (progress * (progress * 6 - 15) + 10)
  )
}

const capturestep = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  if (progress <= 0.5) return smootherstep(progress)
  if (progress >= ORBIT_CAPTURE_SETTLE_PROGRESS) return 1

  const normalized =
    (progress - 0.5) / (ORBIT_CAPTURE_SETTLE_PROGRESS - 0.5)
  return (
    0.5 +
    0.5625 * normalized +
    1.625 * normalized ** 3 -
    3 * normalized ** 4 +
    1.3125 * normalized ** 5
  )
}

function travelingWave(
  mainElapsed: number,
  start: number,
  direction: Vector3,
  axis: Vector3,
  reverse = false,
) {
  const progress = (mainElapsed - start) / REACTOR_WAVE_DURATION
  if (progress < 0 || progress > 1) return 0
  const coordinate = direction.dot(axis) * 0.5 + 0.5
  const arrival = reverse ? 1 - coordinate : coordinate
  const waveCenter =
    -REACTOR_WAVE_WIDTH + progress * (1 + REACTOR_WAVE_WIDTH * 2)
  return smootherstep(
    1 - Math.abs(waveCenter - arrival) / REACTOR_WAVE_WIDTH,
  )
}

function setCubicBezier(
  output: Vector3,
  start: Vector3,
  controlA: Vector3,
  controlB: Vector3,
  end: Vector3,
  progress: number,
) {
  const inverse = 1 - progress
  const startWeight = inverse * inverse * inverse
  const controlAWeight = 3 * inverse * inverse * progress
  const controlBWeight = 3 * inverse * progress * progress
  const endWeight = progress * progress * progress
  return output
    .copy(start)
    .multiplyScalar(startWeight)
    .addScaledVector(controlA, controlAWeight)
    .addScaledVector(controlB, controlBWeight)
    .addScaledVector(end, endWeight)
}

interface AssemblyCubeProps {
  cardRef: RefObject<HTMLElement | null>
}

function AssemblyCube({ cardRef }: AssemblyCubeProps) {
  const groupRef = useRef<Group>(null)
  const nucleusFrameRef = useRef<Group>(null)
  const plasmaRef = useRef<Mesh>(null)
  const meshRef = useRef<InstancedMesh>(null)
  const orbitMeshRef = useRef<InstancedMesh>(null)
  const reactorMeshRef = useRef<InstancedMesh>(null)
  const heroPlateRef = useRef<Mesh>(null)
  const plasmaLightRef = useRef<PointLight>(null)
  const heroPlateLightRef = useRef<PointLight>(null)
  const selectedPlateIndex = useRef(-1)
  const heroLaunchCaptured = useRef(false)
  const cardRevealed = useRef(false)
  const titleWaveStep = useRef(0)
  const reactorApertureFrozen = useRef(false)
  const transform = useMemo(() => new Object3D(), [])
  const orbitTransform = useMemo(() => new Object3D(), [])
  const reactorTransform = useMemo(() => new Object3D(), [])
  const heroFacingTransform = useMemo(() => new Object3D(), [])
  const reactorColor = useMemo(() => new Color(), [])
  const reactorSpinOrientation = useMemo(() => new Quaternion(), [])
  const reactorWorldPosition = useMemo(() => new Vector3(), [])
  const reactorScreenPosition = useMemo(() => new Vector3(), [])
  const selectionWorldDirection = useMemo(() => new Vector3(), [])
  const centerToCamera = useMemo(() => new Vector3(), [])
  const cameraForward = useMemo(() => new Vector3(), [])
  const cameraRight = useMemo(() => new Vector3(), [])
  const cameraUp = useMemo(() => new Vector3(), [])
  const heroStartPosition = useMemo(() => new Vector3(), [])
  const heroStartNormal = useMemo(() => new Vector3(), [])
  const heroControlA = useMemo(() => new Vector3(), [])
  const heroControlB = useMemo(() => new Vector3(), [])
  const heroEndPosition = useMemo(() => new Vector3(), [])
  const heroStartOrientation = useMemo(() => new Quaternion(), [])
  const heroFacingOrientation = useMemo(() => new Quaternion(), [])
  const plasmaWorldCenter = useMemo(() => new Vector3(), [])
  const plasmaProxyCenter = useMemo(() => new Vector3(), [])
  const plasmaWorldRadii = useMemo(() => new Vector3(), [])
  const compact = useThree((state) => state.size.width < 720)
  const setDpr = useThree((state) => state.setDpr)
  const sceneScale = compact ? 0.82 : 1.3
  const contactHalfExtent = (CUBE_SIZE / 2 + CUBE_STEP) * sceneScale
  const rollDistance = contactHalfExtent * 2
  const diamondLift = contactHalfExtent * (Math.sqrt(3) - 1)
  const previewStage = useMemo(
    () =>
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('plasma-preview')
        ? new URLSearchParams(window.location.search).get('plasma-preview')
        : null,
    [],
  )
  const previewAssemblyGlow = useMemo(
    () =>
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('assembly-glow-preview'),
    [],
  )
  const previewMaterialBaseline = useMemo(
    () =>
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('material-baseline'),
    [],
  )
  const previewPlasma = previewStage !== null
  useLayoutEffect(() => {
    setDpr(
      compact
        ? 1
        : Math.min(window.devicePixelRatio, 1.5),
    )
  }, [compact, setDpr])
  const assembly = useMemo(() => {
    const simulation = new LayeredAssembly()
    if (previewAssemblyGlow) simulation.time = simulation.endTime + 0.04
    else if (previewPlasma) simulation.time = simulation.endTime + 0.1
    return simulation
  }, [previewAssemblyGlow, previewPlasma])
  const reactorFamilies = useMemo(
    () => createReactorFamilies(assembly.motions.map((motion) => motion.target)),
    [assembly],
  )
  const reactorTiles = useMemo(
    () => createReactorTileProfiles(reactorFamilies),
    [reactorFamilies],
  )
  const reactorApertureDirections = useMemo(
    () => createReactorApertureDirections(reactorFamilies),
    [reactorFamilies],
  )
  const spin = useMemo(() => {
    const simulation = new SpinSimulation()
    if (previewPlasma) {
      const numericPreview = previewStage === '' ? Number.NaN : Number(previewStage)
      const previewMainElapsed = Number.isFinite(numericPreview)
        ? numericPreview
        : previewStage === 'grid'
          ? NUCLEUS_EXPAND_START + 1.25
          : previewStage === 'flash'
            ? PLASMA_CORE_START + 0.12
            : previewStage === 'core'
              ? PLASMA_WARM_START - 0.28
              : previewStage === 'warm'
                ? PLASMA_RIM_START - 0.2
                : previewStage === 'reactor'
                  ? REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION * 0.55
                  : previewStage === 'divide'
                    ? REACTOR_DIVIDE_ONE_START + REACTOR_DIVIDE_ONE_DURATION * 0.7
                    : previewStage === 'tiles'
                      ? REACTOR_TRANSFORM_END + 0.6
                      : previewStage === 'waves'
                        ? REACTOR_WAVE_ONE_START + REACTOR_WAVE_DURATION * 0.54
                        : previewStage === 'signal'
                          ? REACTOR_SIGNAL_START + REACTOR_SIGNAL_DURATION * 0.48
                          : previewStage === 'scatter'
                            ? REACTOR_SCATTER_START + 0.72
                            : previewStage === 'card'
                              ? HERO_CARD_REVEAL + 0.42
                              : REACTOR_SCATTER_START +
                                REACTOR_SCATTER_STAGGER +
                                REACTOR_SCATTER_MAX_FLIGHT +
                                0.2
      simulation.elapsed = MAIN_SPIN_START + previewMainElapsed
      simulation.settled = true
    }
    return simulation
  }, [previewPlasma, previewStage])
  const cubeletMaterial = useMemo(
    () =>
      createMetamaterial(
        previewMaterialBaseline
          ? { color: '#18d383', metalness: 0.24, roughness: 0.28 }
          : undefined,
      ),
    [previewMaterialBaseline],
  )
  const nucleusMaterial = useMemo(
    () =>
      createMetamaterial(
        previewMaterialBaseline
          ? {
              color: '#18d383',
              metalness: 0.24,
              roughness: 0.28,
              emissive: '#6cf3b3',
              transparent: true,
            }
          : { emissive: '#6cf3b3', transparent: true },
      ),
    [previewMaterialBaseline],
  )
  const assemblySeamMaterial = useMemo(
    () => createAssemblySeamMaterial(),
    [],
  )
  const assemblyInnerMaterial = useMemo(
    () => createAssemblyInnerMaterial(),
    [],
  )
  const gridMaterial = useMemo(() => createGridMaterial(), [])
  const plasmaMaterial = useMemo(() => createPlasmaMaterial(), [])
  const flashMaterial = useMemo(() => createFlashMaterial(), [])
  const reactorMaterial = useMemo(
    () => {
      const material = createMetamaterial({
        color: '#ffffff',
        metalness: previewMaterialBaseline ? 0.24 : CONDUCTIVE_METALNESS,
        roughness: previewMaterialBaseline ? 0.28 : CONDUCTIVE_ROUGHNESS,
        emissive: previewMaterialBaseline ? '#042b20' : '#063d2b',
      })
      return previewMaterialBaseline
        ? material
        : enableReactorCircuitSurface(material)
    },
    [previewMaterialBaseline],
  )
  const heroPlateMaterial = useMemo(
    () => {
      const material = createMetamaterial({
        color: '#18d383',
        metalness: previewMaterialBaseline ? 0.42 : REACTOR_METALNESS,
        roughness: previewMaterialBaseline ? 0.18 : REACTOR_ROUGHNESS,
        emissive: '#f2383f',
        transparent: true,
      })
      return previewMaterialBaseline
        ? material
        : enableReactorCircuitSurface(material)
    },
    [previewMaterialBaseline],
  )
  const spinOrientation = useMemo(() => new Quaternion(), [])
  const tiltOrientation = useMemo(() => new Quaternion(), [])
  const precessionOrientation = useMemo(() => new Quaternion(), [])
  const nutationOrientation = useMemo(() => new Quaternion(), [])
  const classOrbitOrientation = useMemo(() => new Quaternion(), [])
  const classShapeOrientation = useMemo(() => new Quaternion(), [])
  const classTargetOrientation = useMemo(() => new Quaternion(), [])
  const apertureAlignOrientation = useMemo(() => new Quaternion(), [])
  const apertureRollOrientation = useMemo(() => new Quaternion(), [])
  const apertureTargetOrientation = useMemo(() => new Quaternion(), [])
  const reactorApertureDirection = useMemo(() => new Vector3(), [])
  const reactorLocalViewDirection = useMemo(() => new Vector3(), [])
  const reactorInverseGroupOrientation = useMemo(() => new Quaternion(), [])
  const reactorApertureAlignOrientation = useMemo(() => new Quaternion(), [])
  const reactorApertureRollOrientation = useMemo(() => new Quaternion(), [])
  const reactorApertureTargetOrientation = useMemo(() => new Quaternion(), [])
  const reactorApertureOrientation = useMemo(() => new Quaternion(), [])
  const orbitSpinOrientation = useMemo(() => new Quaternion(), [])
  const orbitOrientationScratch = useMemo(
    () => Array.from({ length: 5 }, () => new Quaternion()),
    [],
  )
  const orbitEuler = useMemo(() => new Euler(), [])
  const cubeletGeometry = useMemo(
    () =>
      previewMaterialBaseline
        ? new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
        : mergeVertices(
            new RoundedBoxGeometry(
              CUBE_SIZE,
              CUBE_SIZE,
              CUBE_SIZE,
              1,
              CUBE_EDGE_RADIUS,
            ),
          ),
    [previewMaterialBaseline],
  )
  const reactorPlateGeometry = useMemo(
    () => new BoxGeometry(1, 1, 1),
    [],
  )

  const syncInstances = (mainElapsed = -1) => {
    const mesh = meshRef.current
    if (!mesh) return

    const shellComplete = mainElapsed >= ORBIT_END

    assembly.motions.forEach((motion, index) => {
      assembly.getPosition(index, transform.position)
      if (shellComplete) {
        transform.position
          .copy(motion.target)
          .normalize()
          .multiplyScalar(SHELL_RADIUS)
      }

      const orbitGroup = ORBIT_GROUP_BY_INDEX.get(index)
      const launched =
        orbitGroup !== undefined &&
        mainElapsed > orbitGroup.start &&
        !shellComplete

      transform.rotation.set(0, 0, 0)
      const reactorHandoff = mainElapsed >= REACTOR_TRANSFORM_START
      transform.scale.setScalar(launched || reactorHandoff ? 0 : 1)
      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  }

  const syncOrbiters = (
    group: Group,
    camera: Camera,
    mainElapsed: number,
  ) => {
    const mesh = orbitMeshRef.current
    if (!mesh) return

    const apertureProgress = smootherstep(
      (mainElapsed - ORBIT_APERTURE_START) / ORBIT_APERTURE_DURATION,
    )
    centerToCamera.copy(camera.position).sub(group.position).normalize()

    for (const orbitGroup of ORBIT_GROUPS) {
      const orbitRadius = contactHalfExtent * orbitGroup.radiusScale
      const sourceRadius =
        assembly.motions[orbitGroup.indices[0]].target.length() * sceneScale
      const captureStart = ORBIT_CAPTURE_START + orbitGroup.captureOffset
      const orientationStart = captureStart - ORBIT_ORIENTATION_LEAD
      const localTime = mainElapsed - orbitGroup.start
      let shapeRadius = orbitRadius
      let detachedScale = ORBIT_DETACHED_SCALE

      classOrbitOrientation
        .setFromAxisAngle(orbitGroup.axis, localTime * orbitGroup.speed)
        .multiply(group.quaternion)

      // Once ignition begins, steer each rigid symmetry class toward a
      // camera-facing aperture. The follow-up roll is around the view ray,
      // so projected clearance around the core stays constant while the
      // polyhedron visibly keeps orbiting. Opposite pairs remain opposite.
      if (apertureProgress > 0) {
        apertureAlignOrientation.setFromUnitVectors(
          orbitGroup.apertureDirection,
          centerToCamera,
        )
        apertureRollOrientation.setFromAxisAngle(
          centerToCamera,
          localTime * orbitGroup.speed * ORBIT_APERTURE_ROLL_SCALE +
            orbitGroup.aperturePhase,
        )
        apertureTargetOrientation
          .copy(apertureRollOrientation)
          .multiply(apertureAlignOrientation)
        classOrbitOrientation.slerp(
          apertureTargetOrientation,
          apertureProgress,
        )
      }

      if (localTime < ORBIT_DEPART_DURATION) {
        const departEnvelope = smootherstep(
          localTime / ORBIT_DEPART_DURATION,
        )
        classShapeOrientation.slerpQuaternions(
          group.quaternion,
          classOrbitOrientation,
          departEnvelope,
        )
        shapeRadius =
          sourceRadius + (orbitRadius - sourceRadius) * departEnvelope
        detachedScale =
          1 +
          (ORBIT_DETACHED_SCALE - 1) *
            smootherstep(localTime / ORBIT_SCALE_OUT_DURATION)
      } else if (mainElapsed < captureStart) {
        classShapeOrientation.copy(classOrbitOrientation)
      } else {
        const captureProgress =
          (mainElapsed - captureStart) / ORBIT_CAPTURE_DURATION
        const captureEnvelope = capturestep(captureProgress)

        classTargetOrientation
          .copy(group.quaternion)
          .multiply(orbitGroup.finalOrientation)
        classShapeOrientation.slerpQuaternions(
          classOrbitOrientation,
          classTargetOrientation,
          captureEnvelope,
        )
        shapeRadius =
          orbitRadius +
          (SHELL_RADIUS * sceneScale - orbitRadius) * captureEnvelope
        detachedScale =
          ORBIT_DETACHED_SCALE +
          smootherstep(
            (captureProgress - ORBIT_CAPTURE_SETTLE_PROGRESS) /
              (ORBIT_SCALE_RECOVERY_END -
                ORBIT_CAPTURE_SETTLE_PROGRESS),
          ) *
            (1 - ORBIT_DETACHED_SCALE)
      }

      orbitGroup.indices.forEach((motionIndex, slot) => {
        const active = localTime > 0 && mainElapsed < ORBIT_END
        orbitTransform.scale.setScalar(0)

        if (active) {
          const target = assembly.motions[motionIndex].target
          orbitTransform.position
            .copy(target)
            .normalize()
            .multiplyScalar(shapeRadius)
            .applyQuaternion(classShapeOrientation)
            .add(group.position)

          const orientationProgress =
            (mainElapsed - orientationStart) / ORBIT_ORIENTATION_DURATION
          const symmetrySlot = slot % (orbitGroup.indices.length / 2)
          if (orientationProgress <= 0) {
            setFreeOrbitOrientation(
              localTime,
              symmetrySlot,
              orbitEuler,
              orbitSpinOrientation,
            )
          } else if (orientationProgress >= 1) {
            orbitSpinOrientation.copy(IDENTITY_ORIENTATION)
          } else {
            setOrbitOrientationCurve(
              ORBIT_ORIENTATION_CURVES[motionIndex],
              orientationProgress,
              orbitSpinOrientation,
              orbitOrientationScratch,
            )
          }
          orbitTransform.quaternion
            .copy(classShapeOrientation)
            .multiply(orbitSpinOrientation)

          orbitTransform.scale.setScalar(sceneScale * detachedScale)
        }

        orbitTransform.updateMatrix()
        mesh.setMatrixAt(motionIndex, orbitTransform.matrix)
      })
    }

    mesh.instanceMatrix.needsUpdate = true
  }

  const updateReactorAperture = (
    group: Group,
    camera: Camera,
    mainElapsed: number,
  ) => {
    if (reactorApertureFrozen.current) return

    if (mainElapsed < REACTOR_APERTURE_START) {
      reactorApertureOrientation.copy(IDENTITY_ORIENTATION)
      return
    }

    if (mainElapsed < REACTOR_DIVIDE_ONE_START) {
      reactorApertureDirection.copy(reactorApertureDirections.parent)
    } else if (mainElapsed < REACTOR_DIVIDE_TWO_START) {
      const progress = smootherstep(
        (mainElapsed - REACTOR_DIVIDE_ONE_START) /
          REACTOR_DIVIDE_ONE_DURATION,
      )
      reactorApertureDirection
        .lerpVectors(
          reactorApertureDirections.parent,
          reactorApertureDirections.lineage,
          progress,
        )
        .normalize()
    } else {
      const progress = smootherstep(
        (mainElapsed - REACTOR_DIVIDE_TWO_START) /
          REACTOR_DIVIDE_TWO_DURATION,
      )
      reactorApertureDirection
        .lerpVectors(
          reactorApertureDirections.lineage,
          reactorApertureDirections.target,
          progress,
        )
        .normalize()
    }

    reactorLocalViewDirection
      .copy(camera.position)
      .sub(group.position)
      .normalize()
    reactorInverseGroupOrientation.copy(group.quaternion).invert()
    reactorLocalViewDirection
      .applyQuaternion(reactorInverseGroupOrientation)
      .normalize()

    reactorApertureAlignOrientation.setFromUnitVectors(
      reactorApertureDirection,
      reactorLocalViewDirection,
    )
    const rollElapsed =
      Math.min(mainElapsed, REACTOR_SCATTER_START) - REACTOR_TRANSFORM_START
    reactorApertureRollOrientation.setFromAxisAngle(
      reactorLocalViewDirection,
      rollElapsed * REACTOR_APERTURE_ROLL_SPEED,
    )
    reactorApertureTargetOrientation
      .copy(reactorApertureRollOrientation)
      .multiply(reactorApertureAlignOrientation)
    reactorApertureOrientation.slerpQuaternions(
      IDENTITY_ORIENTATION,
      reactorApertureTargetOrientation,
      smootherstep(
        (mainElapsed - REACTOR_APERTURE_START) /
        REACTOR_APERTURE_DURATION,
      ),
    )
    if (mainElapsed >= REACTOR_SCATTER_START) {
      reactorApertureFrozen.current = true
    }
  }

  const selectHeroPlate = (
    group: Group,
    camera: Camera,
    mainElapsed: number,
  ) => {
    if (
      selectedPlateIndex.current >= 0 ||
      mainElapsed < REACTOR_HERO_SELECT_TIME
    ) {
      return
    }

    centerToCamera.copy(camera.position).sub(group.position).normalize()
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    let bestIndex = 0
    let bestScore = Number.NEGATIVE_INFINITY

    for (let index = 0; index < reactorTiles.length; index += 1) {
      selectionWorldDirection
        .copy(reactorTiles[index].direction)
        .applyQuaternion(reactorApertureOrientation)
        .applyQuaternion(group.quaternion)
        .normalize()
      const facing = selectionWorldDirection.dot(centerToCamera)
      const left = -selectionWorldDirection.dot(cameraRight)
      const vertical = selectionWorldDirection.dot(cameraUp)
      const score =
        left * 0.74 -
        Math.abs(facing - 0.46) * 0.54 -
        Math.abs(vertical + 0.3) * 0.46
      if (facing > 0.08 && vertical < 0.16 && score > bestScore) {
        bestIndex = index
        bestScore = score
      }
    }

    selectedPlateIndex.current = bestIndex
  }

  const setHeroPlateAtShell = (
    group: Group,
    tile: ReactorTileProfile,
    mainElapsed: number,
  ) => {
    const heroPlate = heroPlateRef.current
    if (!heroPlate) return

    const wavePulse = Math.min(
      1,
      travelingWave(
        mainElapsed,
        REACTOR_WAVE_ONE_START,
        tile.direction,
        WAVE_AXIS_A,
      ) +
        travelingWave(
          mainElapsed,
          REACTOR_WAVE_TWO_START,
          tile.direction,
          WAVE_AXIS_B,
          true,
        ),
    )

    heroPlate.position
      .copy(tile.direction)
      .multiplyScalar((SHELL_RADIUS + wavePulse * 0.085) * sceneScale)
      .applyQuaternion(reactorApertureOrientation)
      .applyQuaternion(group.quaternion)
      .add(group.position)
    heroPlate.quaternion
      .copy(group.quaternion)
      .multiply(reactorApertureOrientation)
      .multiply(tile.orientation)
    heroPlate.scale.set(
      REACTOR_TILE_WIDTH * sceneScale * (1 + wavePulse * 0.18),
      REACTOR_TILE_WIDTH * sceneScale * (1 + wavePulse * 0.18),
      REACTOR_TILE_THICKNESS * sceneScale * (1 + wavePulse * 0.48),
    )
  }

  const updateHeroPlate = (
    group: Group,
    camera: Camera,
    mainElapsed: number,
  ) => {
    const heroPlate = heroPlateRef.current
    const heroLight = heroPlateLightRef.current
    const selectedIndex = selectedPlateIndex.current
    if (
      !heroPlate ||
      selectedIndex < 0 ||
      mainElapsed < REACTOR_SIGNAL_START
    ) {
      if (heroPlate) heroPlate.scale.setScalar(0)
      if (heroLight) heroLight.intensity = 0
      return
    }

    const tile = reactorTiles[selectedIndex]
    const launchElapsed = mainElapsed - HERO_PLATE_LAUNCH_START
    const heroBaseMetalness = previewMaterialBaseline
      ? 0.42
      : REACTOR_METALNESS
    const heroBaseRoughness = previewMaterialBaseline
      ? 0.18
      : REACTOR_ROUGHNESS

    if (launchElapsed < 0) {
      setHeroPlateAtShell(group, tile, mainElapsed)
      const signalProgress = Math.min(
        1,
        Math.max(
          0,
          (mainElapsed - REACTOR_SIGNAL_START) / REACTOR_SIGNAL_DURATION,
        ),
      )
      const signalEnvelope =
        smootherstep(signalProgress / 0.12) *
        (1 - smootherstep((signalProgress - 0.84) / 0.16))
      const signalPulse =
        (0.5 - 0.5 * Math.cos(signalProgress * Math.PI * 6)) *
        signalEnvelope
      const signalGlow = smootherstep(signalPulse)
      const signalScale = 1 + signalGlow * 0.14
      heroPlate.scale.x *= signalScale
      heroPlate.scale.y *= signalScale
      heroPlate.scale.z *= 1 + signalGlow * 0.72
      selectionWorldDirection
        .copy(tile.direction)
        .applyQuaternion(reactorApertureOrientation)
        .applyQuaternion(group.quaternion)
        .normalize()
      heroPlate.position.addScaledVector(
        selectionWorldDirection,
        signalGlow * 0.048,
      )
      heroPlateMaterial.color
        .copy(EMERALD)
        .lerp(SIGNAL_RED, 0.12 + signalEnvelope * 0.88)
      heroPlateMaterial.metalness = heroBaseMetalness
      heroPlateMaterial.roughness =
        heroBaseRoughness - signalGlow * 0.045
      heroPlateMaterial.emissiveIntensity = 0.04 + signalGlow * 1.25
      heroPlateMaterial.opacity = 1
      if (heroLight) {
        heroLight.position.copy(heroPlate.position)
        heroLight.intensity = signalGlow * 3.4
      }
      return
    }

    if (!heroLaunchCaptured.current) {
      setHeroPlateAtShell(group, tile, mainElapsed)
      heroStartPosition.copy(heroPlate.position)
      heroStartOrientation.copy(heroPlate.quaternion)
      heroStartNormal
        .copy(tile.direction)
        .applyQuaternion(reactorApertureOrientation)
        .applyQuaternion(group.quaternion)
        .normalize()
      camera.getWorldDirection(cameraForward)
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      heroControlA
        .copy(heroStartPosition)
        .addScaledVector(heroStartNormal, 0.78)
        .addScaledVector(cameraUp, -0.08)
        .addScaledVector(cameraRight, -0.12)
      heroControlB
        .copy(camera.position)
        .addScaledVector(cameraForward, 5.15)
        .addScaledVector(cameraRight, -3.05)
        .addScaledVector(cameraUp, -0.92)
      heroEndPosition
        .copy(camera.position)
        .addScaledVector(cameraForward, 4.55)
        .addScaledVector(cameraRight, -5.2)
        .addScaledVector(cameraUp, -1.48)
      heroFacingTransform.position.copy(heroEndPosition)
      heroFacingTransform.up.copy(cameraUp)
      heroFacingTransform.lookAt(camera.position)
      heroFacingOrientation.copy(heroFacingTransform.quaternion)
      heroLaunchCaptured.current = true
    }

    if (launchElapsed < HERO_PLATE_RECOIL_DURATION) {
      const recoilProgress = launchElapsed / HERO_PLATE_RECOIL_DURATION
      const compression = Math.sin(recoilProgress * Math.PI)
      heroPlate.position
        .copy(heroStartPosition)
        .addScaledVector(heroStartNormal, -0.065 * compression)
      heroPlate.quaternion.copy(heroStartOrientation)
      heroPlate.scale.set(
        REACTOR_TILE_WIDTH * sceneScale * (1 + compression * 0.08),
        REACTOR_TILE_WIDTH * sceneScale * (1 + compression * 0.08),
        REACTOR_TILE_THICKNESS * sceneScale * (1 - compression * 0.28),
      )
      heroPlateMaterial.color.copy(EMERALD).lerp(SIGNAL_RED, 0.92)
      heroPlateMaterial.metalness = heroBaseMetalness
      heroPlateMaterial.roughness = heroBaseRoughness - 0.045
      heroPlateMaterial.emissiveIntensity = 1.35
      heroPlateMaterial.opacity = 1
    } else {
      const rawFlightProgress = Math.min(
        1,
        Math.max(
          0,
          (launchElapsed - HERO_PLATE_RECOIL_DURATION) /
            HERO_PLATE_FLIGHT_DURATION,
        ),
      )
      const flightProgress = smootherstep(rawFlightProgress)
      setCubicBezier(
        heroPlate.position,
        heroStartPosition,
        heroControlA,
        heroControlB,
        heroEndPosition,
        flightProgress,
      )
      heroPlate.quaternion.slerpQuaternions(
        heroStartOrientation,
        heroFacingOrientation,
        smootherstep((rawFlightProgress - 0.08) / 0.62),
      )
      const cardMorph = smootherstep((rawFlightProgress - 0.58) / 0.3)
      const fade = 1 - smootherstep((rawFlightProgress - 0.84) / 0.16)
      heroPlate.scale.set(
        REACTOR_TILE_WIDTH * sceneScale * (1 + cardMorph * 1.65) * fade,
        REACTOR_TILE_WIDTH * sceneScale * (1 - cardMorph * 0.24) * fade,
        REACTOR_TILE_THICKNESS * sceneScale * fade,
      )
      heroPlateMaterial.color
        .copy(EMERALD)
        .lerp(SIGNAL_RED, 0.88 * (1 - cardMorph * 0.9))
      heroPlateMaterial.metalness =
        heroBaseMetalness - cardMorph * 0.12
      heroPlateMaterial.roughness =
        heroBaseRoughness + cardMorph * 0.08
      heroPlateMaterial.emissiveIntensity =
        (1.35 - cardMorph * 1.02) * fade
      heroPlateMaterial.opacity = fade
    }

    if (heroLight) {
      heroLight.position.copy(heroPlate.position)
      heroLight.intensity =
        3 * (1 - smootherstep(launchElapsed / 1.35))
    }

    if (mainElapsed >= HERO_CARD_REVEAL && !cardRevealed.current) {
      cardRef.current?.classList.add('is-visible')
      cardRef.current?.removeAttribute('aria-hidden')
      cardRef.current?.removeAttribute('inert')
      document.body.classList.add('reactor-card-visible')
      cardRevealed.current = true
    }
  }

  const syncReactor = (
    mainElapsed: number,
    group?: Group,
    camera?: Camera,
  ) => {
    const mesh = reactorMeshRef.current
    if (!mesh) return

    const morphRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
      ),
    )
    // Keep a readable cube first: shrink it uniformly, then flatten it into a
    // plate. The camera-facing aperture begins only after flattening is visible.
    const morphShrinkProgress = smootherstep(morphRaw / 0.24)
    const morphFlattenProgress = smootherstep((morphRaw - 0.18) / 0.82)
    const divideOneRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_ONE_START) /
          REACTOR_DIVIDE_ONE_DURATION,
      ),
    )
    const divideOneSeparation = smootherstep(
      (divideOneRaw - 0.02) / 0.66,
    )
    const divideOneSizeProgress = smootherstep(divideOneRaw / 0.62)
    const divideTwoRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_TWO_START) /
          REACTOR_DIVIDE_TWO_DURATION,
      ),
    )
    const divideTwoSeparation = smootherstep(
      (divideTwoRaw - 0.02) / 0.64,
    )
    const divideTwoSizeProgress = smootherstep(divideTwoRaw / 0.6)

    for (
      let familyIndex = 0;
      familyIndex < reactorFamilies.length;
      familyIndex += 1
    ) {
      const family = reactorFamilies[familyIndex]
      for (let slot = 0; slot < 4; slot += 1) {
        const instanceIndex = familyIndex * 4 + slot
        const tile = reactorTiles[instanceIndex]
        reactorTransform.position.set(0, 0, 0)
        reactorTransform.quaternion.copy(IDENTITY_ORIENTATION)
        reactorTransform.scale.setScalar(0)
        reactorColor.copy(EMERALD)

        if (mainElapsed >= REACTOR_TRANSFORM_START) {
          if (mainElapsed < REACTOR_DIVIDE_ONE_START) {
            if (slot === 0) {
              reactorTransform.position
                .copy(family.parentDirection)
                .multiplyScalar(SHELL_RADIUS)
              reactorTransform.quaternion.slerpQuaternions(
                IDENTITY_ORIENTATION,
                family.parentOrientation,
                morphFlattenProgress,
              )
              reactorTransform.scale.set(
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphShrinkProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphShrinkProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphShrinkProgress +
                  (REACTOR_PARENT_THICKNESS - REACTOR_PARENT_WIDTH) *
                    morphFlattenProgress,
              )
            }
          } else if (mainElapsed < REACTOR_DIVIDE_TWO_START) {
            if (slot === 0 || slot === 2) {
              const lineageIndex = slot === 0 ? 0 : 1
              const birthProgress =
                slot === 0
                  ? 1
                  : smootherstep((divideOneRaw - 0.3) / 0.5)
              const plateWidth =
                REACTOR_PARENT_WIDTH +
                (REACTOR_LINEAGE_WIDTH - REACTOR_PARENT_WIDTH) *
                  divideOneSizeProgress
              const plateThickness =
                REACTOR_PARENT_THICKNESS +
                (REACTOR_LINEAGE_THICKNESS - REACTOR_PARENT_THICKNESS) *
                  divideOneSizeProgress

              reactorTransform.position
                .copy(family.parentDirection)
                .lerp(
                  family.lineageDirections[lineageIndex],
                  divideOneSeparation,
                )
                .normalize()
                .multiplyScalar(SHELL_RADIUS)
              reactorTransform.quaternion.slerpQuaternions(
                family.parentOrientation,
                family.lineageOrientations[lineageIndex],
                divideOneSeparation,
              )
              reactorTransform.scale.set(
                plateWidth * birthProgress,
                plateWidth * birthProgress,
                plateThickness * birthProgress,
              )
            }
          } else {
            const lineageIndex = slot < 2 ? 0 : 1
            const birthProgress =
              slot % 2 === 0
                ? 1
                : smootherstep((divideTwoRaw - 0.34) / 0.48)
            const plateWidth =
              REACTOR_LINEAGE_WIDTH +
              (REACTOR_TILE_WIDTH - REACTOR_LINEAGE_WIDTH) *
                divideTwoSizeProgress
            const plateThickness =
              REACTOR_LINEAGE_THICKNESS +
              (REACTOR_TILE_THICKNESS - REACTOR_LINEAGE_THICKNESS) *
                divideTwoSizeProgress

            reactorTransform.position
              .copy(family.lineageDirections[lineageIndex])
              .lerp(family.targetDirections[slot], divideTwoSeparation)
              .normalize()
              .multiplyScalar(SHELL_RADIUS)
            reactorTransform.quaternion.slerpQuaternions(
              family.lineageOrientations[lineageIndex],
              family.targetOrientations[slot],
              divideTwoSeparation,
            )
            reactorTransform.scale.set(
              plateWidth * birthProgress,
              plateWidth * birthProgress,
              plateThickness * birthProgress,
            )
          }

          if (mainElapsed >= REACTOR_TRANSFORM_END) {
            const waveOne = travelingWave(
              mainElapsed,
              REACTOR_WAVE_ONE_START,
              tile.direction,
              WAVE_AXIS_A,
            )
            const waveTwo = travelingWave(
              mainElapsed,
              REACTOR_WAVE_TWO_START,
              tile.direction,
              WAVE_AXIS_B,
              true,
            )
            const wavePulse = Math.min(1, waveOne + waveTwo)

            if (mainElapsed < REACTOR_SCATTER_START) {
              reactorTransform.position
                .copy(tile.direction)
                .multiplyScalar(SHELL_RADIUS + wavePulse * 0.085)
              reactorTransform.quaternion.copy(tile.orientation)
              reactorTransform.scale.set(
                REACTOR_TILE_WIDTH * (1 + wavePulse * 0.18),
                REACTOR_TILE_WIDTH * (1 + wavePulse * 0.18),
                REACTOR_TILE_THICKNESS * (1 + wavePulse * 0.48),
              )
              reactorColor.lerp(WAVE_BLUE, wavePulse * 0.44)
            }

            const selectedHandoff =
              instanceIndex === selectedPlateIndex.current &&
              mainElapsed >= REACTOR_SIGNAL_START

            if (selectedHandoff) {
              reactorTransform.scale.setScalar(0)
            } else if (mainElapsed >= REACTOR_SCATTER_START) {
              const ejectionElapsed =
                mainElapsed - REACTOR_SCATTER_START - tile.delay

              if (ejectionElapsed >= 0) {
                if (ejectionElapsed < HERO_PLATE_RECOIL_DURATION) {
                  const recoil = Math.sin(
                    (ejectionElapsed / HERO_PLATE_RECOIL_DURATION) * Math.PI,
                  )
                  reactorTransform.position
                    .copy(tile.direction)
                    .multiplyScalar(SHELL_RADIUS - recoil * 0.052)
                  reactorTransform.quaternion.copy(tile.orientation)
                  reactorTransform.scale.set(
                    REACTOR_TILE_WIDTH * (1 + recoil * 0.055),
                    REACTOR_TILE_WIDTH * (1 + recoil * 0.055),
                    REACTOR_TILE_THICKNESS * (1 - recoil * 0.24),
                  )
                } else {
                  const flightTime =
                    ejectionElapsed - HERO_PLATE_RECOIL_DURATION
                  const travelTime = Math.min(
                    flightTime,
                    REACTOR_SCATTER_MAX_FLIGHT,
                  )
                  const distance =
                    tile.speed *
                    (travelTime * 0.32 + travelTime * travelTime * 0.78)

                  reactorTransform.position
                    .copy(tile.direction)
                    .multiplyScalar(SHELL_RADIUS)
                    .addScaledVector(tile.ejectionDirection, distance)
                  reactorSpinOrientation.setFromAxisAngle(
                    tile.spinAxis,
                    flightTime * tile.angularSpeed,
                  )
                  reactorTransform.quaternion
                    .copy(tile.orientation)
                    .multiply(reactorSpinOrientation)

                  // Keep every plate physically intact while it is readable.
                  // It is removed only after fog, the viewport edge, or the
                  // camera plane has already hidden it.
                  let concealed = false
                  if (group && camera) {
                    reactorWorldPosition
                      .copy(reactorTransform.position)
                      .applyQuaternion(reactorApertureOrientation)
                      .multiplyScalar(sceneScale)
                      .applyQuaternion(group.quaternion)
                      .add(group.position)
                    const cameraDistance =
                      reactorWorldPosition.distanceTo(camera.position)
                    reactorScreenPosition
                      .copy(reactorWorldPosition)
                      .project(camera)
                    const outsideViewport =
                      Math.abs(reactorScreenPosition.x) > 1.12 ||
                      Math.abs(reactorScreenPosition.y) > 1.12 ||
                      reactorScreenPosition.z < -1 ||
                      reactorScreenPosition.z > 1
                    const hiddenInFog = cameraDistance >= 18.35
                    const passedCamera = cameraDistance <= 0.72
                    concealed =
                      outsideViewport ||
                      hiddenInFog ||
                      passedCamera ||
                      flightTime >= REACTOR_SCATTER_MAX_FLIGHT
                  }
                  reactorTransform.scale.set(
                    concealed ? 0 : REACTOR_TILE_WIDTH,
                    concealed ? 0 : REACTOR_TILE_WIDTH,
                    concealed ? 0 : REACTOR_TILE_THICKNESS,
                  )
                  reactorColor.lerp(
                    WAVE_BLUE,
                    0.12 * (1 - smootherstep(flightTime / 0.6)),
                  )
                }
              }
            }
          }
        }

        if (mainElapsed >= REACTOR_TRANSFORM_START) {
          reactorTransform.position.applyQuaternion(
            reactorApertureOrientation,
          )
          reactorTransform.quaternion.premultiply(
            reactorApertureOrientation,
          )
        }
        reactorTransform.updateMatrix()
        mesh.setMatrixAt(instanceIndex, reactorTransform.matrix)
        mesh.setColorAt(instanceIndex, reactorColor)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  useLayoutEffect(() => {
    syncInstances()
    const orbitMesh = orbitMeshRef.current
    const heroPlate = heroPlateRef.current

    if (orbitMesh) {
      for (let index = 0; index < CUBELET_COUNT; index += 1) {
        orbitTransform.scale.setScalar(0)
        orbitTransform.updateMatrix()
        orbitMesh.setMatrixAt(index, orbitTransform.matrix)
      }
      orbitMesh.instanceMatrix.needsUpdate = true
    }

    syncReactor(-1)
    if (heroPlate) heroPlate.scale.setScalar(0)
    cardRef.current?.classList.remove('is-visible')
    cardRef.current?.setAttribute('aria-hidden', 'true')
    cardRef.current?.setAttribute('inert', '')
    document.body.classList.remove('reactor-card-visible')
    document.body.removeAttribute('data-orbit-title-wave')
    if (previewMaterialBaseline) {
      document.body.setAttribute('data-material-baseline', '')
    } else {
      document.body.removeAttribute('data-material-baseline')
    }
    titleWaveStep.current = 0
    reactorApertureFrozen.current = false
    selectedPlateIndex.current = -1
    heroLaunchCaptured.current = false
    cardRevealed.current = false

    return () => {
      cardRef.current?.classList.remove('is-visible')
      cardRef.current?.setAttribute('aria-hidden', 'true')
      cardRef.current?.setAttribute('inert', '')
      document.body.classList.remove('reactor-card-visible')
      document.body.removeAttribute('data-orbit-title-wave')
      document.body.removeAttribute('data-material-baseline')
    }
  }, [
    assembly,
    cardRef,
    orbitTransform,
    previewMaterialBaseline,
    reactorFamilies,
    reactorTiles,
    reactorTransform,
    transform,
  ])

  useFrame(({ camera, clock }, delta) => {
    const previousAssemblyTime = assembly.time
    if (!previewAssemblyGlow) assembly.update(delta)

    const assemblyGlowElapsed =
      assembly.time - (assembly.endTime - ASSEMBLY_GLOW_LEAD)
    const assemblyGlowAttack = smootherstep(
      assemblyGlowElapsed / ASSEMBLY_GLOW_ATTACK,
    )
    const assemblyGlowRelease =
      1 -
      smootherstep(
        (assemblyGlowElapsed - ASSEMBLY_GLOW_ATTACK - ASSEMBLY_GLOW_HOLD) /
          ASSEMBLY_GLOW_RELEASE,
      )
    const assemblyGlow = previewPlasma
      ? 0
      : assemblyGlowAttack * assemblyGlowRelease
    const crystallization = smootherstep(
      (assembly.time / assembly.endTime - 0.34) / 0.66,
    )
    const conductivity = smootherstep(
      (spin.mainElapsed - ORBIT_GROUPS[0].start) /
        (PLASMA_CORE_START - ORBIT_GROUPS[0].start),
    )
    if (previewMaterialBaseline) {
      cubeletMaterial.color.copy(EMERALD)
      cubeletMaterial.metalness = 0.24
      cubeletMaterial.roughness = 0.28
      cubeletMaterial.emissiveIntensity = 0
    } else {
      updateStructuralMetamaterial(
        cubeletMaterial,
        crystallization,
        conductivity,
        assemblyGlow,
      )
    }
    nucleusMaterial.color.copy(cubeletMaterial.color)
    nucleusMaterial.metalness = cubeletMaterial.metalness
    nucleusMaterial.roughness = cubeletMaterial.roughness
    nucleusMaterial.emissiveIntensity = cubeletMaterial.emissiveIntensity
    const assemblyGlowVisible = assemblyGlow > 0.001
    assemblySeamMaterial.visible = assemblyGlowVisible
    assemblyInnerMaterial.visible = assemblyGlowVisible
    updateAssemblySeamMaterial(
      assemblySeamMaterial,
      assembly.time,
      assemblyGlow * 0.32,
    )
    assemblyInnerMaterial.opacity = assemblyGlow * 0.13

    const group = groupRef.current
    if (!group || !assembly.complete) {
      syncInstances()
      return
    }

    const spinDelta = previewPlasma
      ? 0
      : assembly.time - Math.max(previousAssemblyTime, assembly.endTime)
    spin.update(spinDelta)

    while (
      titleWaveStep.current < TITLE_WAVE_TIMES.length &&
      spin.mainElapsed >= TITLE_WAVE_TIMES[titleWaveStep.current]
    ) {
      document.body.dataset.orbitTitleWave =
        TITLE_WAVE_STAGES[titleWaveStep.current]
      titleWaveStep.current += 1
    }

    syncInstances(spin.mainElapsed)
    const reactorSurfaceProgress = smootherstep(
      (spin.mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
    )
    if (previewMaterialBaseline) {
      reactorMaterial.metalness = 0.24 + reactorSurfaceProgress * 0.18
      reactorMaterial.roughness = 0.28 - reactorSurfaceProgress * 0.1
      reactorMaterial.emissiveIntensity = reactorSurfaceProgress * 0.14
    } else {
      const reactorShutdown = smootherstep(
        (spin.mainElapsed - REACTOR_WAVE_ONE_START) /
          REACTOR_ROTATION_BRAKE_DURATION,
      )
      const reactorScatterFade = smootherstep(
        (spin.mainElapsed - REACTOR_SCATTER_START) / 0.9,
      )
      const reactorEnergy =
        (1 - reactorShutdown * 0.78) * (1 - reactorScatterFade)
      updateReactorMetamaterial(
        reactorMaterial,
        reactorSurfaceProgress,
        clock.elapsedTime,
        reactorEnergy,
      )
      updateReactorCircuitSurface(
        heroPlateMaterial,
        1,
        clock.elapsedTime,
        1 - reactorScatterFade * 0.72,
        selectedPlateIndex.current,
      )
    }

    if (spin.elapsed < EDGE_ROLL_DURATION) {
      const rollProgress = smoothstep(spin.elapsed / EDGE_ROLL_DURATION)
      const rollAngle = (Math.PI / 2) * rollProgress

      group.position.set(
        INITIAL_X +
          contactHalfExtent *
            (1 + Math.sin(rollAngle) - Math.cos(rollAngle)),
        contactHalfExtent *
          (Math.sin(rollAngle) + Math.cos(rollAngle) - 1),
        0,
      )
      group.quaternion.setFromAxisAngle(ROLL_AXIS, -rollAngle)
      syncReactor(spin.mainElapsed)
      return
    }

    const liftProgress = smoothstep(
      (spin.elapsed - EDGE_ROLL_DURATION) / CORNER_LIFT_DURATION,
    )

    group.position.set(INITIAL_X + rollDistance, diamondLift * liftProgress, 0)
    tiltOrientation.slerpQuaternions(
      ROLL_ORIENTATION,
      DIAMOND_ORIENTATION,
      liftProgress,
    )
    spinOrientation.setFromAxisAngle(UP, spin.angle)

    if (spin.elapsed >= MAIN_SPIN_START) {
      const topEnvelope =
        smoothstep(spin.mainElapsed / 0.72) *
        (1 - smoothstep((spin.mainElapsed - 10.05) / 1.05))
      let rotationElapsed = spin.mainElapsed
      if (spin.mainElapsed > REACTOR_APERTURE_START) {
        rotationElapsed =
          spin.mainElapsed < REACTOR_TRANSFORM_END
            ? REACTOR_APERTURE_START
            : REACTOR_APERTURE_START +
              (spin.mainElapsed - REACTOR_TRANSFORM_END)
      }
      if (spin.mainElapsed > REACTOR_WAVE_ONE_START) {
        const rotationAtBrake =
          REACTOR_APERTURE_START +
          (REACTOR_WAVE_ONE_START - REACTOR_TRANSFORM_END)
        const brakeProgress = Math.min(
          1,
          (spin.mainElapsed - REACTOR_WAVE_ONE_START) /
            REACTOR_ROTATION_BRAKE_DURATION,
        )
        const integratedBrake =
          brakeProgress -
          brakeProgress ** 3 +
          0.5 * brakeProgress ** 4
        rotationElapsed =
          rotationAtBrake +
          REACTOR_ROTATION_BRAKE_DURATION * integratedBrake
      }
      const precessionAngle = rotationElapsed * 0.62
      const nutationAngle =
        0.105 *
        topEnvelope *
        (1 + 0.12 * Math.sin(spin.mainElapsed * 2.4))

      precessionOrientation.setFromAxisAngle(UP, precessionAngle)
      nutationOrientation.setFromAxisAngle(PRECESSION_AXIS, nutationAngle)
      group.quaternion
        .copy(precessionOrientation)
        .multiply(nutationOrientation)
        .multiply(spinOrientation)
        .multiply(tiltOrientation)
    } else {
      group.quaternion.copy(tiltOrientation)
    }

    updateReactorAperture(group, camera, spin.mainElapsed)
    selectHeroPlate(group, camera, spin.mainElapsed)
    syncReactor(spin.mainElapsed, group, camera)
    syncOrbiters(group, camera, spin.mainElapsed)
    updateHeroPlate(group, camera, spin.mainElapsed)

    const gridProgress = smootherstep(
      (spin.mainElapsed - NUCLEUS_GRID_START) / NUCLEUS_GRID_DURATION,
    )
    const expandProgress = smootherstep(
      (spin.mainElapsed - NUCLEUS_EXPAND_START) / NUCLEUS_EXPAND_DURATION,
    )
    const coreProgress = smootherstep(
      (spin.mainElapsed - PLASMA_CORE_START) / PLASMA_CORE_DURATION,
    )
    const warmProgress = smootherstep(
      (spin.mainElapsed - PLASMA_WARM_START) / PLASMA_WARM_DURATION,
    )
    const rimProgress = smootherstep(
      (spin.mainElapsed - PLASMA_RIM_START) / PLASMA_RIM_DURATION,
    )
    const finalExpandProgress = smootherstep(
      (spin.mainElapsed - NUCLEUS_FINAL_EXPAND_START) /
        NUCLEUS_FINAL_EXPAND_DURATION,
    )
    const plasmaOpacity = Math.max(coreProgress, warmProgress, rimProgress)
    const initialNucleusScale =
      1 + (NUCLEUS_MAX_SCALE - 1) * expandProgress
    const finalNucleusScale =
      initialNucleusScale +
      (NUCLEUS_REACTOR_SCALE - initialNucleusScale) * finalExpandProgress
    const plasmaRadialScale =
      1 + (PLASMA_REACTOR_RADIAL_SCALE - 1) * finalExpandProgress
    const plasmaProxyRadialScale =
      1 +
      (PLASMA_REACTOR_PROXY_RADIAL_SCALE - 1) * finalExpandProgress
    const plasmaProxyVerticalScale =
      1 +
      (PLASMA_REACTOR_PROXY_VERTICAL_SCALE - 1) * finalExpandProgress

    const nucleusFrame = nucleusFrameRef.current
    if (nucleusFrame) {
      nucleusFrame.scale.setScalar(finalNucleusScale)
    }
    const plasma = plasmaRef.current
    plasmaWorldCenter.copy(group.position)
    plasmaWorldCenter.y -=
      PLASMA_REACTOR_DROP * sceneScale * finalExpandProgress
    const plasmaBaseRadius = PLASMA_RADIUS * sceneScale * plasmaRadialScale
    plasmaWorldRadii.setScalar(plasmaBaseRadius)
    plasmaProxyCenter.copy(plasmaWorldCenter)
    plasmaProxyCenter.y +=
      PLASMA_RADIUS *
      sceneScale *
      (plasmaProxyVerticalScale - plasmaProxyRadialScale)
    if (plasma) {
      plasma.geometry =
        finalExpandProgress < 0.35
          ? PLASMA_GEOMETRY
          : PLASMA_EXPANDED_GEOMETRY
      plasma.position.copy(plasmaProxyCenter)
      plasma.quaternion.copy(IDENTITY_ORIENTATION)
      plasma.scale.set(
        sceneScale * plasmaProxyRadialScale,
        sceneScale * plasmaProxyVerticalScale,
        sceneScale * plasmaProxyRadialScale,
      )
    }

    const conversionGlow = 4 * gridProgress * (1 - gridProgress)
    nucleusMaterial.depthWrite = gridProgress < 0.02
    nucleusMaterial.opacity = 1 - gridProgress
    nucleusMaterial.emissiveIntensity =
      cubeletMaterial.emissiveIntensity + conversionGlow * 0.72
    updateGridMaterial(
      gridMaterial,
      assembly.time,
      gridProgress,
      warmProgress,
      finalExpandProgress,
    )
    updatePlasmaMaterial(
      plasmaMaterial,
      assembly.time,
      plasmaOpacity,
      coreProgress,
      warmProgress,
      rimProgress,
      plasmaWorldCenter,
      plasmaWorldRadii,
      finalExpandProgress,
      compact,
    )

    const flashElapsed = spin.mainElapsed - PLASMA_CORE_START
    const flashAttack = smootherstep(flashElapsed / IGNITION_FLASH_ATTACK)
    const flashRelease =
      1 -
      smootherstep(
        (flashElapsed - IGNITION_FLASH_ATTACK - IGNITION_FLASH_HOLD) /
          IGNITION_FLASH_DECAY,
      )
    updateFlashMaterial(
      flashMaterial,
      flashElapsed >= 0 ? flashAttack * flashRelease * 0.94 : 0,
    )

    const plasmaLight = plasmaLightRef.current
    if (plasmaLight) {
      plasmaLight.position.copy(plasmaWorldCenter)
      const flicker =
        Math.sin(assembly.time * 7.1) * 0.48 +
        Math.sin(assembly.time * 12.7 + 1.8) * 0.24
      plasmaLight.color.setRGB(
        0.72 + warmProgress * 0.28,
        0.98 - warmProgress * 0.55,
        0.92 - warmProgress * 0.78,
      )
      plasmaLight.intensity =
        coreProgress * (5.8 + flicker * 0.35) +
        warmProgress * (1.8 + flicker * 0.65) +
        finalExpandProgress * (1.6 + flicker * 0.28)
      plasmaLight.distance = 2.6 + finalExpandProgress * 3.8
    }
  })

  return (
    <>
      <group ref={groupRef} position={[INITIAL_X, 0, 0]} scale={sceneScale}>
        <group ref={nucleusFrameRef}>
          <mesh
            geometry={cubeletGeometry}
            castShadow
            receiveShadow
            material={nucleusMaterial}
          />

          <mesh material={gridMaterial} renderOrder={2}>
            <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
          </mesh>
        </group>

        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, CUBELET_COUNT]}
          geometry={cubeletGeometry}
          material={cubeletMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        />

        <mesh
          material={assemblyInnerMaterial}
          renderOrder={1}
          frustumCulled={false}
        >
          <boxGeometry
            args={[
              ASSEMBLY_INNER_GLOW_SIZE,
              ASSEMBLY_INNER_GLOW_SIZE,
              ASSEMBLY_INNER_GLOW_SIZE,
            ]}
          />
        </mesh>

        <mesh
          material={assemblySeamMaterial}
          renderOrder={4}
          frustumCulled={false}
        >
          <boxGeometry
            args={[ASSEMBLY_SEAM_SIZE, ASSEMBLY_SEAM_SIZE, ASSEMBLY_SEAM_SIZE]}
          />
        </mesh>

        <instancedMesh
          ref={reactorMeshRef}
          args={[undefined, undefined, REACTOR_INSTANCE_COUNT]}
          geometry={reactorPlateGeometry}
          material={reactorMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      </group>

      <mesh
        ref={plasmaRef}
        geometry={PLASMA_GEOMETRY}
        material={plasmaMaterial}
        renderOrder={1}
        frustumCulled={false}
      />

      <pointLight
        ref={plasmaLightRef}
        color="#ff6d20"
        intensity={0}
        distance={2.6}
        decay={2}
      />

      <instancedMesh
        ref={orbitMeshRef}
        args={[undefined, undefined, CUBELET_COUNT]}
        geometry={cubeletGeometry}
        material={cubeletMaterial}
        frustumCulled={false}
        castShadow
        receiveShadow
      />

      <mesh
        ref={heroPlateRef}
        geometry={reactorPlateGeometry}
        material={heroPlateMaterial}
        frustumCulled={false}
        castShadow
        receiveShadow
      />

      <pointLight
        ref={heroPlateLightRef}
        color="#f2383f"
        intensity={0}
        distance={2.4}
        decay={2}
      />

      <mesh
        geometry={FLASH_GEOMETRY}
        material={flashMaterial}
        renderOrder={1000}
        frustumCulled={false}
      />
    </>
  )
}

function ReactorWarmSpotlight() {
  const lightRef = useRef<SpotLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    target.position.set(2.8, 0.5, 0)
    scene.add(target)
    if (lightRef.current) lightRef.current.target = target

    return () => {
      scene.remove(target)
    }
  }, [scene, target])

  return (
    <spotLight
      ref={lightRef}
      position={[5.4, -0.8, 4.6]}
      intensity={72}
      distance={11}
      decay={2}
      angle={0.52}
      penumbra={0.78}
      color="#ffb653"
    />
  )
}

/**
 * Procedural PBR environment: metallic surfaces (reactor plates, gold
 * traces) need an environment map to produce real specular reflections —
 * analytic lights alone leave metals flat. The panels mirror the analytic
 * rig (cool key, blue rim, warm gold accent, emerald floor wash) so the
 * reflections agree with the lighting story. Generated once via PMREM,
 * no network fetch, ~15 ms.
 */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const envScene = new Scene()

    envScene.add(
      new Mesh(
        new BoxGeometry(40, 40, 40),
        new MeshBasicMaterial({ color: new Color('#020504'), side: BackSide }),
      ),
    )

    const addPanel = (
      color: string,
      intensity: number,
      position: [number, number, number],
      size: [number, number],
    ) => {
      const panel = new Mesh(
        new PlaneGeometry(size[0], size[1]),
        new MeshBasicMaterial({
          color: new Color(color).multiplyScalar(intensity),
        }),
      )
      panel.position.set(position[0], position[1], position[2])
      panel.lookAt(0, 0, 0)
      envScene.add(panel)
    }

    addPanel('#edfdf7', 5, [6, 8, 5], [7, 5])
    addPanel('#39c8ff', 3.5, [-1, 5, -8], [9, 4])
    addPanel('#ffb653', 4, [7, -2, 5], [4, 3])
    addPanel('#18d383', 1.2, [0, -9, 1], [12, 12])

    const renderTarget = pmrem.fromScene(envScene, 0.04)
    scene.environment = renderTarget.texture
    scene.environmentIntensity = 0.32

    envScene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
        ;(object.material as MeshBasicMaterial).dispose()
      }
    })
    pmrem.dispose()

    return () => {
      scene.environment = null
      renderTarget.dispose()
    }
  }, [gl, scene])

  return null
}

export interface HeroCardCopy {
  h2: string
  p1: string
  p2: string
  p3: string
  cta: string
  ariaNav: string
}

const DEFAULT_CARD_COPY: HeroCardCopy = {
  h2: 'Интерактивная 3D-графика для веба',
  p1: 'Я люблю дизайн и стиль: придумывать работающие системы и делать их красивыми. Вкус у меня есть, и я не стесняюсь его применять — сцена на этой странице спроектирована с нуля: математика траекторий, физика волчка, шейдеры плазмы.',
  p2: 'Упор держу на производительность (спасибо, СДВГ) и эстетику (спасибо, перфекционизм): кастомные GLSL-шейдеры, постобработка, стабильные 60–120 FPS на десктопе и мобильных. Делаю конфигураторы, иммерсивные лендинги, картографию на Mapbox, визуализации данных и браузерные движки — вплоть до Minecraft-реплеера.',
  p3: 'Веду проект целиком и отвечаю за результат: концепция → прототип → продакшен. Инструменты подбираю по задаче — включая ИИ-инструменты; смотрю в сторону WebGPU. Чем страннее задача, тем интереснее — неформат приветствуется. Санкт-Петербург, работаю удалённо.',
  cta: 'Написать в Telegram',
  ariaNav: 'Соцсети и контакты',
}

const CARD_CIRCUIT_PATHS = [
  'M42 62H150V104H312V70H470',
  'M112 38V44H246V86H390V132H520',
  'M42 302H168V258H330V300H486V238H620',
  'M540 322V316H694V270H836V318H970',
  'M730 38V52H866V96H1004V54H1130',
  'M1558 60H1474V108H1328V72H1192V132H1080',
  'M1558 310H1456V264H1318V308H1170V252H1046',
  'M1540 38V52H1380V168H1248V196H1120',
] as const

const CARD_CIRCUIT_PADS = [
  [42, 62],
  [112, 38],
  [42, 302],
  [540, 322],
  [730, 38],
  [1558, 60],
  [1558, 310],
  [1540, 38],
  [150, 104],
  [312, 70],
  [312, 86],
  [470, 70],
  [246, 86],
  [520, 132],
  [168, 258],
  [330, 300],
  [620, 238],
  [694, 270],
  [836, 318],
  [970, 318],
  [866, 96],
  [1004, 54],
  [1130, 54],
  [1474, 108],
  [1328, 72],
  [1080, 132],
  [1456, 264],
  [1318, 308],
  [1170, 252],
  [1046, 252],
  [1380, 108],
  [1380, 168],
  [1248, 196],
  [1120, 196],
] as const

export default function HeroScene({
  copy = DEFAULT_CARD_COPY,
}: {
  copy?: HeroCardCopy
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const previewLightingBaseline = useMemo(
    () =>
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('lighting-baseline'),
    [],
  )

  return (
    <>
      <div className="hero-scene" aria-hidden="true">
        <Canvas
          camera={{ position: [4.8, 3.4, 7.2], fov: 43 }}
          dpr={[1, 1.5]}
          shadows
          onCreated={({ camera }) => camera.lookAt(1.2, 0, 0)}
        >
          <color attach="background" args={['#050907']} />
          <fog attach="fog" args={['#050907', 10, 20]} />
          {!previewLightingBaseline && <StudioEnvironment />}
          <ambientLight intensity={previewLightingBaseline ? 0.48 : 0.1} />
          <hemisphereLight
            args={
              previewLightingBaseline
                ? ['#dfffee', '#07100c', 1.1]
                : ['#789f9a', '#010403', 0.36]
            }
          />
          <directionalLight
            position={previewLightingBaseline ? [5, 7, 6] : [5.8, 7.8, 5.2]}
            intensity={previewLightingBaseline ? 2.2 : 2.45}
            color={previewLightingBaseline ? '#d7ffe9' : '#edfdf7'}
            castShadow
          />
          <pointLight
            position={
              previewLightingBaseline ? [-4, 1, 3] : [0.5, 3, -3.4]
            }
            intensity={previewLightingBaseline ? 14 : 44}
            distance={previewLightingBaseline ? 9 : 9.5}
            decay={2}
            color={previewLightingBaseline ? '#0ef0a0' : '#39c8ff'}
          />
          {previewLightingBaseline ? (
            <pointLight
              position={[4, -2, 1]}
              intensity={8}
              distance={8}
              decay={2}
              color="#4de1ff"
            />
          ) : (
            <ReactorWarmSpotlight />
          )}
          <AssemblyCube cardRef={cardRef} />
          <OrbitControls
            target={[1.2, 0, 0]}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0.8}
            maxPolarAngle={2.1}
          />
        </Canvas>
      </div>

      <article
        ref={cardRef}
        className="reactor-card"
        aria-hidden="true"
        inert
      >
        <svg
          className="reactor-card__circuit"
          viewBox="0 0 1600 360"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect
            className="reactor-card__circuit-frame"
            x="18"
            y="18"
            width="1564"
            height="324"
          />
          <g className="reactor-card__circuit-grooves">
            {CARD_CIRCUIT_PATHS.map((path) => (
              <path key={`groove-${path}`} d={path} />
            ))}
          </g>
          <g className="reactor-card__circuit-metal">
            {CARD_CIRCUIT_PATHS.map((path) => (
              <path key={`metal-${path}`} d={path} pathLength="1" />
            ))}
          </g>
          <g className="reactor-card__circuit-pads">
            {CARD_CIRCUIT_PADS.map(([x, y]) => (
              <rect
                key={`${x}-${y}`}
                x={x - 6}
                y={y - 6}
                width="12"
                height="12"
              />
            ))}
          </g>
        </svg>
        <div className="reactor-card__signal" aria-hidden="true" />
        <div className="reactor-card__content">
          <div className="reactor-card__meta">
            <span>REACTOR NODE</span>
            <span>01 / ACTIVE</span>
          </div>
          <h2>{copy.h2}</h2>
          <div className="reactor-card__body">
            <p>{copy.p1}</p>
            <p>{copy.p2}</p>
            <p>{copy.p3}</p>
          </div>
          <nav className="reactor-card__actions" aria-label={copy.ariaNav}>
            <a
              className="reactor-card__icon"
              href="https://x.com/vixkosla"
              target="_blank"
              rel="noopener"
              aria-label="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
            </a>
            <a
              className="reactor-card__icon"
              href="https://www.upwork.com/freelancers/askerovt"
              target="_blank"
              rel="noopener"
              aria-label="Upwork"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06a2.705 2.705 0 0 1 2.703 2.703c-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" />
              </svg>
            </a>
            <a
              className="reactor-card__icon"
              href="https://t.me/vixkosla"
              target="_blank"
              rel="noopener"
              aria-label="Telegram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
            <a
              className="reactor-card__cta"
              href="https://t.me/vixkosla"
              target="_blank"
              rel="noopener"
            >
              {copy.cta}
            </a>
          </nav>
        </div>
      </article>
    </>
  )
}
