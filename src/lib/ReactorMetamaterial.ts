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
  engraving: ScalarUniform
  allFaces: ScalarUniform
  conductorColor: ColorUniform
}

interface ReactorCircuitSurfaceOptions {
  engraving?: number
  allFaces?: boolean
}

export const REACTOR_DEMATERIALIZE_DELAY = 0.08
export const REACTOR_DEMATERIALIZE_DURATION = 0.82

const reactorSurfaceUniforms = new WeakMap<
  MeshStandardMaterial,
  ReactorSurfaceUniforms
>()

const REACTOR_VERTEX_PARAMETERS = `
#include <common>
uniform float uReactorSeed;
varying vec2 vReactorUv;
varying float vReactorFace;
varying float vReactorPlanarity;
flat varying float vReactorSeed;
flat varying float vReactorWave;
flat varying vec4 vReactorRandomA;
flat varying vec4 vReactorRandomB;
flat varying float vReactorDematerialize;

#ifdef USE_INSTANCING
attribute float instanceDematerialize;
#endif

float reactorVertexHash( float value ) {
  return fract( sin( value * 17.17 + 0.131 ) * 43758.5453 );
}
`

const REACTOR_VERTEX_ASSIGNMENTS = `
#include <uv_vertex>
vReactorUv = uv;
vReactorFace = abs( normal.z );
vReactorPlanarity = max(
  abs( normal.x ),
  max( abs( normal.y ), abs( normal.z ) )
);
#ifdef USE_INSTANCING
  vReactorSeed = float( gl_InstanceID );
  vReactorDematerialize = instanceDematerialize;
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
  vReactorDematerialize = 0.0;
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
uniform float uReactorEngraving;
uniform float uReactorAllFaces;
uniform vec3 uReactorConductorColor;
varying vec2 vReactorUv;
varying float vReactorFace;
varying float vReactorPlanarity;
flat varying float vReactorSeed;
flat varying float vReactorWave;
flat varying vec4 vReactorRandomA;
flat varying vec4 vReactorRandomB;
flat varying float vReactorDematerialize;

float reactorGridHash( vec2 point ) {
  point = fract( point * vec2( 123.34, 456.21 ) );
  point += dot( point, point + 45.32 );
  return fract( point.x * point.y );
}

float reactorSegmentDistance(
  vec2 point,
  vec2 segmentStart,
  vec2 segmentEnd
) {
  vec2 segment = segmentEnd - segmentStart;
  vec2 offset = point - ( segmentStart + segmentEnd ) * 0.5;
  vec2 axisOffset = abs( offset ) - abs( segment ) * 0.5;
  float axisDistance = max( axisOffset.x, axisOffset.y );

  float diagonal =
    step( 0.0001, abs( segment.x ) ) *
    step( 0.0001, abs( segment.y ) );
  float slope = mix(
    1.0,
    -1.0,
    step( segment.x * segment.y, 0.0 )
  );
  float diagonalAlong = abs(
    ( offset.x + slope * offset.y ) * 0.70710678
  );
  float diagonalAcross = abs(
    ( offset.x - slope * offset.y ) * 0.70710678
  );
  float diagonalHalfLength =
    max( abs( segment.x ), abs( segment.y ) ) * 0.70710678;
  float diagonalDistance = max(
    diagonalAcross,
    diagonalAlong - diagonalHalfLength
  );
  return mix( axisDistance, diagonalDistance, diagonal );
}

float reactorBand( float distanceToFeature, float width ) {
  float antialias = max( fwidth( distanceToFeature ) * 1.35, 0.00075 );
  return 1.0 - smoothstep( width, width + antialias, distanceToFeature );
}

float reactorRouteDistance(
  vec2 point,
  vec2 pointA,
  vec2 pointB,
  vec2 pointC,
  vec2 pointD
) {
  return min(
    reactorSegmentDistance( point, pointA, pointB ),
    min(
      reactorSegmentDistance( point, pointB, pointC ),
      reactorSegmentDistance( point, pointC, pointD )
    )
  );
}

float reactorOctagonDistance(
  vec2 point,
  vec2 center,
  float halfSize
) {
  vec2 offset = abs( point - center );
  return max(
    max( offset.x, offset.y ),
    ( offset.x + offset.y ) * 0.70710678
  ) - halfSize;
}

vec3 reactorReliefNormal(
  vec3 surfacePosition,
  vec3 surfaceNormal,
  float height,
  float strength,
  float direction
) {
  vec3 sigmaX = normalize( dFdx( surfacePosition ) );
  vec3 sigmaY = normalize( dFdy( surfacePosition ) );
  vec3 tangentX = cross( sigmaY, surfaceNormal );
  vec3 tangentY = cross( surfaceNormal, sigmaX );
  float determinant = dot( sigmaX, tangentX ) * direction;
  vec2 heightDelta = vec2( dFdx( height ), dFdy( height ) ) * strength;
  vec3 gradient = sign( determinant ) * (
    heightDelta.x * tangentX + heightDelta.y * tangentY
  );
  return normalize(
    abs( determinant ) * surfaceNormal - gradient
  );
}
`

const REACTOR_SURFACE_FRAGMENT = `
#include <color_fragment>

vec3 reactorSignalColor = diffuseColor.rgb;
float reactorPlateFaceMask = smoothstep( 0.72, 0.98, vReactorFace );
float reactorCubeFaceMask = smoothstep( 0.84, 0.985, vReactorPlanarity );
float reactorFaceMask = mix(
  reactorPlateFaceMask,
  reactorCubeFaceMask,
  uReactorAllFaces
);
float reactorSeedA = vReactorRandomA.x;
float reactorSeedB = vReactorRandomA.y;
float reactorSeedC = vReactorRandomA.z;
float reactorSeedD = vReactorRandomA.w;
float reactorSeedE = vReactorRandomB.x;
float reactorSeedF = vReactorRandomB.y;
float reactorSeedG = vReactorRandomB.z;
float reactorSeedH = vReactorRandomB.w;

// During release a plate does not fade as a translucent rectangle. Its solid
// cells shut off first, exposing the same 4x4 energized lattice used by the
// nucleus cage; the lattice cells then extinguish in a deterministic order.
float reactorDematerialize = clamp( vReactorDematerialize, 0.0, 1.0 );
float reactorMatrixSolidLife = 1.0;
float reactorMatrixStructure = 0.0;
float reactorMatrixCore = 0.0;
float reactorMatrixFilamentMask = 0.0;
float reactorMatrixBreakup = 0.0;

if ( reactorDematerialize > 0.0001 ) {
  const float reactorMatrixDensity = 4.0;
  vec2 reactorMatrixGrid = vReactorUv * reactorMatrixDensity;
  vec2 reactorMatrixCell = floor( reactorMatrixGrid );
  vec2 reactorMatrixUv = fract( reactorMatrixGrid );
  vec2 reactorMatrixNearest = min(
    reactorMatrixUv,
    1.0 - reactorMatrixUv
  );
  vec2 reactorMatrixFootprint = fwidth( reactorMatrixGrid );
  float reactorMatrixAA = max(
    reactorMatrixFootprint.x,
    reactorMatrixFootprint.y
  ) * 0.78;
  vec2 reactorMatrixBarCore = vec2(
    1.0 - smoothstep(
      max( 0.0, 0.036 - reactorMatrixAA ),
      0.036 + reactorMatrixAA,
      reactorMatrixNearest.x
    ),
    1.0 - smoothstep(
      max( 0.0, 0.036 - reactorMatrixAA ),
      0.036 + reactorMatrixAA,
      reactorMatrixNearest.y
    )
  );
  vec2 reactorMatrixBarGlow = vec2(
    1.0 - smoothstep(
      max( 0.0, 0.115 - reactorMatrixAA * 1.3 ),
      0.115 + reactorMatrixAA * 1.3,
      reactorMatrixNearest.x
    ),
    1.0 - smoothstep(
      max( 0.0, 0.115 - reactorMatrixAA * 1.3 ),
      0.115 + reactorMatrixAA * 1.3,
      reactorMatrixNearest.y
    )
  );
  vec2 reactorMatrixFilament = vec2(
    1.0 - smoothstep(
      max( 0.0, 0.014 - reactorMatrixAA ),
      0.014 + reactorMatrixAA,
      reactorMatrixNearest.x
    ),
    1.0 - smoothstep(
      max( 0.0, 0.014 - reactorMatrixAA ),
      0.014 + reactorMatrixAA,
      reactorMatrixNearest.y
    )
  );
  float reactorMatrixBoundary = min(
    min( vReactorUv.x, 1.0 - vReactorUv.x ),
    min( vReactorUv.y, 1.0 - vReactorUv.y )
  );
  vec2 reactorMatrixUvFootprint = fwidth( vReactorUv );
  float reactorMatrixBoundaryAA = max(
    reactorMatrixUvFootprint.x,
    reactorMatrixUvFootprint.y
  ) * 1.1;
  float reactorMatrixFrameCore = 1.0 - smoothstep(
    max( 0.0, 0.012 - reactorMatrixBoundaryAA ),
    0.012 + reactorMatrixBoundaryAA,
    reactorMatrixBoundary
  );
  float reactorMatrixFrameGlow = 1.0 - smoothstep(
    max( 0.0, 0.048 - reactorMatrixBoundaryAA * 1.2 ),
    0.048 + reactorMatrixBoundaryAA * 1.2,
    reactorMatrixBoundary
  );
  float reactorMatrixNodeDistance = length( reactorMatrixNearest );
  float reactorMatrixNode = 1.0 - smoothstep(
    max( 0.0, 0.027 - reactorMatrixAA ),
    0.027 + reactorMatrixAA,
    reactorMatrixNodeDistance
  );
  float reactorMatrixGridCore = max(
    reactorMatrixBarCore.x,
    reactorMatrixBarCore.y
  );
  float reactorMatrixGridGlow = max(
    reactorMatrixBarGlow.x,
    reactorMatrixBarGlow.y
  );
  float reactorMatrixCellSeed = reactorGridHash(
    reactorMatrixCell + vec2(
      vReactorSeed * 0.173,
      vReactorSeed * 0.379
    )
  );
  float reactorSolidOffStart = mix(
    0.08,
    0.30,
    reactorMatrixCellSeed
  );
  reactorMatrixSolidLife = 1.0 - smoothstep(
    reactorSolidOffStart,
    reactorSolidOffStart + 0.18,
    reactorDematerialize
  );
  float reactorGridOffStart = mix(
    0.62,
    0.84,
    reactorMatrixCellSeed
  );
  float reactorMatrixLife = 1.0 - smoothstep(
    reactorGridOffStart,
    reactorGridOffStart + 0.14,
    reactorDematerialize
  );
  float reactorMatrixIgnition = smoothstep(
    0.025,
    0.18,
    reactorDematerialize
  );
  float reactorMatrixFaceMask = smoothstep(
    0.84,
    0.985,
    vReactorPlanarity
  );
  reactorMatrixCore = max(
    reactorMatrixFrameCore,
    max( reactorMatrixGridCore, reactorMatrixNode )
  );
  float reactorMatrixGlow = max(
    reactorMatrixFrameGlow * 0.34,
    reactorMatrixGridGlow * 0.5
  );
  reactorMatrixStructure = max(
    reactorMatrixCore,
    reactorMatrixGlow
  ) * reactorMatrixIgnition * reactorMatrixLife * reactorMatrixFaceMask;
  reactorMatrixFilamentMask = max(
    reactorMatrixFrameCore,
    max(
      reactorMatrixFilament.x,
      reactorMatrixFilament.y
    )
  ) * reactorMatrixIgnition * reactorMatrixLife * reactorMatrixFaceMask;
  reactorMatrixBreakup = (
    1.0 - smoothstep(
      0.0,
      0.052,
      abs( reactorDematerialize - reactorGridOffStart )
    )
  ) * reactorMatrixStructure;

  if ( max( reactorMatrixSolidLife, reactorMatrixStructure ) < 0.022 ) {
    discard;
  }
}

float reactorSwapAxes = step( 0.5, reactorSeedC );
float reactorFlipX = step( 0.5, reactorSeedD );
float reactorFlipY = step( 0.5, reactorSeedE );
vec2 reactorUv = mix( vReactorUv, vReactorUv.yx, reactorSwapAxes );
reactorUv.x = mix( reactorUv.x, 1.0 - reactorUv.x, reactorFlipX );
reactorUv.y = mix( reactorUv.y, 1.0 - reactorUv.y, reactorFlipY );

// Modern high-speed language: four independent route corridors keep fixed
// lane spacing through horizontal, vertical, and 45-degree segments. They
// occupy different plate zones instead of converging on a decorative hub.
vec2 reactorRouteA0 = vec2(
  0.055,
  mix( 0.2, 0.31, reactorSeedA )
);
vec2 reactorRouteA1 = vec2(
  mix( 0.18, 0.24, reactorSeedB ),
  reactorRouteA0.y
);
float reactorRouteARise = mix( 0.16, 0.22, reactorSeedC );
vec2 reactorRouteA2 =
  reactorRouteA1 + vec2( reactorRouteARise );
vec2 reactorRouteA3 = vec2(
  mix( 0.51, 0.6, reactorSeedD ),
  reactorRouteA2.y
);

vec2 reactorRouteB0 = vec2(
  mix( 0.34, 0.45, reactorSeedE ),
  0.945
);
vec2 reactorRouteB1 = vec2(
  reactorRouteB0.x,
  mix( 0.76, 0.82, reactorSeedF )
);
float reactorRouteBRun = mix( 0.17, 0.23, reactorSeedG );
vec2 reactorRouteB2 =
  reactorRouteB1 + vec2( reactorRouteBRun, -reactorRouteBRun );
vec2 reactorRouteB3 = vec2( 0.945, reactorRouteB2.y );

vec2 reactorRouteC0 = vec2(
  mix( 0.53, 0.64, reactorSeedF ),
  0.055
);
vec2 reactorRouteC1 = vec2(
  reactorRouteC0.x,
  mix( 0.2, 0.28, reactorSeedG )
);
float reactorRouteCRun = mix( 0.14, 0.2, reactorSeedH );
vec2 reactorRouteC2 =
  reactorRouteC1 + vec2( reactorRouteCRun );
vec2 reactorRouteC3 = vec2( 0.945, reactorRouteC2.y );

vec2 reactorRouteD0 = vec2(
  0.055,
  mix( 0.62, 0.72, reactorSeedH )
);
vec2 reactorRouteD1 = vec2(
  mix( 0.16, 0.22, reactorSeedA ),
  reactorRouteD0.y
);
float reactorRouteDRun = mix( 0.12, 0.18, reactorSeedB );
vec2 reactorRouteD2 =
  reactorRouteD1 + vec2( reactorRouteDRun );
vec2 reactorRouteD3 = vec2( reactorRouteD2.x, 0.945 );

float reactorRouteA = reactorRouteDistance(
  reactorUv,
  reactorRouteA0,
  reactorRouteA1,
  reactorRouteA2,
  reactorRouteA3
);
float reactorRouteB = reactorRouteDistance(
  reactorUv,
  reactorRouteB0,
  reactorRouteB1,
  reactorRouteB2,
  reactorRouteB3
);
float reactorRouteC = reactorRouteDistance(
  reactorUv,
  reactorRouteC0,
  reactorRouteC1,
  reactorRouteC2,
  reactorRouteC3
);
float reactorRouteD = reactorRouteDistance(
  reactorUv,
  reactorRouteD0,
  reactorRouteD1,
  reactorRouteD2,
  reactorRouteD3
);

float reactorPairSpacingA = mix( 0.013, 0.018, reactorSeedE );
float reactorPairSpacingB = mix( 0.014, 0.02, reactorSeedF );
float reactorPairSpacingC = mix( 0.012, 0.017, reactorSeedG );
float reactorTrioSpacingD = mix( 0.014, 0.019, reactorSeedH );
float reactorTraceDistance = min(
  abs( reactorRouteA - reactorPairSpacingA ),
  abs( reactorRouteB - reactorPairSpacingB )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  abs( reactorRouteC - reactorPairSpacingC )
);
reactorTraceDistance = min(
  reactorTraceDistance,
  min(
    reactorRouteD,
    abs( reactorRouteD - reactorTrioSpacingD )
  )
);

float reactorActivation = smoothstep( 0.015, 0.16, uReactorSurface );
float reactorLocalProgress = min(
  reactorOctagonDistance( reactorUv, reactorRouteA0, 0.0 ),
  min(
    reactorOctagonDistance( reactorUv, reactorRouteB0, 0.0 ),
    min(
      reactorOctagonDistance( reactorUv, reactorRouteC0, 0.0 ),
      reactorOctagonDistance( reactorUv, reactorRouteD0, 0.0 )
    )
  )
);
float reactorEtchClock =
  uReactorSurface * 1.78 -
  vReactorWave * 0.58 -
  reactorSeedG * 0.1 -
  reactorLocalProgress * 0.3;
float reactorGoldReveal =
  smoothstep( -0.05, 0.035, reactorEtchClock ) * reactorActivation;
float reactorBoardReveal =
  smoothstep( 0.09, 0.28, reactorEtchClock ) * reactorActivation;
float reactorGoldLead = 1.0 - smoothstep(
  0.035,
  0.13,
  abs( reactorEtchClock - 0.055 )
);

float reactorTerminalHalfSize = mix( 0.0105, 0.014, reactorSeedD );
float reactorTerminalDistance = min(
  reactorOctagonDistance(
    reactorUv,
    reactorRouteA0,
    reactorTerminalHalfSize
  ),
  reactorOctagonDistance(
    reactorUv,
    reactorRouteA3,
    reactorTerminalHalfSize * 0.88
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteB0,
    reactorTerminalHalfSize * 0.92
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteB3,
    reactorTerminalHalfSize
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteC0,
    reactorTerminalHalfSize * 0.86
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteC3,
    reactorTerminalHalfSize * 0.94
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteD0,
    reactorTerminalHalfSize * 0.9
  )
);
reactorTerminalDistance = min(
  reactorTerminalDistance,
  reactorOctagonDistance(
    reactorUv,
    reactorRouteD3,
    reactorTerminalHalfSize
  )
);

// A few paired transition points replace the old carpet of square vias.
float reactorViaSize = mix( 0.0105, 0.014, reactorSeedH );
float reactorViaDistance = min(
  abs(
    reactorOctagonDistance(
      reactorUv,
      reactorRouteA2,
      reactorViaSize
    )
  ),
  abs(
    reactorOctagonDistance(
      reactorUv,
      reactorRouteB2,
      reactorViaSize * 0.9
    )
  )
);
reactorViaDistance = min(
  reactorViaDistance,
  abs(
    reactorOctagonDistance(
      reactorUv,
      reactorRouteC1,
      reactorViaSize * 0.84
    )
  )
);
reactorViaDistance = min(
  reactorViaDistance,
  abs(
    reactorOctagonDistance(
      reactorUv,
      reactorRouteD2,
      reactorViaSize * 0.78
    )
  )
);

// Two short registration rails keep the corners intentional without drawing
// the closed inset frame that made the previous surface look archival.
float reactorFrameDistance = min(
  reactorSegmentDistance(
    reactorUv,
    vec2( 0.08, 0.1 ),
    vec2( mix( 0.2, 0.27, reactorSeedA ), 0.1 )
  ),
  reactorSegmentDistance(
    reactorUv,
    vec2( 0.9, mix( 0.73, 0.8, reactorSeedB ) ),
    vec2( 0.9, 0.9 )
  )
);

// Alternating warp/weft stitches read as fine glass-fibre textolite rather
// than a visible graph-paper grid.
float reactorWeaveDensity = floor( mix( 28.0, 37.0, reactorSeedC ) );
vec2 reactorWeavePosition =
  reactorUv * reactorWeaveDensity + vec2( reactorSeedD, reactorSeedE );
vec2 reactorWeaveCell = fract( reactorWeavePosition );
vec2 reactorWeaveIndex = floor( reactorWeavePosition );
float reactorWeaveX = reactorBand(
  abs( reactorWeaveCell.x - 0.5 ),
  0.045
);
float reactorWeaveY = reactorBand(
  abs( reactorWeaveCell.y - 0.5 ),
  0.045
);
float reactorWeaveParity = step(
  0.5,
  fract( ( reactorWeaveIndex.x + reactorWeaveIndex.y ) * 0.5 )
);
float reactorMicroWeave = mix(
  reactorWeaveX,
  reactorWeaveY,
  reactorWeaveParity
);
float reactorCellVariation = fract(
  dot( reactorWeaveIndex, vec2( 0.754877, 0.56984 ) ) +
  reactorSeedA * 0.71
);

float reactorFrameGroove = reactorBand( reactorFrameDistance, 0.0065 );
float reactorFrameCore = reactorBand( reactorFrameDistance, 0.0024 );
float reactorTraceGroove = reactorBand( reactorTraceDistance, 0.0095 );
float reactorTraceCore = reactorBand(
  reactorTraceDistance,
  mix( 0.0032, 0.0045, reactorSeedC )
);
float reactorTerminalGroove = reactorBand( reactorTerminalDistance, 0.009 );
float reactorTerminalCore = reactorBand( reactorTerminalDistance, 0.0038 );
float reactorViaGroove = reactorBand( reactorViaDistance, 0.006 );
float reactorViaCore = reactorBand( reactorViaDistance, 0.0023 );

float reactorCircuitGroove = max(
  reactorTraceGroove,
  max( reactorTerminalGroove, reactorViaGroove )
);
float reactorCircuitCore = max(
  reactorTraceCore,
  max( reactorTerminalCore, reactorViaCore )
);

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

// Narrative surface modulation: the same etch clock that drives the
// directional reveal also imprints traveling bands and a fine noise
// breakup, so the gilding never feels like a static decal.
float reactorEtchNoise = reactorGridHash(
  reactorUv * vec2( 41.0, 37.0 ) + reactorSeedA
);
float reactorEtchBands = reactorBand(
  abs( fract( reactorUv.x * 2.3 + reactorUv.y * 1.7 - uReactorTime * 0.09 ) - 0.5 ),
  0.028
);
float reactorEtchBreakup = mix(
  1.0,
  0.72 + 0.28 * reactorEtchNoise,
  smoothstep( 0.22, 0.78, uReactorEnergy )
);
float reactorEtchShimmer = mix(
  1.0,
  0.88 + 0.12 * sin( uReactorTime * 5.4 + reactorSeedB * 6.283 ),
  smoothstep( 0.35, 0.9, uReactorSurface )
);
float reactorNarrativeMask =
  reactorEtchBreakup * reactorEtchShimmer * ( 1.0 - reactorEtchBands * 0.22 );

float reactorSurfaceMask = reactorFaceMask * reactorBoardReveal;
float reactorTraceMask = reactorFaceMask * reactorGoldReveal * reactorNarrativeMask;
float reactorBaseEngraving = reactorFaceMask * uReactorEngraving * reactorNarrativeMask;
float reactorMicroPattern = max(
  reactorSurfaceMask * reactorMicroWeave * 0.62,
  reactorBaseEngraving * reactorMicroWeave * 0.18
);
float reactorFramePattern = max(
  reactorSurfaceMask * reactorFrameGroove,
  reactorBaseEngraving * reactorFrameGroove * 0.68
);
float reactorFrameConductor = reactorSurfaceMask * reactorFrameCore;
float reactorEngravingPattern =
  reactorBaseEngraving * reactorCircuitGroove;
float reactorEngravingCut =
  reactorBaseEngraving * reactorCircuitCore;
float reactorGroovePattern = max(
  reactorEngravingPattern * ( 1.0 - reactorGoldReveal * 0.36 ),
  reactorTraceMask * reactorCircuitGroove
);
float reactorConductorPattern = reactorTraceMask * reactorCircuitCore;
float reactorPulsePattern = reactorConductorPattern * reactorFlowPulse;
float reactorLeadPattern = clamp(
  reactorFaceMask *
  max( reactorTraceCore, max( reactorTerminalCore, reactorViaCore ) ) *
  reactorGoldLead * 1.35,
  0.0,
  1.0
);
// The cubelets keep a real geometric bevel (see CUBE_EDGE_RADIUS), but the
// 104-plate reactor mesh deliberately stays a flat unit box to avoid
// quadrupling vertex count at the scene's already-heaviest stage. Without
// this, the handoff from a rounded cubelet to a razor-edged plate reads as
// the corner highlight simply vanishing. A cheap analytic edge curvature,
// gated off for cubelets (uReactorAllFaces), restores that same catch-light
// on plates using only the existing height-field normal, no extra geometry.
vec2 reactorPlateEdgeUv = min( vReactorUv, 1.0 - vReactorUv );
float reactorPlateEdgeDistance = min( reactorPlateEdgeUv.x, reactorPlateEdgeUv.y );
float reactorPlateEdgeProfile = 1.0 - clamp( reactorPlateEdgeDistance / 0.045, 0.0, 1.0 );
float reactorPlateBevel =
  -reactorPlateEdgeProfile * reactorPlateEdgeProfile *
  reactorFaceMask * ( 1.0 - uReactorAllFaces );
float reactorReliefHeight =
  -reactorEngravingPattern * 0.72 -
  reactorEngravingCut * 0.3 -
  reactorMicroPattern * 0.09 -
  reactorFramePattern * 0.22 +
  reactorConductorPattern * 0.43 +
  reactorPlateBevel * 0.4;
reactorReliefHeight *= 1.0 - reactorDematerialize * 0.9;

float reactorUnetched =
  reactorFaceMask * reactorActivation * ( 1.0 - reactorBoardReveal );
diffuseColor.rgb *= 1.0 - reactorUnetched * 0.16;
diffuseColor.rgb *= 1.0 +
  ( reactorCellVariation - 0.5 ) * reactorBoardReveal * 0.035;
diffuseColor.rgb *= 1.0 - reactorMicroPattern * 0.045;
diffuseColor.rgb *= 1.0 - reactorFramePattern * 0.12;
diffuseColor.rgb *= 1.0 - reactorGroovePattern * 0.18;
diffuseColor.rgb *= 1.0 - reactorEngravingCut * 0.055;
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
vec3 reactorMatrixBaseColor = vec3( 0.025, 0.310, 0.235 );
vec3 reactorMatrixMintColor = vec3( 0.075, 0.690, 0.500 );
float reactorMatrixReveal = clamp(
  reactorMatrixStructure * ( 1.0 - reactorMatrixSolidLife * 0.58 ),
  0.0,
  1.0
);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  mix(
    reactorMatrixBaseColor,
    reactorMatrixMintColor,
    reactorMatrixCore * 0.42
  ),
  reactorMatrixReveal
);
`

const REACTOR_NORMAL_FRAGMENT = `
#include <normal_fragment_maps>
normal = reactorReliefNormal(
  -vViewPosition,
  normal,
  reactorReliefHeight,
  0.28,
  faceDirection
);
`

const REACTOR_ROUGHNESS_FRAGMENT = `
#include <roughnessmap_fragment>
roughnessFactor = clamp(
  roughnessFactor +
  reactorMicroPattern * 0.045 +
  reactorFramePattern * 0.05 +
  reactorGroovePattern * 0.085 +
  reactorEngravingCut * 0.035 -
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
) * ( 1.0 - reactorDematerialize * 0.92 );
float reactorEtchCurrent =
  uReactorEnergy * reactorLeadPattern * 0.48 *
  ( 1.0 - reactorDematerialize * 0.92 );
totalEmissiveRadiance +=
  reactorSignalColor * reactorCurrent +
  reactorTileGold * reactorEtchCurrent;
vec3 reactorMatrixFilamentColor = vec3( 0.310, 0.920, 0.700 );
vec3 reactorMatrixBreakColor = vec3( 0.141, 0.298, 1.0 );
totalEmissiveRadiance +=
  reactorMatrixMintColor * reactorMatrixStructure * 0.20 +
  reactorMatrixFilamentColor * reactorMatrixFilamentMask * 0.32 +
  reactorMatrixBreakColor * reactorMatrixBreakup * 0.72;
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
  options: ReactorCircuitSurfaceOptions = {},
) {
  if (reactorSurfaceUniforms.has(material)) return material

  const uniforms: ReactorSurfaceUniforms = {
    surface: { value: 0 },
    time: { value: 0 },
    energy: { value: 0 },
    seed: { value: 0 },
    engraving: { value: clamp01(options.engraving ?? 0) },
    allFaces: { value: options.allFaces ? 1 : 0 },
    conductorColor: { value: new Color('#d8c58b') },
  }
  reactorSurfaceUniforms.set(material, uniforms)

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReactorSurface = uniforms.surface
    shader.uniforms.uReactorTime = uniforms.time
    shader.uniforms.uReactorEnergy = uniforms.energy
    shader.uniforms.uReactorSeed = uniforms.seed
    shader.uniforms.uReactorEngraving = uniforms.engraving
    shader.uniforms.uReactorAllFaces = uniforms.allFaces
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
      .replace('#include <normal_fragment_maps>', REACTOR_NORMAL_FRAGMENT)
      .replace('#include <emissivemap_fragment>', REACTOR_EMISSIVE_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'reactor-circuit-surface-v11'
  material.needsUpdate = true
  return material
}

export function updateReactorCircuitSurface(
  material: MeshStandardMaterial,
  surfaceProgress: number,
  time: number,
  energy: number,
  seed = 0,
  conductorColor?: Color,
) {
  const uniforms = reactorSurfaceUniforms.get(material)
  if (!uniforms) return

  uniforms.surface.value = clamp01(surfaceProgress)
  uniforms.time.value = time
  uniforms.energy.value = clamp01(energy)
  uniforms.seed.value = Math.max(0, seed)
  if (conductorColor) uniforms.conductorColor.value.copy(conductorColor)
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
