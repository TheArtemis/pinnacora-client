import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, tableCardBaseY } from './constants'

type DeckPileProps = {
  deckCount: number
  canDraw: boolean
  onDrawCard: () => void
}

export function DeckPile({ deckCount, canDraw, onDrawCard }: DeckPileProps) {
  const visibleCards = Math.min(deckCount, 14)

  if (deckCount === 0) {
    return (
      <mesh position={[deckPosition.x, tableCardBaseY - 0.015, deckPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    )
  }

  return (
    <group>
      {Array.from({ length: visibleCards }).map((_, index) => (
        <CardMesh
          hidden
          key={`deck-${index}`}
          position={[deckPosition.x, tableCardBaseY + index * 0.024, deckPosition.z - index * 0.012]}
          rotation={[-Math.PI / 2, 0, 0.04]}
          onClick={canDraw ? onDrawCard : undefined}
        />
      ))}
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
