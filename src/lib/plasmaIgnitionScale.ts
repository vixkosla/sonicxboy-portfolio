const smootherstep = (value: number) => {
  const progress = Math.min(1, Math.max(0, value))
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10)
}

export const PLASMA_CORE_START = 5.8
export const PLASMA_CORE_DURATION = 0.24
export const PLASMA_WARM_START = 7.55
export const PLASMA_WARM_DURATION = 1.2
export const PLASMA_RIM_START = 8.8
export const PLASMA_RIM_DURATION = 1.25
export const PLASMA_REACTOR_RADIAL_SCALE = 2.78
export const PLASMA_REACTOR_PROXY_RADIAL_SCALE = 6.05
export const PLASMA_REACTOR_PROXY_VERTICAL_SCALE = 13.5

export interface PlasmaScaleState {
  coreProgress: number
  warmProgress: number
  rimProgress: number
  plasmaOpacity: number
  plasmaRadialScale: number
  plasmaProxyRadialScale: number
  plasmaProxyVerticalScale: number
  plasmaExpansion: number
}

// Shared by the live scene (HeroScene.tsx) and the SceneProof fixtures
// (scripts/sceneproof/) so both sample the exact same formula.
export function computePlasmaScale(
  mainElapsed: number,
  finalExpandProgress: number,
): PlasmaScaleState {
  const coreProgress = smootherstep(
    (mainElapsed - PLASMA_CORE_START) / PLASMA_CORE_DURATION,
  )
  const warmProgress = smootherstep(
    (mainElapsed - PLASMA_WARM_START) / PLASMA_WARM_DURATION,
  )
  const rimProgress = smootherstep(
    (mainElapsed - PLASMA_RIM_START) / PLASMA_RIM_DURATION,
  )
  const plasmaOpacity = Math.max(coreProgress, warmProgress, rimProgress)
  const plasmaRadialScale =
    1 + (PLASMA_REACTOR_RADIAL_SCALE - 1) * finalExpandProgress
  const plasmaProxyRadialScale =
    1 + (PLASMA_REACTOR_PROXY_RADIAL_SCALE - 1) * finalExpandProgress
  const plasmaProxyVerticalScale =
    1 + (PLASMA_REACTOR_PROXY_VERTICAL_SCALE - 1) * finalExpandProgress
  return {
    coreProgress,
    warmProgress,
    rimProgress,
    plasmaOpacity,
    plasmaRadialScale,
    plasmaProxyRadialScale,
    plasmaProxyVerticalScale,
    plasmaExpansion: finalExpandProgress,
  }
}
