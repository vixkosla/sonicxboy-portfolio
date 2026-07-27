import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
} from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float radius = length(centered);
    float halo = 1.0 - smoothstep(0.08, 1.0, radius);
    halo *= halo;
    float shoulder = 1.0 - smoothstep(0.0, 0.72, radius);
    float alpha = (halo * 0.72 + shoulder * 0.28) * uOpacity;
    if (alpha < 0.001) discard;
    gl_FragColor = vec4(uColor * (1.15 + shoulder * 0.85), alpha);
  }
`

export function createDischargeBacklightMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color('#b8f6ff') },
      uOpacity: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  })
}

export function updateDischargeBacklightMaterial(
  material: ShaderMaterial,
  opacity: number,
) {
  material.uniforms.uOpacity.value = Math.min(1, Math.max(0, opacity))
}
