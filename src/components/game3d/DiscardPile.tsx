import { useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { localHandBaseZ, tableCardBaseY } from './constants'
import type { GameTableSceneProps } from './types'

type DiscardPileProps = Pick<
  GameTableSceneProps,
  | 'canDiscard'
  | 'canPickUpDiscardPile'
  | 'discardPileHighlightStartIndex'
  | 'onDiscardPileCardClick'
  | 'onDiscardPileCardHover'
  | 'onDiscardHandCard'
  | 'onDiscardSelectedCard'
> & {
  cards: CardType[]
  draggedHandCardId: string | null
}

export default function DiscardPile({
  cards,
  canDiscard,
  canPickUpDiscardPile,
  discardPileHighlightStartIndex,
  onDiscardPileCardClick,
  onDiscardPileCardHover,
  draggedHandCardId,
  onDiscardHandCard,
  onDiscardSelectedCard,
}: DiscardPileProps) {
  const hasSeenInitialDiscardRef = useRef(false)
  const seenDiscardCardIdsRef = useRef(new Set<string>())
  const enteringDiscardCardIds = hasSeenInitialDiscardRef.current
    ? new Set(cards.filter((card) => !seenDiscardCardIdsRef.current.has(card.id)).map((card) => card.id))
    : new Set<string>()
  const cardSpread = Math.max(0.28, Math.min(0.48, 8.4 / Math.max(cards.length - 1, 1)))
  const discardCardY = tableCardBaseY + 0.018
  const canDropDraggedCard = canDiscard && Boolean(draggedHandCardId)
  const dropTargetWidth = Math.max(CARD_WIDTH * 1.35, CARD_WIDTH + Math.max(cards.length - 1, 0) * cardSpread)
  const dropTargetX = -2.36 + (Math.max(cards.length - 1, 0) * cardSpread) / 2
  const dropTargetZ = -0.4 - (Math.max(cards.length - 1, 0) * 0.09) / 2

  useEffect(() => {
    seenDiscardCardIdsRef.current = new Set(cards.map((card) => card.id))
    hasSeenInitialDiscardRef.current = true
  }, [cards])

  function handleDraggedCardDrop(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()

    if (!draggedHandCardId || !canDiscard) {
      return
    }

    onDiscardHandCard(draggedHandCardId)
  }

  return (
    <group>
      <mesh
        position={[-2.36, tableCardBaseY - 0.015, -0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={canDiscard && !canDropDraggedCard ? onDiscardSelectedCard : undefined}
      >
        <planeGeometry args={[CARD_WIDTH * 1.35, CARD_HEIGHT * 1.24]} />
        <meshStandardMaterial color={canDropDraggedCard ? '#f4ab35' : '#ffffff'} transparent opacity={canDropDraggedCard ? 0.34 : canDiscard ? 0.22 : 0.1} />
      </mesh>
      {cards.map((card, index) => {
        const selected = discardPileHighlightStartIndex !== null && index >= discardPileHighlightStartIndex
        const offset = index
        const isTopCard = index === cards.length - 1
        const visibleOverlap = Math.max(0, CARD_WIDTH - cardSpread)
        const interactionWidth = isTopCard ? CARD_WIDTH : cardSpread
        const interactionOffsetX = isTopCard ? 0 : -visibleOverlap / 2
        const animateFrom: [number, number, number] | undefined = enteringDiscardCardIds.has(card.id)
          ? [0, 2.05, localHandBaseZ]
          : undefined

        return (
          <CardMesh
            card={card}
            key={card.id}
            position={[-2.36 + offset * cardSpread, discardCardY, -0.4 - offset * 0.09]}
            rotation={[-Math.PI / 2, 0, -0.08]}
            animateFrom={animateFrom}
            animateRotationFrom={animateFrom ? [-0.72, 0, 0] : undefined}
            selected={selected}
            renderOrder={20 + index}
            layerOnTop
            onClick={canDropDraggedCard ? undefined : canPickUpDiscardPile ? () => onDiscardPileCardClick(index) : canDiscard ? onDiscardSelectedCard : undefined}
            onPointerOver={canDropDraggedCard ? undefined : canPickUpDiscardPile ? () => onDiscardPileCardHover(index) : undefined}
            onPointerOut={canDropDraggedCard ? undefined : canPickUpDiscardPile ? () => onDiscardPileCardHover(null) : undefined}
            interactionWidth={interactionWidth}
            interactionOffsetX={interactionOffsetX}
          />
        )
      })}
      {canDropDraggedCard ? (
        <mesh
          position={[dropTargetX, discardCardY + 0.12, dropTargetZ]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerUp={handleDraggedCardDrop}
          renderOrder={180}
        >
          <planeGeometry args={[dropTargetWidth, CARD_HEIGHT * 1.35]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}
