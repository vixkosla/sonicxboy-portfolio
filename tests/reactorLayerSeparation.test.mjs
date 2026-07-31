import assert from 'node:assert/strict'
import test from 'node:test'

import { Matrix4, Vector3 } from 'three'
import { OBB } from 'three/examples/jsm/math/OBB.js'

import {
  REACTOR_INSTANCE_COUNT,
  REACTOR_TILE_THICKNESS,
  REACTOR_TILE_WIDTH,
  REACTOR_WAVE_RADIAL_LIFT,
  REACTOR_WAVE_TANGENTIAL_GROWTH,
  REACTOR_WAVE_THICKNESS_GROWTH,
  REACTOR_SHELL_RADIUS,
  createFibonacciDirections,
  createRadialPlateOrientation,
} from '../src/lib/ReactorLayout.ts'

function createPlateBounds(radius, tangentialScale, thicknessScale) {
  const scale = new Vector3(
    REACTOR_TILE_WIDTH * tangentialScale,
    REACTOR_TILE_WIDTH * tangentialScale,
    REACTOR_TILE_THICKNESS * thicknessScale,
  )
  return createFibonacciDirections(REACTOR_INSTANCE_COUNT).map((direction) => {
    const matrix = new Matrix4().compose(
      direction.clone().multiplyScalar(radius),
      createRadialPlateOrientation(direction),
      scale,
    )
    return new OBB(
      new Vector3(),
      new Vector3(0.5, 0.5, 0.5),
    ).applyMatrix4(matrix)
  })
}

function assertNoIntersections(bounds) {
  for (let left = 0; left < bounds.length; left += 1) {
    for (let right = left + 1; right < bounds.length; right += 1) {
      assert.equal(
        bounds[left].intersectsOBB(bounds[right], 1e-10),
        false,
        `reactor plates ${left}/${right} intersect`,
      )
    }
  }
}

test('outer reactor plates remain disjoint at their shell radius', () => {
  assertNoIntersections(createPlateBounds(REACTOR_SHELL_RADIUS, 1, 1))
})

test('reactor plates remain disjoint at the maximum wave deformation', () => {
  assertNoIntersections(
    createPlateBounds(
      REACTOR_SHELL_RADIUS + REACTOR_WAVE_RADIAL_LIFT,
      1 + REACTOR_WAVE_TANGENTIAL_GROWTH,
      1 + REACTOR_WAVE_THICKNESS_GROWTH,
    ),
  )
})
