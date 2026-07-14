import {
  AddEquation,
  BoxGeometry,
  CustomBlending,
  DoubleSide,
  NormalBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three'

export const PLASMA_RADIUS = 0.235
// The box is only a ray-march proxy. The fragment shader defines the visible
// sphere-and-plume silhouette, so no proxy edge can round off the flame tip.
export const PLASMA_GEOMETRY = new BoxGeometry(
  PLASMA_RADIUS * 2,
  PLASMA_RADIUS * 2,
  PLASMA_RADIUS * 2,
)
export const FLASH_GEOMETRY = new PlaneGeometry(2, 2)

const plasmaVertexShader = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const plasmaFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform float uCoreProgress;
uniform float uWarmProgress;
uniform float uRimProgress;
uniform float uExpansion;
uniform float uStepCount;
uniform vec3 uCenter;
uniform vec3 uRadii;

varying vec3 vWorldPosition;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 cell = floor(p);
  vec3 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);

  float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

  float nearY0 = mix(n000, n100, local.x);
  float nearY1 = mix(n010, n110, local.x);
  float farY0 = mix(n001, n101, local.x);
  float farY1 = mix(n011, n111, local.x);
  return mix(
    mix(nearY0, nearY1, local.y),
    mix(farY0, farY1, local.y),
    local.z
  );
}

float fbm3(vec3 p) {
  float value = 0.0;
  float amplitude = 0.56;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * noise3(p);
    p = p.yzx * 2.03 + vec3(17.1, 9.2, 13.7);
    amplitude *= 0.48;
  }
  return value;
}

float gaussian(float value, float center, float width) {
  float normalized = (value - center) / max(width, 0.0001);
  return exp(-normalized * normalized);
}

vec2 plumeCenter(float height, float time, float expansion) {
  float join = smoothstep(0.24, 1.35, height);
  vec2 slowCurve = vec2(
    sin(height * 1.08 - time * 0.29) * (0.042 + height * 0.017),
    cos(height * 0.91 + time * 0.21) * (0.031 + height * 0.012)
  );
  vec2 fineCurve = vec2(
    sin(height * 3.7 + time * 0.17),
    cos(height * 3.15 - time * 0.13)
  ) * 0.014;
  return (slowCurve + fineCurve) * join * expansion;
}

void main() {
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  float baseRadius = max(uRadii.x, 0.0001);
  vec3 position = (vWorldPosition - uCenter) / baseRadius;
  float stepLength = 2.9 / max(uStepCount, 1.0);
  float transmittance = 1.0;
  float coverage = 0.0;
  vec3 radiance = vec3(0.0);
  vec3 wobble = vec3(
    sin(uTime * 1.13) * 0.025,
    sin(uTime * 0.79 + 1.4) * 0.018,
    cos(uTime * 0.97) * 0.025
  );

  for (int stepIndex = 0; stepIndex < 80; stepIndex++) {
    if (float(stepIndex) >= uStepCount) break;

    vec3 plasmaPosition = position - wobble;
    float height = max(plasmaPosition.y, 0.0);
    float baseFade = smoothstep(-1.035, -0.80, plasmaPosition.y);

    vec2 centerline = plumeCenter(height, uTime, uExpansion);
    vec2 plumeOffset = plasmaPosition.xz - centerline;
    float taper = exp(-height * 0.43);

    vec3 flowPosition = plasmaPosition * vec3(2.28, 1.72, 2.28);
    flowPosition.y -= uTime * 0.82;
    flowPosition.x += sin(height * 2.2 - uTime * 0.34) * 0.21;
    flowPosition.z += cos(height * 1.9 + uTime * 0.27) * 0.18;

    float broadNoise = fbm3(flowPosition);
    float detailNoise = noise3(flowPosition * 2.7 + vec3(4.3, uTime * 0.37, -2.1));
    float microNoise = noise3(
      flowPosition * 5.4 + vec3(-8.1, -uTime * 0.63, 5.7)
    );
    float distortion =
      (broadNoise - 0.48) * 0.30 +
      (detailNoise - 0.5) * 0.085 +
      (microNoise - 0.5) * 0.055 * uExpansion;

    // The lower source stays a true sphere. Expansion never scales its Y axis,
    // so the white core cannot be squeezed into an ellipse.
    float sphereRadius = length(plasmaPosition);
    float sphereWarped = sphereRadius - distortion;
    float sphereInside = 1.0 - smoothstep(0.97, 1.045, sphereRadius);
    float core = 1.0 - smoothstep(
      0.08,
      0.29,
      sphereRadius - distortion * 0.34
    );
    float baseYellow =
      smoothstep(0.15, 0.29, sphereWarped) *
      (1.0 - smoothstep(0.45, 0.61, sphereWarped));
    float baseOrange =
      smoothstep(0.34, 0.49, sphereWarped) *
      (1.0 - smoothstep(0.62, 0.75, sphereWarped));
    float baseRed =
      smoothstep(0.53, 0.64, sphereWarped) *
      (1.0 - smoothstep(0.71, 0.81, sphereWarped));

    float gapDistance = abs(sphereWarped - 0.79);
    float gap = smoothstep(0.032, 0.105, gapDistance);
    float shellDistance = (sphereWarped - 0.92) / 0.031;
    float baseBlueShell = exp(-shellDistance * shellDistance);
    float shellBreakup = smoothstep(
      0.34,
      0.69,
      broadNoise * 0.72 + detailNoise * 0.48
    );
    baseBlueShell *= 0.24 + shellBreakup * 0.76;

    // Only the upper hemisphere becomes a plume. Its nested radii approach a
    // moving line, like smoke rising through still air.
    float plumeJoin = uExpansion * smoothstep(0.18, 0.88, plasmaPosition.y);
    float plumeNoise =
      (broadNoise - 0.5) * (0.065 * taper + 0.012) +
      (detailNoise - 0.5) * 0.022;
    float plumeRadius = max(length(plumeOffset) - plumeNoise, 0.0);
    float yellowWidth = 0.32 * taper + 0.009;
    float orangeWidth = 0.49 * taper + 0.013;
    float redWidth = 0.66 * taper + 0.018;
    float blueWidth = 0.84 * taper + 0.026;
    float tailYellow = 1.0 - smoothstep(
      0.68,
      1.02,
      plumeRadius / yellowWidth
    );
    float tailOrange = 1.0 - smoothstep(
      0.72,
      1.04,
      plumeRadius / orangeWidth
    );
    float tailRed = 1.0 - smoothstep(
      0.76,
      1.055,
      plumeRadius / redWidth
    );
    float tailBlueShell = gaussian(
      plumeRadius,
      blueWidth,
      max(0.012, blueWidth * (0.085 + detailNoise * 0.035))
    );
    tailBlueShell *= 0.28 + shellBreakup * 0.72;

    float upperReplacement =
      1.0 - uExpansion * smoothstep(0.42, 1.03, plasmaPosition.y) * 0.88;
    baseYellow *= sphereInside * upperReplacement;
    baseOrange *= sphereInside * upperReplacement;
    baseRed *= sphereInside * upperReplacement;
    baseBlueShell *= mix(
      1.0,
      0.12,
      uExpansion * smoothstep(0.38, 1.02, plasmaPosition.y)
    );

    float angle = atan(plumeOffset.y, plumeOffset.x);
    float filament = 0.5 + 0.5 * sin(
      angle * 3.0 - uTime * 2.25 + height * 7.5 + broadNoise * 4.6
    );
    float pockets = smoothstep(
      0.28,
      0.74,
      broadNoise * 0.76 + detailNoise * 0.52
    );
    float outerTexture =
      0.16 + pockets * 0.92 + filament * 0.38 +
      microNoise * uExpansion * 0.24;

    float coreDensity =
      core * sphereInside * (2.25 + broadNoise * 1.25) * uCoreProgress;
    float wisp = smoothstep(0.68, 0.94, filament * pockets);
    float baseOuterDensity =
      ((baseYellow * 0.46 + baseOrange * 0.32 + baseRed * 0.20) *
        outerTexture + wisp * (baseOrange + baseRed) * 0.34) *
      uWarmProgress;
    float tailOuterDensity =
      (tailYellow * 0.30 + tailOrange * 0.24 + tailRed * 0.18) *
      (0.34 + outerTexture * 0.66) * plumeJoin * uWarmProgress;
    float bodyDensity =
      (coreDensity + baseOuterDensity * gap + tailOuterDensity) * baseFade;
    float shellDensity =
      (baseBlueShell * sphereInside + tailBlueShell * plumeJoin) *
      baseFade * 0.38 * uRimProgress;
    float density = bodyDensity + shellDensity;

    vec3 bodyColor =
      vec3(1.0, 0.99, 0.95) * core * 2.25 * uCoreProgress +
      vec3(1.0, 0.64, 0.045) *
        (baseYellow + tailYellow * plumeJoin) * 1.38 * uWarmProgress +
      vec3(1.0, 0.12, 0.006) *
        (baseOrange + tailOrange * plumeJoin) * 0.92 * uWarmProgress +
      vec3(0.50, 0.003, 0.001) *
        (baseRed + tailRed * plumeJoin) * 0.58 * uWarmProgress;
    vec3 shellColor =
      vec3(0.016, 0.19, 1.0) *
      (baseBlueShell + tailBlueShell * plumeJoin) * 2.45 * uRimProgress;
    vec3 emission =
      bodyColor * (0.58 + detailNoise * 0.48) * (0.72 + filament * 0.28) +
      shellColor;

    float sampleAlpha = 1.0 - exp(-density * stepLength * 1.14);
    radiance += transmittance * emission * sampleAlpha;
    coverage += transmittance * sampleAlpha;
    transmittance *= 1.0 - sampleAlpha;
    position += rayDirection * stepLength;
  }

  float pulse = 0.92 + 0.08 * sin(uTime * 2.1) * sin(uTime * 0.73 + 1.2);
  vec3 coreCenter = uCenter + wobble * baseRadius;
  vec3 cameraToCore = coreCenter - cameraPosition;
  float rayProjection = dot(cameraToCore, rayDirection);
  vec3 closestPoint =
    (cameraPosition + rayDirection * rayProjection - coreCenter) / baseRadius;
  float impact = length(closestPoint);
  float coreNoise = fbm3(
    closestPoint * 3.6 + vec3(uTime * 0.24, -uTime * 0.71, uTime * 0.17)
  );
  float loneCore = uCoreProgress * (1.0 - uWarmProgress);
  float coreBeat = 1.0 + loneCore * 0.13 * sin(uTime * 5.4);
  float scaledImpact = impact / coreBeat;
  float coreGlow = exp(
    -scaledImpact * scaledImpact * (17.0 + coreNoise * 16.0)
  );
  coreGlow *= (0.70 + coreNoise * 0.48) * uCoreProgress;

  radiance += vec3(1.0, 0.96, 0.84) * coreGlow * 0.72;
  float opacity = max(
    clamp(coverage, 0.0, 1.0),
    coreGlow * 0.34
  ) * uOpacity;
  gl_FragColor = vec4(radiance * pulse * uOpacity, opacity);
}
`

const glassVertexShader = `
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const glassFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform float uWarmth;
uniform float uDissolve;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

float glassHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float glassNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);
  float a = glassHash(cell);
  float b = glassHash(cell + vec2(1.0, 0.0));
  float c = glassHash(cell + vec2(0.0, 1.0));
  float d = glassHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float facing = abs(dot(normalize(vWorldNormal), viewDirection));
  float fresnel = pow(1.0 - facing, 2.35);
  vec2 centeredUv = abs(vUv - 0.5) * 2.0;
  float edge = smoothstep(0.72, 0.98, max(centeredUv.x, centeredUv.y));
  float shimmer = 0.5 + 0.5 * sin(uTime * 0.84 + vWorldPosition.y * 17.0);
  float edgeNoise = glassNoise(vUv * 9.0 + vec2(uTime * 0.19, -uTime * 0.14));
  float noisyEdge = smoothstep(
    0.54,
    0.97,
    edge + (edgeNoise - 0.5) * 0.34
  );

  vec2 fragmentGrid = vUv * 5.0;
  vec2 cell = floor(fragmentGrid);
  vec2 cellUv = fract(fragmentGrid);
  float faceSeed = dot(abs(normalize(vWorldNormal)), vec3(17.0, 31.0, 47.0));
  float breakTime = 0.06 + glassHash(cell + vec2(faceSeed)) * 0.56;
  float fragmentLife =
    1.0 - smoothstep(breakTime - 0.025, breakTime + 0.045, uDissolve);
  float cellBorder = 1.0 - smoothstep(
    0.025,
    0.12,
    min(min(cellUv.x, 1.0 - cellUv.x), min(cellUv.y, 1.0 - cellUv.y))
  );
  float breakupGlow =
    1.0 - smoothstep(0.0, 0.045, abs(uDissolve - breakTime));

  if (fragmentLife < 0.08) discard;

  vec3 coolGlass = vec3(0.045, 0.48, 0.37);
  vec3 coldReflection = vec3(0.58, 1.0, 0.91);
  vec3 hotReflection = vec3(1.0, 0.19, 0.025);
  vec3 reflection = mix(coldReflection, hotReflection, uWarmth * 0.72);
  vec3 color = mix(coolGlass, reflection, fresnel * (0.14 + shimmer * 0.09));
  color +=
    vec3(0.03, 0.52, 0.39) * noisyEdge *
    (0.42 + edgeNoise * 0.24) * (1.0 - uDissolve * 0.82);
  color +=
    vec3(0.025, 0.20, 1.0) * breakupGlow *
    (0.18 + cellBorder * 0.22);

  float alpha =
    uOpacity * fragmentLife *
    (0.14 + fresnel * 0.25 +
      noisyEdge * 0.27 * (1.0 - uDissolve * 0.82) +
      breakupGlow * 0.13);
  gl_FragColor = vec4(color, alpha);
}
`

const flashVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const flashFragmentShader = `
precision highp float;

uniform float uOpacity;
varying vec2 vUv;

void main() {
  float radius = length(vUv - 0.5);
  float radial = 1.0 - smoothstep(0.05, 0.82, radius);
  vec3 color = mix(vec3(0.82, 1.0, 0.96), vec3(1.0), radial);
  float alpha = uOpacity * (0.72 + radial * 0.28);
  gl_FragColor = vec4(color, alpha);
}
`

export function createPlasmaMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCoreProgress: { value: 0 },
      uWarmProgress: { value: 0 },
      uRimProgress: { value: 0 },
      uExpansion: { value: 0 },
      uStepCount: { value: 34 },
      uCenter: { value: new Vector3() },
      uRadii: {
        value: new Vector3(PLASMA_RADIUS, PLASMA_RADIUS, PLASMA_RADIUS),
      },
    },
    vertexShader: plasmaVertexShader,
    fragmentShader: plasmaFragmentShader,
    transparent: true,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  })
}

export function createGlassMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uWarmth: { value: 0 },
      uDissolve: { value: 0 },
    },
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    transparent: true,
    blending: NormalBlending,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  })
}

export function createFlashMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
    },
    vertexShader: flashVertexShader,
    fragmentShader: flashFragmentShader,
    transparent: true,
    blending: NormalBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}

export function updatePlasmaMaterial(
  material: ShaderMaterial,
  time: number,
  opacity: number,
  coreProgress: number,
  warmProgress: number,
  rimProgress: number,
  center: Vector3,
  radii: Vector3,
  expansion: number,
) {
  material.uniforms.uTime.value = time
  material.uniforms.uOpacity.value = opacity
  material.uniforms.uCoreProgress.value = coreProgress
  material.uniforms.uWarmProgress.value = warmProgress
  material.uniforms.uRimProgress.value = rimProgress
  material.uniforms.uExpansion.value = expansion
  material.uniforms.uStepCount.value = 34 + expansion * 38
  material.uniforms.uCenter.value.copy(center)
  material.uniforms.uRadii.value.copy(radii)
}

export function updateGlassMaterial(
  material: ShaderMaterial,
  time: number,
  opacity: number,
  warmth: number,
  dissolve: number,
) {
  material.uniforms.uTime.value = time
  material.uniforms.uOpacity.value = opacity
  material.uniforms.uWarmth.value = warmth
  material.uniforms.uDissolve.value = dissolve
}

export function updateFlashMaterial(
  material: ShaderMaterial,
  opacity: number,
) {
  material.uniforms.uOpacity.value = opacity
}
