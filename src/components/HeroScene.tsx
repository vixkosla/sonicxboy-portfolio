import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, RefObject } from 'react'
import {
  BackSide,
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Euler,
  Fog,
  InstancedBufferAttribute,
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
  REACTOR_DEMATERIALIZE_DELAY,
  REACTOR_DEMATERIALIZE_DURATION,
  REACTOR_METALNESS,
  REACTOR_ROUGHNESS,
  createMetamaterial,
  enableReactorCircuitSurface,
  updateReactorCircuitSurface,
  updateReactorMetamaterial,
  updateStructuralMetamaterial,
} from '../lib/ReactorMetamaterial'
import {
  DischargeScheduler,
  type SurfaceDischargeState,
} from '../lib/DischargeScheduler'
import {
  createDischargeBacklightMaterial,
  updateDischargeBacklightMaterial,
} from '../lib/DischargeBacklight.ts'
import {
  createBlackHoleMaterial,
  updateBlackHoleMaterial,
} from '../lib/BlackHoleMaterial.ts'
import { PrologueSequence } from '../lib/PrologueSequence.ts'
import {
  MobileCameraStory,
  type MobileCameraStoryTimings,
} from '../lib/MobileCameraStory.ts'
import {
  DESKTOP_ASSEMBLY_POINTS,
  DESKTOP_MOTION_POINTS,
} from '../lib/desktopCameraPoints.ts'
import { resolveSceneViewport } from '../lib/viewportMode.ts'
import { SOURCE_REPOSITORY } from '../i18n.ts'

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
const DESKTOP_SCENE_SCALE = 1.3
const COMPACT_SCENE_SCALE = 0.82
const COMPACT_PORTRAIT_TARGET_Y = 0.72
// After the edge roll the whole choreography is anchored at
// INITIAL_X + 2 * contactHalfExtent (the no-slip roll displacement).
// Compact portrait aims at the settled anchor so the show is centered.
const settledCenterX = (scale: number) =>
  INITIAL_X + 2 * (CUBE_SIZE / 2 + CUBE_STEP) * scale
// Compact/reduced-motion camera offset from its aim point. Narrow viewports
// shrink the horizontal FOV, so compact pulls the camera back along the same
// axis; fog and the scatter-hide distance shift by the same delta.
const CAMERA_BASE_OFFSET = new Vector3(3.6, 3.4, 7.2)
const CAMERA_BASE_DISTANCE = CAMERA_BASE_OFFSET.length()
const COMPACT_CAMERA_PULLBACK = 1.45
const COMPACT_CAMERA_EXTRA_DISTANCE =
  CAMERA_BASE_DISTANCE * (COMPACT_CAMERA_PULLBACK - 1)
const FOG_NEAR = 10
const FOG_FAR = 20
const SCATTER_HIDE_DISTANCE = 18.35
// Final-idle core flourish, composed from the accidental ?blackhole-preview
// frame ss_8386ci65x that prompted the idea. Three blocks open out of the
// settled nucleus, then stop completely; only their material keeps breathing.
const BLACK_HOLE_LOCAL_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [1.05, 0.48, 0.18],
  [-0.88, 0.65, -0.25],
  [0.68, -0.52, 0.36],
]
const BLACK_HOLE_LOCAL_SCALES = [1.25, 0.92, 1.05] as const
const BLACK_HOLE_LOCAL_ROTATIONS: ReadonlyArray<readonly [number, number, number]> = [
  [0.34, 0.82, 0.08],
  [-0.52, 0.18, 0.64],
  [0.7, -0.42, 0.26],
]
const BLACK_HOLE_CAMERA_TARGET = new Vector3()
const BLACK_HOLE_CAMERA_POSITION = new Vector3()
const BLACK_HOLE_EULER_SCRATCH = new Euler()
const PROLOGUE_CAMERA_TARGET = new Vector3()
const PROLOGUE_CAMERA_POSITION = new Vector3()
const PROLOGUE_BLEND_POSITION = new Vector3()
const PROLOGUE_BLEND_TARGET = new Vector3()
// Post-prologue camera handoff: a short smootherstep blend from the chase
// cam's final pose into the camera story's live sample replaces the former
// hard cut hidden only by the explode flash.
const PROLOGUE_CAMERA_BLEND = 0.6
const cameraAimScratch = new Vector3()
const PAGE_SEARCH_PARAMS =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
const VIEWPORT_LAB_PREVIEW =
  PAGE_SEARCH_PARAMS?.has('viewport-lab') === true
const DEVELOPMENT_PREVIEW_ENABLED =
  import.meta.env.DEV || VIEWPORT_LAB_PREVIEW
const BACKLIGHT_PREVIEW_ENABLED =
  DEVELOPMENT_PREVIEW_ENABLED &&
  PAGE_SEARCH_PARAMS?.has('backlight-preview') === true
const FREEZE_VIEWPORT_LAB_GRID =
  PAGE_SEARCH_PARAMS !== null &&
  PAGE_SEARCH_PARAMS.get('viewport-lab') === 'grid' &&
  PAGE_SEARCH_PARAMS.has('plasma-preview')
// Dev-only: ?compact-preview forces compact scene parameters on a wide
// window. It does not emulate a phone aspect ratio; use a real narrow
// viewport when validating screen-space centering.
const FORCE_COMPACT_PREVIEW =
  DEVELOPMENT_PREVIEW_ENABLED &&
  PAGE_SEARCH_PARAMS?.has('compact-preview') === true
const CAMERA_STORY_PREVIEW_REQUESTED =
  DEVELOPMENT_PREVIEW_ENABLED &&
  PAGE_SEARCH_PARAMS?.has('camera-story') === true
const PROLOGUE_PREVIEW_ENABLED =
  DEVELOPMENT_PREVIEW_ENABLED &&
  PAGE_SEARCH_PARAMS?.has('prologue-preview') === true
// Lookdev previews freeze or re-aim the scene on their own terms; the
// prologue would only add a ~3s preamble to every reload of those tools,
// so any active preview opts the page out of the default-on prologue.
const PROLOGUE_EXCLUDED_BY_PREVIEW =
  DEVELOPMENT_PREVIEW_ENABLED &&
  PAGE_SEARCH_PARAMS !== null &&
  [
    'plasma-preview',
    'camera-story',
    'blackhole-preview',
    'assembly-glow-preview',
    'material-baseline',
    'backlight-preview',
    'compact-preview',
    'viewport-lab',
  ].some((key) => PAGE_SEARCH_PARAMS.has(key))
const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const CUBE_EDGE_RADIUS = 0.0225
const ASSEMBLY_GLOW_SCALE = 1.012
const ASSEMBLY_GLOW_LEAD = 0.1
const ASSEMBLY_GLOW_ATTACK = 0.12
const ASSEMBLY_GLOW_HOLD = 0.06
const ASSEMBLY_GLOW_RELEASE = 0.46
const ROLL_CONTACT_GLOW_START = EDGE_ROLL_DURATION * 0.34
const ROLL_CONTACT_GLOW_ATTACK = EDGE_ROLL_DURATION * 0.5
const ROLL_CONTACT_GLOW_RELEASE_START = EDGE_ROLL_DURATION * 0.92
const ROLL_CONTACT_GLOW_RELEASE = 0.22
// Cubelet engraving gets its own story beats instead of a flat periodic
// shimmer: contact flash at roll, spin waves, ignition surge, and a
// capture shimmer as the shell closes. Each beat reuses the same
// directional reveal; only the envelope changes.
const CUBELET_ENGRAVING_WAVE_PERIOD = 4.2
const CUBELET_ENGRAVING_WAVE_ATTACK = 0.9
const CUBELET_ENGRAVING_WAVE_HOLD = 0.35
const CUBELET_ENGRAVING_WAVE_RELEASE = 1.1
const CUBELET_ENGRAVING_WAVE_PEAK = 0.4
const CUBELET_ENGRAVING_ROLL_PEAK = 0.68
const CUBELET_ENGRAVING_IGNITION_PEAK = 0.85
const CUBELET_ENGRAVING_IGNITION_DURATION = 1.4
const CUBELET_ENGRAVING_CAPTURE_PEAK = 0.52
const CUBELET_ENGRAVING_CAPTURE_DURATION = 1.9
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
const CUBELET_ENGRAVING_IGNITION_START =
  MAIN_SPIN_START + PLASMA_CORE_START - 0.24
const CUBELET_ENGRAVING_CAPTURE_START =
  MAIN_SPIN_START + ORBIT_CAPTURE_START + ORBIT_CAPTURE_DURATION * 0.4
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
  REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION + 0.08
const REACTOR_DIVIDE_ONE_DURATION = 1.15
const REACTOR_DIVIDE_TWO_START =
  REACTOR_DIVIDE_ONE_START + REACTOR_DIVIDE_ONE_DURATION + 0.08
const REACTOR_DIVIDE_TWO_DURATION = 1.3
const REACTOR_TRANSFORM_END =
  REACTOR_DIVIDE_TWO_START + REACTOR_DIVIDE_TWO_DURATION
const REACTOR_CIRCUIT_REVEAL_START =
  REACTOR_TRANSFORM_START + REACTOR_MORPH_DURATION * 0.28
const REACTOR_CIRCUIT_REVEAL_DURATION =
  REACTOR_TRANSFORM_END - REACTOR_CIRCUIT_REVEAL_START + 0.24
const REACTOR_PARENT_WIDTH = 0.3
const REACTOR_PARENT_THICKNESS = 0.07
const REACTOR_LINEAGE_WIDTH = 0.285
const REACTOR_LINEAGE_THICKNESS = 0.05
const REACTOR_TILE_WIDTH = 0.27
const REACTOR_TILE_THICKNESS = 0.022
const REACTOR_PLATE_EDGE_RADIUS = 0.09
const REACTOR_PLATE_EDGE_SEGMENTS = 3
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
// Wait until every scattered plate is gone, then leave a quiet beat before
// the core performs its final idle flourish. This must not overlap the card.
const IDLE_CORE_FLOURISH_START =
  REACTOR_SCATTER_START +
  REACTOR_SCATTER_STAGGER +
  REACTOR_SCATTER_MAX_FLIGHT +
  0.45
const IDLE_CORE_FLOURISH_DURATION = 2.6
const IDLE_CORE_FLOURISH_STAGGER = 0.18
const HERO_PLATE_LAUNCH_START = REACTOR_SCATTER_START - 0.15
const HERO_PLATE_RECOIL_DURATION = 0.15
const HERO_PLATE_FLIGHT_DURATION = 1.55
const HERO_CARD_REVEAL =
  HERO_PLATE_LAUNCH_START + HERO_PLATE_RECOIL_DURATION + 1.27
// Give the air-support oval its own closing beat before the card arrives.
// CSS uses this lead to fold the near/inner lanes away first, instead of
// cutting the entire figure on the same frame as the card reveal.
const OVAL_EXIT_LEAD = 1.25
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
// Electric discharges: surface arcs crawl the blue shell from the moment the
// core finishes igniting (the reactor "revving" phase); stream strikes join
// once the flame fills the vacated reactor volume.
const DISCHARGE_AUTO_START =
  NUCLEUS_FINAL_EXPAND_START + NUCLEUS_FINAL_EXPAND_DURATION * 0.7
const SURFACE_AUTO_START = PLASMA_RIM_START + PLASMA_RIM_DURATION + 0.5
// Both the portrait-mobile and desktop camera stories key off the scene's
// actual phase constants rather than a duplicate wall-clock timeline -
// the named beats are identical either way, only the shot vectors differ.
// Values are SpinSimulation.elapsed, including roll/lift before
// mainElapsed begins.
const CAMERA_STORY_TIMINGS = {
  roll: EDGE_ROLL_DURATION,
  diamond: MAIN_SPIN_START,
  spin: MAIN_SPIN_START + 0.55,
  orbit: MAIN_SPIN_START + NUCLEUS_EXPAND_START + 0.5,
  ignition: MAIN_SPIN_START + PLASMA_CORE_START,
  capture: MAIN_SPIN_START + PLASMA_WARM_START + 0.65,
  shell: MAIN_SPIN_START + ORBIT_END - 0.05,
  reactor: MAIN_SPIN_START + REACTOR_TRANSFORM_START + 0.62,
  division: MAIN_SPIN_START + REACTOR_DIVIDE_ONE_START + 0.72,
  handoff: MAIN_SPIN_START + REACTOR_HERO_SELECT_TIME - 0.08,
} satisfies MobileCameraStoryTimings
const NUCLEUS_BASE_EMISSIVE = new Color('#6cf3b3')
const INNER_GLOW_COLD = new Color('#d1f0ff')

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

// SSR-visible style values must hydrate byte-identically, and Math.sin is
// not bit-stable across JS engines (Node and the browser can differ in the
// last ULP), so DOM markup noise uses integer math instead - ECMAScript
// specifies imul/shifts exactly, making this identical in every engine.
// Scene-only values above keep the GLSL-style hash and its validated data.
function ssrStableNoise(index: number, salt: number) {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
  value ^= value >>> 15
  return (value >>> 0) / 4294967296
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

// The desktop nebula echoes eight visible turning points instead of sitting
// static: main spin taking hold, ignition's warm flash, the completed
// emerald shell, the plates going metallic, the second-generation split,
// the saturated red signal plate, the card's gold settle, and the first
// electric discharge. Same stepping pattern as the title wave - each stage
// name is unique so the CSS animation restarts cleanly.
const NEBULA_BEAT_TIMES = [
  0,
  PLASMA_CORE_START,
  ORBIT_END,
  REACTOR_TRANSFORM_START,
  REACTOR_DIVIDE_ONE_START,
  REACTOR_SIGNAL_START,
  HERO_CARD_REVEAL,
  DISCHARGE_AUTO_START,
] as const
const NEBULA_BEAT_STAGES = [
  'roll',
  'ignite',
  'shell',
  'reactor',
  'divide',
  'signal',
  'card',
  'discharge',
] as const
// The cubelet engraving used to stay one fixed gold the whole time it's
// visible. Same idea as the nebula: let the trace color answer whatever
// beat is actually happening instead of sitting static, reusing the exact
// hue each NEBULA_BEAT_STAGES entry already shows in the backdrop so the
// object and the empty space around it read as one palette. sampleReactorHue
// walks the same NEBULA_BEAT_TIMES thresholds and lerps between the two
// bracketing hues, so the trace color drifts continuously through
// roll -> ignite -> shell -> reactor -> divide -> signal -> card -> discharge
// instead of snapping stage to stage.
const REACTOR_HUE_ROLL = new Color('#6cf3b3')
const REACTOR_HUE_IGNITE = new Color('#ffb653')
const REACTOR_HUE_REACTOR = new Color('#c7a247')
const REACTOR_HUE_DIVIDE = new Color('#4febb3')
const REACTOR_HUE_CARD = new Color('#ead99b')
const REACTOR_HUE_DISCHARGE = new Color('#4de1ff')
const REACTOR_HUE_STAGES = [
  REACTOR_HUE_ROLL,
  REACTOR_HUE_IGNITE,
  EMERALD,
  REACTOR_HUE_REACTOR,
  REACTOR_HUE_DIVIDE,
  SIGNAL_RED,
  REACTOR_HUE_CARD,
  REACTOR_HUE_DISCHARGE,
] as const
const REACTOR_HUE_SCRATCH = new Color()

function sampleReactorHue(target: Color, mainElapsed: number): Color {
  let index = 0
  while (
    index < NEBULA_BEAT_TIMES.length - 1 &&
    mainElapsed >= NEBULA_BEAT_TIMES[index + 1]
  ) {
    index += 1
  }
  const nextIndex = Math.min(index + 1, REACTOR_HUE_STAGES.length - 1)
  const spanStart = NEBULA_BEAT_TIMES[index]
  const spanEnd = NEBULA_BEAT_TIMES[Math.min(index + 1, NEBULA_BEAT_TIMES.length - 1)]
  const span = spanEnd - spanStart
  const localT = span > 0 ? Math.min(1, Math.max(0, (mainElapsed - spanStart) / span)) : 1
  return target.copy(REACTOR_HUE_STAGES[index]).lerp(REACTOR_HUE_STAGES[nextIndex], localT)
}

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

const easeOutQuart = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  return 1 - (1 - progress) ** 4
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
  const dischargeBacklightRef = useRef<Mesh>(null)
  const meshRef = useRef<InstancedMesh>(null)
  const assemblyGlowMeshRef = useRef<InstancedMesh>(null)
  const orbitMeshRef = useRef<InstancedMesh>(null)
  const reactorMeshRef = useRef<InstancedMesh>(null)
  const blackHoleMeshRef = useRef<InstancedMesh>(null)
  const prologueOrbMeshRef = useRef<InstancedMesh>(null)
  const prologueHeroMeshRef = useRef<Mesh>(null)
  const heroPlateRef = useRef<Mesh>(null)
  const plasmaLightRef = useRef<PointLight>(null)
  const heroPlateLightRef = useRef<PointLight>(null)
  const innerGlowLightRef = useRef<PointLight>(null)
  const selectedPlateIndex = useRef(-1)
  const heroLaunchCaptured = useRef(false)
  const cardRevealed = useRef(false)
  const ovalExitStarted = useRef(false)
  const titleWaveStep = useRef(0)
  const nebulaBeatStep = useRef(0)
  const nebulaCoreRevealed = useRef(false)
  const reactorApertureFrozen = useRef(false)
  const viewportLabReady = useRef(false)
  const cameraShotId = useRef('')
  const transform = useMemo(() => new Object3D(), [])
  const blackHoleTransform = useMemo(() => new Object3D(), [])
  const prologueOrbTransform = useMemo(() => new Object3D(), [])
  const assemblyGlowTransform = useMemo(() => new Object3D(), [])
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
  const dischargeBacklightDirection = useMemo(() => new Vector3(), [])
  const dischargeBacklightAxis = useMemo(() => new Vector3(), [])
  const dischargeBacklightView = useMemo(() => new Vector3(), [])
  const dischargeBacklightScreenSide = useMemo(() => new Vector3(), [])
  const viewport = useThree((state) =>
    resolveSceneViewport(state.size.width, state.size.height),
  )
  const compact = viewport.compact || FORCE_COMPACT_PREVIEW
  const portraitCompact = viewport.portraitCompact || FORCE_COMPACT_PREVIEW
  const desktopCameraViewport = viewport.desktopCamera
  const shortPortrait = useThree(
    (state) =>
      resolveSceneViewport(state.size.width, state.size.height)
        .portraitCompact &&
      state.size.height <= 680,
  )
  const setDpr = useThree((state) => state.setDpr)
  const sceneScale = compact ? COMPACT_SCENE_SCALE : DESKTOP_SCENE_SCALE
  const contactHalfExtent = (CUBE_SIZE / 2 + CUBE_STEP) * sceneScale
  const rollDistance = contactHalfExtent * 2
  const diamondLift = contactHalfExtent * (Math.sqrt(3) - 1)
  const previewStage = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED &&
      PAGE_SEARCH_PARAMS?.has('plasma-preview')
        ? PAGE_SEARCH_PARAMS.get('plasma-preview')
        : null,
    [],
  )
  const previewAssemblyGlowStage = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED &&
      PAGE_SEARCH_PARAMS?.has('assembly-glow-preview')
        ? PAGE_SEARCH_PARAMS.get('assembly-glow-preview')
        : null,
    [],
  )
  const previewAssemblyGlow = previewAssemblyGlowStage !== null
  const cameraStory = useMemo(
    () =>
      new MobileCameraStory({
        assemblyX: INITIAL_X,
        settledX: settledCenterX(COMPACT_SCENE_SCALE),
        timings: CAMERA_STORY_TIMINGS,
        distanceScale: shortPortrait ? 1.16 : 1,
        targetYBias: shortPortrait ? 0.5 : 0,
      }),
    [shortPortrait],
  )
  // Wide desktop and portrait mobile use separate authored tracks on the same
  // engine. Compact landscape and reduced-motion keep the static fallback.
  const desktopCameraStory = useMemo(
    () =>
      new MobileCameraStory({
        assemblyX: INITIAL_X,
        settledX: settledCenterX(DESKTOP_SCENE_SCALE),
        timings: CAMERA_STORY_TIMINGS,
        assemblyPoints: DESKTOP_ASSEMBLY_POINTS,
        motionPoints: DESKTOP_MOTION_POINTS,
        driftEnabled: false,
      }),
    [],
  )
  const activeCameraStory = portraitCompact ? cameraStory : desktopCameraStory
  const previewCameraStoryId = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED
        ? PAGE_SEARCH_PARAMS?.get('camera-story') ?? null
        : null,
    [],
  )
  const previewCamera = useMemo(
    () => activeCameraStory.resolvePreview(previewCameraStoryId),
    [activeCameraStory, previewCameraStoryId],
  )
  const previewCameraPoint = previewCamera?.point ?? null
  const previewCameraStory = previewCamera !== null
  const cameraStoryEnabled =
    (!PREFERS_REDUCED_MOTION &&
      (portraitCompact || desktopCameraViewport)) ||
    previewCameraStory ||
    PROLOGUE_PREVIEW_ENABLED
  const previewMaterialBaseline = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED &&
      PAGE_SEARCH_PARAMS?.has('material-baseline') === true,
    [],
  )
  // Isolated lookdev pass for the "black hole" cube cluster near the
  // nucleus (BlackHoleMaterial.ts) - a proposal, not yet wired into the
  // real choreography. Freezes assembly at time 0 (so the far-away swarm
  // stays out of frame) and points the camera at a fixed close view of the
  // nucleus instead of running the normal camera story.
  const blackHolePreview = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED &&
      PAGE_SEARCH_PARAMS?.has('blackhole-preview') === true,
    [],
  )
  // Cold-open prologue: on by default, but only in viewports with a
  // scripted camera story to receive the chase-cam handoff (static-fallback
  // viewports keep their established rig - nothing would own the camera
  // after the prologue there). `?no-prologue` restores the old
  // start-on-swarm behavior, lookdev previews opt out on their own.
  const prologueEnabled =
    PROLOGUE_PREVIEW_ENABLED ||
    (!PREFERS_REDUCED_MOTION &&
      (portraitCompact || desktopCameraViewport) &&
      PAGE_SEARCH_PARAMS?.has('no-prologue') !== true &&
      !PROLOGUE_EXCLUDED_BY_PREVIEW)
  const prologue = useMemo(
    () =>
      new PrologueSequence({
        screenRight: portraitCompact ? 1.0 : 2.0,
      }),
    [portraitCompact],
  )
  const prologueEndCaptured = useRef(false)
  const prologueBlendStart = useMemo(() => new Vector3(), [])
  const prologueBlendTargetStart = useMemo(() => new Vector3(), [])
  useLayoutEffect(() => {
    // A viewport-class change rebuilds the sequence from t=0; the stale
    // captured end pose from the previous instance must not blend in.
    prologueEndCaptured.current = false
  }, [prologue])
  const previewPlasma = previewStage !== null
  useLayoutEffect(() => {
    setDpr(
      compact
        ? 1
        : Math.min(window.devicePixelRatio, 1.5),
    )
  }, [compact, setDpr])
  useLayoutEffect(() => {
    if (import.meta.env.DEV) {
      const debugWindow = window as unknown as Record<string, unknown>
      debugWindow.__mobileCameraStory = cameraStory
      debugWindow.__desktopCameraStory = desktopCameraStory
    }

    if (!cameraStoryEnabled) {
      document.body.removeAttribute('data-camera-shot')
      cameraShotId.current = ''
    }

    return () => {
      document.body.removeAttribute('data-camera-shot')
      if (import.meta.env.DEV) {
        const debugWindow = window as unknown as Record<string, unknown>
        delete debugWindow.__mobileCameraStory
        delete debugWindow.__desktopCameraStory
      }
    }
  }, [cameraStory, desktopCameraStory, cameraStoryEnabled])
  useLayoutEffect(() => {
    const mesh = blackHoleMeshRef.current
    if (!mesh) return
    const reveal = blackHolePreview ? 1 : 0
    for (let index = 0; index < BLACK_HOLE_LOCAL_OFFSETS.length; index += 1) {
      const offset = BLACK_HOLE_LOCAL_OFFSETS[index]
      const rotation = BLACK_HOLE_LOCAL_ROTATIONS[index]
      blackHoleTransform.position.set(
        offset[0] * reveal,
        offset[1] * reveal,
        offset[2] * reveal,
      )
      blackHoleTransform.quaternion.setFromEuler(
        BLACK_HOLE_EULER_SCRATCH.set(
          rotation[0] * reveal,
          rotation[1] * reveal,
          rotation[2] * reveal,
        ),
      )
      blackHoleTransform.scale.setScalar(
        BLACK_HOLE_LOCAL_SCALES[index] * reveal,
      )
      blackHoleTransform.updateMatrix()
      mesh.setMatrixAt(index, blackHoleTransform.matrix)
    }
    mesh.visible = blackHolePreview
    mesh.instanceMatrix.needsUpdate = true
  }, [blackHolePreview, blackHoleTransform])
  const assembly = useMemo(() => {
    const simulation = new LayeredAssembly()
    if (previewAssemblyGlow) {
      const previewElapsed =
        previewAssemblyGlowStage === 'roll'
          ? EDGE_ROLL_DURATION * 0.58
          : previewAssemblyGlowStage === 'landing'
            ? EDGE_ROLL_DURATION * 0.96
            : 0.04
      simulation.time = simulation.endTime + previewElapsed
    } else if (previewPlasma) {
      simulation.time = simulation.endTime + 0.1
    } else if (previewCamera?.clock === 'assembly') {
      simulation.time = simulation.endTime * previewCamera.time
    } else if (previewCamera?.clock === 'motion') {
      simulation.time = simulation.endTime + 0.1
    }
    return simulation
  }, [
    previewAssemblyGlow,
    previewAssemblyGlowStage,
    previewCamera,
    previewPlasma,
  ])
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
    if (previewAssemblyGlow) {
      simulation.elapsed =
        previewAssemblyGlowStage === 'roll'
          ? EDGE_ROLL_DURATION * 0.58
          : previewAssemblyGlowStage === 'landing'
            ? EDGE_ROLL_DURATION * 0.96
            : 0
    } else if (previewPlasma) {
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
                      : previewStage === 'arcrev'
                        ? REACTOR_TRANSFORM_END + 0.6
                        : previewStage === 'waves'
                        ? REACTOR_WAVE_ONE_START + REACTOR_WAVE_DURATION * 0.54
                          : previewStage === 'signal'
                            ? REACTOR_SIGNAL_START + REACTOR_SIGNAL_DURATION * 0.48
                            : previewStage === 'scatter'
                              ? REACTOR_SCATTER_START + 0.72
                              : previewStage === 'card'
                                ? HERO_CARD_REVEAL + 0.42
                                : previewStage === 'idle'
                                  ? IDLE_CORE_FLOURISH_START +
                                    IDLE_CORE_FLOURISH_DURATION +
                                    IDLE_CORE_FLOURISH_STAGGER * 2 +
                                    0.2
                                  : REACTOR_SCATTER_START +
                                    REACTOR_SCATTER_STAGGER +
                                    REACTOR_SCATTER_MAX_FLIGHT +
                                    0.2
      simulation.elapsed = MAIN_SPIN_START + previewMainElapsed
      simulation.settled = true
    } else if (previewCamera?.clock === 'motion') {
      while (simulation.elapsed < previewCamera.time - 1e-6) {
        simulation.update(
          Math.min(1 / 20, previewCamera.time - simulation.elapsed),
        )
      }
      simulation.elapsed = previewCamera.time
      simulation.settled = true
    }
    return simulation
  }, [
    previewAssemblyGlow,
    previewAssemblyGlowStage,
    previewCamera,
    previewPlasma,
    previewStage,
  ])
  const cubeletMaterial = useMemo(
    () => {
      const material = createMetamaterial(
        previewMaterialBaseline
          ? { color: '#18d383', metalness: 0.24, roughness: 0.28 }
          : undefined,
      )
      return previewMaterialBaseline
        ? material
        : enableReactorCircuitSurface(material, {
            engraving: 0.82,
            allFaces: true,
          })
    },
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
  const blackHoleMaterial = useMemo(() => createBlackHoleMaterial(), [])
  const prologueHeroMaterial = useMemo(
    () =>
      createMetamaterial({
        color: '#18d383',
        metalness: 0.22,
        roughness: 0.32,
        emissive: '#6cf3b3',
      }),
    [],
  )
  const gridMaterial = useMemo(() => createGridMaterial(), [])
  const plasmaMaterial = useMemo(() => createPlasmaMaterial(), [])
  const dischargeBacklightMaterial = useMemo(
    () => createDischargeBacklightMaterial(),
    [],
  )
  const flashMaterial = useMemo(() => createFlashMaterial(), [])
  const previewArcBaseline = useMemo(
    () =>
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('arc-baseline'),
    [],
  )
  const discharge = useMemo(() => {
    const scheduler = new DischargeScheduler()
    scheduler.autonomousStart = DISCHARGE_AUTO_START
    scheduler.surfaceStart = SURFACE_AUTO_START
    scheduler.enabled = !previewArcBaseline
    if (previewStage === 'arc') {
      scheduler.previewStream = {
        strand: 2,
        head: 2.6,
        envelope: 1,
        seed: 5.1,
      }
    } else if (
      BACKLIGHT_PREVIEW_ENABLED ||
      previewStage === 'arcsurf' ||
      previewStage === 'arcrev' ||
      previewStage === 'arcnet'
    ) {
      const from = new Vector3(0.9, 0.15, 0.41).normalize()
      const to = new Vector3(-0.35, 0.55, 0.76).normalize()
      const axis = new Vector3().crossVectors(from, to).normalize()
      const span = from.angleTo(to)
      scheduler.previewSurface = {
        axis: [axis.x, axis.y, axis.z],
        tanA: [from.x, from.y, from.z],
        headAngle: span * 0.62,
        span,
        radius: 0.97,
        seed: 8.3,
        envelope: 1,
        illum: 1,
        from: [from.x, from.y, from.z],
        mid: [0.28, 0.35, 0.59],
        groupId: 1,
      }
      if (previewStage === 'arcnet') {
        // Frozen branched network: two forked companions share the main
        // hub and diverge by rotated endpoints, slightly behind in travel.
        const mid = new Vector3()
          .addVectors(from, to)
          .normalize()
        scheduler.previewSurface.mid = [mid.x, mid.y, mid.z]
        scheduler.previewSurfacesExtra = [0.42, -0.55].map(
          (theta, branchIndex) => {
            const rotated = to
              .clone()
              .applyAxisAngle(from, theta)
              .normalize()
            const branchAxis = new Vector3()
              .crossVectors(from, rotated)
              .normalize()
            const branchSpan = from.angleTo(rotated)
            const branchMid = new Vector3()
              .addVectors(from, rotated)
              .normalize()
            return {
              axis: [branchAxis.x, branchAxis.y, branchAxis.z],
              tanA: [from.x, from.y, from.z],
              headAngle: branchSpan * (0.5 - branchIndex * 0.12),
              span: branchSpan,
              radius: 0.96 + branchIndex * 0.03,
              seed: 8.3 + (branchIndex + 1) * 2.17,
              envelope: 0.92 - branchIndex * 0.14,
              illum: 0.9 - branchIndex * 0.15,
              from: [from.x, from.y, from.z],
              mid: [branchMid.x, branchMid.y, branchMid.z],
              groupId: 1,
            } satisfies SurfaceDischargeState
          },
        )
      }
    }
    return scheduler
  }, [previewArcBaseline, previewStage])
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
        : enableReactorCircuitSurface(material, { engraving: 0.92 })
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
        : enableReactorCircuitSurface(material, { engraving: 0.92 })
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
  const reactorDematerializeAttribute = useMemo(
    () =>
      new InstancedBufferAttribute(
        new Float32Array(REACTOR_INSTANCE_COUNT),
        1,
      ).setUsage(DynamicDrawUsage),
    [],
  )
  const reactorPlateGeometry = useMemo(
    () => {
      const geometry = mergeVertices(
        new RoundedBoxGeometry(
          1,
          1,
          1,
          REACTOR_PLATE_EDGE_SEGMENTS,
          REACTOR_PLATE_EDGE_RADIUS,
        ),
      )
      geometry.setAttribute(
        'instanceDematerialize',
        reactorDematerializeAttribute,
      )
      return geometry
    },
    [reactorDematerializeAttribute],
  )

  const syncInstances = (mainElapsed = -1) => {
    const mesh = meshRef.current
    if (!mesh) return
    const glowMesh = assemblyGlowMeshRef.current
    const glowVisible = glowMesh && assemblySeamMaterial.visible

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

      if (glowVisible) {
        assemblyGlowTransform.position.copy(transform.position)
        assemblyGlowTransform.quaternion.copy(transform.quaternion)
        assemblyGlowTransform.scale
          .copy(transform.scale)
          .multiplyScalar(ASSEMBLY_GLOW_SCALE)
        assemblyGlowTransform.updateMatrix()
        glowMesh.setMatrixAt(index, assemblyGlowTransform.matrix)
      }
    })

    mesh.instanceMatrix.needsUpdate = true

    if (glowVisible) {
      glowMesh.instanceMatrix.needsUpdate = true
    }
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
    // The visible material owns the scatter disappearance. Turning shadow
    // casting off with the release prevents already-dematerialized plates
    // from leaving opaque box shadows behind the lattice fragments.
    mesh.castShadow = mainElapsed < REACTOR_SCATTER_START

    const morphRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
      ),
    )
    // Preserve the cube's tangential footprint while its depth is compressed:
    // the viewer first reads one object changing state, not a small cube being
    // swapped for a plate. Width and radial orientation follow only after the
    // wafer silhouette is established.
    const morphThicknessProgress = smootherstep(morphRaw / 0.52)
    const morphWidthProgress = smootherstep((morphRaw - 0.16) / 0.84)
    const morphOrientationProgress = smootherstep((morphRaw - 0.08) / 0.78)
    const divideOneRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_ONE_START) /
          REACTOR_DIVIDE_ONE_DURATION,
      ),
    )
    // Separation starts just before birth, while the new branch is still a
    // small seam of material. It becomes readable early, but reaches full area
    // only after the two plate footprints have cleared one another.
    const divideOneSeparation = smootherstep(
      (divideOneRaw - 0.035) / 0.735,
    )
    const divideOneBirthProgress = smootherstep(
      (divideOneRaw - 0.06) / 0.78,
    )
    const divideOneSizeProgress = smootherstep(divideOneRaw / 0.82)
    const divideTwoRaw = Math.min(
      1,
      Math.max(
        0,
        (mainElapsed - REACTOR_DIVIDE_TWO_START) /
          REACTOR_DIVIDE_TWO_DURATION,
      ),
    )
    const divideTwoSeparation = smootherstep(
      (divideTwoRaw - 0.035) / 0.72,
    )
    const divideTwoBirthProgress = smootherstep(
      (divideTwoRaw - 0.06) / 0.82,
    )
    const divideTwoSizeProgress = smootherstep(divideTwoRaw / 0.82)

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
        let dematerializeProgress = 0

        if (mainElapsed >= REACTOR_TRANSFORM_START) {
          if (mainElapsed < REACTOR_DIVIDE_ONE_START) {
            if (slot === 0) {
              reactorTransform.position
                .copy(family.parentDirection)
                .multiplyScalar(SHELL_RADIUS)
              reactorTransform.quaternion.slerpQuaternions(
                IDENTITY_ORIENTATION,
                family.parentOrientation,
                morphOrientationProgress,
              )
              reactorTransform.scale.set(
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphWidthProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_WIDTH - CUBE_SIZE) * morphWidthProgress,
                CUBE_SIZE +
                  (REACTOR_PARENT_THICKNESS - CUBE_SIZE) *
                    morphThicknessProgress,
              )
            }
          } else if (mainElapsed < REACTOR_DIVIDE_TWO_START) {
            if (slot === 0 || slot === 2) {
              const lineageIndex = slot === 0 ? 0 : 1
              const birthProgress =
                slot === 0 ? 1 : divideOneBirthProgress
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
              slot % 2 === 0 ? 1 : divideTwoBirthProgress
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
                  dematerializeProgress = previewMaterialBaseline
                    ? 0
                    : smootherstep(
                        (flightTime - REACTOR_DEMATERIALIZE_DELAY) /
                          REACTOR_DEMATERIALIZE_DURATION,
                      )
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

                  // Visibility now ends on screen through the lattice
                  // dematerialization. Fog/viewport/camera concealment remain
                  // early-outs for pieces whose trajectory hides them first.
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
                    const hiddenInFog =
                      cameraDistance >=
                      SCATTER_HIDE_DISTANCE +
                        (compact ? COMPACT_CAMERA_EXTRA_DISTANCE : 0)
                    const passedCamera = cameraDistance <= 0.72
                    concealed =
                      outsideViewport ||
                      hiddenInFog ||
                      passedCamera ||
                      flightTime >= REACTOR_SCATTER_MAX_FLIGHT
                  }
                  reactorTransform.scale.set(
                    concealed || dematerializeProgress >= 0.999
                      ? 0
                      : REACTOR_TILE_WIDTH,
                    concealed || dematerializeProgress >= 0.999
                      ? 0
                      : REACTOR_TILE_WIDTH,
                    concealed || dematerializeProgress >= 0.999
                      ? 0
                      : REACTOR_TILE_THICKNESS,
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
        reactorDematerializeAttribute.setX(
          instanceIndex,
          dematerializeProgress,
        )
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    reactorDematerializeAttribute.needsUpdate = true
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
    document.body.removeAttribute('data-oval-on')
    document.body.removeAttribute('data-oval-leaving')
    document.body.removeAttribute('data-nebula-beat')
    document.body.removeAttribute('data-nebula-core')
    if (previewMaterialBaseline) {
      document.body.setAttribute('data-material-baseline', '')
    } else {
      document.body.removeAttribute('data-material-baseline')
    }
    titleWaveStep.current = 0
    nebulaBeatStep.current = 0
    nebulaCoreRevealed.current = false
    reactorApertureFrozen.current = false
    selectedPlateIndex.current = -1
    heroLaunchCaptured.current = false
    cardRevealed.current = false
    ovalExitStarted.current = false

    return () => {
      cardRef.current?.classList.remove('is-visible')
      cardRef.current?.setAttribute('aria-hidden', 'true')
      cardRef.current?.setAttribute('inert', '')
      document.body.classList.remove('reactor-card-visible')
      document.body.removeAttribute('data-orbit-title-wave')
      document.body.removeAttribute('data-oval-on')
      document.body.removeAttribute('data-oval-leaving')
      document.body.removeAttribute('data-material-baseline')
      document.body.removeAttribute('data-nebula-beat')
      document.body.removeAttribute('data-nebula-core')
    }
  }, [
    assembly,
    assemblyGlowTransform,
    cardRef,
    orbitTransform,
    previewMaterialBaseline,
    reactorFamilies,
    reactorTiles,
    reactorTransform,
    transform,
  ])

  const applyCameraStory = (camera: Camera, scene: Scene) => {
    if (!cameraStoryEnabled) return

    if (previewCameraPoint) {
      activeCameraStory.samplePoint(previewCameraPoint)
    } else if (previewCamera) {
      activeCameraStory.sampleClock(previewCamera.clock, previewCamera.time)
    } else {
      activeCameraStory.sample(
        Math.min(1, assembly.time / assembly.endTime),
        spin.elapsed,
        Math.min(assembly.time, assembly.endTime) + spin.elapsed,
        spin.angularVelocity,
      )
    }

    camera.position.copy(activeCameraStory.position)
    camera.up.copy(UP)
    camera.lookAt(activeCameraStory.target)
    // The aperture, signal selection, and release paths read matrixWorld in
    // this same frame, before Three's render traversal updates the camera.
    camera.updateMatrixWorld(true)

    // Every authored dolly keeps the subject at the same relative depth in
    // the scene fog. Without this coupling, the wide assembly/orbit shots
    // would dim their subject merely because the camera moved backwards.
    if (scene.fog instanceof Fog) {
      const storyDistance = camera.position.distanceTo(
        activeCameraStory.target,
      )
      const fogShift = storyDistance - CAMERA_BASE_DISTANCE
      scene.fog.near = FOG_NEAR + fogShift
      scene.fog.far = FOG_FAR + fogShift
    }

    const activeId = activeCameraStory.activePoint.id
    if (cameraShotId.current !== activeId) {
      document.body.dataset.cameraShot = activeId
      cameraShotId.current = activeId
    }

    // Prologue handoff: the story's first sample is a fixed far-left aim,
    // the chase cam ends close behind the cast cube - blend between them
    // over the first PROLOGUE_CAMERA_BLEND seconds of assembly time (the
    // explode flash covers the swing) instead of cutting.
    if (
      prologueEndCaptured.current &&
      assembly.time < PROLOGUE_CAMERA_BLEND
    ) {
      const blendT = smootherstep(assembly.time / PROLOGUE_CAMERA_BLEND)
      PROLOGUE_BLEND_POSITION.copy(prologueBlendStart).lerp(
        camera.position,
        blendT,
      )
      camera.position.copy(PROLOGUE_BLEND_POSITION)
      PROLOGUE_BLEND_TARGET.copy(prologueBlendTargetStart).lerp(
        activeCameraStory.target,
        blendT,
      )
      camera.up.copy(UP)
      camera.lookAt(PROLOGUE_BLEND_TARGET)
      camera.updateMatrixWorld(true)
    }
  }

  useFrame(({ camera, clock, scene }, delta) => {
    if (VIEWPORT_LAB_PREVIEW && !viewportLabReady.current) {
      viewportLabReady.current = true
      document.documentElement.dataset.heroCanvasReady = 'true'
    }

    // Cold-open prologue: plays once before assembly starts counting (the
    // early return below means assembly.update() is never reached while
    // this is active, so it stays parked at time 0 - the far-away swarm
    // start position - exactly where the prologue hands off). Positions
    // from PrologueSequence are in the same local space as everything else
    // under groupRef, so meshes just take them directly; the camera is a
    // top-level object, so its position/target need the same
    // position+scale conversion applyCameraStory uses elsewhere.
    if (prologueEnabled && !prologue.complete) {
      prologue.update(delta)
      updateBlackHoleMaterial(blackHoleMaterial, clock.elapsedTime)

      const nucleusFrame = nucleusFrameRef.current
      if (nucleusFrame) nucleusFrame.scale.setScalar(0)

      PROLOGUE_CAMERA_POSITION.copy(prologue.cameraPosition).multiplyScalar(
        sceneScale,
      )
      PROLOGUE_CAMERA_POSITION.x += INITIAL_X
      PROLOGUE_CAMERA_TARGET.copy(prologue.cameraTarget).multiplyScalar(
        sceneScale,
      )
      PROLOGUE_CAMERA_TARGET.x += INITIAL_X
      camera.position.copy(PROLOGUE_CAMERA_POSITION)
      camera.up.copy(UP)
      camera.lookAt(PROLOGUE_CAMERA_TARGET)
      camera.updateMatrixWorld(true)

      if (prologue.complete && !prologueEndCaptured.current) {
        prologueEndCaptured.current = true
        prologueBlendStart.copy(PROLOGUE_CAMERA_POSITION)
        prologueBlendTargetStart.copy(PROLOGUE_CAMERA_TARGET)
      }

      const orbMesh = prologueOrbMeshRef.current
      if (orbMesh) {
        for (let index = 0; index < prologue.orbPositions.length; index += 1) {
          prologueOrbTransform.position.copy(prologue.orbPositions[index])
          prologueOrbTransform.scale.setScalar(
            prologue.orbVisible[index] ? 0.4 : 0,
          )
          prologueOrbTransform.updateMatrix()
          orbMesh.setMatrixAt(index, prologueOrbTransform.matrix)
        }
        orbMesh.instanceMatrix.needsUpdate = true
      }

      const heroMesh = prologueHeroMeshRef.current
      if (heroMesh) {
        heroMesh.visible = prologue.heroVisible
        heroMesh.position.copy(prologue.heroPosition)
        heroMesh.scale.setScalar(prologue.heroScale)
      }
      prologueHeroMaterial.emissiveIntensity = 0.15 + prologue.explodeFlash * 2.4

      return
    }

    // Isolated lookdev: skip the whole choreography (assembly never
    // advances past its time-0 start, so the far-away swarm stays out of
    // frame) and point the camera at a fixed close view of the nucleus so
    // the new cluster is easy to judge on its own.
    if (blackHolePreview) {
      const nucleusFrame = nucleusFrameRef.current
      if (nucleusFrame) nucleusFrame.scale.setScalar(0)

      BLACK_HOLE_CAMERA_TARGET.set(INITIAL_X, 0.05, 0)
      BLACK_HOLE_CAMERA_POSITION.set(INITIAL_X + 2.1, 1.35, 2.5)
      camera.position.copy(BLACK_HOLE_CAMERA_POSITION)
      camera.up.copy(UP)
      camera.lookAt(BLACK_HOLE_CAMERA_TARGET)
      camera.updateMatrixWorld(true)
      updateBlackHoleMaterial(blackHoleMaterial, clock.elapsedTime)
      return
    }

    const previousAssemblyTime = assembly.time
    if (!previewAssemblyGlow && !previewCameraStory) assembly.update(delta)

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
    const assemblyGlow =
      previewPlasma || previewCamera?.clock === 'motion'
      ? 0
      : assemblyGlowAttack * assemblyGlowRelease
    const contactRollProgress = assembly.complete
      ? smoothstep(spin.elapsed / EDGE_ROLL_DURATION)
      : 0
    const contactGlowAttack = smootherstep(
      (spin.elapsed - ROLL_CONTACT_GLOW_START) / ROLL_CONTACT_GLOW_ATTACK,
    )
    const contactGlowRelease =
      1 -
      smootherstep(
        (spin.elapsed - ROLL_CONTACT_GLOW_RELEASE_START) /
          ROLL_CONTACT_GLOW_RELEASE,
      )
    const contactGlow = assembly.complete
      ? contactGlowAttack * contactGlowRelease
      : 0
    const seamOpacity = Math.min(
      0.68,
      assemblyGlow * 0.34 + contactGlow * 0.6,
    )
    const materialGlow = assemblyGlow * (1 - contactGlow * 0.78)
    const innerGlow = Math.max(assemblyGlow, contactGlow)
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
        materialGlow,
      )
    }
    nucleusMaterial.color.copy(cubeletMaterial.color)
    nucleusMaterial.metalness = cubeletMaterial.metalness
    nucleusMaterial.roughness = cubeletMaterial.roughness
    nucleusMaterial.emissiveIntensity = cubeletMaterial.emissiveIntensity
    const assemblyGlowVisible = seamOpacity > 0.001
    assemblySeamMaterial.visible = assemblyGlowVisible
    updateAssemblySeamMaterial(
      assemblySeamMaterial,
      assembly.time,
      seamOpacity,
      contactRollProgress,
      contactGlow,
      -contactHalfExtent,
      1.05 * sceneScale,
      CUBE_SIZE * 0.5,
    )

    // Internal synergy light: energy released inside the closed cube spills
    // through the bevel gaps between cubelets, so the lock/roll beat reads as
    // light coming from within rather than a surface overlay. The light lives
    // inside the rolling group, so it travels with the cube; its cold-white
    // tint shifts to the contact mint as the support-edge band forms. The
    // 1.35 distance dies out right past the shell, and outward faces simply
    // turn away from it, so the glow stays internal. Both envelopes are zero
    // outside the beat, so the light costs nothing afterwards.
    const innerGlowLight = innerGlowLightRef.current
    if (innerGlowLight) {
      const innerFlicker = 0.93 + 0.07 * Math.sin(assembly.time * 10.5)
      innerGlowLight.intensity = innerGlow * 3.5 * innerFlicker
      innerGlowLight.color.setRGB(
        0.82 - contactGlow * 0.36,
        0.94 + contactGlow * 0.06,
        1.0 - contactGlow * 0.28,
      )
    }

    const group = groupRef.current
    if (!group || !assembly.complete) {
      applyCameraStory(camera, scene)
      syncInstances()
      return
    }

    const spinDelta = previewPlasma || previewCameraStory
      ? 0
      : assembly.time - Math.max(previousAssemblyTime, assembly.endTime)
    spin.update(spinDelta)
    applyCameraStory(camera, scene)

    if (!previewMaterialBaseline && spin.mainElapsed < REACTOR_TRANSFORM_START) {
      const elapsed = spin.elapsed
      const wavePhase = elapsed % CUBELET_ENGRAVING_WAVE_PERIOD
      let waveEnvelope = 0
      if (wavePhase < CUBELET_ENGRAVING_WAVE_ATTACK) {
        waveEnvelope = smootherstep(wavePhase / CUBELET_ENGRAVING_WAVE_ATTACK)
      } else if (
        wavePhase <
        CUBELET_ENGRAVING_WAVE_ATTACK + CUBELET_ENGRAVING_WAVE_HOLD
      ) {
        waveEnvelope = 1
      } else if (
        wavePhase <
        CUBELET_ENGRAVING_WAVE_ATTACK +
          CUBELET_ENGRAVING_WAVE_HOLD +
          CUBELET_ENGRAVING_WAVE_RELEASE
      ) {
        waveEnvelope =
          1 -
          smootherstep(
            (wavePhase -
              CUBELET_ENGRAVING_WAVE_ATTACK -
              CUBELET_ENGRAVING_WAVE_HOLD) /
              CUBELET_ENGRAVING_WAVE_RELEASE,
          )
      }

      // Beat 1 — roll contact flash: the cube lands and the engraving
      // answers with a single hot pulse on the same frame the contact
      // glow fires.
      const rollContact =
        smootherstep(
          (elapsed - ROLL_CONTACT_GLOW_START) / ROLL_CONTACT_GLOW_ATTACK,
        ) *
        (1 -
          smootherstep(
            (elapsed - ROLL_CONTACT_GLOW_RELEASE_START) /
              ROLL_CONTACT_GLOW_RELEASE,
          ))
      const rollBeat = rollContact * CUBELET_ENGRAVING_ROLL_PEAK

      // Beat 2 — spin waves: the periodic shimmer that was here before,
      // now nested between the stronger narrative beats.
      const spinBeat = waveEnvelope * CUBELET_ENGRAVING_WAVE_PEAK

      // Beat 3 — ignition surge: the plasma core lights and the gold
      // engraving surges outward as if the heat reached the shell.
      const ignitionRaw =
        (elapsed - CUBELET_ENGRAVING_IGNITION_START) /
        CUBELET_ENGRAVING_IGNITION_DURATION
      const ignitionBeat =
        smootherstep(ignitionRaw) *
        (1 - smootherstep(ignitionRaw - 0.62)) *
        CUBELET_ENGRAVING_IGNITION_PEAK

      // Beat 4 — capture shimmer: the shell closes and the engraving
      // settles into a quieter, final gilding before the reactor morph.
      const captureRaw =
        (elapsed - CUBELET_ENGRAVING_CAPTURE_START) /
        CUBELET_ENGRAVING_CAPTURE_DURATION
      const captureBeat =
        smootherstep(captureRaw) *
        (1 - smootherstep(captureRaw - 0.7)) *
        CUBELET_ENGRAVING_CAPTURE_PEAK

      const surface = Math.min(
        1,
        rollBeat + spinBeat + ignitionBeat + captureBeat,
      )
      const energy = Math.min(
        1,
        rollContact * 0.9 +
          waveEnvelope * 0.6 +
          ignitionBeat * 0.85 +
          captureBeat * 0.5,
      )

      updateReactorCircuitSurface(
        cubeletMaterial,
        surface,
        elapsed,
        energy,
        0,
        sampleReactorHue(REACTOR_HUE_SCRATCH, spin.mainElapsed),
      )
    }

    while (
      titleWaveStep.current < TITLE_WAVE_TIMES.length &&
      spin.mainElapsed >= TITLE_WAVE_TIMES[titleWaveStep.current]
    ) {
      document.body.dataset.orbitTitleWave =
        TITLE_WAVE_STAGES[titleWaveStep.current]
      // The first energy wave reaching the headline also ignites its
      // air-support oval — one choreographed beat, set only once.
      if (titleWaveStep.current === 0) {
        document.body.dataset.ovalOn = ''
      }
      titleWaveStep.current += 1
    }

    while (
      nebulaBeatStep.current < NEBULA_BEAT_TIMES.length &&
      spin.mainElapsed >= NEBULA_BEAT_TIMES[nebulaBeatStep.current]
    ) {
      document.body.dataset.nebulaBeat = NEBULA_BEAT_STAGES[nebulaBeatStep.current]
      nebulaBeatStep.current += 1
    }

    // The nebula backdrop stays dark through assembly and the roll/spin -
    // there's no object worth answering with color yet. It only fades in
    // once the plasma core actually ignites inside the shell, same moment
    // as the 'ignite' beat above.
    if (!nebulaCoreRevealed.current && spin.mainElapsed >= PLASMA_CORE_START) {
      nebulaCoreRevealed.current = true
      document.body.dataset.nebulaCore = ''
    }

    if (
      spin.mainElapsed >= HERO_CARD_REVEAL - OVAL_EXIT_LEAD &&
      !ovalExitStarted.current
    ) {
      document.body.dataset.ovalLeaving = ''
      ovalExitStarted.current = true
    }

    syncInstances(spin.mainElapsed)
    const reactorSurfaceProgress = smootherstep(
      (spin.mainElapsed - REACTOR_TRANSFORM_START) / REACTOR_MORPH_DURATION,
    )
    const reactorCircuitProgress = smootherstep(
      (spin.mainElapsed - REACTOR_CIRCUIT_REVEAL_START) /
        REACTOR_CIRCUIT_REVEAL_DURATION,
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
        reactorCircuitProgress,
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
    // The still-solid nucleus flares during the lock/roll synergy beat: it
    // is the physical source of the internal light, and its hot surface is
    // what leaks through the bevel gaps as the internal glow.
    nucleusMaterial.emissive
      .copy(NUCLEUS_BASE_EMISSIVE)
      .lerp(INNER_GLOW_COLD, assemblyGlow * 0.55)
    nucleusMaterial.emissiveIntensity =
      cubeletMaterial.emissiveIntensity +
      conversionGlow * 0.72 +
      innerGlow * 1.5
    updateGridMaterial(
      gridMaterial,
      assembly.time,
      gridProgress,
      warmProgress,
      finalExpandProgress,
    )
    discharge.update(spin.mainElapsed)

    // One real WebGL source sits behind the plasma and follows the strongest
    // surface arc's illumination midpoint. Projecting the arc direction onto
    // the camera plane preserves the struck side; offsetting against the view
    // vector places the billboard physically behind the plasma. No DOM spots,
    // timers, global peak, or group rotation participate in this response.
    const dischargeBacklight = dischargeBacklightRef.current
    if (dischargeBacklight) {
      let backlightSource: SurfaceDischargeState | null = null
      for (const surface of discharge.surfaces) {
        if (
          surface.illum > 0.001 &&
          (backlightSource === null || surface.illum > backlightSource.illum)
        ) {
          backlightSource = surface
        }
      }

      // Art direction 2026-07-27: the diffused spark light lives only in the
      // final idle composition; the busy scatter/card beats stay unlit. The
      // dev preview bypasses the gate so it can freeze the effect at any time.
      const finalIdleLighting =
        spin.mainElapsed >= IDLE_CORE_FLOURISH_START || BACKLIGHT_PREVIEW_ENABLED
      dischargeBacklight.visible =
        finalIdleLighting && backlightSource !== null

      if (dischargeBacklight.visible && backlightSource) {
        dischargeBacklightAxis
          .set(
            backlightSource.axis[0],
            backlightSource.axis[1],
            backlightSource.axis[2],
          )
          .normalize()
        dischargeBacklightDirection
          .set(
            backlightSource.tanA[0],
            backlightSource.tanA[1],
            backlightSource.tanA[2],
          )
          .applyAxisAngle(
            dischargeBacklightAxis,
            backlightSource.headAngle * 0.5,
          )
          .normalize()
        dischargeBacklightView
          .copy(camera.position)
          .sub(plasmaWorldCenter)
          .normalize()
        dischargeBacklightScreenSide
          .copy(dischargeBacklightDirection)
          .addScaledVector(
            dischargeBacklightView,
            -dischargeBacklightDirection.dot(dischargeBacklightView),
          )

        const shellRadius =
          plasmaWorldRadii.x *
          (1 + 0.95 * finalExpandProgress) *
          backlightSource.radius
        dischargeBacklight.position
          .copy(plasmaWorldCenter)
          .addScaledVector(dischargeBacklightScreenSide, shellRadius)
          .addScaledVector(dischargeBacklightView, -shellRadius * 0.4)
        dischargeBacklight.quaternion.copy(camera.quaternion)
        const backlightScale = shellRadius * 0.78
        dischargeBacklight.scale.set(backlightScale, backlightScale, 1)
        updateDischargeBacklightMaterial(
          dischargeBacklightMaterial,
          backlightSource.illum * 0.68,
        )
      } else {
        updateDischargeBacklightMaterial(dischargeBacklightMaterial, 0)
      }
    }

    // Final-idle flourish: once all moving plates have left and the scene has
    // held still, three black-hole blocks unfold from the core into the
    // ss_8386ci65x composition. The bounded ease reaches an exact rest state;
    // there is no spring tail or perpetual transform wobble afterwards.
    const blackHoleMesh = blackHoleMeshRef.current
    if (blackHoleMesh) {
      const flourishElapsed = spin.mainElapsed - IDLE_CORE_FLOURISH_START
      blackHoleMesh.visible = !compact && flourishElapsed >= 0
      if (blackHoleMesh.visible) {
        for (let index = 0; index < BLACK_HOLE_LOCAL_OFFSETS.length; index += 1) {
          const rawProgress =
            (flourishElapsed - index * IDLE_CORE_FLOURISH_STAGGER) /
            IDLE_CORE_FLOURISH_DURATION
          const progress = PREFERS_REDUCED_MOTION
            ? rawProgress >= 0
              ? 1
              : 0
            : easeOutQuart(rawProgress)
          const offset = BLACK_HOLE_LOCAL_OFFSETS[index]
          const rotation = BLACK_HOLE_LOCAL_ROTATIONS[index]
          blackHoleTransform.position.set(
            offset[0] * progress,
            offset[1] * progress,
            offset[2] * progress,
          )
          blackHoleTransform.quaternion.setFromEuler(
            BLACK_HOLE_EULER_SCRATCH.set(
              rotation[0] * progress,
              rotation[1] * progress,
              rotation[2] * progress,
            ),
          )
          blackHoleTransform.scale.setScalar(
            BLACK_HOLE_LOCAL_SCALES[index] * progress,
          )
          blackHoleTransform.updateMatrix()
          blackHoleMesh.setMatrixAt(index, blackHoleTransform.matrix)
        }
        blackHoleMesh.instanceMatrix.needsUpdate = true
        updateBlackHoleMaterial(blackHoleMaterial, clock.elapsedTime, 0.46)
      }
    }

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
      discharge.streams,
      discharge.surfaces,
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

        <pointLight
          ref={innerGlowLightRef}
          color="#d1f0ff"
          intensity={0}
          distance={1.35}
          decay={2}
        />

        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, CUBELET_COUNT]}
          geometry={cubeletGeometry}
          material={cubeletMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        />

        <instancedMesh
          ref={assemblyGlowMeshRef}
          args={[undefined, undefined, CUBELET_COUNT]}
          geometry={cubeletGeometry}
          material={assemblySeamMaterial}
          renderOrder={4}
          frustumCulled={false}
        />

        <instancedMesh
          ref={reactorMeshRef}
          args={[undefined, undefined, REACTOR_INSTANCE_COUNT]}
          geometry={reactorPlateGeometry}
          material={reactorMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        />

        <instancedMesh
          ref={blackHoleMeshRef}
          args={[undefined, undefined, BLACK_HOLE_LOCAL_OFFSETS.length]}
          geometry={cubeletGeometry}
          material={blackHoleMaterial}
          frustumCulled={false}
          castShadow
          receiveShadow
        />

        {prologueEnabled && (
          <>
            <instancedMesh
              ref={prologueOrbMeshRef}
              args={[undefined, undefined, 3]}
              geometry={cubeletGeometry}
              material={blackHoleMaterial}
              frustumCulled={false}
              castShadow
              receiveShadow
            />
            <mesh
              ref={prologueHeroMeshRef}
              geometry={cubeletGeometry}
              material={prologueHeroMaterial}
              frustumCulled={false}
              castShadow
              receiveShadow
              visible={false}
            />
          </>
        )}
      </group>

      <mesh
        ref={dischargeBacklightRef}
        material={dischargeBacklightMaterial}
        renderOrder={0}
        frustumCulled={false}
        visible={false}
      >
        <planeGeometry args={[2, 2]} />
      </mesh>

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

/** Static fallback for reduced-motion and compact landscape. Scripted camera
 * viewports return null because mounting OrbitControls would fight the track. */
function SceneControls() {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const viewport = useThree((state) =>
    resolveSceneViewport(state.size.width, state.size.height),
  )
  const compact = viewport.compact || FORCE_COMPACT_PREVIEW
  const portraitCompact = viewport.portraitCompact || FORCE_COMPACT_PREVIEW
  const desktopCameraViewport = viewport.desktopCamera
  const targetX = portraitCompact
    ? settledCenterX(COMPACT_SCENE_SCALE)
    : INITIAL_X
  const targetY = portraitCompact ? COMPACT_PORTRAIT_TARGET_Y : 0
  const scriptedCameraStory =
    (!PREFERS_REDUCED_MOTION &&
      (portraitCompact || desktopCameraViewport)) ||
    CAMERA_STORY_PREVIEW_REQUESTED ||
    PROLOGUE_PREVIEW_ENABLED

  useLayoutEffect(() => {
    if (scriptedCameraStory) return

    const pullback = compact ? COMPACT_CAMERA_PULLBACK : 1
    camera.position
      .copy(CAMERA_BASE_OFFSET)
      .multiplyScalar(pullback)
      .add(cameraAimScratch.set(targetX, targetY, 0))
    camera.lookAt(targetX, targetY, 0)

    const extra = compact ? COMPACT_CAMERA_EXTRA_DISTANCE : 0
    if (scene.fog instanceof Fog) {
      scene.fog.near = FOG_NEAR + extra
      scene.fog.far = FOG_FAR + extra
    }

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__sceneDebug = {
        camera,
        scene,
        compact,
        portraitCompact,
        desktopCameraViewport,
        targetX,
        targetY,
      }
    }
  }, [
    camera,
    scene,
    compact,
    portraitCompact,
    desktopCameraViewport,
    scriptedCameraStory,
    targetX,
    targetY,
  ])

  if (scriptedCameraStory || portraitCompact) return null

  return (
    <OrbitControls
      target={[targetX, targetY, 0]}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={0.8}
      maxPolarAngle={2.1}
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
  sourceLabel: string
}

const DEFAULT_CARD_COPY: HeroCardCopy = {
  h2: 'Интерактивная 3D-графика для веба',
  p1: 'Я люблю дизайн и стиль: придумывать работающие системы и делать их красивыми. Вкус у меня есть, и я не стесняюсь его применять — сцена на этой странице спроектирована с нуля: математика траекторий, физика волчка, шейдеры плазмы.',
  p2: 'Упор держу на производительность (спасибо, СДВГ) и эстетику (спасибо, перфекционизм): кастомные GLSL-шейдеры, постобработка, стабильные 60–120 FPS на десктопе и мобильных. Делаю конфигураторы, иммерсивные лендинги, картографию на Mapbox, визуализации данных и браузерные движки — вплоть до Minecraft-реплеера.',
  p3: 'Веду проект целиком и отвечаю за результат: концепция → прототип → продакшен. Инструменты подбираю по задаче — включая ИИ-инструменты; смотрю в сторону WebGPU. Чем страннее задача, тем интереснее — неформат приветствуется. Санкт-Петербург, работаю удалённо.',
  cta: 'Написать в Telegram',
  ariaNav: 'Соцсети и контакты',
  sourceLabel: 'Исходный код сайта на GitHub',
}

const CARD_CIRCUIT_PATHS = [
  'M24 30H82V46H154V28H226',
  'M72 74H132V92H212V64H286',
  'M188 18V34H306V56H388V34H456',
  'M438 20V42H504V72H578',
  'M590 26H662V48H736V30H804',
  'M770 18V58H852V78H926',
  'M944 28H1018V46H1086V24H1158',
  'M1132 76H1210V54H1288V84H1366',
  'M1326 24H1402V44H1474V26H1576',
  'M24 330H104V310H174V334H250',
  'M78 276H150V294H226V268H302',
  'M292 334H372V308H448V326H522',
  'M506 286H584V314H664V292H742',
  'M718 334H798V306H878V330H954',
  'M934 280H1010V302H1090V274H1168',
  'M1142 332H1222V308H1300V330H1380',
  'M1336 276H1412V296H1490V270H1576',
  'M530 112V150H504V202H536V242',
  'M1056 106V146H1080V194H1048V238',
  'M24 116H58V150H92V184H54V224H24',
  'M1576 112H1542V146H1508V180H1544V222H1576',
  'M356 112H408V130H452',
  'M720 110H766V134H812',
  'M1184 118H1230V140H1278',
] as const

// Dark lenticel marks on birch bark - horizontal slashes in the area between
// the two circuit-trace rows where the body text sits. Each mark is a short
// tapered stroke with varied spacing, tilt, and weight to feel organic.
// Three densities: dense cluster (3-4 tight), normal pair, and isolated single
// marks scattered across the band.
// Kept sparse and irregular on purpose: an earlier pass filled every row
// edge-to-edge at even spacing, which read as a repeating printed pattern
// rather than bark - real lenticels cluster occasionally and otherwise
// leave long stretches of bare bark between them.
const CARD_BARK_MARKS = [
  // ── top band (Y ≈ 140..176) ──────────────────────
  // row 1: sparse
  'M46 148L78 146', 'M228 144L268 149', 'M458 145L504 150',
  // row 2: one real cluster (loosened, not a solid run)
  'M558 164L582 162', 'M596 160L620 158',
  'M690 148L732 143', 'M864 156L906 150',
  // row 3: mixed
  'M936 166L968 163', 'M1052 162L1084 158',
  'M1246 153L1292 147', 'M1508 144L1550 148',
  // row 4: near lower band
  'M58 172L98 170', 'M264 172L316 169', 'M510 172L564 168',
  // ── middle band (Y ≈ 180..210) ───────────────────
  'M82 192L114 190', 'M262 188L310 185', 'M478 188L540 184',
  'M714 188L758 185', 'M964 192L998 189',
  'M1200 195L1244 191', 'M1480 188L1534 184',
  // ── lower band (Y ≈ 210..240) ────────────────────
  'M40 226L84 222', 'M200 228L248 224', 'M398 228L456 223',
  'M580 228L628 224', 'M852 228L906 222',
  'M1122 226L1172 222', 'M1420 226L1474 222',
  // ── bottom scatter (Y ≈ 242..260) ────────────────
  'M64 244L104 240', 'M320 246L376 242', 'M630 252L672 246',
  'M926 252L968 246', 'M1424 250L1478 244',
] as const

// Each lenticel mark gets a filled half-ellipse shadow beneath it, like the
// dark crescent under a real birch bark scar, instead of a blurred copy of
// the same line - a stroke duplicate reads as "a stick behind a stick", not
// as a shadow. Derived once from CARD_BARK_MARKS so the crescent always
// spans (and centers under) its own stroke.
//
// A single fixed pad/roundness ratio made all 67 crescents read as one
// stamped shape repeated - real bark scars vary a lot. Three deterministic
// cycles (lengths 11, 7, 5 - mutually prime, so their combined period is
// 385, longer than the whole mark set) pick the pad, roundness, and drop
// per mark with no visible repeat; an occasional mod-13 mark gets a much
// bigger "eye" the way birch bark has scattered larger scars among the
// small lenticels. No Math.random(): this array is built once at module
// load and must render identically on the server and during hydration.
// Darkness and blur then scale off the mark's own resulting size, so a
// bigger crescent also reads as a deeper, softer shadow instead of just a
// scaled-up copy of the same flat mark.
const BARK_SHADOW_PAD_RATIOS = [0.14, 0.34, 0.2, 0.5, 0.16, 0.28, 0.42, 0.12, 0.3, 0.22, 0.38]
const BARK_SHADOW_ROUND_RATIOS = [0.42, 0.7, 0.52, 0.8, 0.46, 0.62, 0.36]
const BARK_SHADOW_DROP = [1.5, 3, 2, 4, 2.5]
const BARK_MARK_ENDPOINTS = /^M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)$/

interface BarkShadow {
  d: string
  fill: string
  blur: string
}

function barkShadowArc(mark: string, index: number): BarkShadow {
  const parsed = mark.match(BARK_MARK_ENDPOINTS)
  if (!parsed) return { d: mark, fill: 'rgba(35, 24, 12, 0.2)', blur: '1.2px' }
  const x1 = Number(parsed[1])
  const y1 = Number(parsed[2])
  const x2 = Number(parsed[3])
  const y2 = Number(parsed[4])
  const width = Math.abs(x2 - x1)
  const isBigEye = index % 13 === 4
  const eyeBoost = isBigEye ? 1.6 : 1
  const padRatio = BARK_SHADOW_PAD_RATIOS[index % BARK_SHADOW_PAD_RATIOS.length] * eyeBoost
  const roundRatio =
    BARK_SHADOW_ROUND_RATIOS[index % BARK_SHADOW_ROUND_RATIOS.length] * (isBigEye ? 1.25 : 1)
  const drop = BARK_SHADOW_DROP[index % BARK_SHADOW_DROP.length]
  const pad = width * padRatio
  const sx = Math.min(x1, x2) - pad
  const ex = Math.max(x1, x2) + pad
  const chordY = (y1 + y2) / 2 + drop
  const rx = (ex - sx) / 2
  const ry = rx * roundRatio
  // Round to numbers, not strings: toFixed leaves trailing zeros ("0.20")
  // that CSSOM normalizes away ("0.2") during hydration, which React then
  // reports as a style mismatch. Plain rounded numbers serialize the same
  // on the server, on the client, and inside the browser's CSS parser.
  const alpha = Math.min(0.34, Math.round((0.13 + rx * 0.0035) * 100) / 100)
  const blurPx = Math.min(2.6, Math.round((0.9 + rx * 0.018) * 100) / 100)
  return {
    d: `M${sx} ${chordY}A${rx} ${ry} 0 0 0 ${ex} ${chordY}Z`,
    fill: `rgba(35, 24, 12, ${alpha})`,
    blur: `${blurPx}px`,
  }
}
const CARD_BARK_SHADOWS = CARD_BARK_MARKS.map((mark, index) => barkShadowArc(mark, index))

const CARD_CIRCUIT_PADS = [
  [24, 30, 3], [154, 28, 2.5], [226, 28, 3],
  [72, 74, 2.5], [212, 64, 3], [286, 64, 2.5],
  [188, 18, 2.5], [306, 56, 3], [456, 34, 2.5],
  [438, 20, 2.5], [504, 72, 3], [578, 72, 2.5],
  [590, 26, 3], [736, 30, 2.5], [804, 30, 3],
  [770, 18, 2.5], [852, 78, 3], [926, 78, 2.5],
  [944, 28, 3], [1086, 24, 2.5], [1158, 24, 3],
  [1132, 76, 2.5], [1288, 84, 3], [1366, 84, 2.5],
  [1326, 24, 3], [1474, 26, 2.5], [1576, 26, 3],
  [24, 330, 3], [174, 334, 2.5], [250, 334, 3],
  [78, 276, 2.5], [226, 268, 3], [302, 268, 2.5],
  [292, 334, 3], [448, 326, 2.5], [522, 326, 3],
  [506, 286, 2.5], [664, 292, 3], [742, 292, 2.5],
  [718, 334, 3], [878, 330, 2.5], [954, 330, 3],
  [934, 280, 2.5], [1090, 274, 3], [1168, 274, 2.5],
  [1142, 332, 3], [1300, 330, 2.5], [1380, 330, 3],
  [1336, 276, 2.5], [1490, 270, 3], [1576, 270, 2.5],
  [530, 112, 3], [504, 202, 2.5], [536, 242, 3],
  [1056, 106, 2.5], [1080, 194, 3], [1048, 238, 2.5],
  [24, 116, 3], [92, 184, 2.5], [24, 224, 3],
  [1576, 112, 3], [1508, 180, 2.5], [1576, 222, 3],
  [356, 112, 2.5], [408, 130, 3], [452, 130, 2.5],
  [720, 110, 3], [766, 134, 2.5], [812, 134, 3],
  [1184, 118, 2.5], [1230, 140, 3], [1278, 140, 2.5],
] as const

// ── Wide/desktop circuit pattern (>=721px) ────────────────────────────────
// The compact pattern above squeezes ~4x horizontally on phone-sized cards,
// which is exactly the pitch the user approved as "аккуратно". On wide cards
// the same viewBox stretches ~1:1, so the old coarse Manhattan traces read
// oversized. This desktop-only sibling redraws the pattern in the current
// reactor-plate surface language (the v10 look the orbiting cubelets use):
// paired high-speed corridors with a constant lane gap, 45-degree
// transitions instead of right angles, sparse vias only at corridor ends,
// and two short corner registration rails instead of the closed frame.
// Mobile keeps the compact pattern untouched; the bark layer never changes.
const CARD_CIRCUIT_PATHS_WIDE = [
  // top band, paired corridors with 45-degree jogs
  'M24 32H78L94 48H150L166 32H228M24 43H72L88 59H139L155 43H228',
  'M258 20V34H330L346 50H420V36H470M269 20V45H336L352 61H431V47H481',
  'M500 26H560L576 42H640L656 26H720M500 37H554L570 53H629L645 37H720',
  'M760 20V36H830L846 52H910V68M771 20V47H836L852 63H921V79',
  'M950 28H1010L1026 44H1090L1106 28H1160M950 39H1004L1020 55H1079L1095 39H1160',
  'M1210 22V38H1280L1296 54H1360V40H1420M1221 22V49H1286L1302 65H1371V51H1431',
  'M1460 30H1520L1536 46H1576M1460 41H1514L1530 57H1576',
  // bottom band
  'M24 328H80L96 312H160L176 328H240M24 339H86L102 323H166L182 339H240',
  'M280 340V326H350L366 310H430V324H490M291 340V315H356L372 299H436V313H501',
  'M540 330H610L626 314H690L706 330H770M540 341H604L620 325H679L695 341H770',
  'M810 340V324H880L896 308H960V322M821 340V313H886L902 297H966V311',
  'M1010 330H1070L1086 314H1150L1166 330H1230M1010 341H1064L1080 325H1139L1155 341H1230',
  'M1270 340V326H1340L1356 310H1420L1436 326H1500M1281 340V315H1346L1362 299H1431L1447 315H1511',
  // edge verticals
  'M24 108H52L68 124V156L84 172H110M24 119H46L57 130V162L73 178H104',
  'M24 250H56L72 266V300M24 261H50L61 272V306',
  'M1576 106H1548L1532 122V154L1516 170H1490M1576 117H1554L1543 128V160L1527 176H1496',
  'M1576 252H1544L1528 268V302M1576 263H1550L1539 274V308',
  // short drops toward the text band (stop clear of the copy)
  'M486 112V138L502 154H536M497 112V144L508 155H542',
  'M1056 110V136L1072 152H1106M1067 110V142L1078 153H1112',
] as const

// Two short corner registration rails replace the wide pattern's closed
// frame (the v10 surface did the same when its frame read as an archival PCB).
const CARD_CIRCUIT_RAILS_WIDE = ['M18 64V18H64', 'M1582 296V342H1536'] as const

// Sparse vias at corridor ends only - the compact card carries 48 pads,
// which at this finer pitch read as clutter; every fourth stays a filled
// dot through the shared pad CSS.
const CARD_CIRCUIT_PADS_WIDE = [
  [24, 37, 3], [232, 37, 3],
  [264, 20, 2.5], [478, 41, 3],
  [500, 31, 2.5], [720, 31, 3],
  [765, 20, 2.5], [916, 73, 3],
  [950, 33, 2.5], [1160, 33, 3],
  [1215, 22, 2.5], [1426, 45, 3],
  [1460, 35, 2.5], [1576, 51, 3],
  [24, 333, 3], [240, 333, 2.5],
  [285, 340, 3], [495, 318, 2.5],
  [540, 335, 3], [770, 335, 2.5],
  [815, 340, 3], [960, 316, 2.5],
  [1010, 335, 3], [1230, 335, 2.5],
  [1275, 340, 3], [1506, 320, 2.5],
  [24, 113, 3], [107, 175, 2.5],
  [24, 255, 2.5], [72, 303, 3],
  [1576, 111, 2.5], [1493, 173, 3],
  [1576, 257, 3], [1528, 305, 2.5],
  [491, 112, 2.5], [539, 154, 3],
  [1061, 110, 3], [1109, 152, 2.5],
] as const

export default function HeroScene({
  copy = DEFAULT_CARD_COPY,
}: {
  copy?: HeroCardCopy
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const cardBodyRef = useRef<HTMLDivElement | null>(null)
  const previewLightingBaseline = useMemo(
    () =>
      DEVELOPMENT_PREVIEW_ENABLED &&
      PAGE_SEARCH_PARAMS?.has('lighting-baseline') === true,
    [],
  )
  const headingGlyphs = Array.from(copy.h2)
  const headingInitial = headingGlyphs.shift() ?? ''
  const headingRemainder = headingGlyphs.join('')

  // Square-bracket tokens in the i18n copy mark accent words. Split them
  // into real <em> nodes so the card can render marginalia-style accents
  // without breaking the copy-fit measurements.
  const renderAccentText = (text: string) => {
    const parts = text.split(/(\[[^\]]+\])/g)
    let accentOrder = 0
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        // Per-mark stagger for the corrector's-hand draw-on; the CSS adds
        // its own base delay after the paragraph text has landed.
        const delay = `${accentOrder * 0.09}s`
        accentOrder += 1
        return (
          <em
            key={index}
            className="reactor-card__accent"
            style={{ '--accent-delay': delay } as CSSProperties}
          >
            {part.slice(1, -1)}
          </em>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // Mobile pages and the wide desktop leaves have a real bounded area. Fit
  // each paragraph independently so short copy does not drown in empty board
  // space while long copy still remains fully readable and unclipped.
  useLayoutEffect(() => {
    const body = cardBodyRef.current
    if (!body) return

    const paragraphs = Array.from(
      body.querySelectorAll<HTMLParagraphElement>('p'),
    )
    let animationFrame = 0
    let disposed = false

    const fitCopy = () => {
      animationFrame = 0
      const bodyStyle = window.getComputedStyle(body)
      const horizontalPager = bodyStyle.scrollSnapType.includes('x')
      const shortLandscape = window.matchMedia(
        '(max-width: 1180px) and (max-height: 800px) and (orientation: landscape)',
      ).matches
      const wideDesktop = window.innerWidth > 960 && !shortLandscape
      const shouldFit = horizontalPager || wideDesktop

      body.toggleAttribute('data-copy-fit', shouldFit)
      for (const paragraph of paragraphs) {
        paragraph.style.removeProperty('--card-copy-fit')
      }
      if (!shouldFit) return

      // Ponomar is rendered at 1.06x the fitted custom property on desktop.
      // Keep the effective floor close to the previous 13.1px book copy while
      // still allowing the longest RU/EN leaf to clear its bounded column.
      const minimum = horizontalPager ? 12 : 12.5
      const maximum = horizontalPager ? 30 : 20
      const safetyReduction = horizontalPager ? 0.3 : 0.18

      for (const paragraph of paragraphs) {
        paragraph.style.setProperty('--card-copy-fit', `${minimum}px`)
        const availableHeight = paragraph.clientHeight
        const availableWidth = paragraph.clientWidth
        if (availableHeight <= 0 || availableWidth <= 0) continue

        let low = minimum
        let high = maximum
        for (let step = 0; step < 9; step += 1) {
          const candidate = (low + high) / 2
          paragraph.style.setProperty(
            '--card-copy-fit',
            `${candidate.toFixed(3)}px`,
          )
          const fits =
            paragraph.scrollHeight <= availableHeight + 0.5 &&
            paragraph.scrollWidth <= availableWidth + 1
          if (fits) low = candidate
          else high = candidate
        }

        paragraph.style.setProperty(
          '--card-copy-fit',
          `${Math.max(minimum, low - safetyReduction).toFixed(3)}px`,
        )
      }
    }

    const scheduleFit = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(fitCopy)
    }
    const resizeObserver = new ResizeObserver(scheduleFit)
    resizeObserver.observe(body)
    window.addEventListener('resize', scheduleFit)
    document.fonts.ready.then(() => {
      if (!disposed) scheduleFit()
    })
    scheduleFit()

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleFit)
      body.removeAttribute('data-copy-fit')
      for (const paragraph of paragraphs) {
        paragraph.style.removeProperty('--card-copy-fit')
      }
    }
  }, [copy.p1, copy.p2, copy.p3])

  return (
    <>
      <div className="hero-scene" aria-hidden="true">
        <Canvas
          camera={{ position: [4.8, 3.4, 7.2], fov: 43 }}
          dpr={[1, 1.5]}
          frameloop={FREEZE_VIEWPORT_LAB_GRID ? 'demand' : 'always'}
          shadows
          onCreated={({ camera, invalidate }) => {
            camera.lookAt(INITIAL_X, 0, 0)
            window.requestAnimationFrame(() => {
              invalidate()
            })
          }}
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
          <SceneControls />
        </Canvas>
      </div>

      <article
        ref={cardRef}
        className="reactor-card"
        aria-hidden="true"
        inert
      >
        <svg
          className="reactor-card__circuit reactor-card__circuit--compact"
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
            {CARD_CIRCUIT_PATHS.map((path, index) => (
              <path
                key={`groove-${path}`}
                d={path}
                pathLength="1"
                style={{
                  '--circuit-delay': `${index * 0.042}s`,
                } as CSSProperties}
              />
            ))}
          </g>
          <g className="reactor-card__circuit-metal">
            {CARD_CIRCUIT_PATHS.map((path, index) => (
              <path
                key={`metal-${path}`}
                d={path}
                pathLength="1"
                style={{
                  '--circuit-delay': `${index * 0.042}s`,
                } as CSSProperties}
              />
            ))}
          </g>
          <g className="reactor-card__circuit-pads">
            {CARD_CIRCUIT_PADS.map(([x, y, size], index) => (
              <rect
                key={`${x}-${y}-${index}`}
                x={x - size}
                y={y - size}
                width={size * 2}
                height={size * 2}
                rx={index % 4 === 0 ? size : 0.6}
                style={{
                  '--pad-delay': `${(index % 16) * 0.035}s`,
                } as CSSProperties}
              />
            ))}
          </g>
        </svg>
        <svg
          className="reactor-card__circuit reactor-card__circuit--wide"
          viewBox="0 0 1600 360"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {CARD_CIRCUIT_RAILS_WIDE.map((rail) => (
            <path
              key={`rail-${rail}`}
              className="reactor-card__circuit-frame"
              d={rail}
            />
          ))}
          <g className="reactor-card__circuit-grooves">
            {CARD_CIRCUIT_PATHS_WIDE.map((path, index) => (
              <path
                key={`groove-wide-${index}`}
                d={path}
                pathLength="1"
                style={{
                  '--circuit-delay': `${index * 0.042}s`,
                } as CSSProperties}
              />
            ))}
          </g>
          <g className="reactor-card__circuit-metal">
            {CARD_CIRCUIT_PATHS_WIDE.map((path, index) => (
              <path
                key={`metal-wide-${index}`}
                d={path}
                pathLength="1"
                style={{
                  '--circuit-delay': `${index * 0.042}s`,
                } as CSSProperties}
              />
            ))}
          </g>
          <g className="reactor-card__circuit-pads">
            {CARD_CIRCUIT_PADS_WIDE.map(([x, y, size], index) => (
              <rect
                key={`wide-${x}-${y}-${index}`}
                x={x - size}
                y={y - size}
                width={size * 2}
                height={size * 2}
                rx={index % 4 === 0 ? size : 0.6}
                style={{
                  '--pad-delay': `${(index % 16) * 0.035}s`,
                } as CSSProperties}
              />
            ))}
          </g>
        </svg>
        <svg
          className="reactor-card__circuit reactor-card__circuit--bark"
          viewBox="0 0 1600 360"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g className="reactor-card__bark-marks-shadow" aria-hidden="true">
            {CARD_BARK_SHADOWS.map((shadow, index) => (
              <path
                key={`bark-sd-${index}`}
                d={shadow.d}
                style={{
                  '--bark-delay': `${index * 0.03}s`,
                  // Once drawn on, lenticels don't stay static - they breathe
                  // continuously, each on its own slow, chaotic cycle so the
                  // board reads as living material rather than a printed
                  // pattern. Duration and delay are both per-mark deterministic
                  // noise (no Math.random - stays SSR/hydration-stable); the
                  // delay is offset past this mark's own reveal so breathing
                  // never fights the initial draw-on.
                  '--bark-breathe-duration': `${7 + ssrStableNoise(index, 141) * 9}s`,
                  '--bark-breathe-delay': `${1.7 + index * 0.03 + ssrStableNoise(index, 173) * 7}s`,
                  fill: shadow.fill,
                  filter: `blur(${shadow.blur})`,
                } as CSSProperties}
              />
            ))}
          </g>
          <g className="reactor-card__bark-marks">
            {CARD_BARK_MARKS.map((path, index) => (
              <path
                key={`bark-${path}`}
                d={path}
                pathLength="1"
                style={{
                  '--bark-delay': `${index * 0.03}s`,
                  '--bark-breathe-duration': `${7 + ssrStableNoise(index, 41) * 9}s`,
                  '--bark-breathe-delay': `${1.6 + index * 0.03 + ssrStableNoise(index, 73) * 7}s`,
                } as CSSProperties}
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
          <h2 aria-label={copy.h2}>
            <span
              className="reactor-card__heading-initial"
              aria-hidden="true"
            >
              {headingInitial}
            </span>
            <span
              className="reactor-card__heading-text"
              aria-hidden="true"
            >
              {headingRemainder}
            </span>
          </h2>
          <div
            ref={cardBodyRef}
            className="reactor-card__body"
            role="region"
            aria-label={copy.h2}
            tabIndex={0}
          >
            <p data-page="01 / 03">{renderAccentText(copy.p1)}</p>
            <p data-page="02 / 03">{renderAccentText(copy.p2)}</p>
            <p data-page="03 / 03">{renderAccentText(copy.p3)}</p>
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
              href={SOURCE_REPOSITORY}
              target="_blank"
              rel="noopener"
              aria-label={copy.sourceLabel}
              title={copy.sourceLabel}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .297a12 12 0 0 0-3.793 23.388c.6.111.82-.261.82-.577v-2.234c-3.338.725-4.042-1.416-4.042-1.416-.546-1.386-1.333-1.755-1.333-1.755-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.762-1.605-2.665-.304-5.467-1.333-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 6.102c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.624-5.479 5.921.43.372.814 1.103.814 2.222v3.293c0 .319.216.694.825.576A12 12 0 0 0 12 .297Z" />
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
