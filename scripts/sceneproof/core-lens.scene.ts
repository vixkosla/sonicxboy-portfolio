import {
  Box3,
  Color,
  InstancedMesh,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  defineThreeFixture,
  type ThreeFixtureContext,
} from 'sceneproof/three'

import {
  createPlasmaMaterial,
  PLASMA_GEOMETRY,
  PLASMA_RADIUS,
  updatePlasmaMaterial,
} from '../../src/lib/FireEffect.ts'
import { computePlasmaScale } from '../../src/lib/plasmaIgnitionScale.ts'
import {
  applyCoreLensInstanceTransform,
  computeCoreLensState,
  CORE_LENS_LOCAL_OFFSETS,
} from '../../src/lib/coreLensLayout.ts'
import {
  createCoreLensMaterial,
  createCoreLensTexture,
  setCoreLensCapture,
  updateCoreLensMaterial,
} from '../../src/lib/CoreLensMaterial.ts'
import { CUBE_SIZE } from '../../src/lib/LayeredAssembly.ts'

// Matches HeroScene.tsx's own bevel radius for the same RoundedBoxGeometry
// (`CUBE_EDGE_RADIUS`, src/components/HeroScene.tsx). Not re-exported from
// there because that file pulls in the full r3f/React component tree; this
// is a small enough literal to keep in sync by hand.
const CUBE_EDGE_RADIUS = 0.0225

// Isolates the real core-lens refractive voxels (unchanged production
// material/layout formula from src/lib/CoreLensMaterial.ts and
// src/lib/coreLensLayout.ts) with the real plasma nucleus behind them as
// refraction content - the lens only reads as anything against real
// background detail, an empty void refracts to another empty void. Does not
// reproduce the cube swarm, camera dolly, or reactor-phase choreography.
type Props = {
  finalExpandProgress?: number
  compact?: boolean
}

export const createCoreLensEvidence = defineThreeFixture(
  (context: ThreeFixtureContext<Props>) => {
    const finalExpandProgress = context.props.finalExpandProgress ?? 0
    const compact = context.props.compact ?? false

    const scene = new Scene()
    scene.background = new Color('#050907')
    const camera = new PerspectiveCamera(
      45,
      context.width / context.height,
      0.05,
      100,
    )
    camera.position.set(0, 0.06, 1.0)
    camera.lookAt(0, 0, 0)

    const plasmaMaterial = createPlasmaMaterial()
    const plasmaMesh = new Mesh(PLASMA_GEOMETRY, plasmaMaterial)
    scene.add(plasmaMesh)

    const cubeletGeometry = mergeVertices(
      new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 1, CUBE_EDGE_RADIUS),
    )
    const captureSize = compact ? 256 : 512
    const lensTexture = createCoreLensTexture(captureSize)
    const lensMaterial = createCoreLensMaterial(lensTexture, captureSize)
    const lensMesh = new InstancedMesh(
      cubeletGeometry,
      lensMaterial,
      CORE_LENS_LOCAL_OFFSETS.length,
    )
    lensMesh.renderOrder = 3
    lensMesh.frustumCulled = false
    scene.add(lensMesh)

    const worldCenter = new Vector3(0, 0, 0)
    const plasmaWorldRadii = new Vector3()
    const transform = new Object3D()
    const drawingBufferSize = new Vector2()
    const captureOrigin = new Vector2()
    const projectedCenter = new Vector3()

    // Same capture pattern as HeroScene.tsx: copy the framebuffer square
    // behind the lens cluster immediately before it draws.
    lensMesh.onBeforeRender = (renderer, _scene, cam) => {
      renderer.getDrawingBufferSize(drawingBufferSize)
      projectedCenter.copy(worldCenter).project(cam)
      const centerX =
        (projectedCenter.x * 0.5 + 0.5) * drawingBufferSize.x
      const centerY =
        (projectedCenter.y * 0.5 + 0.5) * drawingBufferSize.y
      const maxX = Math.max(0, drawingBufferSize.x - captureSize)
      const maxY = Math.max(0, drawingBufferSize.y - captureSize)
      captureOrigin.set(
        Math.round(Math.min(maxX, Math.max(0, centerX - captureSize * 0.5))),
        Math.round(Math.min(maxY, Math.max(0, centerY - captureSize * 0.5))),
      )
      setCoreLensCapture(
        lensMaterial,
        captureOrigin.x,
        captureOrigin.y,
        captureSize,
      )
      renderer.copyFramebufferToTexture(lensTexture, captureOrigin)
    }

    function seek(timeMs: number) {
      const mainElapsed = timeMs / 1000
      const plasmaState = computePlasmaScale(mainElapsed, finalExpandProgress)
      const baseRadius = PLASMA_RADIUS * plasmaState.plasmaRadialScale
      plasmaMesh.position.set(
        0,
        PLASMA_RADIUS *
          (plasmaState.plasmaProxyVerticalScale -
            plasmaState.plasmaProxyRadialScale),
        0,
      )
      plasmaMesh.scale.set(
        plasmaState.plasmaProxyRadialScale,
        plasmaState.plasmaProxyVerticalScale,
        plasmaState.plasmaProxyRadialScale,
      )
      plasmaWorldRadii.setScalar(baseRadius)
      updatePlasmaMaterial(
        plasmaMaterial,
        mainElapsed,
        plasmaState.plasmaOpacity,
        plasmaState.coreProgress,
        plasmaState.warmProgress,
        plasmaState.rimProgress,
        worldCenter,
        plasmaWorldRadii,
        // Same production formula as HeroScene.tsx.
        plasmaState.plasmaExpansion,
        compact,
      )

      const lensState = computeCoreLensState(
        mainElapsed,
        finalExpandProgress,
        plasmaState.warmProgress,
        plasmaState.rimProgress,
        compact,
        mainElapsed,
      )
      lensMesh.visible = lensState.visible
      if (lensState.visible) {
        for (let index = 0; index < CORE_LENS_LOCAL_OFFSETS.length; index += 1) {
          applyCoreLensInstanceTransform(
            index,
            transform,
            worldCenter,
            1,
            lensState,
          )
          lensMesh.setMatrixAt(index, transform.matrix)
        }
        lensMesh.instanceMatrix.needsUpdate = true
        updateCoreLensMaterial(
          lensMaterial,
          lensState.time,
          lensState.strength,
          lensState.opacity,
        )
      } else {
        updateCoreLensMaterial(lensMaterial, 0, 0, 0)
      }
    }

    seek(8200)

    return {
      scene,
      camera,
      ready: Promise.resolve(),
      seek,
      targets: [
        {
          id: 'core-lens',
          label: 'Core lens refractive voxels',
          members: [{ object: lensMesh }],
          context: [{ object: plasmaMesh }],
          bounds: () => new Box3().setFromObject(lensMesh),
          focus: () => lensMesh.getWorldPosition(new Vector3()),
        },
      ],
      dispose: () => {
        plasmaMaterial.dispose()
        lensMaterial.dispose()
        lensTexture.dispose()
        cubeletGeometry.dispose()
      },
    }
  },
)
