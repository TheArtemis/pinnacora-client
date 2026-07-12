import { useEffect, useMemo, useRef, useState } from 'react'
import { getMeldPoints, isCompleteMeld } from '../../game/scoring'
import type { ServerGameState } from '../../game/serverTypes'
import CardMesh, { CARD_HEIGHT } from './CardMesh'
import { emptyMelds, localHandBaseZ, localMeldInteractionY, MELD_LAYOUT, tableCardBaseY } from './constants'
import DevOutline from './DevOutline'
import { localPlayerId, sequenceMeldCardSlot, sequenceMeldUsesCompactLayout, sequenceMeldVisibleSlotCount, MELOD_SEQUENCE_MIDDLE_STACK_OFFSET, MELOD_SEQUENCE_SLOT_SPACING_FACTOR } from './layout'
import PointsBurst from './PointsBurst'

const COMPLETED_MELD_SCALE = 0.72
const LOCAL_MELD_JOKER_SWAP_Z_LIFT = 2.85

type MeldCardsProps = {
  state: ServerGameState | null
  swappableMeldJokerIds: Set<string>
  draggedSwappableMeldJokerIds: Set<string>
  discardPileMeldTargetIds: Set<string>
  discardPileJokerTargetIds: Set<string>
  ownMeldAttachTargetIds: Set<string>
  draggedOwnMeldAttachTargetIds: Set<string>
  canSwapJoker: boolean
  onMeldJokerClick: (meldId: string, jokerCardId: string) => void
  onMeldJokerDropTargetChange: (dropTarget: { meldId: string; jokerCardId: string } | null) => void
  onAttachToMeldClick: (meldId: string) => void
  onAttachToMeldDropTargetChange: (meldId: string | null) => void
  onDiscardPileMeldTargetClick: (meldId: string) => void
  onDiscardPileJokerTargetClick: (meldId: string, jokerCardId: string) => void
}

function isJoker(card: ServerGameState['melds'][number]['cards'][number]) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}

function isCompletedMeld(meld: ServerGameState['melds'][number]) {
  return isCompleteMeld(meld.cards, meld.type)
}

export default function MeldCards({
  state,
  swappableMeldJokerIds,
  draggedSwappableMeldJokerIds,
  discardPileMeldTargetIds,
  discardPileJokerTargetIds,
  ownMeldAttachTargetIds,
  draggedOwnMeldAttachTargetIds,
  canSwapJoker,
  onMeldJokerClick,
  onMeldJokerDropTargetChange,
  onAttachToMeldClick,
  onAttachToMeldDropTargetChange,
  onDiscardPileMeldTargetClick,
  onDiscardPileJokerTargetClick,
}: MeldCardsProps) {
  const melds = state?.melds ?? emptyMelds
  const viewerPlayerId = localPlayerId(state)
  const currentMeldCardIds = useMemo(() => melds.flatMap((meld) => meld.cards.map((card) => `${meld.id}-${card.id}`)), [melds])
  const currentMeldCardKey = currentMeldCardIds.join('|')
  const currentMeldIds = useMemo(() => melds.map((meld) => meld.id), [melds])
  const currentMeldKey = currentMeldIds.join('|')
  const hasSeenInitialMeldsRef = useRef(false)
  const seenMeldIdsRef = useRef(new Set<string>())
  const seenMeldCardIdsRef = useRef(new Set<string>())
  const [materializingMeldCardIds, setMaterializingMeldCardIds] = useState<Set<string>>(() => new Set())
  const [activePointBurstMeldIds, setActivePointBurstMeldIds] = useState<Set<string>>(() => new Set())
  const [hoveredMeldJokerId, setHoveredMeldJokerId] = useState<string | null>(null)
  const [fidgetTriggers, setFidgetTriggers] = useState<Map<string, number>>(() => new Map())

  useEffect(() => {
    const nextMeldCardIds = currentMeldCardKey ? currentMeldCardKey.split('|') : []
    const nextMeldIds = currentMeldKey ? currentMeldKey.split('|') : []
    const nextSeenMeldCardIds = new Set(nextMeldCardIds)
    const nextSeenMeldIds = new Set(nextMeldIds)

    if (!hasSeenInitialMeldsRef.current) {
      seenMeldCardIdsRef.current = nextSeenMeldCardIds
      seenMeldIdsRef.current = nextSeenMeldIds
      hasSeenInitialMeldsRef.current = true
      return
    }

    const nextMaterializingMeldCardIds = new Set(
      nextMeldCardIds.filter((meldCardId) => !seenMeldCardIdsRef.current.has(meldCardId)),
    )
    const nextPointBurstMeldIds = nextMeldIds.filter((meldId) => !seenMeldIdsRef.current.has(meldId))

    seenMeldCardIdsRef.current = nextSeenMeldCardIds
    seenMeldIdsRef.current = nextSeenMeldIds
    setMaterializingMeldCardIds(nextMaterializingMeldCardIds)

    if (nextPointBurstMeldIds.length > 0) {
      setActivePointBurstMeldIds((currentMeldIds) => new Set([...currentMeldIds, ...nextPointBurstMeldIds]))
    }

    if (nextMaterializingMeldCardIds.size === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMaterializingMeldCardIds(new Set())
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [currentMeldCardKey, currentMeldKey])

  function triggerMeldFidget(meldCardIds: string[]) {
    setFidgetTriggers((currentTriggers) => {
      const nextTriggers = new Map(currentTriggers)

      for (const meldCardId of meldCardIds) {
        nextTriggers.set(meldCardId, (nextTriggers.get(meldCardId) ?? 0) + 1)
      }

      return nextTriggers
    })
  }

  const ownerMeldIndexes = new Map<string, number>()
  const ownerCompleteMeldIndexes = new Map<string, number>()
  const ownerMeldCounts = new Map<string, number>()
  const ownerCompleteMeldCounts = new Map<string, number>()

  for (const meld of melds) {
    const targetCounts = isCompletedMeld(meld) ? ownerCompleteMeldCounts : ownerMeldCounts
    targetCounts.set(meld.playerId, (targetCounts.get(meld.playerId) ?? 0) + 1)
  }

  return (
    <group>
      {melds.map((meld) => {
        const isComplete = isCompletedMeld(meld)
        const ownerIndexes = isComplete ? ownerCompleteMeldIndexes : ownerMeldIndexes
        const ownerMeldIndex = ownerIndexes.get(meld.playerId) ?? 0
        ownerIndexes.set(meld.playerId, ownerMeldIndex + 1)
        const isLocalMeld = meld.playerId === viewerPlayerId
        const ownerMeldCount = (isComplete ? ownerCompleteMeldCounts : ownerMeldCounts).get(meld.playerId) ?? 1
        const maxColumnsPerRow = isComplete ? 1 : MELD_LAYOUT.maxColumnsPerRow
        const row = Math.floor(ownerMeldIndex / maxColumnsPerRow)
        const column = ownerMeldIndex % maxColumnsPerRow
        const columnsInRow = Math.min(maxColumnsPerRow, ownerMeldCount - row * maxColumnsPerRow)
        const startX = isComplete
          ? MELD_LAYOUT.completedX
          : (column - (columnsInRow - 1) / 2) * MELD_LAYOUT.columnSpacing
        const startZ = isComplete
          ? (isLocalMeld
            ? MELD_LAYOUT.localBaseZ + 0.1 - row * MELD_LAYOUT.completedRowSpacing
            : MELD_LAYOUT.opponentBaseZ - 0.1 + row * MELD_LAYOUT.completedRowSpacing)
          : isLocalMeld
            ? MELD_LAYOUT.localBaseZ - row * MELD_LAYOUT.rowSpacing
            : MELD_LAYOUT.opponentBaseZ + row * MELD_LAYOUT.rowSpacing
        const animateFrom: [number, number, number] = isLocalMeld
          ? [0, 2.18, localHandBaseZ]
          : [0, 2.1, MELD_LAYOUT.opponentBaseZ - 0.15]
        const visibleCards = meld.cards.map((card, originalIndex) => ({ card, originalIndex }))
        const visibleMeldCardIds = visibleCards.map(({ card }) => `${meld.id}-${card.id}`).reverse()
        const meldHasJoker = visibleCards.some(({ card }) => isJoker(card))
        const usesCompactSequenceLayout = sequenceMeldUsesCompactLayout(
          meld.type,
          visibleCards.length,
          meldHasJoker,
          isComplete,
        )
        const cardSpacing = isComplete
          ? CARD_HEIGHT * 0.14
          : usesCompactSequenceLayout
            ? CARD_HEIGHT * MELOD_SEQUENCE_SLOT_SPACING_FACTOR
            : meld.type === 'sequence'
              ? CARD_HEIGHT * 0.5
              : CARD_HEIGHT * 0.42
        const zDirection = isLocalMeld ? -1 : 1
        const visibleSlotCount = sequenceMeldVisibleSlotCount(visibleCards.length, usesCompactSequenceLayout)
        const burstZ = startZ + ((visibleSlotCount - 1) * cardSpacing * zDirection) / 2
        const showPointBurst = activePointBurstMeldIds.has(meld.id)

        return (
          <group key={meld.id}>
            <DevOutline
              width={CARD_HEIGHT * 0.72}
              height={Math.max(CARD_HEIGHT * 0.72, (visibleSlotCount - 1) * cardSpacing + CARD_HEIGHT * 0.72)}
              position={[
                startX,
                tableCardBaseY,
                startZ + ((visibleSlotCount - 1) * cardSpacing * zDirection) / 2,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              color="#8b5cf6"
            />
            {visibleCards.map(({ card, originalIndex }, visibleCardIndex) => {
              const meldCardId = `${meld.id}-${card.id}`
              const swappableMeldJokerId = `${meld.id}:${card.id}`
              const shouldMaterialize = materializingMeldCardIds.has(meldCardId)
              const isJoker = card.rank === 'JOKER' || card.suit === 'joker'
              const isClickableJoker = canSwapJoker && isJoker
              const isSwappableJoker = swappableMeldJokerIds.has(swappableMeldJokerId)
              const isDraggedSwappableJoker = draggedSwappableMeldJokerIds.has(swappableMeldJokerId)
              const isDiscardPileMeldTarget = discardPileMeldTargetIds.has(meld.id)
              const isDiscardPileJokerTarget = discardPileJokerTargetIds.has(swappableMeldJokerId)
              const isOwnMeldAttachTarget = isLocalMeld && ownMeldAttachTargetIds.has(meld.id)
              const isDraggedOwnMeldAttachTarget = isLocalMeld && draggedOwnMeldAttachTargetIds.has(meld.id)
              const isHoveredJoker = hoveredMeldJokerId === swappableMeldJokerId
              const shouldElevateMeldAboveHand =
                isLocalMeld && (isDraggedSwappableJoker || isDraggedOwnMeldAttachTarget)
              const jokerSwapZLift = shouldElevateMeldAboveHand ? LOCAL_MELD_JOKER_SWAP_Z_LIFT : 0
              const interactionY = shouldElevateMeldAboveHand
                ? localMeldInteractionY + originalIndex * 0.006
                : tableCardBaseY + originalIndex * 0.006
              const isHighlightedTarget =
                isSwappableJoker ||
                isDraggedSwappableJoker ||
                isDiscardPileMeldTarget ||
                isDiscardPileJokerTarget ||
                isOwnMeldAttachTarget ||
                isDraggedOwnMeldAttachTarget
              const hasAttachInteraction = isOwnMeldAttachTarget || isDraggedOwnMeldAttachTarget
              const hasPointerInteraction =
                isClickableJoker || isDraggedSwappableJoker || hasAttachInteraction
              const { slotIndex, stackLayer } = sequenceMeldCardSlot(originalIndex, visibleCards.length)
              const resolvedSlotIndex = usesCompactSequenceLayout ? slotIndex : visibleCardIndex
              const middleStackOffset = usesCompactSequenceLayout && stackLayer > 0 ? stackLayer * MELOD_SEQUENCE_MIDDLE_STACK_OFFSET : 0

              return (
                <CardMesh
                  card={card}
                  key={meldCardId}
                  position={[
                    startX,
                    interactionY,
                    startZ + resolvedSlotIndex * cardSpacing * zDirection + middleStackOffset * zDirection + jokerSwapZLift,
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  animateFrom={shouldMaterialize ? animateFrom : undefined}
                  scale={isComplete ? COMPLETED_MELD_SCALE : 1}
                  renderOrder={
                    shouldElevateMeldAboveHand
                      ? 120 + resolvedSlotIndex * 10 + stackLayer
                      : resolvedSlotIndex * 10 + stackLayer
                  }
                  layerOnTop={shouldElevateMeldAboveHand}
                  selected={isHighlightedTarget}
                  hovered={
                    isHoveredJoker ||
                    isDraggedSwappableJoker ||
                    isDiscardPileMeldTarget ||
                    isDiscardPileJokerTarget ||
                    isOwnMeldAttachTarget ||
                    isDraggedOwnMeldAttachTarget
                  }
                  outlineColor={isHighlightedTarget ? '#15803d' : undefined}
                  fidgetTrigger={fidgetTriggers.get(meldCardId) ?? 0}
                  fidgetFallDelay={visibleMeldCardIds.indexOf(meldCardId) * 0.045}
                  fidgetSideDirection={isLocalMeld ? -1 : 1}
                  onClick={() => {
                    triggerMeldFidget(visibleMeldCardIds)
                    if (isDiscardPileJokerTarget) {
                      onDiscardPileJokerTargetClick(meld.id, card.id)
                    } else if (isDiscardPileMeldTarget) {
                      onDiscardPileMeldTargetClick(meld.id)
                    } else if (isClickableJoker && isSwappableJoker) {
                      onMeldJokerClick(meld.id, card.id)
                    } else if (isOwnMeldAttachTarget) {
                      onAttachToMeldClick(meld.id)
                    } else if (isClickableJoker) {
                      onMeldJokerClick(meld.id, card.id)
                    }
                  }}
                  onPointerOver={hasPointerInteraction ? () => {
                    if (isClickableJoker) {
                      setHoveredMeldJokerId(swappableMeldJokerId)
                    }
                    if (isDraggedSwappableJoker) {
                      onMeldJokerDropTargetChange({ meldId: meld.id, jokerCardId: card.id })
                    }
                    if (isDraggedOwnMeldAttachTarget) {
                      onAttachToMeldDropTargetChange(meld.id)
                    }
                  } : undefined}
                  onPointerOut={hasPointerInteraction ? () => {
                    if (isClickableJoker) {
                      setHoveredMeldJokerId(null)
                    }
                    if (isDraggedSwappableJoker) {
                      onMeldJokerDropTargetChange(null)
                    }
                    if (isDraggedOwnMeldAttachTarget) {
                      onAttachToMeldDropTargetChange(null)
                    }
                  } : undefined}
                />
              )
            })}
            {showPointBurst ? (
              <PointsBurst
                points={getMeldPoints(meld)}
                position={[startX, tableCardBaseY + 1.15, burstZ]}
                onComplete={() => {
                  setActivePointBurstMeldIds((currentMeldIds) => {
                    const nextMeldIds = new Set(currentMeldIds)
                    nextMeldIds.delete(meld.id)
                    return nextMeldIds
                  })
                }}
              />
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
