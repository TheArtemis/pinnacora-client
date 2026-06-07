import { useLayoutEffect, useRef, useState } from 'react'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { localHandBaseZ, tableCardBaseY } from './constants'
import type { GameTableSceneProps } from './types'

const DISCARD_AREA_WIDTH = 8.8
const DISCARD_AREA_DEPTH = CARD_HEIGHT * 1.34
const DISCARD_AREA_X = 0
const DISCARD_AREA_Z = -0.62

type DiscardPileProps = Pick<
  GameTableSceneProps,
  | 'canDiscard'
  | 'canPickUpDiscardPile'
  | 'discardPileHighlightStartIndex'
  | 'onDiscardPileCardClick'
  | 'onDiscardPileCardHover'
  | 'onDiscardSelectedCard'
> & {
  cards: CardType[]
  draggedHandCardId: string | null
  onDiscardDropTargetChange: (isHovered: boolean) => void
}

export default function DiscardPile({
  cards,
  canDiscard,
  canPickUpDiscardPile,
  discardPileHighlightStartIndex,
  onDiscardPileCardClick,
  onDiscardPileCardHover,
  draggedHandCardId,
  onDiscardDropTargetChange,
  onDiscardSelectedCard,
}: DiscardPileProps) {
  const seenDiscardCardIdsRef = useRef<Set<string> | null>(null)
  const [enteringDiscardCardIds, setEnteringDiscardCardIds] = useState<Set<string>>(() => new Set())
  const cardMembershipKey = cards.map((card) => card.id).join('|')
  const cardSpread = Math.max(0.28, Math.min(0.5, (DISCARD_AREA_WIDTH - CARD_WIDTH) / Math.max(cards.length - 1, 1)))
  const discardCardY = tableCardBaseY + 0.018
  const canDropDraggedCard = canDiscard && Boolean(draggedHandCardId)
  const firstCardX = DISCARD_AREA_X - (Math.max(cards.length - 1, 0) * cardSpread) / 2

  useLayoutEffect(() => {
    const nextCardIds = new Set(cardMembershipKey ? cardMembershipKey.split('|') : [])
    const previousCardIds = seenDiscardCardIdsRef.current
    seenDiscardCardIdsRef.current = nextCardIds

    if (!previousCardIds) {
      return
    }

    setEnteringDiscardCardIds(new Set([...nextCardIds].filter((cardId) => !previousCardIds.has(cardId))))
  }, [cardMembershipKey])

  return (
    <group>
      <mesh
        position={[DISCARD_AREA_X, tableCardBaseY - 0.015, DISCARD_AREA_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={canDiscard && !canDropDraggedCard ? onDiscardSelectedCard : undefined}
        onPointerOver={canDropDraggedCard ? () => onDiscardDropTargetChange(true) : undefined}
        onPointerOut={canDropDraggedCard ? () => onDiscardDropTargetChange(false) : undefined}
      >
        <planeGeometry args={[DISCARD_AREA_WIDTH, DISCARD_AREA_DEPTH]} />
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
            position={[firstCardX + offset * cardSpread, discardCardY, DISCARD_AREA_Z]}
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
          position={[DISCARD_AREA_X, discardCardY + 0.12, DISCARD_AREA_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerOver={() => onDiscardDropTargetChange(true)}
          onPointerOut={() => onDiscardDropTargetChange(false)}
          renderOrder={180}
        >
          <planeGeometry args={[DISCARD_AREA_WIDTH, DISCARD_AREA_DEPTH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}
