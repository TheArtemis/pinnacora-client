import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { localHandBaseZ, tableCardBaseY } from './constants'
import DevOutline from './DevOutline'
import { createRoundedRectGeometry, createRoundedRectInnerGeometry } from './roundedRectGeometry'
import type { GameTableSceneProps } from './types'

const DISCARD_AREA_WIDTH = 8.8
const DISCARD_AREA_DEPTH = CARD_HEIGHT * 1.34
const DISCARD_AREA_CORNER_RADIUS = 0.42
const DISCARD_AREA_BORDER_WIDTH = 0.1
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
  isHandCardDragging: boolean
  onDiscardDropTargetChange: (isHovered: boolean) => void
}

export default function DiscardPile({
  cards,
  canDiscard,
  canPickUpDiscardPile,
  discardPileHighlightStartIndex,
  onDiscardPileCardClick,
  onDiscardPileCardHover,
  isHandCardDragging,
  onDiscardDropTargetChange,
  onDiscardSelectedCard,
}: DiscardPileProps) {
  const seenDiscardCardIdsRef = useRef<Set<string> | null>(null)
  const [enteringDiscardCardIds, setEnteringDiscardCardIds] = useState<Set<string>>(() => new Set())
  const cardMembershipKey = cards.map((card) => card.id).join('|')
  const cardSpread = Math.max(0.28, Math.min(0.5, (DISCARD_AREA_WIDTH - CARD_WIDTH) / Math.max(cards.length - 1, 1)))
  const discardCardY = tableCardBaseY + 0.018
  const canDropDraggedCard = canDiscard && isHandCardDragging
  const firstCardX = DISCARD_AREA_X - (Math.max(cards.length - 1, 0) * cardSpread) / 2
  const discardAreaFillGeometry = useMemo(
    () => createRoundedRectInnerGeometry(
      DISCARD_AREA_WIDTH,
      DISCARD_AREA_DEPTH,
      DISCARD_AREA_CORNER_RADIUS,
      DISCARD_AREA_BORDER_WIDTH,
    ),
    [],
  )
  const discardAreaBorderGeometry = useMemo(
    () => createRoundedRectGeometry(DISCARD_AREA_WIDTH, DISCARD_AREA_DEPTH, DISCARD_AREA_CORNER_RADIUS),
    [],
  )
  const discardAreaHitGeometry = discardAreaBorderGeometry
  const discardAreaFillColor = canDropDraggedCard ? '#dbeafe' : '#f8fafc'
  const discardAreaFillOpacity = canDropDraggedCard ? 0.72 : canDiscard ? 0.34 : 0.2
  const discardAreaBorderColor = canDropDraggedCard ? '#2563eb' : canDiscard ? '#64748b' : '#94a3b8'
  const discardAreaBorderOpacity = canDropDraggedCard ? 0.95 : canDiscard ? 0.78 : 0.52

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
        geometry={discardAreaBorderGeometry}
        position={[DISCARD_AREA_X, tableCardBaseY - 0.016, DISCARD_AREA_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={11}
        raycast={() => null}
      >
        <meshStandardMaterial color={discardAreaBorderColor} transparent opacity={discardAreaBorderOpacity} />
      </mesh>
      <mesh
        geometry={discardAreaFillGeometry}
        position={[DISCARD_AREA_X, tableCardBaseY - 0.014, DISCARD_AREA_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={canDiscard && !canDropDraggedCard ? onDiscardSelectedCard : undefined}
        onPointerOver={canDropDraggedCard ? () => onDiscardDropTargetChange(true) : undefined}
        onPointerOut={canDropDraggedCard ? () => onDiscardDropTargetChange(false) : undefined}
      >
        <meshStandardMaterial color={discardAreaFillColor} transparent opacity={discardAreaFillOpacity} />
      </mesh>
      <DevOutline
        width={DISCARD_AREA_WIDTH}
        height={DISCARD_AREA_DEPTH}
        position={[DISCARD_AREA_X, tableCardBaseY, DISCARD_AREA_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        color="#ec4899"
      />
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
            fidgetable={!canDropDraggedCard}
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
          geometry={discardAreaHitGeometry}
          position={[DISCARD_AREA_X, discardCardY + 0.12, DISCARD_AREA_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerOver={() => onDiscardDropTargetChange(true)}
          onPointerOut={() => onDiscardDropTargetChange(false)}
          renderOrder={180}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  )
}
