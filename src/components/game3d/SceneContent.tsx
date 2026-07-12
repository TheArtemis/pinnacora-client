import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MathUtils, type Group } from 'three'
import { canAttachCardToOwnMeld, canReplaceMeldJoker } from '../../game/melds'
import CameraRig from './CameraRig'
import { DeckDrawArrow, DeckPile } from './DeckPile'
import DiscardPile from './DiscardPile'
import LocalHand from './LocalHand'
import MeldCards from './MeldCards'
import OpponentHand from './OpponentHand'
import PuttingDownCards from './PuttingDownCards'
import TableTop from './TableTop'
import DevOutline from './DevOutline'
import { TABLE, tableCardBaseY } from './constants'
import { localPlayerId } from './layout'
import type { SceneContentProps } from './types'

export default function SceneContent(props: SceneContentProps) {
  const discardPile = props.state?.discardPile ?? []
  const tableCardsRef = useRef<Group>(null)
  const [draggedHandCardId, setDraggedHandCardId] = useState<string | null>(null)
  const isDiscardDropTargetHoveredRef = useRef(false)
  const meldJokerDropTargetRef = useRef<{ meldId: string; jokerCardId: string } | null>(null)
  const meldAttachDropTargetRef = useRef<string | null>(null)
  const puttingDownCardIds = useMemo(
    () => new Set(props.puttingDownCards.map((card) => card.id)),
    [props.puttingDownCards],
  )
  const viewerPlayerId = localPlayerId(props.state)
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

  const draggedOwnMeldAttachTargetIds = useMemo(() => {
    const draggedCard = props.hand.find((card) => card.id === draggedHandCardId)

    if (!props.canDiscard || !draggedCard || !viewerPlayerId) {
      return new Set<string>()
    }

    return new Set(
      props.state?.melds
        .filter((meld) => canAttachCardToOwnMeld(meld, viewerPlayerId, draggedCard))
        .map((meld) => meld.id) ?? [],
    )
  }, [draggedHandCardId, props.canDiscard, props.hand, props.state?.melds, viewerPlayerId])

  const ownMeldAttachTargetIdsOnTable = useMemo(() => {
    if (!viewerPlayerId) {
      return new Set<string>()
    }

    const ownAttachIds = new Set<string>()

    for (const meldId of props.ownMeldAttachTargetIds) {
      const meld = props.state?.melds.find((candidateMeld) => candidateMeld.id === meldId)

      if (meld?.playerId === viewerPlayerId) {
        ownAttachIds.add(meldId)
      }
    }

    for (const meldId of draggedOwnMeldAttachTargetIds) {
      ownAttachIds.add(meldId)
    }

    return ownAttachIds
  }, [draggedOwnMeldAttachTargetIds, props.ownMeldAttachTargetIds, props.state?.melds, viewerPlayerId])
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
  const passthroughHandInteractionForOwnJokerSwap =
    ownSwappableMeldJokerIds.size > 0 || ownMeldAttachTargetIdsOnTable.size > 0
  const isHandCardDragging = draggedHandCardId !== null

  function clearHandDragState() {
    setDraggedHandCardId(null)
    isDiscardDropTargetHoveredRef.current = false
    meldJokerDropTargetRef.current = null
    meldAttachDropTargetRef.current = null
  }

  const handCardIdsKey = props.hand.map((card) => card.id).join('|')
  const ownMeldAttachTargetKey = [...props.ownMeldAttachTargetIds].sort().join('|')

  useEffect(() => {
    if (props.canDiscard) {
      return
    }

    clearHandDragState()
  }, [props.canDiscard])

  useEffect(() => {
    clearHandDragState()
  }, [handCardIdsKey])

  useEffect(() => {
    if (props.ownMeldAttachTargetIds.size === 0) {
      clearHandDragState()
    }
  }, [ownMeldAttachTargetKey, props.ownMeldAttachTargetIds.size])

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
      meldAttachDropTargetRef.current = null
    }
  }

  function handleHandCardDragEnd(cardId: string) {
    const meldJokerDropTarget = meldJokerDropTargetRef.current
    const meldAttachDropTarget = meldAttachDropTargetRef.current
    const isDiscardDropTargetHovered = isDiscardDropTargetHoveredRef.current

    clearHandDragState()

    if (!props.canDiscard) {
      return
    }

    if (meldJokerDropTarget) {
      props.onMeldJokerDrop(meldJokerDropTarget.meldId, meldJokerDropTarget.jokerCardId, cardId)
    } else if (meldAttachDropTarget) {
      props.onAttachToMeldDrop(meldAttachDropTarget, cardId)
    } else if (isDiscardDropTargetHovered) {
      props.onDiscardHandCard(cardId)
    }
  }

  return (
    <>
      <CameraRig focusLocalHand={props.isLocalHandFocused} focusMiddleTable={props.isMiddleTableFocused} />
      <color attach="background" args={['#eef2f4']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.8, 5.2, 4.4]} intensity={1.8} />
      <TableTop />
      <group ref={tableCardsRef}>
        <DevOutline
          width={TABLE.playingWidth}
          height={0.5}
          depth={TABLE.playingDepth}
          position={[0, tableCardBaseY, 0]}
          color="#f97316"
        />
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
          isHandCardDragging={isHandCardDragging}
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
          ownMeldAttachTargetIds={props.ownMeldAttachTargetIds}
          draggedOwnMeldAttachTargetIds={draggedOwnMeldAttachTargetIds}
          canSwapJoker={props.canDiscard}
          onMeldJokerClick={props.onMeldJokerClick}
          onMeldJokerDropTargetChange={(dropTarget) => {
            meldJokerDropTargetRef.current = dropTarget
          }}
          onAttachToMeldClick={props.onAttachToMeld}
          onAttachToMeldDropTargetChange={(meldId) => {
            meldAttachDropTargetRef.current = meldId
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
        handHoverCameraFocusEnabled={props.handHoverCameraFocusEnabled}
        onHandAreaFocusChange={props.onLocalHandFocusChange}
        onHandCardClick={props.onHandCardClick}
        onHandCardReorder={props.onHandCardReorder}
        onHandCardDragChange={handleHandCardDragChange}
        onHandCardDragEnd={handleHandCardDragEnd}
        onHandCardHover={props.onHandCardHover}
        passthroughInteractionForOwnJokerSwap={passthroughHandInteractionForOwnJokerSwap}
        passthroughUnselectedHandCards={props.ownMeldAttachTargetIds.size > 0}
      />
      <PuttingDownCards cards={props.puttingDownCards} />
    </>
  )
}
