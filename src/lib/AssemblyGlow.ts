import {
  AdditiveBlending,
  DoubleSide,
  ShaderMaterial,
} from 'three'

const seamVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const seamFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  const float gridDensity = 3.0;
  vec2 gridUv = vUv * gridDensity;
  vec2 cellUv = fract(gridUv);
  vec2 nearestLine = min(cellUv, 1.0 - cellUv);
  float lineDistance = min(nearestLine.x, nearestLine.y);
  float footprint = max(fwidth(gridUv.x), fwidth(gridUv.y));
  float antialias = footprint * 0.72;
  float core = 1.0 - smoothstep(
    max(0.0, 0.014 - antialias),
    0.014 + antialias,
    lineDistance
  );
  float shoulder = 1.0 - smoothstep(
    max(0.0, 0.085 - antialias * 1.35),
    0.085 + antialias * 1.35,
    lineDistance
  );
  float intersection = 1.0 - smoothstep(
    0.025,
    0.105,
    length(nearestLine)
  );
  float pulse = 0.93 + 0.07 * sin(
    uTime * 10.5 + vWorldPosition.x * 7.0 + vWorldPosition.y * 5.0
  );
  float alpha = uOpacity * (
    core * 0.82 + shoulder * 0.16 + intersection * 0.12
  ) * pulse;

  if (alpha < 0.004) discard;

  vec3 coldWhite = vec3(0.82, 0.94, 1.0);
  vec3 hotWhite = vec3(1.0);
  vec3 color = mix(coldWhite, hotWhite, core * 0.86 + intersection * 0.14);
  gl_FragColor = vec4(color * (0.72 + core * 0.72), alpha);
}
`

export function createAssemblySeamMaterial() {
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: seamVertexShader,
    fragmentShader: seamFragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  })

  material.visible = false
  return material
}

export function updateAssemblySeamMaterial(
  material: ShaderMaterial,
  time: number,
  opacity: number,
) {
  material.uniforms.uTime.value = time
  material.uniforms.uOpacity.value = opacity
}
