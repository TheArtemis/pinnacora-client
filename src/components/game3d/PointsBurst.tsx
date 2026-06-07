import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MathUtils,
  SRGBColorSpace,
  type Group,
  type MeshBasicMaterial,
} from 'three'

type PointsBurstProps = {
  points: number
  position: [number, number, number]
  onComplete: () => void
}

const durationSeconds = 1.35
const pointsTextureCache = new Map<string, CanvasTexture>()

function createPointsTexture(label: string) {
  const cachedTexture = pointsTextureCache.get(label)

  if (cachedTexture) {
    return cachedTexture
  }

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256

  const context = canvas.getContext('2d')

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = '900 112px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.shadowColor = 'rgba(17, 24, 39, 0.18)'
    context.shadowBlur = 10
    context.shadowOffsetY = 5
    context.lineWidth = 16
    context.strokeStyle = '#ffffff'
    context.strokeText(label, canvas.width / 2, canvas.height / 2)
    context.fillStyle = '#2563eb'
    context.fillText(label, canvas.width / 2, canvas.height / 2)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  pointsTextureCache.set(label, texture)

  return texture
}

export default function PointsBurst({ points, position, onComplete }: PointsBurstProps) {
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const elapsedSecondsRef = useRef(0)
  const hasCompletedRef = useRef(false)
  const label = `+${points}`
  const texture = useMemo(() => createPointsTexture(label), [label])

  useEffect(() => {
    elapsedSecondsRef.current = 0
    hasCompletedRef.current = false
  }, [texture])

  useFrame(({ camera }, delta) => {
    if (!groupRef.current || !materialRef.current) {
      return
    }

    elapsedSecondsRef.current += delta
    const progress = Math.min(elapsedSecondsRef.current / durationSeconds, 1)
    const lift = MathUtils.smoothstep(progress, 0, 1) * 1.25
    const fade = 1 - MathUtils.smoothstep(progress, 0.58, 1)
    const scale = 0.86 + Math.sin(progress * Math.PI) * 0.2

    groupRef.current.position.set(position[0], position[1] + lift, position[2])
    groupRef.current.quaternion.copy(camera.quaternion)
    groupRef.current.rotateZ(progress * Math.PI * 1.4)
    groupRef.current.scale.setScalar(scale)
    materialRef.current.opacity = fade

    if (progress >= 1 && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      onComplete()
    }
  })

  return (
    <group ref={groupRef} position={position} renderOrder={220}>
      <mesh>
        <planeGeometry args={[1.82, 0.92]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
