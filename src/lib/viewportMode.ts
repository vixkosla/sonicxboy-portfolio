export interface SceneViewport {
  compact: boolean
  portraitCompact: boolean
  desktopCamera: boolean
}

const PORTRAIT_COMPACT: SceneViewport = Object.freeze({
  compact: true,
  portraitCompact: true,
  desktopCamera: false,
})

const LANDSCAPE_COMPACT: SceneViewport = Object.freeze({
  compact: true,
  portraitCompact: false,
  desktopCamera: false,
})

const LANDSCAPE_DESKTOP: SceneViewport = Object.freeze({
  compact: false,
  portraitCompact: false,
  desktopCamera: true,
})

const STATIC_DESKTOP_SCALE: SceneViewport = Object.freeze({
  compact: false,
  portraitCompact: false,
  desktopCamera: false,
})

const COMPACT_MAX_WIDTH = 720
const COMPACT_LANDSCAPE_MAX_WIDTH = 1180
const COMPACT_LANDSCAPE_MAX_HEIGHT = 800

export function resolveSceneViewport(
  width: number,
  height: number,
): SceneViewport {
  const landscape = width > height

  if (width <= COMPACT_MAX_WIDTH && !landscape) {
    return PORTRAIT_COMPACT
  }

  const compactLandscape =
    landscape &&
    width <= COMPACT_LANDSCAPE_MAX_WIDTH &&
    height <= COMPACT_LANDSCAPE_MAX_HEIGHT
  if (compactLandscape) return LANDSCAPE_COMPACT

  if (landscape) return LANDSCAPE_DESKTOP

  return STATIC_DESKTOP_SCALE
}
