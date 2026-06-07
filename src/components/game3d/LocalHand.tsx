import { useEffect, useRef, useState } from 'react'
import { DoubleSide } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, localHandBaseZ, tableCardBaseY } from './constants'
import { cardFanOffset } from './layout'
import type { GameTableSceneProps } from './types'

const LOCAL_HAND_CARD_SPACING = 1.08
const LOCAL_HAND_MAX_WIDTH = 11.6

type LocalHandProps = Pick<GameTableSceneProps, 'selectedCardIds' | 'onHandCardClick' | 'onHandCardHover'> & {
  cards: CardType[]
  puttingDownCardIds: Set<string>
  isGatheringForSort: boolean
  selectedCardOutlineColor?: string
  onHandAreaFocusChange: (isFocused: boolean) => void
}

export default function LocalHand({
  cards,
  selectedCardIds,
  puttingDownCardIds,
  isGatheringForSort,
  selectedCardOutlineColor,
  onHandAreaFocusChange,
  onHandCardClick,
  onHandCardHover,
}: LocalHandProps) {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [isHandAreaHovered, setIsHandAreaHovered] = useState(false)
  const handAreaLeaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const hasSeenInitialCardsRef = useRef(false)
  const seenCardIdsRef = useRef(new Set<string>())
  const enteringCardIds = hasSeenInitialCardsRef.current
    ? new Set(cards.filter((card) => !seenCardIdsRef.current.has(card.id)).map((card) => card.id))
    : new Set<string>()

  useEffect(() => {
    onHandCardHover(hoveredCardIndex === null ? [] : [hoveredCardIndex])
  }, [hoveredCardIndex, onHandCardHover])

  useEffect(() => {
    onHandAreaFocusChange(isHandAreaHovered)
  }, [isHandAreaHovered, onHandAreaFocusChange])

  useEffect(() => {
    seenCardIdsRef.current = new Set(cards.map((card) => card.id))
    hasSeenInitialCardsRef.current = true
  }, [cards])

  useEffect(() => {
    return () => {
      if (handAreaLeaveTimeoutRef.current) {
        window.clearTimeout(handAreaLeaveTimeoutRef.current)
      }
    }
  }, [])

  function handleHandAreaOver() {
    if (handAreaLeaveTimeoutRef.current) {
      window.clearTimeout(handAreaLeaveTimeoutRef.current)
    }

    setIsHandAreaHovered(true)
  }

  function handleHandAreaOut() {
    if (handAreaLeaveTimeoutRef.current) {
      window.clearTimeout(handAreaLeaveTimeoutRef.current)
    }

    handAreaLeaveTimeoutRef.current = window.setTimeout(() => {
      setIsHandAreaHovered(false)
    }, 90)
  }

  function handleCardClick(event: ThreeEvent<MouseEvent>, card: CardType) {
    event.stopPropagation()
    onHandCardClick(card)
  }

  function handleCardOver(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOver()
    setHoveredCardIndex(index)
  }

  function handleCardOut(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOut()
    setHoveredCardIndex((currentIndex) => (currentIndex === index ? null : currentIndex))
  }

  return (
    <group>
      {cards.map((card, index) => {
        const x = cardFanOffset(index, cards.length, LOCAL_HAND_CARD_SPACING, LOCAL_HAND_MAX_WIDTH)
        const resolvedSpacing =
          cards.length <= 1 ? CARD_WIDTH : Math.min(LOCAL_HAND_CARD_SPACING, LOCAL_HAND_MAX_WIDTH / Math.max(cards.length - 1, 1))
        const visibleOverlap = Math.max(0, CARD_WIDTH - resolvedSpacing)
        const isLastCard = index === cards.length - 1
        const interactionWidth = isLastCard ? CARD_WIDTH : resolvedSpacing
        const interactionOffsetX = isLastCard ? 0 : -visibleOverlap / 2
        const isPuttingDown = puttingDownCardIds.has(card.id)
        const targetRotation: [number, number, number] = isGatheringForSort
          ? [isHandAreaHovered ? -0.42 : -1.08, 0, 0]
          : [isHandAreaHovered ? -0.42 : -1.08, 0, 0]
        const targetPosition: [number, number, number] = isGatheringForSort
          ? [0, 2.22 + index * 0.012, localHandBaseZ - index * 0.008]
          : [x, 2.05, localHandBaseZ]
        const animateFrom: [number, number, number] | undefined = enteringCardIds.has(card.id)
          ? [deckPosition.x, tableCardBaseY + 0.34, deckPosition.z]
          : undefined

        return (
          <group key={card.id}>
            <CardMesh
              card={card}
              position={targetPosition}
              rotation={targetRotation}
              animateFrom={animateFrom}
              animateRotationFrom={animateFrom ? [-Math.PI / 2, 0, 0.04] : undefined}
              renderOrder={index}
              layerOnTop
              selected={selectedCardIds.has(card.id)}
              outlineColor={selectedCardOutlineColor}
              hovered={hoveredCardIndex === index}
              opacity={isPuttingDown ? 0 : 1}
              scale={isPuttingDown ? 0.62 : 1}
            />
            {!isPuttingDown ? (
              <mesh
                position={[targetPosition[0] + interactionOffsetX, targetPosition[1], targetPosition[2]]}
                rotation={targetRotation}
                onClick={(event) => handleCardClick(event, card)}
                onPointerOver={(event) => handleCardOver(event, index)}
                onPointerOut={(event) => handleCardOut(event, index)}
              >
                <planeGeometry args={[interactionWidth, CARD_HEIGHT]} />
                <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
