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

float ridged(float value) {
  return 1.0 - abs(value * 2.0 - 1.0);
}

vec2 plumeCenter(float height, float time, float expansion) {
  float join = smoothstep(0.08, 1.15, height);
  vec2 slowCurve = vec2(
    sin(height * 0.94 - time * 0.24) * (0.036 + height * 0.012),
    cos(height * 0.82 + time * 0.18) * (0.029 + height * 0.009)
  );
  vec2 fineCurve = vec2(
    sin(height * 3.35 + time * 0.16),
    cos(height * 2.88 - time * 0.12)
  ) * 0.012;
  return (slowCurve + fineCurve) * join * expansion;
}

vec2 strandOffset(
  float height,
  float time,
  float phase,
  float spread,
  float speed
) {
  float join = mix(0.26, 1.0, smoothstep(0.08, 0.92, height));
  float narrowing = exp(-height * 0.27) * 0.92 + 0.08;
  float travel = height * (1.05 + phase * 0.025) - time * speed + phase;
  vec2 orbit = vec2(
    sin(travel),
    cos(travel * 0.87 + phase * 0.41)
  );
  vec2 secondary = vec2(
    sin(height * 3.2 + phase * 1.73 + time * 0.19),
    cos(height * 2.65 - phase * 1.21 - time * 0.16)
  ) * 0.23;
  return (orbit + secondary) * spread * narrowing * join;
}

float strandTube(vec2 point, vec2 center, float width) {
  float normalized = length(point - center) / max(width, 0.0001);
  return exp(-normalized * normalized * 1.85);
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
  position += rayDirection * stepLength * hash31(
    vec3(gl_FragCoord.xy * 0.071, 9.13)
  );

  for (int stepIndex = 0; stepIndex < 80; stepIndex++) {
    if (float(stepIndex) >= uStepCount) break;

    vec3 plasmaPosition = position - wobble;
    float height = max(plasmaPosition.y, 0.0);
    float baseFade = smoothstep(-1.035, -0.80, plasmaPosition.y);

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
    float ridgeNoise = ridged(
      noise3(flowPosition * 3.45 + vec3(7.4, -uTime * 0.91, 3.8))
    );
    float flowRidge = pow(ridged(detailNoise), 3.2);
    vec2 flowWarp = vec2(detailNoise - 0.5, microNoise - 0.5) *
      (0.15 * taper + 0.018);
    flowWarp += vec2(
      sin(height * 1.74 - uTime * 0.31 + broadNoise * 3.1),
      cos(height * 1.46 + uTime * 0.23 + broadNoise * 2.7)
    ) * (0.022 + taper * 0.026);

    vec2 centerline = plumeCenter(height, uTime, uExpansion);
    vec2 flowPoint = plasmaPosition.xz + flowWarp * uExpansion;
    vec2 plumeOffset = flowPoint - centerline;
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

    // The plume overlaps the upper hemisphere instead of starting above it. Its
    // initial width follows the sphere cross-section, then hands over to an
    // exponentially narrowing column. This removes the pinched seam between the
    // round source and the rising flow.
    float plumeJoin = uExpansion * smoothstep(-0.08, 0.56, plasmaPosition.y);
    float crossSection = sqrt(max(1.0 - height * height, 0.0));
    float columnBlend = smoothstep(0.22, 1.12, height);
    float plumeNoise =
      (broadNoise - 0.5) * (0.10 * taper + 0.018 + height * 0.005) +
      (detailNoise - 0.5) * 0.031 +
      (ridgeNoise - 0.5) * 0.014;
    float plumeRadius = max(length(plumeOffset) - plumeNoise, 0.0);
    float yellowWidth = mix(
      crossSection * 0.42 + 0.045,
      0.285 * taper + 0.010,
      columnBlend
    );
    float orangeWidth = mix(
      crossSection * 0.64 + 0.055,
      0.455 * taper + 0.015,
      columnBlend
    );
    float redWidth = mix(
      crossSection * 0.82 + 0.065,
      0.625 * taper + 0.020,
      columnBlend
    );
    float blueWidth = mix(
      crossSection * 0.96 + 0.055,
      0.79 * taper + 0.027,
      columnBlend
    );
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
    tailBlueShell *=
      0.08 + shellBreakup * 0.43 + ridgeNoise * 0.31 + flowRidge * 0.24;

    // Seven independent material streams rise through the shared volume. They
    // start together in the hot source, braid through the broad column, then
    // converge into hair-thin lines high above it.
    float strandWidth = 0.085 * taper + 0.0115;
    vec2 strandCenter0 = centerline + strandOffset(
      height, uTime, 0.35, 0.048, 0.54
    ) * uExpansion;
    vec2 strandCenter1 = centerline + strandOffset(
      height, uTime, 1.72, 0.340, 0.42
    ) * uExpansion;
    vec2 strandCenter2 = centerline + strandOffset(
      height, uTime, 3.08, 0.280, 0.49
    ) * uExpansion;
    vec2 strandCenter3 = centerline + strandOffset(
      height, uTime, 4.46, 0.380, 0.37
    ) * uExpansion;
    vec2 strandCenter4 = centerline + strandOffset(
      height, uTime, 5.84, 0.310, 0.58
    ) * uExpansion;
    vec2 strandCenter5 = centerline + strandOffset(
      height, uTime, 7.18, 0.420, 0.45
    ) * uExpansion;
    vec2 strandCenter6 = centerline + strandOffset(
      height, uTime, 8.52, 0.360, 0.62
    ) * uExpansion;
    float strand0 = strandTube(flowPoint, strandCenter0, strandWidth * 1.28);
    float strand1 = strandTube(flowPoint, strandCenter1, strandWidth * 0.93);
    float strand2 = strandTube(flowPoint, strandCenter2, strandWidth * 0.78);
    float strand3 = strandTube(flowPoint, strandCenter3, strandWidth * 0.86);
    float strand4 = strandTube(flowPoint, strandCenter4, strandWidth * 0.70);
    float strand5 = strandTube(flowPoint, strandCenter5, strandWidth * 0.72);
    float strand6 = strandTube(flowPoint, strandCenter6, strandWidth * 0.65);
    float strandBreakup = 0.22 + 0.78 * smoothstep(
      0.18,
      0.83,
      ridgeNoise * 0.66 + flowRidge * 0.58 + microNoise * 0.22
    );
    float strandField = (
      strand0 * 1.18 + strand1 * 0.92 + strand2 * 0.78 +
      strand3 * 0.84 + strand4 * 0.68 + strand5 * 0.73 + strand6 * 0.62
    ) * strandBreakup;
    float paleStrands = (
      strand0 * 0.88 + strand1 * 0.67 + strand2 * 0.82 +
      strand3 * 0.61 + strand4 * 0.58 + strand5 * 0.72 + strand6 * 0.55
    ) * strandBreakup;
    float blueStrands = (
      strand1 * 0.72 + strand3 * 0.88 + strand4 * 0.42 +
      strand5 * 0.58 + strand6 * 0.76
    ) * (0.28 + ridgeNoise * 0.72);

    float upperReplacement =
      1.0 - uExpansion * smoothstep(0.28, 1.05, plasmaPosition.y) * 0.88;
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
    float ribbonA = pow(
      0.5 + 0.5 * sin(
        angle * 5.0 + height * 5.3 - uTime * 1.17 + broadNoise * 5.2
      ),
      7.0
    );
    float ribbonB = pow(
      0.5 + 0.5 * sin(
        angle * 8.0 - height * 3.85 + uTime * 0.83 + detailNoise * 4.1
      ),
      11.0
    );
    float ribbonField = (ribbonA * 0.72 + ribbonB * 0.48) *
      (0.34 + ridgeNoise * 0.66);
    float pockets = smoothstep(
      0.28,
      0.74,
      broadNoise * 0.76 + detailNoise * 0.52
    );
    float outerTexture =
      0.11 + pockets * 0.70 + filament * 0.24 +
      ribbonField * 0.58 + microNoise * uExpansion * 0.18;

    float coreDensity =
      core * sphereInside * (2.25 + broadNoise * 1.25) * uCoreProgress;
    float wisp = smoothstep(0.68, 0.94, filament * pockets);
    float baseOuterDensity =
      ((baseYellow * 0.46 + baseOrange * 0.32 + baseRed * 0.20) *
        outerTexture + wisp * (baseOrange + baseRed) * 0.34) *
      uWarmProgress;
    float tailOuterDensity =
      (tailYellow * 0.22 + tailOrange * 0.17 + tailRed * 0.12) *
      (0.18 + outerTexture * 0.82) *
      clamp(
        0.18 + strandField * 0.29 + ribbonField * 0.43 + pockets * 0.17,
        0.14,
        1.18
      ) * mix(1.0, 0.58, smoothstep(1.35, 5.2, height)) *
      plumeJoin * uWarmProgress;
    float streamDensity = strandField * (
      0.16 + tailYellow * 0.42 + tailOrange * 0.28 + tailRed * 0.11
    ) * plumeJoin * uWarmProgress;
    float mistBand = smoothstep(
      0.58,
      0.91,
      plumeRadius / max(blueWidth, 0.0001)
    ) * (1.0 - smoothstep(
      1.0,
      1.28,
      plumeRadius / max(blueWidth, 0.0001)
    ));
    float mistDensity = mistBand * plumeJoin *
      (0.052 + broadNoise * 0.066 + ridgeNoise * 0.038) * uRimProgress;
    float bodyDensity =
      (coreDensity + baseOuterDensity * gap + tailOuterDensity + streamDensity) *
      baseFade;
    float shellDensity =
      (baseBlueShell * sphereInside + tailBlueShell * plumeJoin) *
      baseFade * 0.38 * uRimProgress;
    float density = bodyDensity + shellDensity + mistDensity;

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
    float spectralLift = smoothstep(0.72, 3.9, height);
    vec3 strandPaleColor = mix(
      vec3(1.0, 0.93, 0.68),
      vec3(0.68, 0.84, 1.0),
      spectralLift
    );
    float strandHeightFade = mix(1.0, 0.82, smoothstep(1.5, 7.5, height));
    vec3 strandColor = (
      strandPaleColor * paleStrands * 3.45 +
      vec3(1.0, 0.24, 0.012) * strandField * 0.72 +
      vec3(0.20, 0.48, 1.0) * blueStrands *
        smoothstep(0.48, 1.55, height) * 2.05 * uRimProgress
    ) * plumeJoin * uWarmProgress * strandHeightFade;
    vec3 ribbonColor = mix(
      vec3(1.0, 0.18, 0.008),
      vec3(0.58, 0.77, 1.0),
      spectralLift * 0.78
    ) * ribbonField *
      (tailOrange * 0.72 + tailRed * 0.36) *
      plumeJoin * uWarmProgress * 1.42;
    vec3 mistColor = vec3(0.095, 0.22, 0.48) * mistDensity * 2.25;
    vec3 emission =
      bodyColor * (0.58 + detailNoise * 0.48) * (0.72 + filament * 0.28) +
      shellColor + strandColor + ribbonColor + mistColor;

    float sampleAlpha = 1.0 - exp(-density * stepLength * 1.14);
    radiance += transmittance * emission * sampleAlpha;
    radiance += transmittance *
      (strandColor * 0.36 + ribbonColor * 0.085) * stepLength;
    coverage += transmittance * sampleAlpha;
    transmittance *= 1.0 - sampleAlpha;
    if (transmittance < 0.012) break;
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

const gridVertexShader = `
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

const gridFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform float uWarmth;
uniform float uDissolve;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

float gridHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float gridNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  local = local * local * (3.0 - 2.0 * local);
  float a = gridHash(cell);
  float b = gridHash(cell + vec2(1.0, 0.0));
  float c = gridHash(cell + vec2(0.0, 1.0));
  float d = gridHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float facing = abs(dot(normalize(vWorldNormal), viewDirection));
  float fresnel = pow(1.0 - facing, 2.15);
  float shimmer = 0.5 + 0.5 * sin(
    uTime * 1.05 + vWorldPosition.y * 15.0 + vWorldPosition.x * 8.0
  );
  float surfaceNoise = gridNoise(
    vUv * 8.0 + vec2(uTime * 0.14, -uTime * 0.11)
  );

  // Four broad cells read as an intentional cage at reactor scale. Two
  // nested masks give every bar a sharp core and a soft emissive shoulder;
  // fwidth keeps both masks stable when the cube recedes or turns edge-on.
  const float gridDensity = 4.0;
  vec2 fragmentGrid = vUv * gridDensity;
  vec2 cell = floor(fragmentGrid);
  vec2 cellUv = fract(fragmentGrid);
  vec2 nearestLine = min(cellUv, 1.0 - cellUv);
  float lineDistance = min(nearestLine.x, nearestLine.y);
  vec2 fragmentFootprint = fwidth(fragmentGrid);
  float lineAA = max(fragmentFootprint.x, fragmentFootprint.y) * 0.78;
  float gridCore = 1.0 - smoothstep(
    max(0.0, 0.036 - lineAA),
    0.036 + lineAA,
    lineDistance
  );
  float gridGlow = 1.0 - smoothstep(
    max(0.0, 0.105 - lineAA * 1.35),
    0.105 + lineAA * 1.35,
    lineDistance
  );
  float gridLine = max(gridCore, gridGlow * 0.48);
  float nodeDistance = length(nearestLine);
  float gridNode = 1.0 - smoothstep(
    max(0.0, 0.055 - lineAA * 1.25),
    0.055 + lineAA * 1.25,
    nodeDistance
  );
  float outerDistance = min(
    min(vUv.x, 1.0 - vUv.x),
    min(vUv.y, 1.0 - vUv.y)
  );
  vec2 uvFootprint = fwidth(vUv);
  float edgeAA = max(uvFootprint.x, uvFootprint.y) * 0.9;
  float outerCore = 1.0 - smoothstep(
    max(0.0, 0.024 - edgeAA),
    0.024 + edgeAA,
    outerDistance
  );
  float outerGlow = 1.0 - smoothstep(
    max(0.0, 0.115 - edgeAA * 1.4),
    0.115 + edgeAA * 1.4,
    outerDistance
  );
  float outerEdge = max(outerCore, outerGlow * 0.52);
  float scan = 0.5 + 0.5 * sin(
    fragmentGrid.y * 1.35 - uTime * 1.4 + surfaceNoise * 2.2
  );

  float faceSeed = dot(abs(normalize(vWorldNormal)), vec3(17.0, 31.0, 47.0));
  float breakTime = 0.06 + gridHash(cell + vec2(faceSeed)) * 0.56;
  float fragmentLife =
    1.0 - smoothstep(breakTime - 0.025, breakTime + 0.045, uDissolve);
  float breakupGlow =
    1.0 - smoothstep(0.0, 0.045, abs(uDissolve - breakTime));
  float structure = max(
    outerEdge,
    max(gridLine * (0.72 + scan * 0.28), gridNode * 0.86)
  );
  float breakupStructure = breakupGlow * (0.16 + gridLine * 0.84);

  if (max(structure * fragmentLife, breakupStructure) < 0.025) discard;

  vec3 reactorGreen = vec3(0.094, 0.827, 0.514);
  vec3 reactorMint = vec3(0.37, 0.95, 0.67);
  vec3 waveBlue = vec3(0.141, 0.298, 1.0);
  float highlight = clamp(
    0.10 + fresnel * 0.42 + shimmer * 0.08 + uWarmth * 0.13,
    0.0,
    0.52
  );
  vec3 color = mix(reactorGreen, reactorMint, highlight);
  color *= 0.78 + surfaceNoise * 0.31;
  color += reactorMint * (gridCore * 0.16 + outerCore * 0.21);
  color += waveBlue * breakupStructure * 0.82;

  // Rear faces reveal the volume but stay quiet enough to avoid a moire
  // carpet where several sides overlap in projection.
  float faceVisibility = gl_FrontFacing ? 1.0 : 0.34;
  float structureAlpha =
    gridCore * (0.42 + scan * 0.12) +
    gridGlow * 0.075 +
    gridNode * 0.16 +
    outerCore * (0.54 + fresnel * 0.22) +
    outerGlow * 0.085;
  float alpha = uOpacity * (
    fragmentLife * structureAlpha + breakupStructure * 0.27
  ) * faceVisibility;
  gl_FragColor = vec4(color * mix(0.58, 1.0, faceVisibility), alpha);
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
      uStepCount: { value: 38 },
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

export function createGridMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uWarmth: { value: 0 },
      uDissolve: { value: 0 },
    },
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
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
  material.uniforms.uStepCount.value = 38 + expansion * 42
  material.uniforms.uCenter.value.copy(center)
  material.uniforms.uRadii.value.copy(radii)
}

export function updateGridMaterial(
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
