import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three'
import { devMode } from '../../config/dev'

const DEV_OUTLINE_COLOR = '#f97316'
const DEV_OUTLINE_RENDER_ORDER = 10000

function createPlaneOutlineGeometry(width: number, height: number) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const vertices = new Float32Array([
    -halfWidth, -halfHeight, 0, halfWidth, -halfHeight, 0,
    halfWidth, -halfHeight, 0, halfWidth, halfHeight, 0,
    halfWidth, halfHeight, 0, -halfWidth, halfHeight, 0,
    -halfWidth, halfHeight, 0, -halfWidth, -halfHeight, 0,
  ])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  return geometry
}

function createBoxOutlineGeometry(width: number, height: number, depth: number) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const halfDepth = depth / 2
  const vertices = new Float32Array([
    -halfWidth, -halfHeight, -halfDepth, halfWidth, -halfHeight, -halfDepth,
    halfWidth, -halfHeight, -halfDepth, halfWidth, halfHeight, -halfDepth,
    halfWidth, halfHeight, -halfDepth, -halfWidth, halfHeight, -halfDepth,
    -halfWidth, halfHeight, -halfDepth, -halfWidth, -halfHeight, -halfDepth,
    -halfWidth, -halfHeight, halfDepth, halfWidth, -halfHeight, halfDepth,
    halfWidth, -halfHeight, halfDepth, halfWidth, halfHeight, halfDepth,
    halfWidth, halfHeight, halfDepth, -halfWidth, halfHeight, halfDepth,
    -halfWidth, halfHeight, halfDepth, -halfWidth, -halfHeight, halfDepth,
    -halfWidth, -halfHeight, -halfDepth, -halfWidth, -halfHeight, halfDepth,
    halfWidth, -halfHeight, -halfDepth, halfWidth, -halfHeight, halfDepth,
    halfWidth, halfHeight, -halfDepth, halfWidth, halfHeight, halfDepth,
    -halfWidth, halfHeight, -halfDepth, -halfWidth, halfHeight, halfDepth,
  ])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  return geometry
}

type DevOutlineProps = {
  width: number
  height: number
  depth?: number
  color?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export default function DevOutline({
  width,
  height,
  depth,
  color = DEV_OUTLINE_COLOR,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: DevOutlineProps) {
  const { geometry, material } = useMemo(() => {
    const geometry = depth === undefined
      ? createPlaneOutlineGeometry(width, height)
      : createBoxOutlineGeometry(width, height, depth)
    const material = new LineBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    })

    return { geometry, material }
  }, [width, height, depth, color])

  if (!devMode) {
    return null
  }

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      renderOrder={DEV_OUTLINE_RENDER_ORDER}
      raycast={() => null}
    />
  )
}
