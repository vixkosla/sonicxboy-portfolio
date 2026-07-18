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
float reactorSeedG = vReactorRandomB.z;
float reactorSeedH = vReactorRandomB.w;

float reactorSwapAxes = step( 0.5, reactorSeedC );
float reactorFlipX = step( 0.5, reactorSeedD );
float reactorFlipY = step( 0.5, reactorSeedE );
vec2 reactorUv = mix( vReactorUv, vReactorUv.yx, reactorSwapAxes );
reactorUv.x = mix( reactorUv.x, 1.0 - reactorUv.x, reactorFlipX );
reactorUv.y = mix( reactorUv.y, 1.0 - reactorUv.y, reactorFlipY );

vec2 reactorHub = vec2(
  mix( 0.3, 0.7, reactorSeedA ),
  mix( 0.3, 0.7, reactorSeedB )
);
float reactorHubHalfSize = mix( 0.036, 0.058, reactorSeedF );

// One diagonal wave traverses the shell. Inside each plate the conductor
// grows out from its local hub; the resin/fine etch follows behind it.
float reactorActivation = smoothstep( 0.015, 0.16, uReactorSurface );
float reactorRadialProgress = length( reactorUv - reactorHub );
float reactorEtchClock =
  uReactorSurface * 1.78 -
  vReactorWave * 0.58 -
  reactorSeedG * 0.1 -
  reactorRadialProgress * 0.38;
float reactorGoldReveal =
  smoothstep( -0.05, 0.035, reactorEtchClock ) * reactorActivation;
float reactorBoardReveal =
  smoothstep( 0.09, 0.28, reactorEtchClock ) * reactorActivation;
float reactorGoldLead = 1.0 - smoothstep(
  0.035,
  0.13,
  abs( reactorEtchClock - 0.055 )
);

vec2 reactorLeftNode = vec2( 0.075, mix( 0.14, 0.86, reactorSeedC ) );
vec2 reactorRightNode = vec2( 0.925, mix( 0.14, 0.86, reactorSeedD ) );
vec2 reactorTopNode = vec2( mix( 0.14, 0.86, reactorSeedE ), 0.925 );
vec2 reactorBottomNode = vec2( mix( 0.14, 0.86, reactorSeedF ), 0.075 );
vec2 reactorLocalNode = vec2(
  mix( 0.18, 0.82, reactorSeedG ),
  mix( 0.18, 0.82, reactorSeedH )
);
float reactorTopologyB = step( 0.34, reactorSeedA );
float reactorTopologyC = step( 0.68, reactorSeedA );
float reactorTopologyA = 1.0 - reactorTopologyB;
reactorTopologyB *= 1.0 - reactorTopologyC;
float reactorLeftBranch = clamp(
  reactorTopologyA +
  reactorTopologyB +
  reactorTopologyC * step( 0.62, reactorSeedG ),
  0.0,
  1.0
);
float reactorTopBranch = clamp(
  reactorTopologyA +
  reactorTopologyC +
  reactorTopologyB * step( 0.7, reactorSeedH ),
  0.0,
  1.0
);
float reactorRightBranch = clamp(
  reactorTopologyB +
  reactorTopologyA * step( 0.58, reactorSeedG ) +
  reactorTopologyC * step( 0.78, reactorSeedG ),
  0.0,
  1.0
);
float reactorBottomBranch = clamp(
  reactorTopologyC +
  reactorTopologyB * step( 0.58, reactorSeedH ) +
  reactorTopologyA * step( 0.78, reactorSeedH ),
  0.0,
  1.0
);
float reactorLocalBranch = step(
  0.44,
  fract( reactorSeedA + reactorSeedE )
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
vec2 reactorLocalCorner = vec2( reactorLocalNode.x, reactorHub.y );
float reactorLocalDistance = min(
  reactorSegmentDistance( reactorUv, reactorHub, reactorLocalCorner ),
  reactorSegmentDistance( reactorUv, reactorLocalCorner, reactorLocalNode )
);

float reactorTraceDistance = min(
  mix( 1.0, reactorLeftDistance, reactorLeftBranch ),
  mix( 1.0, reactorTopDistance, reactorTopBranch )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  mix( 1.0, reactorRightDistance, reactorRightBranch )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  mix( 1.0, reactorBottomDistance, reactorBottomBranch )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  mix( 1.0, reactorLocalDistance, reactorLocalBranch )
);

float reactorTerminalDistance = min(
  mix(
    1.0,
    max(
      abs( reactorUv.x - reactorLeftNode.x ),
      abs( reactorUv.y - reactorLeftNode.y )
    ),
    reactorLeftBranch
  ),
  mix(
    1.0,
    max(
      abs( reactorUv.x - reactorTopNode.x ),
      abs( reactorUv.y - reactorTopNode.y )
    ),
    reactorTopBranch
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
reactorTerminalDistance = min(
  reactorTerminalDistance,
  mix(
    1.0,
    max(
      abs( reactorUv.x - reactorLocalNode.x ),
      abs( reactorUv.y - reactorLocalNode.y )
    ),
    reactorLocalBranch
  )
);

float reactorEdgeDistance = min(
  min( reactorUv.x, 1.0 - reactorUv.x ),
  min( reactorUv.y, 1.0 - reactorUv.y )
);
float reactorFrameInset = mix( 0.046, 0.068, reactorSeedG );
float reactorFrameDistance = abs( reactorEdgeDistance - reactorFrameInset );
float reactorHubDistance = abs(
  max(
    abs( reactorUv.x - reactorHub.x ),
    abs( reactorUv.y - reactorHub.y )
  ) - reactorHubHalfSize
);
float reactorGridDensity = floor( mix( 8.0, 13.0, reactorSeedD ) );
vec2 reactorGridPosition = reactorUv * reactorGridDensity;
vec2 reactorGridCell = abs( fract( reactorGridPosition ) - 0.5 );
float reactorGridDistance = 0.5 - max( reactorGridCell.x, reactorGridCell.y );
vec2 reactorGridIndex = floor( reactorGridPosition );
float reactorCellVariation = fract(
  dot( reactorGridIndex, vec2( 0.754877, 0.56984 ) ) +
  reactorSeedA * 0.71
);

vec2 reactorViaA = vec2(
  mix( 0.18, 0.82, reactorSeedB ),
  mix( 0.18, 0.82, reactorSeedE )
);
vec2 reactorViaB = vec2(
  mix( 0.18, 0.82, reactorSeedF ),
  mix( 0.18, 0.82, reactorSeedA )
);
float reactorViaSize = mix( 0.014, 0.023, reactorSeedH );
float reactorViaDistance = min(
  abs(
    max(
      abs( reactorUv.x - reactorViaA.x ),
      abs( reactorUv.y - reactorViaA.y )
    ) - reactorViaSize
  ),
  abs(
    max(
      abs( reactorUv.x - reactorViaB.x ),
      abs( reactorUv.y - reactorViaB.y )
    ) - reactorViaSize * 0.82
  )
);

vec2 reactorModuleCenter = vec2(
  mix( 0.24, 0.76, reactorSeedE ),
  mix( 0.24, 0.76, reactorSeedF )
);
vec2 reactorModuleHalfSize = mix(
  vec2( 0.052, 0.026 ),
  vec2( 0.03, 0.058 ),
  step( 0.5, reactorSeedG )
);
vec2 reactorModuleOffset =
  abs( reactorUv - reactorModuleCenter ) - reactorModuleHalfSize;
float reactorModuleDistance = abs(
  max( reactorModuleOffset.x, reactorModuleOffset.y )
);
float reactorModulePresence = step( 0.38, reactorSeedB );

float reactorMicroGrid = reactorBand(
  reactorGridDistance,
  mix( 0.006, 0.011, reactorSeedE )
);
float reactorFrameGroove = reactorBand( reactorFrameDistance, 0.012 );
float reactorFrameCore = reactorBand( reactorFrameDistance, 0.0035 );
float reactorTraceGroove = reactorBand( reactorTraceDistance, 0.019 );
float reactorTraceCore = reactorBand(
  reactorTraceDistance,
  mix( 0.0045, 0.007, reactorSeedC )
);
float reactorTerminalGroove = reactorBand( reactorTerminalDistance, 0.025 );
float reactorTerminalCore = reactorBand( reactorTerminalDistance, 0.008 );
float reactorHubGroove = reactorBand( reactorHubDistance, 0.015 );
float reactorHubCore = reactorBand( reactorHubDistance, 0.0045 );
float reactorViaGroove = reactorBand( reactorViaDistance, 0.009 );
float reactorViaCore = reactorBand( reactorViaDistance, 0.003 );
float reactorModuleGroove = reactorBand( reactorModuleDistance, 0.01 ) *
  reactorModulePresence;
float reactorModuleCore = reactorBand( reactorModuleDistance, 0.003 ) *
  reactorModulePresence;

float reactorFlowCoordinate = fract(
  reactorUv.x * 0.58 +
  reactorUv.y * 0.42 -
  uReactorTime * 0.18 +
  reactorSeedA
);
float reactorFlowPulse = reactorBand(
  abs( reactorFlowCoordinate - 0.5 ),
  0.036
);

float reactorSurfaceMask = reactorFaceMask * reactorBoardReveal;
float reactorTraceMask = reactorFaceMask * reactorGoldReveal;
float reactorMicroPattern =
  reactorSurfaceMask * reactorMicroGrid;
float reactorFramePattern = reactorSurfaceMask * reactorFrameGroove;
float reactorFrameConductor = reactorSurfaceMask * reactorFrameCore;
float reactorGroovePattern = reactorTraceMask * max(
  reactorTraceGroove,
  max(
    reactorTerminalGroove,
    max(
      reactorHubGroove,
      max( reactorViaGroove, reactorModuleGroove )
    )
  )
);
float reactorConductorPattern = reactorTraceMask * max(
  reactorTraceCore,
  max(
    reactorTerminalCore,
    max(
      reactorHubCore,
      max( reactorViaCore, reactorModuleCore )
    )
  )
);
float reactorPulsePattern = reactorConductorPattern * reactorFlowPulse;
float reactorLeadPattern = clamp(
  reactorFaceMask *
  max(
    reactorTraceCore,
    max( reactorTerminalCore, reactorHubCore )
  ) * reactorGoldLead * 1.35,
  0.0,
  1.0
);

float reactorUnetched =
  reactorFaceMask * reactorActivation * ( 1.0 - reactorBoardReveal );
diffuseColor.rgb *= 1.0 - reactorUnetched * 0.16;
diffuseColor.rgb *= 1.0 +
  ( reactorCellVariation - 0.5 ) * reactorBoardReveal * 0.035;
diffuseColor.rgb *= 1.0 - reactorMicroPattern * 0.045;
diffuseColor.rgb *= 1.0 - reactorFramePattern * 0.14;
diffuseColor.rgb *= 1.0 - reactorGroovePattern * 0.24;
float reactorGoldMask = clamp(
  reactorConductorPattern * 0.96,
  0.0,
  1.0
);
vec3 reactorTileGold = mix(
  uReactorConductorColor,
  vec3( 0.94, 0.9, 0.74 ),
  reactorSeedH * 0.1
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  reactorTileGold,
  reactorGoldMask
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  vec3( 1.0, 0.88, 0.58 ),
  reactorLeadPattern * 0.66
);
`

const REACTOR_ROUGHNESS_FRAGMENT = `
#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor +
  reactorMicroPattern * 0.045 +
  reactorFramePattern * 0.05 +
  reactorGroovePattern * 0.085 -
  reactorConductorPattern * 0.16 -
  reactorLeadPattern * 0.07,
  0.08,
  0.88
);
`

const REACTOR_METALNESS_FRAGMENT = `
#include <metalnessmap_fragment>
metalnessFactor = clamp(
  metalnessFactor -
  reactorMicroPattern * 0.035 -
  reactorGroovePattern * 0.065 +
  reactorConductorPattern * 0.34 +
  reactorFrameConductor * 0.06 +
  reactorLeadPattern * 0.12,
  0.0,
  1.0
);
`

const REACTOR_EMISSIVE_FRAGMENT = `
#include <emissivemap_fragment>
float reactorCurrent = uReactorEnergy * (
  reactorConductorPattern * 0.018 +
  reactorPulsePattern * 0.34
);
float reactorEtchCurrent =
  uReactorEnergy * reactorLeadPattern * 0.48;
totalEmissiveRadiance +=
  reactorSignalColor * reactorCurrent +
  reactorTileGold * reactorEtchCurrent;
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
    conductorColor: { value: new Color('#d8c58b') },
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
  material.customProgramCacheKey = () => 'reactor-circuit-surface-v7'
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
  circuitProgress = morphProgress,
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
  updateReactorCircuitSurface(material, circuitProgress, time, energy)
}
