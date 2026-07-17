declare module 'three/examples/jsm/geometries/RoundedBoxGeometry.js' {
  import { BoxGeometry } from 'three'

  export class RoundedBoxGeometry extends BoxGeometry {
    constructor(
      width?: number,
      height?: number,
      depth?: number,
      segments?: number,
      radius?: number,
    )
  }
}

declare module 'three/examples/jsm/utils/BufferGeometryUtils.js' {
  import { BufferGeometry } from 'three'

  export function mergeVertices<T extends BufferGeometry>(
    geometry: T,
    tolerance?: number,
  ): T
}
