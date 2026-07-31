import type { Object3D, Vector3 } from 'three'

import { PLASMA_CORE_START } from './plasmaIgnitionScale.ts'

// The original (pre-black-hole-misread) brief: five Minecraft-scale glass
// voxels live inside the real plasma nucleus. They begin nearly coincident,
// then open into an irregular cluster whose missing shader cells expose real
// empty space. Each voxel rotates on a different quiet axis, so its coarse
// screen-space refraction sends the core's colour along a different vector.
export const CORE_LENS_LOCAL_OFFSETS: ReadonlyArray<
  readonly [number, number, number]
> = [
  [-0.17, 0.1, -0.025],
  [0.105, 0.155, 0.035],
  [0.185, -0.055, -0.085],
  [-0.075, -0.17, 0.075],
  [0.025, -0.005, 0.175],
]
export const CORE_LENS_LOCAL_SCALES = [
  0.34, 0.285, 0.315, 0.27, 0.235,
] as const
export const CORE_LENS_LOCAL_ROTATIONS: ReadonlyArray<
  readonly [number, number, number]
> = [
  [0.18, 0.46, -0.12],
  [-0.28, 0.16, 0.52],
  [0.41, -0.34, 0.2],
  [-0.48, 0.58, -0.24],
  [0.3, 0.72, 0.38],
]
export const CORE_LENS_LOCAL_SPINS: ReadonlyArray<
  readonly [number, number, number]
> = [
  [0.035, -0.052, 0.018],
  [-0.024, 0.043, 0.031],
  [0.047, 0.021, -0.036],
  [-0.031, -0.028, 0.044],
  [0.026, -0.039, -0.025],
]
export const CORE_LENS_CAPTURE_DESKTOP = 512
export const CORE_LENS_CAPTURE_COMPACT = 256
export const CORE_LENS_REVEAL_START = PLASMA_CORE_START + 0.08
export const CORE_LENS_REVEAL_DURATION = 1.35

const smootherstep = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10)
}

export interface CoreLensState {
  progress: number
  visible: boolean
  time: number
  spread: number
  scaleEnvelope: number
  strength: number
  opacity: number
}

// Shared by the live scene (HeroScene.tsx) and the SceneProof core-lens
// fixture (scripts/sceneproof/) so both sample the exact same formula.
export function computeCoreLensState(
  mainElapsed: number,
  finalExpandProgress: number,
  warmProgress: number,
  rimProgress: number,
  compact: boolean,
  time: number,
): CoreLensState {
  const progress = smootherstep(
    (mainElapsed - CORE_LENS_REVEAL_START) / CORE_LENS_REVEAL_DURATION,
  )
  const spread = (0.16 + progress * 0.84) * (1 + finalExpandProgress * 0.72)
  const scaleEnvelope =
    progress * (0.52 + progress * 0.48) * (1 + finalExpandProgress * 0.48)
  return {
    progress,
    visible: progress > 0.001,
    time,
    spread,
    scaleEnvelope,
    strength: progress * (0.7 + warmProgress * 0.2 + rimProgress * 0.1),
    opacity: progress * (compact ? 0.76 : 0.84),
  }
}

// Writes one instance's local transform into `transform` (caller owns
// calling updateMatrix()/setMatrixAt()) using the exact production offsets,
// rotations, and spin rates above.
export function applyCoreLensInstanceTransform(
  index: number,
  transform: Object3D,
  worldCenter: Vector3,
  sceneScale: number,
  state: CoreLensState,
) {
  const offset = CORE_LENS_LOCAL_OFFSETS[index]
  const rotation = CORE_LENS_LOCAL_ROTATIONS[index]
  const spinRate = CORE_LENS_LOCAL_SPINS[index]
  transform.position.set(
    worldCenter.x + offset[0] * sceneScale * state.spread,
    worldCenter.y + offset[1] * sceneScale * state.spread,
    worldCenter.z + offset[2] * sceneScale * state.spread,
  )
  transform.rotation.set(
    rotation[0] + spinRate[0] * state.time,
    rotation[1] + spinRate[1] * state.time,
    rotation[2] + spinRate[2] * state.time,
  )
  transform.scale.setScalar(
    CORE_LENS_LOCAL_SCALES[index] * sceneScale * state.scaleEnvelope,
  )
  transform.updateMatrix()
}
