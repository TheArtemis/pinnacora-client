import { DoubleSide, MathUtils, type Mesh, type MeshStandardMaterial } from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Card as CardType } from '../../game/cardTypes'
import { getCardBackTexture, getCardFaceTexture } from './cardTextures'

export const CARD_WIDTH = 1.84
export const CARD_HEIGHT = 2.64

type CardMeshProps = {
  card?: CardType
  hidden?: boolean
  selected?: boolean
  hovered?: boolean
  position: [number, number, number]
  rotation?: [number, number, number]
  animateFrom?: [number, number, number]
  opacity?: number
  scale?: number
  renderOrder?: number
  layerOnTop?: boolean
  onClick?: () => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}

export default function CardMesh({
  card,
  hidden = false,
  selected = false,
  hovered = false,
  position,
  rotation = [0, 0, 0],
  animateFrom,
  opacity = 1,
  scale = 1,
  renderOrder = 0,
  layerOnTop = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: CardMeshProps) {
  const [initialPosition] = useState<[number, number, number]>(() => animateFrom ?? position)
  const [initialRotation] = useState<[number, number, number]>(() => rotation)
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const texture = hidden || !card ? getCardBackTexture() : getCardFaceTexture(card)
  const lift = selected ? (hovered ? 0.22 : 0.12) : hovered ? 0.18 : 0
  const animateFromKey = animateFrom?.join(',') ?? ''

  useEffect(() => {
    if (!meshRef.current || !animateFromKey) {
      return
    }

    const [x = 0, y = 0, z = 0] = animateFromKey.split(',').map(Number)
    meshRef.current.position.set(x, y, z)
    meshRef.current.scale.setScalar(0.72)

    if (materialRef.current) {
      materialRef.current.opacity = 0
    }
  }, [animateFromKey])

  useFrame((_, delta) => {
    if (!meshRef.current) {
      return
    }

    meshRef.current.position.x = MathUtils.damp(meshRef.current.position.x, position[0], 10, delta)
    meshRef.current.position.y = MathUtils.damp(meshRef.current.position.y, position[1] + lift, 18, delta)
    meshRef.current.position.z = MathUtils.damp(meshRef.current.position.z, position[2], 10, delta)
    meshRef.current.rotation.x = MathUtils.damp(meshRef.current.rotation.x, rotation[0], 10, delta)
    meshRef.current.rotation.y = MathUtils.damp(meshRef.current.rotation.y, rotation[1], 10, delta)
    meshRef.current.rotation.z = MathUtils.damp(meshRef.current.rotation.z, rotation[2], 10, delta)
    const nextScale = MathUtils.damp(meshRef.current.scale.x, scale, 10, delta)
    meshRef.current.scale.setScalar(nextScale)

    if (materialRef.current) {
      materialRef.current.opacity = MathUtils.damp(materialRef.current.opacity, opacity, 12, delta)
    }
  })

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onClick?.()
  }

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    onPointerOver?.()
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    onPointerOut?.()
  }

  return (
    <mesh
      ref={meshRef}
      position={initialPosition}
      rotation={initialRotation}
      renderOrder={renderOrder}
      onClick={onClick ? handleClick : undefined}
      onPointerOver={onPointerOver ? handlePointerOver : undefined}
      onPointerOut={onPointerOut ? handlePointerOut : undefined}
    >
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <meshStandardMaterial
        ref={materialRef}
        map={texture}
        side={DoubleSide}
        roughness={0.62}
        metalness={0.02}
        emissive={selected || hovered ? '#f4ab35' : '#000000'}
        emissiveIntensity={selected || hovered ? 0.18 : 0}
        transparent
        alphaTest={0.04}
        depthTest={!layerOnTop}
        depthWrite={!layerOnTop}
      />
    </mesh>
  )
}
