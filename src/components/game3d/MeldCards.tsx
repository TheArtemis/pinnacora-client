import { useEffect, useMemo, useRef, useState } from 'react'
import { getMeldPoints } from '../../game/scoring'
import type { ServerGameState } from '../../game/serverTypes'
import CardMesh, { CARD_HEIGHT } from './CardMesh'
import { emptyMelds, localHandBaseZ, tableCardBaseY } from './constants'
import { localPlayerId } from './layout'
import PointsBurst from './PointsBurst'

const rankOrder: Record<ServerGameState['melds'][number]['cards'][number]['rank'], number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 0,
}
const COMPLETED_MELD_X = 8.85
const COMPLETED_MELD_SCALE = 0.72

type MeldCardsProps = {
  state: ServerGameState | null
  swappableMeldJokerIds: Set<string>
  draggedSwappableMeldJokerIds: Set<string>
  discardPileMeldTargetIds: Set<string>
  discardPileJokerTargetIds: Set<string>
  canSwapJoker: boolean
  onMeldJokerClick: (meldId: string, jokerCardId: string) => void
  onMeldJokerDropTargetChange: (dropTarget: { meldId: string; jokerCardId: string } | null) => void
  onDiscardPileMeldTargetClick: (meldId: string) => void
  onDiscardPileJokerTargetClick: (meldId: string, jokerCardId: string) => void
}

function isJoker(card: ServerGameState['melds'][number]['cards'][number]) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}

function isCompleteMeld(meld: ServerGameState['melds'][number]) {
  if (meld.type === 'set') {
    return meld.cards.length >= 4
  }

  const naturalValues = new Set(
    meld.cards
      .filter((card) => !isJoker(card))
      .map((card) => (card.rank === 'A' ? 1 : rankOrder[card.rank])),
  )

  return meld.cards.length >= 13 && naturalValues.size + meld.cards.filter(isJoker).length >= 13
}

export default function MeldCards({
  state,
  swappableMeldJokerIds,
  draggedSwappableMeldJokerIds,
  discardPileMeldTargetIds,
  discardPileJokerTargetIds,
  canSwapJoker,
  onMeldJokerClick,
  onMeldJokerDropTargetChange,
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
    const targetCounts = isCompleteMeld(meld) ? ownerCompleteMeldCounts : ownerMeldCounts
    targetCounts.set(meld.playerId, (targetCounts.get(meld.playerId) ?? 0) + 1)
  }

  return (
    <group>
      {melds.map((meld) => {
        const isComplete = isCompleteMeld(meld)
        const ownerIndexes = isComplete ? ownerCompleteMeldIndexes : ownerMeldIndexes
        const ownerMeldIndex = ownerIndexes.get(meld.playerId) ?? 0
        ownerIndexes.set(meld.playerId, ownerMeldIndex + 1)
        const isLocalMeld = meld.playerId === viewerPlayerId
        const ownerMeldCount = (isComplete ? ownerCompleteMeldCounts : ownerMeldCounts).get(meld.playerId) ?? 1
        const maxColumnsPerRow = isComplete ? 1 : 6
        const row = Math.floor(ownerMeldIndex / maxColumnsPerRow)
        const column = ownerMeldIndex % maxColumnsPerRow
        const columnsInRow = Math.min(maxColumnsPerRow, ownerMeldCount - row * maxColumnsPerRow)
        const startX = isComplete ? COMPLETED_MELD_X : (column - (columnsInRow - 1) / 2) * 2.96
        const startZ = isComplete
          ? (isLocalMeld ? 6.1 - row * 1.28 : -6.1 + row * 1.28)
          : isLocalMeld ? 5.58 - row * 3.12 : -5.58 + row * 3.12
        const animateFrom: [number, number, number] = isLocalMeld ? [0, 2.18, localHandBaseZ] : [0, 2.1, -6.15]
        const visibleCards = meld.cards.map((card, originalIndex) => ({ card, originalIndex }))
        const visibleMeldCardIds = visibleCards.map(({ card }) => `${meld.id}-${card.id}`).reverse()
        const cardSpacing = isComplete
          ? CARD_HEIGHT * 0.14
          : meld.type === 'sequence' ? CARD_HEIGHT * 0.5 : CARD_HEIGHT * 0.42
        const zDirection = isLocalMeld ? -1 : 1
        const burstZ = startZ + ((visibleCards.length - 1) * cardSpacing * zDirection) / 2
        const showPointBurst = activePointBurstMeldIds.has(meld.id)

        return (
          <group key={meld.id}>
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
              const isHoveredJoker = hoveredMeldJokerId === swappableMeldJokerId

              return (
                <CardMesh
                  card={card}
                  key={meldCardId}
                  position={[
                    startX,
                    tableCardBaseY + originalIndex * 0.006,
                    startZ + visibleCardIndex * cardSpacing * zDirection,
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  animateFrom={shouldMaterialize ? animateFrom : undefined}
                  scale={isComplete ? COMPLETED_MELD_SCALE : 1}
                  selected={isSwappableJoker || isDraggedSwappableJoker || isDiscardPileMeldTarget || isDiscardPileJokerTarget}
                  hovered={isHoveredJoker || isDraggedSwappableJoker || isDiscardPileMeldTarget || isDiscardPileJokerTarget}
                  outlineColor={
                    isSwappableJoker || isDraggedSwappableJoker || isDiscardPileMeldTarget || isDiscardPileJokerTarget
                      ? '#3f7a54'
                      : undefined
                  }
                  fidgetTrigger={fidgetTriggers.get(meldCardId) ?? 0}
                  fidgetFallDelay={visibleMeldCardIds.indexOf(meldCardId) * 0.045}
                  fidgetSideDirection={isLocalMeld ? -1 : 1}
                  onClick={() => {
                    triggerMeldFidget(visibleMeldCardIds)
                    if (isDiscardPileJokerTarget) {
                      onDiscardPileJokerTargetClick(meld.id, card.id)
                    } else if (isDiscardPileMeldTarget) {
                      onDiscardPileMeldTargetClick(meld.id)
                    } else if (isClickableJoker) {
                      onMeldJokerClick(meld.id, card.id)
                    }
                  }}
                  onPointerOver={isClickableJoker || isDraggedSwappableJoker ? () => {
                    if (isClickableJoker) {
                      setHoveredMeldJokerId(swappableMeldJokerId)
                    }
                    if (isDraggedSwappableJoker) {
                      onMeldJokerDropTargetChange({ meldId: meld.id, jokerCardId: card.id })
                    }
                  } : undefined}
                  onPointerOut={isClickableJoker || isDraggedSwappableJoker ? () => {
                    if (isClickableJoker) {
                      setHoveredMeldJokerId(null)
                    }
                    if (isDraggedSwappableJoker) {
                      onMeldJokerDropTargetChange(null)
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
