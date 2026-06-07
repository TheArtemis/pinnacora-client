import { DoubleSide, MathUtils, type Group, type MeshStandardMaterial } from 'three'
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
  animateRotationFrom?: [number, number, number]
  opacity?: number
  scale?: number
  renderOrder?: number
  layerOnTop?: boolean
  snapToPosition?: boolean
  disableLift?: boolean
  outlineColor?: string
  interactionWidth?: number
  interactionOffsetX?: number
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
  animateRotationFrom,
  opacity = 1,
  scale = 1,
  renderOrder = 0,
  layerOnTop = false,
  snapToPosition = false,
  disableLift = false,
  outlineColor,
  interactionWidth = CARD_WIDTH,
  interactionOffsetX = 0,
  onClick,
  onPointerOver,
  onPointerOut,
}: CardMeshProps) {
  const [initialPosition] = useState<[number, number, number]>(() => animateFrom ?? position)
  const [initialRotation] = useState<[number, number, number]>(() => animateRotationFrom ?? rotation)
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const selectedBorderColor = selected ? outlineColor ?? '#f4ab35' : undefined
  const texture = hidden || !card ? getCardBackTexture() : getCardFaceTexture(card, selectedBorderColor)
  const lift = disableLift ? 0 : selected ? (hovered ? 0.22 : 0.12) : hovered ? 0.18 : 0
  const animateFromKey = animateFrom?.join(',') ?? ''
  const highlightColor = selectedBorderColor ?? '#f4ab35'
  const hasInteraction = Boolean(onClick || onPointerOver || onPointerOut)

  useEffect(() => {
    if (!groupRef.current || !animateFromKey) {
      return
    }

    const [x = 0, y = 0, z = 0] = animateFromKey.split(',').map(Number)
    groupRef.current.position.set(x, y, z)
    groupRef.current.scale.setScalar(0.72)

    if (materialRef.current) {
      materialRef.current.opacity = 0
    }
  }, [animateFromKey])

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return
    }

    if (snapToPosition) {
      groupRef.current.position.x = position[0]
      groupRef.current.position.y = MathUtils.damp(groupRef.current.position.y, position[1] + lift, 18, delta)
      groupRef.current.position.z = position[2]
      groupRef.current.rotation.x = MathUtils.damp(groupRef.current.rotation.x, rotation[0], 12, delta)
      groupRef.current.rotation.y = MathUtils.damp(groupRef.current.rotation.y, rotation[1], 12, delta)
      groupRef.current.rotation.z = MathUtils.damp(groupRef.current.rotation.z, rotation[2], 12, delta)
      const nextScale = MathUtils.damp(groupRef.current.scale.x, scale, 10, delta)
      groupRef.current.scale.setScalar(nextScale)
    } else {
      groupRef.current.position.x = MathUtils.damp(groupRef.current.position.x, position[0], 10, delta)
      groupRef.current.position.y = MathUtils.damp(groupRef.current.position.y, position[1] + lift, 18, delta)
      groupRef.current.position.z = MathUtils.damp(groupRef.current.position.z, position[2], 10, delta)
      groupRef.current.rotation.x = MathUtils.damp(groupRef.current.rotation.x, rotation[0], 10, delta)
      groupRef.current.rotation.y = MathUtils.damp(groupRef.current.rotation.y, rotation[1], 10, delta)
      groupRef.current.rotation.z = MathUtils.damp(groupRef.current.rotation.z, rotation[2], 10, delta)
      const nextScale = MathUtils.damp(groupRef.current.scale.x, scale, 10, delta)
      groupRef.current.scale.setScalar(nextScale)
    }

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
    <group
      ref={groupRef}
      position={initialPosition}
      rotation={initialRotation}
      renderOrder={renderOrder}
    >
      <mesh raycast={() => null}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial
          ref={materialRef}
          map={texture}
          side={DoubleSide}
          roughness={0.62}
          metalness={0.02}
          emissive={selected || hovered ? highlightColor : '#000000'}
          emissiveIntensity={selected || hovered ? 0.18 : 0}
          transparent
          alphaTest={0.04}
          depthTest={!layerOnTop}
          depthWrite={!layerOnTop}
        />
      </mesh>
      {hasInteraction ? (
        <mesh
          position={[interactionOffsetX, 0, 0.04]}
          onClick={onClick ? handleClick : undefined}
          onPointerOver={onPointerOver ? handlePointerOver : undefined}
          onPointerOut={onPointerOut ? handlePointerOut : undefined}
        >
          <planeGeometry args={[interactionWidth, CARD_HEIGHT]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}
