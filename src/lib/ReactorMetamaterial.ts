import { Color, MeshStandardMaterial } from 'three'

const DORMANT_COLOR_VALUE = '#0c754d'
const ACTIVE_COLOR_VALUE = '#18d383'
const STRUCTURAL_EMISSIVE = '#063d2b'
const DORMANT_COLOR = new Color(DORMANT_COLOR_VALUE)
const ACTIVE_COLOR = new Color(ACTIVE_COLOR_VALUE)

interface ScalarUniform {
  value: number
}

interface ColorUniform {
  value: Color
}

interface ReactorSurfaceUniforms {
  surface: ScalarUniform
  time: ScalarUniform
  energy: ScalarUniform
  seed: ScalarUniform
  conductorColor: ColorUniform
}

const reactorSurfaceUniforms = new WeakMap<
  MeshStandardMaterial,
  ReactorSurfaceUniforms
>()

const REACTOR_VERTEX_PARAMETERS = `
#include <common>
uniform float uReactorSeed;
varying vec2 vReactorUv;
varying float vReactorFace;
flat varying float vReactorSeed;
flat varying float vReactorWave;
flat varying vec4 vReactorRandomA;
flat varying vec4 vReactorRandomB;

float reactorVertexHash( float value ) {
  return fract( sin( value * 17.17 + 0.131 ) * 43758.5453 );
}
`

const REACTOR_VERTEX_ASSIGNMENTS = `
#include <uv_vertex>
vReactorUv = uv;
vReactorFace = abs( normal.z );
#ifdef USE_INSTANCING
  vReactorSeed = float( gl_InstanceID );
  vec3 reactorInstanceCenter = instanceMatrix[ 3 ].xyz;
  vec3 reactorInstanceDirection = reactorInstanceCenter /
    max( length( reactorInstanceCenter ), 0.001 );
  vReactorWave = clamp(
    dot(
      reactorInstanceDirection,
      normalize( vec3( -0.68, 0.56, 0.48 ) )
    ) * 0.5 + 0.5,
    0.0,
    1.0
  );
#else
  vReactorSeed = uReactorSeed;
  vReactorWave = reactorVertexHash( vReactorSeed + 211.0 );
#endif
vReactorRandomA = vec4(
  reactorVertexHash( vReactorSeed + 1.0 ),
  reactorVertexHash( vReactorSeed + 19.0 ),
  reactorVertexHash( vReactorSeed + 37.0 ),
  reactorVertexHash( vReactorSeed + 53.0 )
);
vReactorRandomB = vec4(
  reactorVertexHash( vReactorSeed + 71.0 ),
  reactorVertexHash( vReactorSeed + 89.0 ),
  reactorVertexHash( vReactorSeed + 107.0 ),
  reactorVertexHash( vReactorSeed + 131.0 )
);
`

const REACTOR_FRAGMENT_PARAMETERS = `
#include <common>
uniform float uReactorSurface;
uniform float uReactorTime;
uniform float uReactorEnergy;
uniform vec3 uReactorConductorColor;
varying vec2 vReactorUv;
varying float vReactorFace;
flat varying float vReactorSeed;
flat varying float vReactorWave;
flat varying vec4 vReactorRandomA;
flat varying vec4 vReactorRandomB;

float reactorSegmentDistance(
  vec2 point,
  vec2 segmentStart,
  vec2 segmentEnd
) {
  vec2 segmentCenter = ( segmentStart + segmentEnd ) * 0.5;
  vec2 halfExtent = abs( segmentEnd - segmentStart ) * 0.5;
  vec2 offset = abs( point - segmentCenter ) - halfExtent;
  return max( offset.x, offset.y );
}

float reactorBand( float distanceToFeature, float width ) {
  float antialias = max( fwidth( distanceToFeature ) * 1.35, 0.00075 );
  return 1.0 - smoothstep( width, width + antialias, distanceToFeature );
}
`

const REACTOR_SURFACE_FRAGMENT = `
#include <color_fragment>

vec3 reactorSignalColor = diffuseColor.rgb;
float reactorFaceMask = smoothstep( 0.72, 0.98, vReactorFace );
float reactorSeedA = vReactorRandomA.x;
float reactorSeedB = vReactorRandomA.y;
float reactorSeedC = vReactorRandomA.z;
float reactorSeedD = vReactorRandomA.w;
float reactorSeedE = vReactorRandomB.x;
float reactorSeedF = vReactorRandomB.y;

float reactorSwapAxes = step( 0.5, reactorSeedC );
float reactorFlipX = step( 0.5, reactorSeedD );
float reactorFlipY = step( 0.5, reactorSeedE );
vec2 reactorUv = mix( vReactorUv, vReactorUv.yx, reactorSwapAxes );
reactorUv.x = mix( reactorUv.x, 1.0 - reactorUv.x, reactorFlipX );
reactorUv.y = mix( reactorUv.y, 1.0 - reactorUv.y, reactorFlipY );

vec2 reactorHub = vec2(
  mix( 0.36, 0.64, reactorSeedA ),
  mix( 0.36, 0.64, reactorSeedB )
);
float reactorHubHalfSize = mix( 0.072, 0.105, reactorSeedF );
float reactorMicroReveal = smoothstep( 0.1, 0.62, uReactorSurface );
float reactorStructureReveal = smoothstep( 0.28, 0.9, uReactorSurface );
float reactorRadialProgress = length( reactorUv - reactorHub ) * 0.86;
float reactorTraceReveal = smoothstep(
  reactorRadialProgress,
  reactorRadialProgress + 0.2,
  uReactorSurface
);

vec2 reactorLeftNode = vec2( 0.13, mix( 0.2, 0.8, reactorSeedC ) );
vec2 reactorRightNode = vec2( 0.87, mix( 0.2, 0.8, reactorSeedD ) );
vec2 reactorTopNode = vec2( mix( 0.2, 0.8, reactorSeedE ), 0.87 );
vec2 reactorBottomNode = vec2( mix( 0.2, 0.8, reactorSeedF ), 0.13 );
float reactorRightBranch = step(
  0.28,
  vReactorRandomB.z
);
float reactorBottomBranch = step(
  0.42,
  vReactorRandomB.w
);

vec2 reactorLeftCorner = vec2( reactorHub.x, reactorLeftNode.y );
float reactorLeftDistance = min(
  reactorSegmentDistance(
    reactorUv,
    reactorLeftNode,
    reactorLeftCorner
  ),
  reactorSegmentDistance( reactorUv, reactorLeftCorner, reactorHub )
);
vec2 reactorTopCorner = vec2( reactorTopNode.x, reactorHub.y );
float reactorTopDistance = min(
  reactorSegmentDistance(
    reactorUv,
    reactorTopNode,
    reactorTopCorner
  ),
  reactorSegmentDistance( reactorUv, reactorTopCorner, reactorHub )
);
vec2 reactorRightCorner = vec2( reactorHub.x, reactorRightNode.y );
float reactorRightDistance = min(
  reactorSegmentDistance(
    reactorUv,
    reactorRightNode,
    reactorRightCorner
  ),
  reactorSegmentDistance( reactorUv, reactorRightCorner, reactorHub )
);
vec2 reactorBottomCorner = vec2( reactorBottomNode.x, reactorHub.y );
float reactorBottomDistance = min(
  reactorSegmentDistance(
    reactorUv,
    reactorBottomNode,
    reactorBottomCorner
  ),
  reactorSegmentDistance( reactorUv, reactorBottomCorner, reactorHub )
);

float reactorTraceDistance = min(
  reactorLeftDistance,
  reactorTopDistance
);
reactorTraceDistance = min(
  reactorTraceDistance,
  mix( 1.0, reactorRightDistance, reactorRightBranch )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  mix( 1.0, reactorBottomDistance, reactorBottomBranch )
);

float reactorTerminalDistance = min(
  max(
    abs( reactorUv.x - reactorLeftNode.x ),
    abs( reactorUv.y - reactorLeftNode.y )
  ),
  max(
    abs( reactorUv.x - reactorTopNode.x ),
    abs( reactorUv.y - reactorTopNode.y )
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  mix(
    1.0,
    max(
      abs( reactorUv.x - reactorRightNode.x ),
      abs( reactorUv.y - reactorRightNode.y )
    ),
    reactorRightBranch
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  mix(
    1.0,
    max(
      abs( reactorUv.x - reactorBottomNode.x ),
      abs( reactorUv.y - reactorBottomNode.y )
    ),
    reactorBottomBranch
  )
);

float reactorEdgeDistance = min(
  min( reactorUv.x, 1.0 - reactorUv.x ),
  min( reactorUv.y, 1.0 - reactorUv.y )
);
float reactorFrameDistance = abs( reactorEdgeDistance - 0.075 );
float reactorHubDistance = abs(
  max(
    abs( reactorUv.x - reactorHub.x ),
    abs( reactorUv.y - reactorHub.y )
  ) - reactorHubHalfSize
);
vec2 reactorGridCell = abs( fract( reactorUv * 5.0 ) - 0.5 );
float reactorGridDistance = 0.5 - max( reactorGridCell.x, reactorGridCell.y );

float reactorMicroGrid = reactorBand( reactorGridDistance, 0.014 );
float reactorFrameGroove = reactorBand( reactorFrameDistance, 0.018 );
float reactorFrameCore = reactorBand( reactorFrameDistance, 0.006 );
float reactorTraceGroove = reactorBand( reactorTraceDistance, 0.033 );
float reactorTraceCore = reactorBand( reactorTraceDistance, 0.011 );
float reactorTerminalGroove = reactorBand( reactorTerminalDistance, 0.04 );
float reactorTerminalCore = reactorBand( reactorTerminalDistance, 0.014 );
float reactorHubGroove = reactorBand( reactorHubDistance, 0.024 );
float reactorHubCore = reactorBand( reactorHubDistance, 0.007 );

float reactorFlowCoordinate = fract(
  reactorUv.x * 0.58 +
  reactorUv.y * 0.42 -
  uReactorTime * 0.18 +
  reactorSeedA
);
float reactorFlowPulse = reactorBand(
  abs( reactorFlowCoordinate - 0.5 ),
  0.055
);

float reactorSurfaceMask = reactorFaceMask * reactorStructureReveal;
float reactorTraceMask = reactorFaceMask * reactorTraceReveal;
float reactorMicroPattern =
  reactorFaceMask * reactorMicroReveal * reactorMicroGrid;
float reactorFramePattern = reactorSurfaceMask * reactorFrameGroove;
float reactorFrameConductor = reactorSurfaceMask * reactorFrameCore;
float reactorGroovePattern = reactorTraceMask * max(
  reactorTraceGroove,
  max( reactorTerminalGroove, reactorHubGroove )
);
float reactorConductorPattern = reactorTraceMask * max(
  reactorTraceCore,
  max( reactorTerminalCore, reactorHubCore )
);
float reactorPulsePattern = reactorConductorPattern * reactorFlowPulse;

diffuseColor.rgb *= 1.0 - reactorMicroPattern * 0.075;
diffuseColor.rgb *= 1.0 - reactorFramePattern * 0.22;
diffuseColor.rgb *= 1.0 - reactorGroovePattern * 0.31;
float reactorGoldMask = clamp(
  reactorConductorPattern * 0.92,
  0.0,
  1.0
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  uReactorConductorColor,
  reactorGoldMask
);
`

const REACTOR_ROUGHNESS_FRAGMENT = `
#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor +
  reactorMicroPattern * 0.075 +
  reactorFramePattern * 0.065 +
  reactorGroovePattern * 0.1 -
  reactorConductorPattern * 0.12,
  0.08,
  0.88
);
`

const REACTOR_METALNESS_FRAGMENT = `
#include <metalnessmap_fragment>
metalnessFactor = clamp(
  metalnessFactor -
  reactorMicroPattern * 0.055 -
  reactorGroovePattern * 0.08 +
  reactorConductorPattern * 0.28 +
  reactorFrameConductor * 0.08,
  0.0,
  1.0
);
`

const REACTOR_EMISSIVE_FRAGMENT = `
#include <emissivemap_fragment>
float reactorCurrent = uReactorEnergy * (
  reactorConductorPattern * 0.025 +
  reactorPulsePattern * 0.5
);
totalEmissiveRadiance += reactorSignalColor * reactorCurrent;
`

export const CONDUCTIVE_METALNESS = 0.38
export const CONDUCTIVE_ROUGHNESS = 0.31
export const CONDUCTIVE_EMISSIVE_INTENSITY = 0.03

export const REACTOR_METALNESS = 0.58
export const REACTOR_ROUGHNESS = 0.22
export const REACTOR_EMISSIVE_INTENSITY = 0.07

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const interpolate = (from: number, to: number, progress: number) =>
  from + (to - from) * progress

interface MetamaterialOptions {
  color?: string
  emissive?: string
  metalness?: number
  roughness?: number
  transparent?: boolean
}

export function createMetamaterial(
  options: MetamaterialOptions = {},
) {
  return new MeshStandardMaterial({
    color: options.color ?? DORMANT_COLOR_VALUE,
    metalness: options.metalness ?? 0.1,
    roughness: options.roughness ?? 0.62,
    emissive: options.emissive ?? STRUCTURAL_EMISSIVE,
    emissiveIntensity: 0,
    transparent: options.transparent ?? false,
  })
}

export function enableReactorCircuitSurface(
  material: MeshStandardMaterial,
) {
  if (reactorSurfaceUniforms.has(material)) return material

  const uniforms: ReactorSurfaceUniforms = {
    surface: { value: 0 },
    time: { value: 0 },
    energy: { value: 0 },
    seed: { value: 0 },
    conductorColor: { value: new Color('#e8c56f') },
  }
  reactorSurfaceUniforms.set(material, uniforms)

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReactorSurface = uniforms.surface
    shader.uniforms.uReactorTime = uniforms.time
    shader.uniforms.uReactorEnergy = uniforms.energy
    shader.uniforms.uReactorSeed = uniforms.seed
    shader.uniforms.uReactorConductorColor = uniforms.conductorColor
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', REACTOR_VERTEX_PARAMETERS)
      .replace('#include <uv_vertex>', REACTOR_VERTEX_ASSIGNMENTS)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', REACTOR_FRAGMENT_PARAMETERS)
      .replace('#include <color_fragment>', REACTOR_SURFACE_FRAGMENT)
      .replace(
        '#include <roughnessmap_fragment>',
        REACTOR_ROUGHNESS_FRAGMENT,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        REACTOR_METALNESS_FRAGMENT,
      )
      .replace('#include <emissivemap_fragment>', REACTOR_EMISSIVE_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'reactor-circuit-surface-v6'
  material.needsUpdate = true
  return material
}

export function updateReactorCircuitSurface(
  material: MeshStandardMaterial,
  surfaceProgress: number,
  time: number,
  energy: number,
  seed = 0,
) {
  const uniforms = reactorSurfaceUniforms.get(material)
  if (!uniforms) return

  uniforms.surface.value = clamp01(surfaceProgress)
  uniforms.time.value = time
  uniforms.energy.value = clamp01(energy)
  uniforms.seed.value = Math.max(0, seed)
}

export function updateStructuralMetamaterial(
  material: MeshStandardMaterial,
  crystallization: number,
  conductivity: number,
  assemblyPulse: number,
) {
  const crystalProgress = clamp01(crystallization)
  const conductiveProgress = clamp01(conductivity)
  const pulse = clamp01(assemblyPulse)

  material.color.copy(DORMANT_COLOR).lerp(ACTIVE_COLOR, crystalProgress)
  material.metalness = interpolate(
    interpolate(0.1, 0.27, crystalProgress),
    CONDUCTIVE_METALNESS,
    conductiveProgress,
  )
  material.roughness = Math.max(
    0.18,
    interpolate(
      interpolate(0.62, 0.39, crystalProgress),
      CONDUCTIVE_ROUGHNESS,
      conductiveProgress,
    ) - pulse * 0.055,
  )
  material.emissiveIntensity =
    interpolate(0, CONDUCTIVE_EMISSIVE_INTENSITY, conductiveProgress) +
    pulse * 0.035
}

export function updateReactorMetamaterial(
  material: MeshStandardMaterial,
  morphProgress: number,
  time = 0,
  energy = 1,
) {
  const progress = clamp01(morphProgress)
  material.metalness = interpolate(
    CONDUCTIVE_METALNESS,
    REACTOR_METALNESS,
    progress,
  )
  material.roughness = interpolate(
    CONDUCTIVE_ROUGHNESS,
    REACTOR_ROUGHNESS,
    progress,
  )
  material.emissiveIntensity = interpolate(
    CONDUCTIVE_EMISSIVE_INTENSITY,
    REACTOR_EMISSIVE_INTENSITY,
    progress,
  )
  updateReactorCircuitSurface(material, progress, time, energy)
}
