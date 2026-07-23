import {
  AdditiveBlending,
  FrontSide,
  ShaderMaterial,
} from 'three'

const seamVertexShader = `
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

void main() {
  vLocalPosition = position;
  vec4 instancePosition = vec4(position, 1.0);

  #ifdef USE_INSTANCING
    instancePosition = instanceMatrix * instancePosition;
  #endif

  vec4 worldPosition = modelMatrix * instancePosition;
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const seamFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;
uniform float uRollProgress;
uniform float uContactStrength;
uniform float uContactY;
uniform float uContactWidth;
uniform float uHalfExtent;

varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

void main() {
  // Every glow instance reuses the real rounded cubelet geometry. On its
  // surface the smallest boundary distance belongs to the visible face;
  // the second-smallest distance therefore measures proximity to a bevel.
  // This traces the actual rounded edge instead of projecting a sharp grid.
  vec3 boundaryDistance = max(
    vec3(uHalfExtent) - abs(vLocalPosition),
    vec3(0.0)
  );
  float nearest = min(
    boundaryDistance.x,
    min(boundaryDistance.y, boundaryDistance.z)
  );
  float farthest = max(
    boundaryDistance.x,
    max(boundaryDistance.y, boundaryDistance.z)
  );
  float bevelDistance =
    boundaryDistance.x + boundaryDistance.y + boundaryDistance.z -
    nearest - farthest;
  float footprint = fwidth(bevelDistance);
  float antialias = footprint * 1.15;
  float core = 1.0 - smoothstep(
    max(0.0, 0.007 - antialias),
    0.013 + antialias,
    bevelDistance
  );
  float shoulder = 1.0 - smoothstep(
    max(0.0, 0.022 - antialias * 1.25),
    0.055 + antialias * 1.25,
    bevelDistance
  );
  float roundedCorner = 1.0 - smoothstep(
    0.020,
    0.048,
    farthest
  );
  float pulse = 0.93 + 0.07 * sin(
    uTime * 10.5 + vWorldPosition.x * 7.0 + vWorldPosition.y * 5.0
  );
  float heightAboveContact = max(vWorldPosition.y - uContactY, 0.0);
  float contactBand = 1.0 - smoothstep(
    uContactWidth * 0.12,
    uContactWidth,
    heightAboveContact
  );
  float rollFocus =
    smoothstep(0.08, 0.72, uRollProgress) * uContactStrength;
  float spatialEnergy = mix(
    1.0,
    0.10 + contactBand * 2.15,
    rollFocus
  );
  float alpha = uOpacity * (
    core * 0.78 +
    shoulder * mix(0.30, 0.20, rollFocus) +
    roundedCorner * 0.12
  ) * pulse * spatialEnergy;

  if (alpha < 0.004) discard;

  vec3 coldWhite = vec3(0.82, 0.94, 1.0);
  vec3 hotWhite = vec3(1.0);
  vec3 contactMint = vec3(0.46, 1.0, 0.72);
  vec3 color = mix(
    coldWhite,
    hotWhite,
    core * 0.88 + roundedCorner * 0.12
  );
  color = mix(
    color,
    contactMint,
    rollFocus * contactBand * (0.40 + shoulder * 0.38)
  );
  gl_FragColor = vec4(color * (0.80 + core * 0.80), alpha);
}
`

export function createAssemblySeamMaterial() {
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uRollProgress: { value: 0 },
      uContactStrength: { value: 0 },
      uContactY: { value: 0 },
      uContactWidth: { value: 0.16 },
      uHalfExtent: { value: 0.25 },
    },
    vertexShader: seamVertexShader,
    fragmentShader: seamFragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: FrontSide,
    toneMapped: false,
  })

  material.visible = false
  return material
}

export function updateAssemblySeamMaterial(
  material: ShaderMaterial,
  time: number,
  opacity: number,
  rollProgress: number,
  contactStrength: number,
  contactY: number,
  contactWidth: number,
  halfExtent: number,
) {
  material.uniforms.uTime.value = time
  material.uniforms.uOpacity.value = opacity
  material.uniforms.uRollProgress.value = rollProgress
  material.uniforms.uContactStrength.value = contactStrength
  material.uniforms.uContactY.value = contactY
  material.uniforms.uContactWidth.value = contactWidth
  material.uniforms.uHalfExtent.value = halfExtent
}
