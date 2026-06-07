import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DoubleSide, MathUtils, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, type Group, type Mesh } from 'three'
import { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, tableCardBaseY } from './constants'
import { getCardBackTexture } from './cardTextures'

const cardBackGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
const deckHitGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
const deckHitMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
const skipRaycast = () => null
const DECK_FIDGET_DURATION_SECONDS = 0.28
const DECK_FIDGET_FALL_HEIGHT = 0.1
const DECK_FIDGET_SIDE_OFFSET = 0.045

type DeckPileProps = {
  deckCount: number
  canDraw: boolean
  onDrawCard: () => void
}

export function DeckPile({ deckCount, canDraw, onDrawCard }: DeckPileProps) {
  const visibleCards = Math.min(deckCount, 14)
  const deckGroupRef = useRef<Group>(null)
  const fidgetElapsedRef = useRef(DECK_FIDGET_DURATION_SECONDS)
  const fidgetDirectionRef = useRef(1)
  const cardBackMaterial = useMemo(
    () => new MeshStandardMaterial({
      map: getCardBackTexture(),
      side: DoubleSide,
      roughness: 0.62,
      metalness: 0.02,
      transparent: true,
      alphaTest: 0.04,
    }),
    [],
  )

  useFrame((_, delta) => {
    if (!deckGroupRef.current) {
      return
    }

    const progress = Math.min(fidgetElapsedRef.current / DECK_FIDGET_DURATION_SECONDS, 1)
    const landingProgress = MathUtils.smoothstep(progress, 0, 1)
    const settleProgress = MathUtils.smoothstep(progress, 0.72, 1)
    const lateralFade = 1 - settleProgress

    deckGroupRef.current.position.x = fidgetDirectionRef.current * DECK_FIDGET_SIDE_OFFSET * lateralFade
    deckGroupRef.current.position.y = DECK_FIDGET_FALL_HEIGHT * (1 - landingProgress)
    deckGroupRef.current.position.z = 0
    fidgetElapsedRef.current = Math.min(fidgetElapsedRef.current + delta, DECK_FIDGET_DURATION_SECONDS)
  })

  function handleDeckClick() {
    fidgetElapsedRef.current = 0
    fidgetDirectionRef.current = Math.random() < 0.5 ? -1 : 1
    if (canDraw) {
      onDrawCard()
    }
  }

  if (deckCount === 0) {
    return (
      <mesh position={[deckPosition.x, tableCardBaseY - 0.015, deckPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    )
  }

  return (
    <group ref={deckGroupRef}>
      {Array.from({ length: visibleCards }).map((_, index) => (
        <mesh
          geometry={cardBackGeometry}
          key={`deck-${index}`}
          material={cardBackMaterial}
          position={[deckPosition.x, tableCardBaseY + index * 0.024, deckPosition.z - index * 0.012]}
          rotation={[-Math.PI / 2, 0, 0.04]}
          raycast={skipRaycast}
        />
      ))}
      <mesh
        geometry={deckHitGeometry}
        material={deckHitMaterial}
        position={[deckPosition.x, tableCardBaseY + visibleCards * 0.024 + 0.04, deckPosition.z]}
        rotation={[-Math.PI / 2, 0, 0.04]}
        onClick={handleDeckClick}
      />
    </group>
  )
}

export function DeckDrawArrow({ visible }: { visible: boolean }) {
  const arrowRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!arrowRef.current || !visible) {
      return
    }

    arrowRef.current.position.y = 1.44 + Math.sin(clock.elapsedTime * 3.4) * 0.2
    arrowRef.current.rotation.y = Math.sin(clock.elapsedTime * 2.1) * 0.12
  })

  if (!visible) {
    return null
  }

  return (
    <group position={[deckPosition.x, 0, deckPosition.z - 0.08]}>
      <mesh ref={arrowRef} position={[0, 1.44, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 0.68, 32]} />
        <meshStandardMaterial color="#f4ab35" emissive="#a6427b" emissiveIntensity={0.35} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.76, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.54, 32]} />
        <meshStandardMaterial color="#f4ab35" transparent opacity={0.54} />
      </mesh>
    </group>
  )
}
