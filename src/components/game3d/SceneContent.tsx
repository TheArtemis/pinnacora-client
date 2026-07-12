import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MathUtils, type Group } from 'three'
import { getHandCardsTableTargets } from '../../game/tableTargets'
import CameraRig from './CameraRig'
import { DeckDrawArrow, DeckPile } from './DeckPile'
import DiscardPile from './DiscardPile'
import LocalHand from './LocalHand'
import MeldCards from './MeldCards'
import OpponentHand from './OpponentHand'
import PuttingDownCards from './PuttingDownCards'
import TableTop from './TableTop'
import DevOutline from './DevOutline'
import { TABLE, TABLE_CAMERA_FOCUS, tableCardBaseY } from './constants'
import { localPlayerId } from './layout'
import type { SceneContentProps } from './types'

type TableDropTarget =
  | { type: 'attach'; meldId: string }
  | { type: 'swap_joker'; meldId: string; jokerCardId: string }
  | { type: 'discard' }

export default function SceneContent(props: SceneContentProps) {
  const discardPile = props.state?.discardPile ?? []
  const tableCardsRef = useRef<Group>(null)
  const [draggedHandCardId, setDraggedHandCardId] = useState<string | null>(null)
  const tableDropTargetRef = useRef<TableDropTarget | null>(null)
  const puttingDownCardIds = useMemo(
    () => new Set(props.puttingDownCards.map((card) => card.id)),
    [props.puttingDownCards],
  )
  const viewerPlayerId = localPlayerId(props.state)
  const melds = props.state?.melds ?? []

  const draggedHandCard = useMemo(
    () => (draggedHandCardId ? props.hand.find((card) => card.id === draggedHandCardId) : undefined),
    [draggedHandCardId, props.hand],
  )

  const selectedHandCards = useMemo(
    () => props.hand.filter((card) => props.selectedCardIds.has(card.id)),
    [props.hand, props.selectedCardIds],
  )

  const interactionHandCards = useMemo(
    () => (draggedHandCard ? [draggedHandCard] : selectedHandCards),
    [draggedHandCard, selectedHandCards],
  )

  const interactionTableTargets = useMemo(
    () => getHandCardsTableTargets(interactionHandCards, melds, viewerPlayerId, props.canDiscard),
    [interactionHandCards, melds, props.canDiscard, viewerPlayerId],
  )

  const isHandCardDragging = draggedHandCardId !== null

  function clearTableDropTarget() {
    tableDropTargetRef.current = null
  }

  function handleHandCardDragChange(cardId: string | null) {
    setDraggedHandCardId(cardId)

    if (!cardId) {
      clearTableDropTarget()
    }
  }

  function handleDragHandAreaChange(isOverHand: boolean) {
    if (isOverHand) {
      clearTableDropTarget()
    }
  }

  function handleHandCardDragEnd(cardId: string, isOverHand: boolean) {
    const dropTarget = tableDropTargetRef.current

    clearTableDropTarget()
    setDraggedHandCardId(null)

    if (!props.canDiscard || isOverHand || !dropTarget) {
      return
    }

    if (dropTarget?.type === 'swap_joker') {
      props.onMeldJokerDrop(dropTarget.meldId, dropTarget.jokerCardId, cardId)
      return
    }

    if (dropTarget?.type === 'attach') {
      props.onAttachToMeldDrop(dropTarget.meldId, cardId)
      return
    }

    if (dropTarget?.type === 'discard') {
      props.onDiscardHandCard(cardId)
    }
  }

  useEffect(() => {
    if (props.canDiscard) {
      return
    }

    setDraggedHandCardId(null)
    clearTableDropTarget()
  }, [props.canDiscard])

  useFrame((_, delta) => {
    if (!tableCardsRef.current) {
      return
    }

    const targetY = props.isMiddleTableFocused ? TABLE_CAMERA_FOCUS.tableLift.y : 0
    const targetZ = props.isMiddleTableFocused ? TABLE_CAMERA_FOCUS.tableLift.z : 0

    tableCardsRef.current.position.y = MathUtils.damp(tableCardsRef.current.position.y, targetY, 7.2, delta)
    tableCardsRef.current.position.z = MathUtils.damp(tableCardsRef.current.position.z, targetZ, 7.2, delta)
  })

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
            if (isHovered) {
              tableDropTargetRef.current = { type: 'discard' }
              return
            }

            if (tableDropTargetRef.current?.type === 'discard') {
              tableDropTargetRef.current = null
            }
          }}
          onDiscardSelectedCard={props.onDiscardSelectedCard}
        />
        <MeldCards
          state={props.state}
          swappableMeldJokerIds={interactionTableTargets.swappableMeldJokerIds}
          discardPileMeldTargetIds={props.discardPileMeldTargetIds}
          discardPileJokerTargetIds={props.discardPileJokerTargetIds}
          ownMeldAttachTargetIds={interactionTableTargets.ownMeldAttachTargetIds}
          isHandCardDragging={isHandCardDragging}
          canSwapJoker={props.canDiscard}
          onMeldJokerClick={props.onMeldJokerClick}
          onMeldJokerDropTargetChange={(dropTarget) => {
            if (dropTarget) {
              tableDropTargetRef.current = {
                type: 'swap_joker',
                meldId: dropTarget.meldId,
                jokerCardId: dropTarget.jokerCardId,
              }
              return
            }

            if (tableDropTargetRef.current?.type === 'swap_joker') {
              tableDropTargetRef.current = null
            }
          }}
          onAttachToMeldClick={props.onAttachToMeld}
          onAttachToMeldDropTargetChange={(meldId) => {
            if (meldId) {
              tableDropTargetRef.current = { type: 'attach', meldId }
              return
            }

            if (tableDropTargetRef.current?.type === 'attach') {
              tableDropTargetRef.current = null
            }
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
        onHandCardDragHandAreaChange={handleDragHandAreaChange}
        onHandCardHover={props.onHandCardHover}
      />
      <PuttingDownCards cards={props.puttingDownCards} />
    </>
  )
}
