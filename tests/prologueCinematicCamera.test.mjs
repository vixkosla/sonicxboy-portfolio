import assert from 'node:assert/strict'
import test from 'node:test'

import { PerspectiveCamera, Quaternion, Vector3 } from 'three'

import { CUBE_SIZE, LayeredAssembly } from '../src/lib/LayeredAssembly.ts'
import {
  PROLOGUE_TIMES,
  PrologueSequence,
} from '../src/lib/PrologueSequence.ts'

const CAMERA_FOV = 43
const PROJECTED_MARGIN = 0.97
const IDENTITY_ORIENTATION = new Quaternion()
const MATCHED_VIEWPORTS = [
  {
    label: 'desktop',
    aspect: 16 / 9,
    screenRight: 0.48,
    frameFraction: 0.9,
    matchCameraOffset: [3.6 / 1.3, 3.4 / 1.3, 7.2 / 1.3],
    matchTargetOffset: [0, 0, 0],
    handoffCameraPosition: [-8 / 1.3, 8 / 1.3, 24 / 1.3],
    handoffCameraTarget: [-16 / 1.3, 0, 0],
  },
  {
    label: 'portrait',
    aspect: 390 / 844,
    screenRight: 0.02,
    frameFraction: 0.86,
    matchCameraOffset: [-2.7 / 0.82, 1.5 / 0.82, 4.6 / 0.82],
    matchTargetOffset: [0, 0.44 / 0.82, 0],
    handoffCameraPosition: [2.6 / 0.82, 2.38 / 0.82, 4.4 / 0.82],
    handoffCameraTarget: [0, 0.58 / 0.82, 0],
  },
]

function createCamera(sequence, aspect) {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 100)
  camera.position.copy(sequence.cameraPosition)
  camera.lookAt(sequence.cameraTarget)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

function assertMorphVolumesInsideFrame(sequence, aspect, label) {
  const camera = createCamera(sequence, aspect)
  const localCorner = new Vector3()
  const projected = new Vector3()
  const halfSize = CUBE_SIZE * 0.5

  sequence.fragmentPositions.forEach((position, index) => {
    const fragmentScale = sequence.fragmentScales[index]
    const crystalScale = sequence.fragmentCrystalScales[index]

    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        for (const z of [-1, 1]) {
          if (fragmentScale > 0.001) {
            localCorner
              .set(x, y, z)
              .multiplyScalar(halfSize * fragmentScale)
              .applyQuaternion(sequence.fragmentOrientations[index])
              .add(position)
            projected.copy(localCorner).project(camera)
            assert.ok(
              Math.abs(projected.x) < PROJECTED_MARGIN &&
                Math.abs(projected.y) < PROJECTED_MARGIN,
              `${label}: rigid fragment ${index} corner projected to ${projected.toArray()}`,
            )
          }

          if (crystalScale > 0.001) {
            localCorner
              .set(x, y, z)
              .multiplyScalar(halfSize * crystalScale)
              .add(position)
            projected.copy(localCorner).project(camera)
            assert.ok(
              Math.abs(projected.x) < PROJECTED_MARGIN &&
                Math.abs(projected.y) < PROJECTED_MARGIN,
              `${label}: crystal fragment ${index} corner projected to ${projected.toArray()}`,
            )
          }
        }
      }
    }
  })
}

test('prologue hands every rigid descendant off at its exact assembly start', () => {
  const prologue = new PrologueSequence()
  const assembly = new LayeredAssembly()
  const assemblyPosition = new Vector3()

  prologue.seek(PROLOGUE_TIMES.end)
  prologue.fragmentPositions.forEach((position, index) => {
    assembly.getPosition(index, assemblyPosition)
    assert.ok(
      position.distanceTo(assemblyPosition) < 1e-9,
      `fragment ${index} breaks spatial lineage`,
    )
    assert.equal(prologue.fragmentScales[index], 0)
    assert.equal(prologue.fragmentCrystalScales[index], 1)
  })
})

for (const viewport of MATCHED_VIEWPORTS) {
  test(`${viewport.label} follow rig retains the divided travelling cube`, () => {
    const prologue = new PrologueSequence(viewport)

    for (const time of [PROLOGUE_TIMES.rubik, 6.3, 7.2]) {
      prologue.seek(time)
      assertMorphVolumesInsideFrame(
        prologue,
        viewport.aspect,
        `prologue ${time}s`,
      )
    }
  })
}

test('opening solid cube is held at close third-person distance', () => {
  const prologue = new PrologueSequence()
  prologue.seek(PROLOGUE_TIMES.monolith)

  const distance = prologue.cameraPosition.distanceTo(prologue.heroPosition)
  assert.ok(distance > 4.8 && distance < 6.8, `monolith distance was ${distance}`)
  assert.ok(prologue.heroScale > 0.95)
})

test('the long move preserves perfectly rigid cube proportions', () => {
  const prologue = new PrologueSequence()

  assert.ok(PROLOGUE_TIMES.end >= 9)

  prologue.seek(2.15)
  assert.equal(prologue.heroScale, 1)

  prologue.seek(7.2)
  assert.ok(prologue.fragmentScales.every((scale) => scale === 1))
})

test('molten contour traverses the solid surface before breakup', () => {
  const prologue = new PrologueSequence()

  prologue.seek(PROLOGUE_TIMES.subdivide - 0.01)
  assert.equal(prologue.surfaceSweepProgress, -0.08)

  prologue.seek(
    (PROLOGUE_TIMES.subdivide + PROLOGUE_TIMES.rubik) * 0.5,
  )
  assert.ok(
    prologue.surfaceSweepProgress > 0.45 &&
      prologue.surfaceSweepProgress < 0.55,
  )

  prologue.seek(PROLOGUE_TIMES.rubik)
  assert.ok(prologue.surfaceSweepProgress > 1)
})

for (const matchedShot of MATCHED_VIEWPORTS) {
  test(`${matchedShot.label} breakup and reassembly frames are identical`, () => {
    const prologue = new PrologueSequence(matchedShot)
    const assembly = new LayeredAssembly()
    const rubikCenter = new Vector3()

    prologue.seek(PROLOGUE_TIMES.rubik)
    prologue.fragmentPositions.forEach((position) => rubikCenter.add(position))
    rubikCenter.multiplyScalar(1 / prologue.fragmentPositions.length)

    const initialCamera = createCamera(prologue, matchedShot.aspect)
    const finalCamera = new PerspectiveCamera(
      CAMERA_FOV,
      matchedShot.aspect,
      0.1,
      100,
    )
    const finalTarget = new Vector3(...matchedShot.matchTargetOffset)
    finalCamera.position
      .copy(finalTarget)
      .add(new Vector3(...matchedShot.matchCameraOffset))
    finalCamera.lookAt(finalTarget)
    finalCamera.updateMatrixWorld(true)
    finalCamera.updateProjectionMatrix()

    const initialProjection = new Vector3()
    const finalProjection = new Vector3()
    const relativePosition = new Vector3()

    prologue.fragmentPositions.forEach((position, index) => {
      const finalPosition = assembly.motions[index].target
      relativePosition.copy(position).sub(rubikCenter)
      assert.ok(relativePosition.distanceTo(finalPosition) < 1e-9)
      assert.ok(
        prologue.fragmentOrientations[index].angleTo(IDENTITY_ORIENTATION) <
          1e-9,
      )
      assert.equal(prologue.fragmentScales[index], 1)

      initialProjection.copy(position).project(initialCamera)
      finalProjection.copy(finalPosition).project(finalCamera)
      assert.ok(
        initialProjection.distanceTo(finalProjection) < 1e-9,
        `fragment ${index} does not preserve the matched shot`,
      )
    })

    prologue.seek(PROLOGUE_TIMES.end)
    assert.equal(prologue.handoffProgress, 1)
    assert.ok(
      prologue.cameraPosition.distanceTo(
        new Vector3(...matchedShot.handoffCameraPosition),
      ) < 1e-9,
    )
    assert.ok(
      prologue.cameraTarget.distanceTo(
        new Vector3(...matchedShot.handoffCameraTarget),
      ) < 1e-9,
    )
  })
}
