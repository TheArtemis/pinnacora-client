import { DoubleSide, MathUtils, MeshBasicMaterial, PlaneGeometry, type Group, type MeshStandardMaterial } from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { Card as CardType } from '../../game/cardTypes'
import { getCardBackTexture, getCardFaceTexture } from './cardTextures'

export const CARD_WIDTH = 1.84
export const CARD_HEIGHT = 2.64

const MOTION_EPSILON = 0.001
const OPACITY_EPSILON = 0.003
const FIDGET_DURATION_SECONDS = 0.28
const FIDGET_FALL_HEIGHT = 0.1
const FIDGET_SIDE_OFFSET = 0.045
const cardFaceGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
const interactionGeometry = new PlaneGeometry(1, CARD_HEIGHT)
const interactionMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })

type PositionRef = {
  current: [number, number, number]
}

type CardMeshProps = {
  card?: CardType
  hidden?: boolean
  selected?: boolean
  hovered?: boolean
  position: [number, number, number]
  positionRef?: PositionRef
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
  fidgetable?: boolean
  fidgetTrigger?: number
  fidgetFallDelay?: number
  fidgetSideDirection?: number
  interactionWidth?: number
  interactionOffsetX?: number
  onClick?: () => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}

function dampTo(current: number, target: number, smoothing: number, delta: number, epsilon = MOTION_EPSILON) {
  const next = MathUtils.damp(current, target, smoothing, delta)

  return Math.abs(next - target) < epsilon ? target : next
}

function sameVector(left?: [number, number, number], right?: [number, number, number]) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
}

function sameCard(left?: CardType, right?: CardType) {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return left.id === right.id && left.rank === right.rank && left.suit === right.suit
}

function areCardMeshPropsEqual(previous: CardMeshProps, next: CardMeshProps) {
  return (
    sameCard(previous.card, next.card) &&
    (previous.hidden ?? false) === (next.hidden ?? false) &&
    (previous.selected ?? false) === (next.selected ?? false) &&
    (previous.hovered ?? false) === (next.hovered ?? false) &&
    sameVector(previous.position, next.position) &&
    previous.positionRef === next.positionRef &&
    sameVector(previous.rotation, next.rotation) &&
    sameVector(previous.animateFrom, next.animateFrom) &&
    sameVector(previous.animateRotationFrom, next.animateRotationFrom) &&
    (previous.opacity ?? 1) === (next.opacity ?? 1) &&
    (previous.scale ?? 1) === (next.scale ?? 1) &&
    (previous.renderOrder ?? 0) === (next.renderOrder ?? 0) &&
    (previous.layerOnTop ?? false) === (next.layerOnTop ?? false) &&
    (previous.snapToPosition ?? false) === (next.snapToPosition ?? false) &&
    (previous.disableLift ?? false) === (next.disableLift ?? false) &&
    previous.outlineColor === next.outlineColor &&
    (previous.fidgetable ?? false) === (next.fidgetable ?? false) &&
    (previous.fidgetTrigger ?? 0) === (next.fidgetTrigger ?? 0) &&
    (previous.fidgetFallDelay ?? 0) === (next.fidgetFallDelay ?? 0) &&
    (previous.fidgetSideDirection ?? 0) === (next.fidgetSideDirection ?? 0) &&
    (previous.interactionWidth ?? CARD_WIDTH) === (next.interactionWidth ?? CARD_WIDTH) &&
    (previous.interactionOffsetX ?? 0) === (next.interactionOffsetX ?? 0) &&
    previous.onClick === next.onClick &&
    previous.onPointerOver === next.onPointerOver &&
    previous.onPointerOut === next.onPointerOut
  )
}

const CardMesh = memo(function CardMesh({
  card,
  hidden = false,
  selected = false,
  hovered = false,
  position,
  positionRef,
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
  fidgetable = false,
  fidgetTrigger = 0,
  fidgetFallDelay = 0,
  fidgetSideDirection,
  interactionWidth = CARD_WIDTH,
  interactionOffsetX = 0,
  onClick,
  onPointerOver,
  onPointerOut,
}: CardMeshProps) {
  const [initialPosition] = useState<[number, number, number]>(() => animateFrom ?? position)
  const [initialRotation] = useState<[number, number, number]>(() => animateRotationFrom ?? rotation)
  const fidgetGroupRef = useRef<Group>(null)
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const fidgetElapsedRef = useRef(FIDGET_DURATION_SECONDS)
  const fidgetDirectionRef = useRef(1)
  const selectedBorderColor = selected ? outlineColor ?? '#f4ab35' : undefined
  const texture = hidden || !card ? getCardBackTexture() : getCardFaceTexture(card, selectedBorderColor)
  const lift = disableLift ? 0 : selected ? (hovered ? 0.22 : 0.12) : hovered ? 0.18 : 0
  const animateFromKey = animateFrom?.join(',') ?? ''
  const highlightColor = selectedBorderColor ?? '#f4ab35'
  const hasInteraction = Boolean(fidgetable || onClick || onPointerOver || onPointerOut)

  const startFidget = useCallback(() => {
    fidgetElapsedRef.current = 0
    fidgetDirectionRef.current = fidgetSideDirection ?? (Math.random() < 0.5 ? -1 : 1)
  }, [fidgetSideDirection])

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

  useEffect(() => {
    if (fidgetTrigger > 0) {
      startFidget()
    }
  }, [fidgetTrigger, startFidget])

  useFrame((_, delta) => {
    if (!groupRef.current || !fidgetGroupRef.current) {
      return
    }

    const group = groupRef.current
    const fidgetGroup = fidgetGroupRef.current
    const targetPosition = positionRef?.current ?? position
    const fidgetProgress = Math.min(
      Math.max(fidgetElapsedRef.current - fidgetFallDelay, 0) / FIDGET_DURATION_SECONDS,
      1,
    )
    const isWaitingToFall = fidgetElapsedRef.current < fidgetFallDelay
    const landingProgress = MathUtils.smoothstep(fidgetProgress, 0, 1)
    const settleProgress = MathUtils.smoothstep(fidgetProgress, 0.72, 1)
    const lateralFade = 1 - settleProgress
    const fidgetOffsetX = fidgetDirectionRef.current * FIDGET_SIDE_OFFSET * lateralFade
    const fidgetOffsetY = isWaitingToFall ? FIDGET_FALL_HEIGHT : FIDGET_FALL_HEIGHT * (1 - landingProgress)
    const fidgetRotationZ = fidgetDirectionRef.current * 0.035 * lateralFade
    const targetY = targetPosition[1] + lift
    const positionSmoothing = snapToPosition ? 18 : 10
    const rotationSmoothing = snapToPosition ? 12 : 10
    const nextX = snapToPosition ? targetPosition[0] : dampTo(group.position.x, targetPosition[0], positionSmoothing, delta)
    const nextY = dampTo(group.position.y, targetY, 18, delta)
    const nextZ = snapToPosition ? targetPosition[2] : dampTo(group.position.z, targetPosition[2], positionSmoothing, delta)
    const nextRotationX = dampTo(group.rotation.x, rotation[0], rotationSmoothing, delta)
    const nextRotationY = dampTo(group.rotation.y, rotation[1], rotationSmoothing, delta)
    const nextRotationZ = dampTo(group.rotation.z, rotation[2] + fidgetRotationZ, rotationSmoothing, delta)
    const nextScale = dampTo(group.scale.x, scale, 10, delta)

    fidgetElapsedRef.current = Math.min(fidgetElapsedRef.current + delta, FIDGET_DURATION_SECONDS + fidgetFallDelay)

    if (
      Math.abs(fidgetGroup.position.x - fidgetOffsetX) > MOTION_EPSILON ||
      Math.abs(fidgetGroup.position.y - fidgetOffsetY) > MOTION_EPSILON ||
      Math.abs(fidgetGroup.position.z) > MOTION_EPSILON
    ) {
      fidgetGroup.position.set(fidgetOffsetX, fidgetOffsetY, 0)
    }

    if (
      Math.abs(group.position.x - nextX) > MOTION_EPSILON ||
      Math.abs(group.position.y - nextY) > MOTION_EPSILON ||
      Math.abs(group.position.z - nextZ) > MOTION_EPSILON
    ) {
      group.position.set(nextX, nextY, nextZ)
    }

    if (
      Math.abs(group.rotation.x - nextRotationX) > MOTION_EPSILON ||
      Math.abs(group.rotation.y - nextRotationY) > MOTION_EPSILON ||
      Math.abs(group.rotation.z - nextRotationZ) > MOTION_EPSILON
    ) {
      group.rotation.set(nextRotationX, nextRotationY, nextRotationZ)
    }

    if (Math.abs(group.scale.x - nextScale) > MOTION_EPSILON) {
      group.scale.setScalar(nextScale)
    }

    if (materialRef.current) {
      const nextOpacity = dampTo(materialRef.current.opacity, opacity, 12, delta, OPACITY_EPSILON)

      if (Math.abs(materialRef.current.opacity - nextOpacity) > OPACITY_EPSILON) {
        materialRef.current.opacity = nextOpacity
      }
    }
  })

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()

    if (fidgetable) {
      startFidget()
    }

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
    <group ref={fidgetGroupRef}>
      <group
        ref={groupRef}
        position={initialPosition}
        rotation={initialRotation}
        renderOrder={renderOrder}
      >
        <mesh raycast={() => null} geometry={cardFaceGeometry}>
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
            geometry={interactionGeometry}
            material={interactionMaterial}
            position={[interactionOffsetX, 0, 0.04]}
            scale={[interactionWidth, 1, 1]}
            onClick={fidgetable || onClick ? handleClick : undefined}
            onPointerOver={onPointerOver ? handlePointerOver : undefined}
            onPointerOut={onPointerOut ? handlePointerOut : undefined}
          >
          </mesh>
        ) : null}
      </group>
    </group>
  )
}, areCardMeshPropsEqual)

export default CardMesh
