import { Matrix4, Quaternion, Vector3 } from 'three'
import { CUBELET_COUNT } from './LayeredAssembly.ts'

export const REACTOR_INSTANCE_COUNT = CUBELET_COUNT * 4
export const REACTOR_TILE_WIDTH = 0.27
export const REACTOR_TILE_THICKNESS = 0.022
// The divided plates keep the same outer-shell radius as the captured voxel
// sphere. They never trade places with the nucleus grid.
export const REACTOR_SHELL_RADIUS = 1.22
export const REACTOR_WAVE_RADIAL_LIFT = 0.085
export const REACTOR_WAVE_TANGENTIAL_GROWTH = 0.08
export const REACTOR_WAVE_THICKNESS_GROWTH = 0.48

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const LAYOUT_UP = new Vector3(0, 1, 0)

export function createRadialPlateOrientation(direction: Vector3) {
  const normal = direction.clone().normalize()
  const tangent = new Vector3().crossVectors(LAYOUT_UP, normal)
  if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
  tangent.normalize()
  const bitangent = new Vector3().crossVectors(normal, tangent).normalize()
  const basis = new Matrix4().makeBasis(tangent, bitangent, normal)
  return new Quaternion().setFromRotationMatrix(basis)
}

export function createFibonacciDirections(count: number) {
  const directions: Vector3[] = []
  for (let index = 0; index < count; index += 1) {
    const vertical = 1 - (2 * (index + 0.5)) / count
    const horizontal = Math.sqrt(1 - vertical * vertical)
    const angle = GOLDEN_ANGLE * index
    directions.push(
      new Vector3(
        Math.cos(angle) * horizontal,
        vertical,
        Math.sin(angle) * horizontal,
      ),
    )
  }
  return directions
}
