import { Color, MeshStandardMaterial } from 'three'

// A small cluster of cubes near the nucleus, styled as a blocky "black
// hole": each cube face is divided into a coarse Minecraft-scale grid of
// flat-color cells. Cells near the face center are true void (near-black,
// no relief); a bright gold/white ring of cells sits at the boundary
// (the photon ring); cells beyond that sample a swirled, time-rotating
// coordinate into a small discrete emerald/gap palette, so the debris
// reads as dragged around the hole while staying flat-shaded per cell -
// distinct from the smooth relief/gradient language the reactor circuit
// surface uses elsewhere in this file's sibling module.

interface ScalarUniform {
  value: number
}

interface BlackHoleUniforms {
  time: ScalarUniform
  voidRadius: ScalarUniform
}

const blackHoleUniforms = new WeakMap<MeshStandardMaterial, BlackHoleUniforms>()

const HOLE_VERTEX_PARAMETERS = `
#include <common>
varying vec2 vHoleUv;
flat varying float vHoleSeed;
flat varying vec4 vHoleRandom;

float holeVertexHash( float value ) {
  return fract( sin( value * 12.9898 + 4.1414 ) * 43758.5453 );
}
`

const HOLE_VERTEX_ASSIGNMENTS = `
#include <uv_vertex>
vHoleUv = uv;
#ifdef USE_INSTANCING
  vHoleSeed = float( gl_InstanceID );
#else
  vHoleSeed = 0.0;
#endif
vHoleRandom = vec4(
  holeVertexHash( vHoleSeed + 3.0 ),
  holeVertexHash( vHoleSeed + 17.0 ),
  holeVertexHash( vHoleSeed + 29.0 ),
  holeVertexHash( vHoleSeed + 41.0 )
);
`

const HOLE_FRAGMENT_PARAMETERS = `
#include <common>
uniform float uHoleTime;
uniform float uHoleVoidRadius;
varying vec2 vHoleUv;
flat varying float vHoleSeed;
flat varying vec4 vHoleRandom;

float holeHash( vec2 point ) {
  point = fract( point * vec2( 123.34, 456.21 ) );
  point += dot( point, point + 45.32 );
  return fract( point.x * point.y );
}
`

const HOLE_COLOR_FRAGMENT = `
#include <color_fragment>

const float holeDensity = 5.0;
vec2 holeCell = floor( vHoleUv * holeDensity );
vec2 holeCellCenter = ( holeCell + 0.5 ) / holeDensity;
vec2 holeOffset = holeCellCenter - 0.5;
float holeDist = length( holeOffset ) * 1.55;

float holeSpin = mix( -1.0, 1.0, step( 0.5, vHoleRandom.x ) ) *
  mix( 0.35, 0.75, vHoleRandom.y );
float holeVoidRadius = uHoleVoidRadius * mix( 0.82, 1.18, vHoleRandom.z );
float holeRingWidth = 0.09;

float holeIsVoid = step( holeDist, holeVoidRadius );
float holeIsRing =
  step( holeVoidRadius, holeDist ) *
  step( holeDist, holeVoidRadius + holeRingWidth );
float holeIsDebris = step( holeVoidRadius + holeRingWidth, holeDist );

// Debris cells sample a swirled coordinate instead of their own UV - the
// twist strengthens near the void, so the flat-color blocks read as being
// dragged around the hole as uHoleTime advances, while any single frame
// stays perfectly flat/blocky per cell (no smooth gradient).
float holeAngle = atan( holeOffset.y, holeOffset.x );
float holeSwirl = holeAngle + holeSpin * uHoleTime * 0.6 +
  ( 1.0 - clamp( holeDist, 0.0, 1.0 ) ) * 2.6;
vec2 holeSwirlCoord = vec2( cos( holeSwirl ), sin( holeSwirl ) ) * holeDist;
float holeDebrisSeed = holeHash(
  floor( holeSwirlCoord * 3.6 ) + vHoleSeed * 7.31
);

vec3 holeVoidColor = vec3( 0.008, 0.02, 0.016 );
vec3 holeRingColor = mix(
  vec3( 1.0, 0.86, 0.55 ),
  vec3( 1.0, 0.63, 0.22 ),
  vHoleRandom.w
);
vec3 holeDebrisColorA = vec3( 0.043, 0.478, 0.318 );
vec3 holeDebrisColorB = vec3( 0.094, 0.827, 0.514 );
vec3 holeDebrisColor = mix(
  holeDebrisColorA,
  holeDebrisColorB,
  step( 0.5, fract( holeDebrisSeed * 3.71 ) )
);
float holeIsDeepGap = step( 0.86, holeDebrisSeed );
holeDebrisColor = mix( holeDebrisColor, holeVoidColor, holeIsDeepGap );

vec3 holeColor = holeVoidColor;
holeColor = mix( holeColor, holeRingColor, holeIsRing );
holeColor = mix( holeColor, holeDebrisColor, holeIsDebris );
diffuseColor.rgb = holeColor;
`

const HOLE_ROUGHNESS_FRAGMENT = `
#include <roughnessmap_fragment>
const float holeDensityR = 5.0;
vec2 holeCellR = floor( vHoleUv * holeDensityR );
vec2 holeOffsetR = ( holeCellR + 0.5 ) / holeDensityR - 0.5;
float holeDistR = length( holeOffsetR ) * 1.55;
float holeVoidRadiusR = uHoleVoidRadius * mix( 0.82, 1.18, vHoleRandom.z );
roughnessFactor = mix( 0.85, 0.32, step( holeVoidRadiusR, holeDistR ) );
`

const HOLE_METALNESS_FRAGMENT = `
#include <metalnessmap_fragment>
const float holeDensityM = 5.0;
vec2 holeCellM = floor( vHoleUv * holeDensityM );
vec2 holeOffsetM = ( holeCellM + 0.5 ) / holeDensityM - 0.5;
float holeDistM = length( holeOffsetM ) * 1.55;
float holeVoidRadiusM = uHoleVoidRadius * mix( 0.82, 1.18, vHoleRandom.z );
metalnessFactor = mix( 0.05, 0.5, step( holeVoidRadiusM, holeDistM ) );
`

const HOLE_EMISSIVE_FRAGMENT = `
#include <emissivemap_fragment>
const float holeDensityE = 5.0;
vec2 holeCellE = floor( vHoleUv * holeDensityE );
vec2 holeOffsetE = ( holeCellE + 0.5 ) / holeDensityE - 0.5;
float holeDistE = length( holeOffsetE ) * 1.55;
float holeVoidRadiusE = uHoleVoidRadius * mix( 0.82, 1.18, vHoleRandom.z );
float holeRingWidthE = 0.09;
float holeIsRingE =
  step( holeVoidRadiusE, holeDistE ) *
  step( holeDistE, holeVoidRadiusE + holeRingWidthE );
float holeRingGlow = holeIsRingE *
  ( 0.55 + 0.45 * sin( uHoleTime * 3.0 + vHoleSeed * 2.1 ) );
vec3 holeRingColorE = vec3( 1.0, 0.72, 0.34 );
totalEmissiveRadiance += holeRingColorE * holeRingGlow * 1.6;
`

export function enableBlackHoleSurface(material: MeshStandardMaterial) {
  if (blackHoleUniforms.has(material)) return material

  const uniforms: BlackHoleUniforms = {
    time: { value: 0 },
    voidRadius: { value: 0.5 },
  }
  blackHoleUniforms.set(material, uniforms)

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHoleTime = uniforms.time
    shader.uniforms.uHoleVoidRadius = uniforms.voidRadius
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', HOLE_VERTEX_PARAMETERS)
      .replace('#include <uv_vertex>', HOLE_VERTEX_ASSIGNMENTS)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', HOLE_FRAGMENT_PARAMETERS)
      .replace('#include <color_fragment>', HOLE_COLOR_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', HOLE_ROUGHNESS_FRAGMENT)
      .replace('#include <metalnessmap_fragment>', HOLE_METALNESS_FRAGMENT)
      .replace('#include <emissivemap_fragment>', HOLE_EMISSIVE_FRAGMENT)
  }
  material.customProgramCacheKey = () => 'black-hole-surface-v1'
  material.needsUpdate = true
  return material
}

export function createBlackHoleMaterial() {
  const material = new MeshStandardMaterial({
    color: new Color('#050705'),
    metalness: 0.3,
    roughness: 0.6,
    emissive: new Color('#000000'),
    emissiveIntensity: 1,
  })
  return enableBlackHoleSurface(material)
}

export function updateBlackHoleMaterial(
  material: MeshStandardMaterial,
  time: number,
  voidRadius = 0.5,
) {
  const uniforms = blackHoleUniforms.get(material)
  if (!uniforms) return
  uniforms.time.value = time
  uniforms.voidRadius.value = voidRadius
}
