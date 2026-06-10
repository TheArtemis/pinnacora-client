import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { MathUtils, type Group } from 'three'
import { canReplaceMeldJoker } from '../../game/melds'
import CameraRig from './CameraRig'
import { DeckDrawArrow, DeckPile } from './DeckPile'
import DiscardPile from './DiscardPile'
import LocalHand from './LocalHand'
import MeldCards from './MeldCards'
import OpponentHand from './OpponentHand'
import PuttingDownCards from './PuttingDownCards'
import TableTop from './TableTop'
import { localPlayerId } from './layout'
import type { SceneContentProps } from './types'

export default function SceneContent(props: SceneContentProps) {
  const discardPile = props.state?.discardPile ?? []
  const tableCardsRef = useRef<Group>(null)
  const [draggedHandCardId, setDraggedHandCardId] = useState<string | null>(null)
  const isDiscardDropTargetHoveredRef = useRef(false)
  const meldJokerDropTargetRef = useRef<{ meldId: string; jokerCardId: string } | null>(null)
  const puttingDownCardIds = useMemo(
    () => new Set(props.puttingDownCards.map((card) => card.id)),
    [props.puttingDownCards],
  )
  const draggedSwappableMeldJokerIds = useMemo(() => {
    const draggedCard = props.hand.find((card) => card.id === draggedHandCardId)

    if (!props.canDiscard || !draggedCard) {
      return new Set<string>()
    }

    const swappableJokerIds = new Set<string>()

    for (const meld of props.state?.melds ?? []) {
      for (const card of meld.cards) {
        if (canReplaceMeldJoker(meld, card.id, draggedCard)) {
          swappableJokerIds.add(`${meld.id}:${card.id}`)
        }
      }
    }

    return swappableJokerIds
  }, [draggedHandCardId, props.canDiscard, props.hand, props.state?.melds])

  const viewerPlayerId = localPlayerId(props.state)
  const ownSwappableMeldJokerIds = useMemo(() => {
    if (!viewerPlayerId) {
      return new Set<string>()
    }

    const ownJokerIds = new Set<string>()

    for (const jokerId of props.swappableMeldJokerIds) {
      const meldId = jokerId.split(':')[0]
      const meld = props.state?.melds.find((candidateMeld) => candidateMeld.id === meldId)

      if (meld?.playerId === viewerPlayerId) {
        ownJokerIds.add(jokerId)
      }
    }

    for (const jokerId of draggedSwappableMeldJokerIds) {
      const meldId = jokerId.split(':')[0]
      const meld = props.state?.melds.find((candidateMeld) => candidateMeld.id === meldId)

      if (meld?.playerId === viewerPlayerId) {
        ownJokerIds.add(jokerId)
      }
    }

    return ownJokerIds
  }, [draggedSwappableMeldJokerIds, props.state?.melds, props.swappableMeldJokerIds, viewerPlayerId])
  const passthroughHandInteractionForOwnJokerSwap = ownSwappableMeldJokerIds.size > 0

  useFrame((_, delta) => {
    if (!tableCardsRef.current) {
      return
    }

    const targetY = props.isMiddleTableFocused ? 1.08 : 0
    const targetZ = props.isMiddleTableFocused ? 1.18 : 0

    tableCardsRef.current.position.y = MathUtils.damp(tableCardsRef.current.position.y, targetY, 7.2, delta)
    tableCardsRef.current.position.z = MathUtils.damp(tableCardsRef.current.position.z, targetZ, 7.2, delta)
  })

  function handleHandCardDragChange(cardId: string | null) {
    setDraggedHandCardId(cardId)

    if (!cardId) {
      isDiscardDropTargetHoveredRef.current = false
      meldJokerDropTargetRef.current = null
    }
  }

  function handleHandCardDragEnd(cardId: string) {
    if (meldJokerDropTargetRef.current && props.canDiscard) {
      props.onMeldJokerDrop(
        meldJokerDropTargetRef.current.meldId,
        meldJokerDropTargetRef.current.jokerCardId,
        cardId,
      )
    } else if (isDiscardDropTargetHoveredRef.current && props.canDiscard) {
      props.onDiscardHandCard(cardId)
    }

    isDiscardDropTargetHoveredRef.current = false
    meldJokerDropTargetRef.current = null
  }

  return (
    <>
      <CameraRig
        focusLocalHand={props.handHoverCameraFocusEnabled && props.isLocalHandFocused}
        focusMiddleTable={props.isMiddleTableFocused}
      />
      <color attach="background" args={['#eef2f4']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.8, 5.2, 4.4]} intensity={1.8} />
      <TableTop />
      <group ref={tableCardsRef}>
        <DeckPile
          deckCount={props.state?.deckCount ?? 0}
          canDraw={props.canDraw}
          onDrawCard={props.onDrawCard}
        />
        <DeckDrawArrow visible={props.canDraw} />
        <DiscardPile
          cards={discardPile}
          canDiscard={props.canDiscard}
          canPickUpDiscardPile={props.canPickUpDiscardPile}
          discardPileHighlightStartIndex={props.discardPileHighlightStartIndex}
          onDiscardPileCardClick={props.onDiscardPileCardClick}
          onDiscardPileCardHover={props.onDiscardPileCardHover}
          draggedHandCardId={draggedHandCardId}
          onDiscardDropTargetChange={(isHovered) => {
            isDiscardDropTargetHoveredRef.current = isHovered
          }}
          onDiscardSelectedCard={props.onDiscardSelectedCard}
        />
        <MeldCards
          state={props.state}
          swappableMeldJokerIds={props.swappableMeldJokerIds}
          draggedSwappableMeldJokerIds={draggedSwappableMeldJokerIds}
          discardPileMeldTargetIds={props.discardPileMeldTargetIds}
          discardPileJokerTargetIds={props.discardPileJokerTargetIds}
          canSwapJoker={props.canDiscard}
          onMeldJokerClick={props.onMeldJokerClick}
          onMeldJokerDropTargetChange={(dropTarget) => {
            meldJokerDropTargetRef.current = dropTarget
          }}
          onDiscardPileMeldTargetClick={props.onDiscardPileMeldTargetClick}
          onDiscardPileJokerTargetClick={props.onDiscardPileJokerTargetClick}
        />
      </group>
      <OpponentHand state={props.state} hoveredCardIndexes={props.opponentHoveredHandIndexes} />
      <LocalHand
        cards={props.hand}
        selectedCardIds={props.selectedCardIds}
        selectedCardOutlineColor={props.selectedCardOutlineColor}
        hiddenCardIds={props.hiddenHandCardIds}
        puttingDownCardIds={puttingDownCardIds}
        isGatheringForSort={props.isHandGatheringForSort}
        isCloseUp={props.isLocalHandFocused}
        onHandAreaFocusChange={props.onLocalHandFocusChange}
        onHandCardClick={props.onHandCardClick}
        onHandCardReorder={props.onHandCardReorder}
        onHandCardDragChange={handleHandCardDragChange}
        onHandCardDragEnd={handleHandCardDragEnd}
        onHandCardHover={props.onHandCardHover}
        passthroughInteractionForOwnJokerSwap={passthroughHandInteractionForOwnJokerSwap}
      />
      <PuttingDownCards cards={props.puttingDownCards} />
    </>
  )
}
