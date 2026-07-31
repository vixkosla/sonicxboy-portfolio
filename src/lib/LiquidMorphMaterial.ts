import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'

interface ScalarUniform {
  value: number
}

interface VectorUniform {
  value: Vector3
}

interface SurfaceSweepUniforms {
  time: ScalarUniform
  progress: ScalarUniform
  halfExtent: ScalarUniform
  center: VectorUniform
}

export type SurfaceSweepMode = 'source' | 'reveal' | 'front'

const surfaceSweepUniforms = new WeakMap<
  MeshStandardMaterial,
  SurfaceSweepUniforms
>()

const SWEEP_VERTEX_PARAMETERS = `
#include <common>
varying vec3 vSurfaceSweepPosition;
`

const SWEEP_VERTEX_POSITION = `
#include <begin_vertex>
#ifdef USE_INSTANCING
  vSurfaceSweepPosition = ( instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
#else
  vSurfaceSweepPosition = transformed;
#endif
`

const SWEEP_FRAGMENT_PARAMETERS = `
#include <common>
uniform float uSurfaceSweepTime;
uniform float uSurfaceSweepProgress;
uniform float uSurfaceSweepHalfExtent;
uniform vec3 uSurfaceSweepCenter;
varying vec3 vSurfaceSweepPosition;

float surfaceSweepCoordinate( vec3 point ) {
  vec3 normalizedPoint = clamp(
    point / max( uSurfaceSweepHalfExtent, 0.0001 ),
    vec3( -1.08 ),
    vec3( 1.08 )
  );
  vec3 contactPoint = vec3( 1.035, 1.025, 1.045 );
  float radialDistance = length( normalizedPoint - contactPoint ) / 3.59;
  float contourLife = radialDistance * ( 1.0 - radialDistance );
  float contour =
    sin(
      normalizedPoint.y * 4.2 -
      normalizedPoint.z * 3.35 +
      uSurfaceSweepTime * 0.42
    ) * 0.026 +
    sin(
      normalizedPoint.x * 3.1 +
      normalizedPoint.y * 2.25 +
      normalizedPoint.z * 2.7
    ) * 0.014;
  return clamp(radialDistance + contour * contourLife, 0.0, 1.0);
}
`

function sweepClip(mode: SurfaceSweepMode) {
  const point =
    mode === 'reveal'
      ? 'vSurfaceSweepPosition - uSurfaceSweepCenter'
      : 'vSurfaceSweepPosition'
  const discard =
    mode === 'source'
      ? 'if ( surfaceSweepValue <= uSurfaceSweepProgress ) discard;'
      : mode === 'reveal'
        ? 'if ( surfaceSweepValue > uSurfaceSweepProgress ) discard;'
        : `
float surfaceSweepWidth = 0.052 +
  0.012 * sin( uSurfaceSweepTime * 4.6 + surfaceSweepValue * 31.0 );
float surfaceSweepBand =
  1.0 - abs( surfaceSweepValue - uSurfaceSweepProgress ) /
  max( surfaceSweepWidth, 0.012 );
if (
  uSurfaceSweepProgress < -0.01 ||
  uSurfaceSweepProgress > 1.03 ||
  surfaceSweepBand <= 0.0
) discard;
surfaceSweepBand = smoothstep( 0.0, 1.0, surfaceSweepBand );
`

  return `
#include <clipping_planes_fragment>
float surfaceSweepValue = surfaceSweepCoordinate( ${point} );
${discard}
`
}

const SWEEP_FRONT_COLOR = `
#include <color_fragment>
vec3 surfaceSweepShadow = vec3( 0.025, 0.22, 0.15 );
vec3 surfaceSweepMetal = vec3( 0.66, 1.0, 0.89 );
vec3 surfaceSweepHot = vec3( 0.91, 1.0, 0.97 );
float surfaceSweepCore = pow( surfaceSweepBand, 2.2 );
diffuseColor.rgb = mix(
  surfaceSweepShadow,
  mix( surfaceSweepMetal, surfaceSweepHot, surfaceSweepCore ),
  0.52 + surfaceSweepBand * 0.48
);
`

const SWEEP_FRONT_EMISSIVE = `
#include <emissivemap_fragment>
totalEmissiveRadiance +=
  vec3( 0.08, 0.88, 0.56 ) *
  ( 0.14 + surfaceSweepBand * surfaceSweepBand * 0.62 );
`

/**
 * Adds a spatially complementary surface wipe without moving vertices.
 * `source` retains the untouched solid cube ahead of the contour, `reveal`
 * exposes the rigid 3x3x3 descendants behind it, and `front` draws only the
 * narrow molten-metal contour between those two hard states.
 */
export function enableSurfaceSweep<T extends MeshStandardMaterial>(
  material: T,
  mode: SurfaceSweepMode,
) {
  if (surfaceSweepUniforms.has(material)) return material

  const uniforms: SurfaceSweepUniforms = {
    time: { value: 0 },
    progress: { value: mode === 'reveal' ? 1.08 : -0.08 },
    halfExtent: { value: 1 },
    center: { value: new Vector3() },
  }
  surfaceSweepUniforms.set(material, uniforms)

  const previousOnBeforeCompile = material.onBeforeCompile.bind(material)
  const previousProgramCacheKey = material.customProgramCacheKey.bind(material)

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer)
    shader.uniforms.uSurfaceSweepTime = uniforms.time
    shader.uniforms.uSurfaceSweepProgress = uniforms.progress
    shader.uniforms.uSurfaceSweepHalfExtent = uniforms.halfExtent
    shader.uniforms.uSurfaceSweepCenter = uniforms.center
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', SWEEP_VERTEX_PARAMETERS)
      .replace('#include <begin_vertex>', SWEEP_VERTEX_POSITION)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', SWEEP_FRAGMENT_PARAMETERS)
      .replace('#include <clipping_planes_fragment>', sweepClip(mode))

    if (mode === 'front') {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_fragment>', SWEEP_FRONT_COLOR)
        .replace('#include <emissivemap_fragment>', SWEEP_FRONT_EMISSIVE)
    }
  }
  material.customProgramCacheKey = () =>
    `${previousProgramCacheKey()}-surface-sweep-v2-${mode}`
  material.needsUpdate = true
  return material
}

/** The molten contour is a shading layer; its geometry remains rigid. */
export function createLiquidMorphMaterial() {
  return enableSurfaceSweep(
    new MeshPhysicalMaterial({
      color: new Color('#9af4d2'),
      metalness: 0.9,
      roughness: 0.12,
      emissive: new Color('#073d2b'),
      emissiveIntensity: 0.46,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      iridescence: 0.18,
      iridescenceIOR: 1.48,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    'front',
  )
}

export function updateSurfaceSweepMaterial(
  material: MeshStandardMaterial,
  time: number,
  progress: number,
  center: Vector3,
  halfExtent: number,
) {
  const uniforms = surfaceSweepUniforms.get(material)
  if (!uniforms) return
  uniforms.time.value = time
  uniforms.progress.value = progress
  uniforms.center.value.copy(center)
  uniforms.halfExtent.value = Math.max(0.0001, halfExtent)
}
