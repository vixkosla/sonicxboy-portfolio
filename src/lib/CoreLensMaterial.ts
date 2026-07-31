import {
  FramebufferTexture,
  LinearFilter,
  ShaderMaterial,
  Vector2,
} from 'three'

// A screen-space refraction material for the voxel lenses around the plasma
// nucleus. HeroScene copies only a small square around the core from the
// already rendered framebuffer immediately before this material draws. Each
// coarse face cell then samples that image along its own hard-edged vector;
// the RGB channels travel slightly different distances, producing a real
// chromatic displacement of the plasma and nearby geometry instead of a
// painted glass gradient. A deterministic minority of complete cells is
// discarded, so the cluster alternates matter with literal empty space.

interface ScalarUniform {
  value: number
}

interface Vector2Uniform {
  value: Vector2
}

interface CoreLensUniforms {
  time: ScalarUniform
  strength: ScalarUniform
  opacity: ScalarUniform
  captureOrigin: Vector2Uniform
  captureSize: Vector2Uniform
}

const coreLensUniforms = new WeakMap<ShaderMaterial, CoreLensUniforms>()

const CORE_LENS_VERTEX_SHADER = /* glsl */ `
varying vec2 vLensUv;
varying vec3 vLensWorldPosition;
varying vec3 vLensWorldNormal;
flat varying float vLensSeed;

void main() {
  mat4 lensModelMatrix = modelMatrix;

  #ifdef USE_INSTANCING
    lensModelMatrix = modelMatrix * instanceMatrix;
    vLensSeed = float( gl_InstanceID ) + 1.0;
  #else
    vLensSeed = 1.0;
  #endif

  vec4 lensWorldPosition = lensModelMatrix * vec4( position, 1.0 );
  vLensUv = uv;
  vLensWorldPosition = lensWorldPosition.xyz;
  // Every instance uses a uniform scale, so mat3 is sufficient here and
  // avoids an inverse/transpose in the hot vertex path.
  vLensWorldNormal = normalize( mat3( lensModelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * lensWorldPosition;
}
`

const CORE_LENS_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uLensScene;
uniform vec2 uLensCaptureOrigin;
uniform vec2 uLensCaptureSize;
uniform float uLensTime;
uniform float uLensStrength;
uniform float uLensOpacity;

varying vec2 vLensUv;
varying vec3 vLensWorldPosition;
varying vec3 vLensWorldNormal;
flat varying float vLensSeed;

float lensHash( vec2 point ) {
  point = fract( point * vec2( 123.34, 456.21 ) );
  point += dot( point, point + 45.32 );
  return fract( point.x * point.y );
}

void main() {
  const float lensDensity = 5.0;
  vec2 lensCell = floor( vLensUv * lensDensity );
  vec2 lensCellUv = fract( vLensUv * lensDensity );
  vec2 lensSeedPoint = lensCell + vec2(
    vLensSeed * 7.13,
    vLensSeed * 11.71
  );

  float lensCellSeed = lensHash( lensSeedPoint );
  float lensVoidSeed = lensHash( lensSeedPoint + 19.37 );

  // Whole Minecraft-scale cells are absent rather than alpha-painted. The
  // viewer therefore sees the untouched framebuffer through these gaps.
  if ( lensVoidSeed < 0.16 ) discard;

  vec3 lensNormal = normalize( vLensWorldNormal );
  vec3 lensView = normalize( cameraPosition - vLensWorldPosition );
  float lensFacing = abs( dot( lensNormal, lensView ) );
  float lensFresnel = pow( 1.0 - lensFacing, 2.25 );

  vec2 lensDirection = vec2(
    lensHash( lensSeedPoint + 3.7 ),
    lensHash( lensSeedPoint + 8.9 )
  ) * 2.0 - 1.0;
  lensDirection += lensNormal.xy * 0.42;
  lensDirection /= max( length( lensDirection ), 0.001 );

  float lensBreath = 0.72 + 0.28 * sin(
    uLensTime * mix( 0.38, 0.72, lensCellSeed ) +
    lensCellSeed * 6.28318 +
    vLensSeed
  );
  float lensDisplacementPixels =
    mix( 3.0, 11.5, lensCellSeed ) *
    lensBreath *
    uLensStrength;
  vec2 lensOffset =
    lensDirection * lensDisplacementPixels / uLensCaptureSize;
  // Wide enough that the R/B taps land on genuinely different source pixels
  // even where the captured background is locally flat (the hot white
  // core) - a narrow split just re-samples the same near-uniform patch in
  // all three channels and nets back out to white, invisible as "glass".
  vec2 lensSplit =
    lensDirection *
    mix( 6.0, 20.0, lensHash( lensSeedPoint + 27.1 ) ) *
    uLensStrength /
    uLensCaptureSize;

  vec2 lensScreenUv =
    ( gl_FragCoord.xy - uLensCaptureOrigin ) / uLensCaptureSize;
  lensScreenUv = clamp( lensScreenUv, vec2( 0.003 ), vec2( 0.997 ) );

  vec3 lensRefracted;
  lensRefracted.r = texture2D(
    uLensScene,
    clamp( lensScreenUv + lensOffset + lensSplit, vec2( 0.003 ), vec2( 0.997 ) )
  ).r;
  lensRefracted.g = texture2D(
    uLensScene,
    clamp( lensScreenUv + lensOffset, vec2( 0.003 ), vec2( 0.997 ) )
  ).g;
  lensRefracted.b = texture2D(
    uLensScene,
    clamp( lensScreenUv + lensOffset - lensSplit, vec2( 0.003 ), vec2( 0.997 ) )
  ).b;

  float lensCellEdgeDistance = min(
    min( lensCellUv.x, 1.0 - lensCellUv.x ),
    min( lensCellUv.y, 1.0 - lensCellUv.y )
  );
  float lensCellEdge = 1.0 - smoothstep( 0.025, 0.105, lensCellEdgeDistance );
  float lensFacet = 0.94 + 0.08 * lensCellSeed;
  vec3 lensGlassTint = mix(
    vec3( 0.50, 1.0, 0.82 ),
    vec3( 0.55, 0.76, 1.0 ),
    lensHash( lensSeedPoint + 41.0 )
  );

  lensRefracted *= lensFacet;
  lensRefracted = mix( lensRefracted, lensRefracted * lensGlassTint, 0.22 );
  lensRefracted += lensGlassTint * (
    lensFresnel * 0.16 + lensCellEdge * 0.04
  ) * uLensStrength;

  float lensAlpha = uLensOpacity * (
    0.58 + lensFresnel * 0.27 + lensCellEdge * 0.10
  );
  gl_FragColor = vec4( lensRefracted, clamp( lensAlpha, 0.0, 0.96 ) );
}
`

export function createCoreLensTexture(size: number) {
  const texture = new FramebufferTexture(size, size)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

export function createCoreLensMaterial(
  texture: FramebufferTexture,
  captureSize: number,
) {
  const uniforms: CoreLensUniforms = {
    time: { value: 0 },
    strength: { value: 0 },
    opacity: { value: 0 },
    captureOrigin: { value: new Vector2() },
    captureSize: { value: new Vector2(captureSize, captureSize) },
  }

  const material = new ShaderMaterial({
    uniforms: {
      uLensScene: { value: texture },
      uLensCaptureOrigin: uniforms.captureOrigin,
      uLensCaptureSize: uniforms.captureSize,
      uLensTime: uniforms.time,
      uLensStrength: uniforms.strength,
      uLensOpacity: uniforms.opacity,
    },
    vertexShader: CORE_LENS_VERTEX_SHADER,
    fragmentShader: CORE_LENS_FRAGMENT_SHADER,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  coreLensUniforms.set(material, uniforms)
  return material
}

export function setCoreLensCapture(
  material: ShaderMaterial,
  x: number,
  y: number,
  size: number,
) {
  const uniforms = coreLensUniforms.get(material)
  if (!uniforms) return
  uniforms.captureOrigin.value.set(x, y)
  uniforms.captureSize.value.set(size, size)
}

export function updateCoreLensMaterial(
  material: ShaderMaterial,
  time: number,
  strength: number,
  opacity: number,
) {
  const uniforms = coreLensUniforms.get(material)
  if (!uniforms) return
  uniforms.time.value = time
  uniforms.strength.value = strength
  uniforms.opacity.value = opacity
}
