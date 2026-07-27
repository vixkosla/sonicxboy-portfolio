import assert from 'node:assert/strict'
import test from 'node:test'

import { PerspectiveCamera, Vector3 } from 'three'

import { LayeredAssembly } from '../src/lib/LayeredAssembly.ts'
import { DESKTOP_ASSEMBLY_POINTS } from '../src/lib/desktopCameraPoints.ts'

const ASSEMBLY_X = 1.2
const DESKTOP_SCENE_SCALE = 1.3
const TEXT_SAFE_AREA = {
  minX: -0.9,
  maxX: -0.05,
  minY: -0.5,
  maxY: 0.45,
}

function createArrivalCamera() {
  const arrival = DESKTOP_ASSEMBLY_POINTS[0]
  const target = new Vector3(
    ASSEMBLY_X + arrival.target[0],
    arrival.target[1],
    arrival.target[2],
  )
  const camera = new PerspectiveCamera(43, 16 / 9, 0.1, 100)
  camera.position
    .copy(target)
    .add(new Vector3(arrival.offset[0], arrival.offset[1], arrival.offset[2]))
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

function countCubeletsOverText(assembly, camera) {
  const position = new Vector3()
  let overlapCount = 0

  for (let index = 0; index < assembly.motions.length; index += 1) {
    assembly
      .getPosition(index, position)
      .multiplyScalar(DESKTOP_SCENE_SCALE)
    position.x += ASSEMBLY_X
    position.project(camera)

    if (
      position.x >= TEXT_SAFE_AREA.minX &&
      position.x <= TEXT_SAFE_AREA.maxX &&
      position.y >= TEXT_SAFE_AREA.minY &&
      position.y <= TEXT_SAFE_AREA.maxY
    ) {
      overlapCount += 1
    }
  }

  return overlapCount
}

test('desktop arrival camera keeps the early assembly swarm outside the text column', () => {
  const assembly = new LayeredAssembly()
  const camera = createArrivalCamera()

  for (const sampleTime of [0, 0.3, 0.6, 0.8]) {
    while (assembly.time < sampleTime) {
      assembly.update(Math.min(1 / 20, sampleTime - assembly.time))
    }

    assert.equal(
      countCubeletsOverText(assembly, camera),
      0,
      `assembly time ${sampleTime}s overlaps the desktop text safe area`,
    )
  }
})
