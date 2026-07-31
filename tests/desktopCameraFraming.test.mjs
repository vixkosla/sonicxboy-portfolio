import assert from 'node:assert/strict'
import test from 'node:test'

import { PerspectiveCamera, Vector3 } from 'three'

import {
  ASSEMBLY_TIME_SCALE,
  CUBE_SIZE,
  LayeredAssembly,
} from '../src/lib/LayeredAssembly.ts'
import { MobileCameraStory } from '../src/lib/MobileCameraStory.ts'
import {
  CORNER_LIFT_DURATION,
  EDGE_ROLL_DURATION,
  MAIN_SPIN_START,
} from '../src/lib/SpinSimulation.ts'
import {
  DESKTOP_ASSEMBLY_POINTS,
  DESKTOP_ASSEMBLY_LEAD_START,
  DESKTOP_ASSEMBLY_LEAD_SETTLE_PROGRESS,
  DESKTOP_MOTION_POINTS,
  desktopAssemblyLeadRemaining,
} from '../src/lib/desktopCameraPoints.ts'
import { SPACETIME_DATA } from '../src/lib/trajectoryData.ts'

const ASSEMBLY_X = 1.2
const DESKTOP_SCENE_SCALE = 1.3
const SETTLED_X = 3.1864
const CAMERA_FOV = 43
const CAMERA_ASPECT = 16 / 9
const CUBELET_HALF_EXTENT = CUBE_SIZE * DESKTOP_SCENE_SCALE * 0.5
const ASSEMBLY_SAMPLES = [
  0, 0.1, 0.18, 0.28, 0.36, 0.46, 0.55, 0.64, 0.74, 0.82, 0.9, 1,
]
const TEXT_SAFE_AREA = {
  minX: -0.86,
  maxX: 0.12,
  minY: -0.65,
  maxY: 0.43,
}
const DUMMY_TIMINGS = {
  roll: EDGE_ROLL_DURATION,
  diamond: MAIN_SPIN_START,
  spin: MAIN_SPIN_START + 0.55,
  orbit: 4.51,
  ignition: 6,
  capture: 8,
  shell: 10,
  reactor: 12,
  division: 13,
  inversion: 15,
  handoff: 15.6,
}

function createStory() {
  return new MobileCameraStory({
    assemblyX: ASSEMBLY_X,
    settledX: SETTLED_X,
    timings: DUMMY_TIMINGS,
    assemblyPoints: DESKTOP_ASSEMBLY_POINTS,
    motionPoints: DESKTOP_MOTION_POINTS,
    driftEnabled: false,
  })
}

function createCamera(position, target) {
  const camera = new PerspectiveCamera(
    CAMERA_FOV,
    CAMERA_ASPECT,
    0.1,
    100,
  )
  camera.position.copy(position)
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

function projectedCubeBounds(center, camera) {
  const corner = new Vector3()
  const projected = new Vector3()
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  }

  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corner
          .set(
            x * CUBELET_HALF_EXTENT,
            y * CUBELET_HALF_EXTENT,
            z * CUBELET_HALF_EXTENT,
          )
          .add(center)
        projected.copy(corner).project(camera)
        bounds.minX = Math.min(bounds.minX, projected.x)
        bounds.maxX = Math.max(bounds.maxX, projected.x)
        bounds.minY = Math.min(bounds.minY, projected.y)
        bounds.maxY = Math.max(bounds.maxY, projected.y)
        bounds.minZ = Math.min(bounds.minZ, projected.z)
        bounds.maxZ = Math.max(bounds.maxZ, projected.z)
      }
    }
  }

  return bounds
}

function intersects(a, b) {
  return (
    a.maxX >= b.minX &&
    a.minX <= b.maxX &&
    a.maxY >= b.minY &&
    a.minY <= b.maxY &&
    a.maxZ >= -1 &&
    a.minZ <= 1
  )
}

test('desktop assembly launches beyond the right edge and stays clear of the copy', () => {
  const assembly = new LayeredAssembly()
  const story = createStory()
  const localPosition = new Vector3()
  const worldPosition = new Vector3()
  const groupPosition = new Vector3()

  for (const progress of ASSEMBLY_SAMPLES) {
    assembly.time = assembly.endTime * progress
    story.sampleClock('assembly', progress)
    const camera = createCamera(story.position, story.target)
    const leadRemaining = desktopAssemblyLeadRemaining(progress)
    groupPosition.set(
      ASSEMBLY_X + DESKTOP_ASSEMBLY_LEAD_START[0] * leadRemaining,
      DESKTOP_ASSEMBLY_LEAD_START[1] * leadRemaining,
      DESKTOP_ASSEMBLY_LEAD_START[2] * leadRemaining,
    )
    let visibleMovingCubelets = 0

    for (let index = 0; index < assembly.motions.length; index += 1) {
      assembly.getPosition(index, localPosition)
      worldPosition
        .copy(localPosition)
        .multiplyScalar(DESKTOP_SCENE_SCALE)
        .add(groupPosition)
      const bounds = projectedCubeBounds(worldPosition, camera)

      assert.equal(
        intersects(bounds, TEXT_SAFE_AREA),
        false,
        `cubelet ${index} overlaps the copy at assembly progress ${progress}`,
      )

      if (
        bounds.maxX >= -1 &&
        bounds.minX <= 1 &&
        bounds.maxY >= -1 &&
        bounds.minY <= 1 &&
        bounds.maxZ >= -1 &&
        bounds.minZ <= 1
      ) {
        visibleMovingCubelets += 1
      }
    }

    if (progress === 0) {
      assert.equal(
        visibleMovingCubelets,
        0,
        'all moving cubelets should begin beyond the right edge during the lead entrance beat',
      )
      const seedBounds = projectedCubeBounds(
        groupPosition,
        camera,
      )
      const seedCentreX = (seedBounds.minX + seedBounds.maxX) * 0.5
      const seedCentreY = (seedBounds.minY + seedBounds.maxY) * 0.5
      const seedHeight = seedBounds.maxY - seedBounds.minY
      assert.ok(
        seedBounds.minX > 1,
        `the lead cube should begin beyond the right edge: x=${seedCentreX}`,
      )
      assert.ok(
        Math.abs(seedCentreY) < 0.08,
        `the lead cube should retain the original arrival height: y=${seedCentreY}`,
      )
      assert.ok(
        seedHeight >= 0.12 && seedHeight <= 0.22,
        `the lead cube should retain the original arrival scale: height=${seedHeight}`,
      )
    }
  }
})

test('desktop lead cube drives horizontally from the right and brakes progressively', () => {
  const story = createStory()
  const seedPosition = new Vector3()

  const boundsAt = (progress) => {
    story.sampleClock('assembly', progress)
    const leadRemaining = desktopAssemblyLeadRemaining(progress)
    seedPosition.set(
      ASSEMBLY_X + DESKTOP_ASSEMBLY_LEAD_START[0] * leadRemaining,
      DESKTOP_ASSEMBLY_LEAD_START[1] * leadRemaining,
      DESKTOP_ASSEMBLY_LEAD_START[2] * leadRemaining,
    )
    return projectedCubeBounds(
      seedPosition,
      createCamera(story.position, story.target),
    )
  }

  const edgeEntry = boundsAt(0.13)
  assert.ok(
    edgeEntry.minX < 1 && edgeEntry.maxX > 1,
    `edge-entry bounds should straddle the right edge: ${JSON.stringify(edgeEntry)}`,
  )
  assert.ok(edgeEntry.minY < 0 && edgeEntry.maxY > 0)

  const fullyEntered = boundsAt(0.16)
  assert.ok(fullyEntered.maxX < 1)
  assert.ok(fullyEntered.minY < 0 && fullyEntered.maxY > 0)

  const preEntry = boundsAt(0.1)
  const preEntryCentreX = (preEntry.minX + preEntry.maxX) * 0.5
  const enteredCentreX = (fullyEntered.minX + fullyEntered.maxX) * 0.5
  assert.ok(
    preEntryCentreX - enteredCentreX > 0.45,
    `the lead should cross a large horizontal distance quickly: ${preEntryCentreX} -> ${enteredCentreX}`,
  )

  const samples = [0, 0.06, 0.12, 0.18, 0.24].map(
    desktopAssemblyLeadRemaining,
  )
  const intervalTravel = samples.slice(0, -1).map(
    (remaining, index) => remaining - samples[index + 1],
  )
  for (let index = 1; index < intervalTravel.length; index += 1) {
    assert.ok(
      intervalTravel[index] < intervalTravel[index - 1],
      `lead travel should decelerate: ${intervalTravel.join(', ')}`,
    )
  }

  assert.equal(
    desktopAssemblyLeadRemaining(DESKTOP_ASSEMBLY_LEAD_SETTLE_PROGRESS),
    0,
  )
  assert.equal(desktopAssemblyLeadRemaining(1), 0)
})

test('desktop assembly uses one continuous arrival-to-lock camera move', () => {
  assert.deepEqual(
    DESKTOP_ASSEMBLY_POINTS.map(({ id }) => id),
    ['arrival', 'lock'],
  )
  assert.equal(DESKTOP_ASSEMBLY_POINTS[0].target[0], 4.8)
  assert.equal(DESKTOP_ASSEMBLY_POINTS[1].target[0], 3.1)
  assert.equal(DESKTOP_ASSEMBLY_POINTS[1].move, 1)

  const story = createStory()
  const seed = new Vector3(ASSEMBLY_X, 0, 0)
  story.sampleClock('assembly', 0)
  const startX = seed
    .clone()
    .project(createCamera(story.position, story.target)).x
  story.sampleClock('assembly', 1)
  const lockX = seed
    .clone()
    .project(createCamera(story.position, story.target)).x

  assert.ok(
    startX - lockX > 0.08,
    `the seed should travel left in screen space: ${startX} -> ${lockX}`,
  )
})

test('accelerated assembly is a uniform spacetime compression', () => {
  const assembly = new LayeredAssembly()

  assert.ok(assembly.endTime > 4.3 && assembly.endTime < 4.4)
  for (let index = 0; index < assembly.motions.length; index += 1) {
    assert.ok(
      Math.abs(
        assembly.motions[index].delay -
          SPACETIME_DATA[index][0] * ASSEMBLY_TIME_SCALE,
      ) < 1e-12,
    )
    assert.ok(
      Math.abs(
        assembly.motions[index].duration -
          SPACETIME_DATA[index][1] * ASSEMBLY_TIME_SCALE,
      ) < 1e-12,
    )
  }
})

test('uniformly accelerated cubelets retain collision clearance', () => {
  const assembly = new LayeredAssembly()
  const positions = assembly.motions.map(() => new Vector3())
  let minimumClearance = Number.POSITIVE_INFINITY
  const frames = Math.ceil(assembly.endTime * 600)

  for (let frame = 0; frame <= frames; frame += 1) {
    assembly.time = Math.min(assembly.endTime, frame / 600)
    for (let index = 0; index < positions.length; index += 1) {
      assembly.getPosition(index, positions[index])
    }
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const axisClearance = Math.max(
          Math.abs(positions[first].x - positions[second].x),
          Math.abs(positions[first].y - positions[second].y),
          Math.abs(positions[first].z - positions[second].z),
        ) - CUBE_SIZE
        minimumClearance = Math.min(minimumClearance, axisClearance)
        assert.ok(
          axisClearance >= 0,
          `cubelets ${first}/${second} collide at t=${assembly.time}`,
        )
      }
    }
  }

  assert.ok(minimumClearance > 0.005)
})

test('roll and corner-lift camera moves share the exact object phase boundaries', () => {
  const story = createStory()
  const roll = story.findPoint('roll')
  const diamond = story.findPoint('diamond')

  assert.ok(roll)
  assert.ok(diamond)
  assert.equal(roll.at - roll.move, 0)
  assert.equal(roll.at, EDGE_ROLL_DURATION)
  assert.ok(
    Math.abs(diamond.at - diamond.move - EDGE_ROLL_DURATION) < 1e-12,
  )
  assert.equal(diamond.at, MAIN_SPIN_START)
  assert.equal(diamond.move, CORNER_LIFT_DURATION)
})

test('spin camera uses a reverse-flank isometric direction', () => {
  const story = createStory()
  const spin = story.findPoint('spin')

  assert.ok(spin)
  assert.ok(spin.offset.x < 0)
  assert.ok(spin.offset.y > 0)
  assert.ok(spin.offset.z < 0)
  assert.ok(Math.abs(Math.abs(spin.offset.x) - spin.offset.y) < 1e-12)
  assert.ok(Math.abs(spin.offset.y - Math.abs(spin.offset.z)) < 1e-12)
})

test('reactor overview hands off continuously to the final positive-flank rig', () => {
  const story = createStory()
  const overview = story.findPoint('overview')
  const handoff = story.findPoint('handoff')
  assert.ok(overview)
  assert.ok(handoff)
  assert.ok(Math.abs(overview.offset.x - overview.offset.y) < 1e-12)
  assert.ok(Math.abs(overview.offset.y - overview.offset.z) < 1e-12)
  assert.ok(handoff.offset.x > 0)
  assert.ok(handoff.offset.y > 0)
  assert.ok(handoff.offset.z > 0)
  assert.ok(Math.abs(handoff.at - handoff.move - overview.at) < 1e-12)
})

test('handoff reaches final size without a later idle camera point', () => {
  const story = createStory()
  const overview = story.findPoint('overview')
  const handoff = story.findPoint('handoff')

  assert.ok(overview)
  assert.ok(handoff)
  assert.equal(story.findPoint('final-idle'), null)
  assert.ok(handoff.distance < overview.distance * 0.75)
  assert.ok(Math.abs(handoff.target.x - 0.6) < 1e-12)
  assert.equal(handoff.target.y, 0)
  assert.equal(handoff.target.z, 0)
})

test('desktop hero centres stay in the open right field while azimuth returns monotonically to handoff', () => {
  const story = createStory()
  const subject = new Vector3()
  const projected = new Vector3()
  let previousAzimuth = Number.POSITIVE_INFINITY
  let spinReached = false

  for (const point of story.motionPoints) {
    story.samplePoint(point)
    const camera = createCamera(story.position, story.target)
    subject.set(
      point.id === 'weight' ? ASSEMBLY_X : SETTLED_X,
      point.id === 'weight' ? 0 : 0.72,
      0,
    )
    projected.copy(subject).project(camera)

    assert.ok(
      projected.x >= 0.25 && projected.x <= 0.6,
      `${point.id} subject centre leaves the open right field at NDC x=${projected.x}`,
    )
    assert.ok(
      projected.y >= -0.25 && projected.y <= 0.25,
      `${point.id} subject centre leaves the vertical safe band at NDC y=${projected.y}`,
    )

    if (point.id === 'spin') spinReached = true
    if (!spinReached) continue

    const rawAzimuth = Math.atan2(point.offset.x, point.offset.z)
    const azimuth = rawAzimuth < 0 ? rawAzimuth + Math.PI * 2 : rawAzimuth
    assert.ok(
      azimuth <= previousAzimuth + 1e-12,
      `${point.id} reverses the clockwise return arc`,
    )
    previousAzimuth = azimuth
  }
})
