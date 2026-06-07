import { useEffect, useMemo, useRef, useState } from 'react'
import { getMeldPoints } from '../../game/scoring'
import type { ServerGameState } from '../../game/serverTypes'
import CardMesh, { CARD_HEIGHT } from './CardMesh'
import { emptyMelds, localHandBaseZ, tableCardBaseY } from './constants'
import { localPlayerId } from './layout'
import PointsBurst from './PointsBurst'

type MeldCardsProps = {
  state: ServerGameState | null
  swappableMeldJokerIds: Set<string>
  canSwapJoker: boolean
  onMeldJokerClick: (meldId: string, jokerCardId: string) => void
}

export default function MeldCards({ state, swappableMeldJokerIds, canSwapJoker, onMeldJokerClick }: MeldCardsProps) {
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

  const ownerMeldIndexes = new Map<string, number>()
  const ownerMeldCounts = new Map<string, number>()

  for (const meld of melds) {
    ownerMeldCounts.set(meld.playerId, (ownerMeldCounts.get(meld.playerId) ?? 0) + 1)
  }

  return (
    <group>
      {melds.map((meld) => {
        const ownerMeldIndex = ownerMeldIndexes.get(meld.playerId) ?? 0
        ownerMeldIndexes.set(meld.playerId, ownerMeldIndex + 1)

        const isLocalMeld = meld.playerId === viewerPlayerId
        const ownerMeldCount = ownerMeldCounts.get(meld.playerId) ?? 1
        const maxColumnsPerRow = 6
        const row = Math.floor(ownerMeldIndex / maxColumnsPerRow)
        const column = ownerMeldIndex % maxColumnsPerRow
        const columnsInRow = Math.min(maxColumnsPerRow, ownerMeldCount - row * maxColumnsPerRow)
        const startX = (column - (columnsInRow - 1) / 2) * 2.96
        const startZ = isLocalMeld ? 5.58 - row * 3.12 : -5.58 + row * 3.12
        const animateFrom: [number, number, number] = isLocalMeld ? [0, 2.18, localHandBaseZ] : [0, 2.1, -6.15]
        const visibleCards = meld.cards.map((card, originalIndex) => ({ card, originalIndex }))
        const cardSpacing = meld.type === 'sequence' ? CARD_HEIGHT * 0.5 : CARD_HEIGHT * 0.42
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
                  selected={isSwappableJoker}
                  hovered={isHoveredJoker}
                  outlineColor={isSwappableJoker ? '#3f7a54' : undefined}
                  onClick={isClickableJoker ? () => onMeldJokerClick(meld.id, card.id) : undefined}
                  onPointerOver={isClickableJoker ? () => setHoveredMeldJokerId(swappableMeldJokerId) : undefined}
                  onPointerOut={isClickableJoker ? () => setHoveredMeldJokerId(null) : undefined}
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
