import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import {
  Color,
  Euler,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { Camera, Group, InstancedMesh, Mesh, PointLight } from 'three'
import {
  CUBE_SIZE,
  CUBE_STEP,
  CUBELET_COUNT,
  LayeredAssembly,
} from '../lib/LayeredAssembly'
import {
  FLASH_GEOMETRY,
  PLASMA_GEOMETRY,
  PLASMA_RADIUS,
  createFlashMaterial,
  createGlassMaterial,
  createPlasmaMaterial,
  updateFlashMaterial,
  updateGlassMaterial,
  updatePlasmaMaterial,
} from '../lib/FireEffect'
import {
  CORNER_LIFT_DURATION,
  EDGE_ROLL_DURATION,
  MAIN_SPIN_START,
  SpinSimulation,
} from '../lib/SpinSimulation'

const EMERALD = new Color('#18d383')
const WAVE_BLUE = new Color('#244cff')
const SIGNAL_RED = new Color('#ff352c')
const UP = new Vector3(0, 1, 0)
const PLATE_NORMAL = new Vector3(0, 0, 1)
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
const NUCLEUS_GLASS_START = 0.65
const NUCLEUS_GLASS_DURATION = 1.45
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
const REACTOR_INSTANCE_COUNT = CUBELET_COUNT * 4
const REACTOR_TRANSFORM_START = ORBIT_END + 0.55
const REACTOR_MORPH_DURATION = 0.9
const REACTOR_DIVIDE_ONE_START =
  REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION + 0.18
const REACTOR_DIVIDE_ONE_DURATION = 1.05
const REACTOR_DIVIDE_TWO_START =
  REACTOR_DIVIDE_ONE_START + REACTOR_DIVIDE_ONE_DURATION + 0.18
const REACTOR_DIVIDE_TWO_DURATION = 1.2
const REACTOR_TRANSFORM_END =
  REACTOR_DIVIDE_TWO_START + REACTOR_DIVIDE_TWO_DURATION
const REACTOR_PARENT_WIDTH = 0.43
const REACTOR_PARENT_THICKNESS = 0.12
const REACTOR_LINEAGE_WIDTH = 0.35
const REACTOR_LINEAGE_THICKNESS = 0.08
const REACTOR_TILE_WIDTH = 0.28
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
      parentOrientation: new Quaternion().setFromUnitVectors(
        PLATE_NORMAL,
        parentDirection,
      ),
      lineageDirections,
      lineageOrientations: lineageDirections.map((direction) =>
        new Quaternion().setFromUnitVectors(PLATE_NORMAL, direction),
      ),
      targetDirections,
      targetOrientations: targetDirections.map((direction) =>
        new Quaternion().setFromUnitVectors(PLATE_NORMAL, direction),
      ),
    }
  })
}

interface OrbitGroup {
  indices: readonly number[]
  axis: Vector3
  finalOrientation: Quaternion
  radiusScale: number
  start: number
  speed: number
  captureOffset: number
}

function createOrbitGroup(
  indices: readonly number[],
  axis: Vector3,
  finalOrientation: Quaternion,
  radiusScale: number,
  start: number,
  speed: number,
  captureOffset: number,
): OrbitGroup {
  return {
    indices,
    axis: axis.normalize(),
    finalOrientation: finalOrientation.normalize(),
    radiusScale,
    start,
    speed,
    captureOffset,
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
  ),
  createOrbitGroup(
    [6, 7, 8, 9, 10, 11, 13, 14, 15, 17, 16, 12],
    new Vector3(-0.62, 0.48, 0.62),
    new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2),
    2.35,
    1.45,
    -Math.PI * 0.24,
    0.15,
  ),
  createOrbitGroup(
    [0, 1, 3, 2, 4, 5],
    new Vector3(0.71, 0.25, -0.66),
    new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2),
    1.35,
    2.45,
    Math.PI * 0.32,
    0.3,
  ),
]

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
  return smootherstep(
    1 - Math.abs(progress - arrival) / REACTOR_WAVE_WIDTH,
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
  const previewPlasma = previewStage !== null
  const assembly = useMemo(() => {
    const simulation = new LayeredAssembly()
    if (previewPlasma) simulation.time = simulation.endTime + 0.1
    return simulation
  }, [previewPlasma])
  const reactorFamilies = useMemo(
    () => createReactorFamilies(assembly.motions.map((motion) => motion.target)),
    [assembly],
  )
  const reactorTiles = useMemo(
    () => createReactorTileProfiles(reactorFamilies),
    [reactorFamilies],
  )
  const spin = useMemo(() => {
    const simulation = new SpinSimulation()
    if (previewPlasma) {
      const numericPreview = previewStage === '' ? Number.NaN : Number(previewStage)
      const previewMainElapsed = Number.isFinite(numericPreview)
        ? numericPreview
        : previewStage === 'glass'
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
  const nucleusMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: EMERALD,
        metalness: 0.24,
        roughness: 0.28,
        transparent: true,
        opacity: 1,
        emissive: new Color('#8fffe0'),
        emissiveIntensity: 0,
      }),
    [],
  )
  const glassMaterial = useMemo(() => createGlassMaterial(), [])
  const plasmaMaterial = useMemo(() => createPlasmaMaterial(), [])
  const flashMaterial = useMemo(() => createFlashMaterial(), [])
  const reactorMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.24,
        roughness: 0.28,
        emissive: new Color('#042b20'),
        emissiveIntensity: 0,
      }),
    [],
  )
  const heroPlateMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: EMERALD,
        metalness: 0.42,
        roughness: 0.18,
        emissive: SIGNAL_RED,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 1,
      }),
    [],
  )
  const spinOrientation = useMemo(() => new Quaternion(), [])
  const tiltOrientation = useMemo(() => new Quaternion(), [])
  const precessionOrientation = useMemo(() => new Quaternion(), [])
  const nutationOrientation = useMemo(() => new Quaternion(), [])
  const classOrbitOrientation = useMemo(() => new Quaternion(), [])
  const classShapeOrientation = useMemo(() => new Quaternion(), [])
  const classTargetOrientation = useMemo(() => new Quaternion(), [])
  const orbitSpinOrientation = useMemo(() => new Quaternion(), [])
  const orbitOrientationScratch = useMemo(
    () => Array.from({ length: 5 }, () => new Quaternion()),
    [],
  )
  const orbitEuler = useMemo(() => new Euler(), [])

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

  const syncOrbiters = (group: Group, mainElapsed: number) => {
    const mesh = orbitMeshRef.current
    if (!mesh) return

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
    let bestIndex = 0
    let bestScore = Number.NEGATIVE_INFINITY

    for (let index = 0; index < reactorTiles.length; index += 1) {
      selectionWorldDirection
        .copy(reactorTiles[index].direction)
        .applyQuaternion(group.quaternion)
        .normalize()
      const facing = selectionWorldDirection.dot(centerToCamera)
      const left = -selectionWorldDirection.dot(cameraRight)
      const score =
        left * 0.76 - Math.abs(facing - 0.48) * 0.58 +
        selectionWorldDirection.y * 0.08
      if (facing > 0.08 && score > bestScore) {
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
      .applyQuaternion(group.quaternion)
      .add(group.position)
    heroPlate.quaternion.copy(group.quaternion).multiply(tile.orientation)
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
      heroPlateMaterial.color
        .copy(EMERALD)
        .lerp(SIGNAL_RED, 0.22 + signalPulse * 0.78)
      heroPlateMaterial.emissiveIntensity = 0.15 + signalPulse * 3.2
      heroPlateMaterial.opacity = 1
      if (heroLight) {
        heroLight.position.copy(heroPlate.position)
        heroLight.intensity = signalPulse * 7.5
      }
      return
    }

    if (!heroLaunchCaptured.current) {
      setHeroPlateAtShell(group, tile, mainElapsed)
      heroStartPosition.copy(heroPlate.position)
      heroStartOrientation.copy(heroPlate.quaternion)
      heroStartNormal
        .copy(tile.direction)
        .applyQuaternion(group.quaternion)
        .normalize()
      camera.getWorldDirection(cameraForward)
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
      heroControlA
        .copy(heroStartPosition)
        .addScaledVector(heroStartNormal, 0.78)
        .addScaledVector(cameraUp, 0.22)
        .addScaledVector(cameraRight, -0.12)
      heroControlB
        .copy(camera.position)
        .addScaledVector(cameraForward, 5.15)
        .addScaledVector(cameraRight, -3.05)
        .addScaledVector(cameraUp, -0.68)
      heroEndPosition
        .copy(camera.position)
        .addScaledVector(cameraForward, 4.55)
        .addScaledVector(cameraRight, -5.2)
        .addScaledVector(cameraUp, -1.32)
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
      heroPlateMaterial.color.copy(SIGNAL_RED)
      heroPlateMaterial.emissiveIntensity = 2.4
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
        .copy(SIGNAL_RED)
        .lerp(EMERALD, cardMorph * 0.48)
      heroPlateMaterial.emissiveIntensity = (2.2 - cardMorph * 1.5) * fade
      heroPlateMaterial.opacity = fade
    }

    if (heroLight) {
      heroLight.position.copy(heroPlate.position)
      heroLight.intensity =
        4.2 * (1 - smootherstep(launchElapsed / 1.35))
    }

    if (mainElapsed >= HERO_CARD_REVEAL && !cardRevealed.current) {
      cardRef.current?.classList.add('is-visible')
      cardRef.current?.removeAttribute('aria-hidden')
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

    const morphProgress = smootherstep(
      (mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
    )
    const divideOneRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_ONE_START) /
          REACTOR_DIVIDE_ONE_DURATION,
      ),
    )
    const divideOneProgress = smootherstep(divideOneRaw)
    const divideTwoRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_TWO_START) /
          REACTOR_DIVIDE_TWO_DURATION,
      ),
    )
    const divideTwoProgress = smootherstep(divideTwoRaw)

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
                morphProgress,
              )
              reactorTransform.scale.set(
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_THICKNESS - CUBE_SIZE) * morphProgress,
              )
            }
          } else if (mainElapsed < REACTOR_DIVIDE_TWO_START) {
            if (slot === 0 || slot === 2) {
              const lineageIndex = slot === 0 ? 0 : 1
              const birthProgress =
                slot === 0
                  ? 1
                  : smootherstep((divideOneRaw - 0.12) / 0.7)
              const plateWidth =
                REACTOR_PARENT_WIDTH +
                (REACTOR_LINEAGE_WIDTH - REACTOR_PARENT_WIDTH) *
                  divideOneProgress
              const plateThickness =
                REACTOR_PARENT_THICKNESS +
                (REACTOR_LINEAGE_THICKNESS - REACTOR_PARENT_THICKNESS) *
                  divideOneProgress

              reactorTransform.position
                .copy(family.parentDirection)
                .lerp(
                  family.lineageDirections[lineageIndex],
                  divideOneProgress,
                )
                .normalize()
                .multiplyScalar(SHELL_RADIUS)
              reactorTransform.quaternion.slerpQuaternions(
                family.parentOrientation,
                family.lineageOrientations[lineageIndex],
                divideOneProgress,
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
                : smootherstep((divideTwoRaw - 0.12) / 0.7)
            const plateWidth =
              REACTOR_LINEAGE_WIDTH +
              (REACTOR_TILE_WIDTH - REACTOR_LINEAGE_WIDTH) *
                divideTwoProgress
            const plateThickness =
              REACTOR_LINEAGE_THICKNESS +
              (REACTOR_TILE_THICKNESS - REACTOR_LINEAGE_THICKNESS) *
                divideTwoProgress

            reactorTransform.position
              .copy(family.lineageDirections[lineageIndex])
              .lerp(family.targetDirections[slot], divideTwoProgress)
              .normalize()
              .multiplyScalar(SHELL_RADIUS)
            reactorTransform.quaternion.slerpQuaternions(
              family.lineageOrientations[lineageIndex],
              family.targetOrientations[slot],
              divideTwoProgress,
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
    document.body.classList.remove('reactor-card-visible')
    selectedPlateIndex.current = -1
    heroLaunchCaptured.current = false
    cardRevealed.current = false

    return () => {
      cardRef.current?.classList.remove('is-visible')
      cardRef.current?.setAttribute('aria-hidden', 'true')
      document.body.classList.remove('reactor-card-visible')
    }
  }, [
    assembly,
    cardRef,
    orbitTransform,
    reactorFamilies,
    reactorTiles,
    reactorTransform,
    transform,
  ])

  useFrame(({ camera }, delta) => {
    const previousAssemblyTime = assembly.time
    assembly.update(delta)

    const group = groupRef.current
    if (!group || !assembly.complete) {
      syncInstances()
      return
    }

    const spinDelta = previewPlasma
      ? 0
      : assembly.time - Math.max(previousAssemblyTime, assembly.endTime)
    spin.update(spinDelta)
    syncInstances(spin.mainElapsed)
    const reactorSurfaceProgress = smootherstep(
      (spin.mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
    )
    reactorMaterial.metalness = 0.24 + reactorSurfaceProgress * 0.18
    reactorMaterial.roughness = 0.28 - reactorSurfaceProgress * 0.1
    reactorMaterial.emissiveIntensity = reactorSurfaceProgress * 0.14

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
      if (spin.mainElapsed > REACTOR_TRANSFORM_START) {
        rotationElapsed =
          spin.mainElapsed < REACTOR_TRANSFORM_END
            ? REACTOR_TRANSFORM_START
            : REACTOR_TRANSFORM_START +
              (spin.mainElapsed - REACTOR_TRANSFORM_END)
      }
      if (spin.mainElapsed > REACTOR_WAVE_ONE_START) {
        const rotationAtBrake =
          REACTOR_TRANSFORM_START +
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

    selectHeroPlate(group, camera, spin.mainElapsed)
    syncReactor(spin.mainElapsed, group, camera)
    syncOrbiters(group, spin.mainElapsed)
    updateHeroPlate(group, camera, spin.mainElapsed)

    const glassProgress = smootherstep(
      (spin.mainElapsed - NUCLEUS_GLASS_START) / NUCLEUS_GLASS_DURATION,
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
      (plasmaProxyVerticalScale - plasmaRadialScale)
    if (plasma) {
      plasma.position.copy(plasmaProxyCenter)
      plasma.quaternion.copy(IDENTITY_ORIENTATION)
      plasma.scale.set(
        sceneScale * plasmaRadialScale,
        sceneScale * plasmaProxyVerticalScale,
        sceneScale * plasmaRadialScale,
      )
    }

    const conversionGlow = 4 * glassProgress * (1 - glassProgress)
    nucleusMaterial.depthWrite = glassProgress < 0.02
    nucleusMaterial.opacity = 1 - glassProgress
    nucleusMaterial.emissiveIntensity = conversionGlow * 0.72
    updateGlassMaterial(
      glassMaterial,
      assembly.time,
      glassProgress,
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
          <mesh castShadow receiveShadow material={nucleusMaterial}>
            <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
          </mesh>

          <mesh material={glassMaterial} renderOrder={2}>
            <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
          </mesh>
        </group>

        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, CUBELET_COUNT]}
          frustumCulled={false}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
          <meshStandardMaterial color={EMERALD} metalness={0.24} roughness={0.28} />
        </instancedMesh>

        <instancedMesh
          ref={reactorMeshRef}
          args={[undefined, undefined, REACTOR_INSTANCE_COUNT]}
          material={reactorMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
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
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
        <meshStandardMaterial color={EMERALD} metalness={0.24} roughness={0.28} />
      </instancedMesh>

      <mesh
        ref={heroPlateRef}
        material={heroPlateMaterial}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      <pointLight
        ref={heroPlateLightRef}
        color="#ff352c"
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

export default function HeroScene() {
  const cardRef = useRef<HTMLElement | null>(null)

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
          <ambientLight intensity={0.48} />
          <hemisphereLight args={['#dfffee', '#07100c', 1.1]} />
          <directionalLight
            position={[5, 7, 6]}
            intensity={2.2}
            color="#d7ffe9"
            castShadow
          />
          <pointLight position={[-4, 1, 3]} intensity={14} distance={9} color="#0ef0a0" />
          <pointLight position={[4, -2, 1]} intensity={8} distance={8} color="#4de1ff" />
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
      >
        <div className="reactor-card__signal" aria-hidden="true" />
        <div className="reactor-card__meta">
          <span>REACTOR NODE</span>
          <span>01 / ACTIVE</span>
        </div>
        <h2>Интерактивные системы</h2>
        <p>
          WebGL-сцены, где движение, свет и интерфейс продолжают одну историю.
        </p>
        <div className="reactor-card__stack">
          <span>THREE.JS</span>
          <span>R3F</span>
          <span>GLSL</span>
        </div>
      </article>
    </>
  )
}
