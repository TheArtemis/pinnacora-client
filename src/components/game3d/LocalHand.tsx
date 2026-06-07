import { useEffect, useRef, useState } from 'react'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh from './CardMesh'
import { localHandBaseZ } from './constants'
import { handFanLayout } from './layout'
import type { GameTableSceneProps } from './types'

type LocalHandProps = Pick<GameTableSceneProps, 'selectedCardIds' | 'onHandCardClick' | 'onHandCardHover'> & {
  cards: CardType[]
  puttingDownCardIds: Set<string>
  isGatheringForSort: boolean
  onHandAreaFocusChange: (isFocused: boolean) => void
}

export default function LocalHand({
  cards,
  selectedCardIds,
  puttingDownCardIds,
  isGatheringForSort,
  onHandAreaFocusChange,
  onHandCardClick,
  onHandCardHover,
}: LocalHandProps) {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [isHandAreaHovered, setIsHandAreaHovered] = useState(false)
  const handAreaLeaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    onHandCardHover(hoveredCardIndex === null ? [] : [hoveredCardIndex])
  }, [hoveredCardIndex, onHandCardHover])

  useEffect(() => {
    onHandAreaFocusChange(isHandAreaHovered)
  }, [isHandAreaHovered, onHandAreaFocusChange])

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

  return (
    <group>
      {cards.map((card, index) => {
        const { fanAngle, normalizedIndex, x, y, z } = handFanLayout(index, cards.length, {
          radius: 6.9,
          baseY: 2.05,
          edgeYOffset: 0.32,
          baseZ: localHandBaseZ,
          edgeZOffset: -0.56,
        })
        const isPuttingDown = puttingDownCardIds.has(card.id)
        const targetPosition: [number, number, number] = isGatheringForSort
          ? [0, 2.22 + index * 0.012, localHandBaseZ - index * 0.008]
          : [x, y, z]
        const targetRotation: [number, number, number] = isGatheringForSort
          ? [isHandAreaHovered ? -0.42 : -1.08, 0, 0]
          : [isHandAreaHovered ? -0.42 : -1.08, normalizedIndex * 0.08, -fanAngle]

        return (
          <CardMesh
            card={card}
            key={card.id}
            position={targetPosition}
            rotation={targetRotation}
            renderOrder={index}
            layerOnTop
            selected={selectedCardIds.has(card.id)}
            hovered={hoveredCardIndex === index}
            opacity={isPuttingDown ? 0 : 1}
            scale={isPuttingDown ? 0.62 : 1}
            onClick={() => onHandCardClick(card)}
            onPointerOver={() => {
              handleHandAreaOver()
              setHoveredCardIndex(index)
            }}
            onPointerOut={() => {
              handleHandAreaOut()
              setHoveredCardIndex((currentIndex) => (currentIndex === index ? null : currentIndex))
            }}
          />
        )
      })}
    </group>
  )
}
