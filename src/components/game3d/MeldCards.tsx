import { useEffect, useMemo, useRef, useState } from 'react'
import type { ServerGameState } from '../../game/serverTypes'
import CardMesh, { CARD_HEIGHT } from './CardMesh'
import { emptyMelds, localHandBaseZ, tableCardBaseY } from './constants'
import { localPlayerId } from './layout'

type MeldCardsProps = {
  state: ServerGameState | null
}

export default function MeldCards({ state }: MeldCardsProps) {
  const melds = state?.melds ?? emptyMelds
  const viewerPlayerId = localPlayerId(state)
  const currentMeldCardIds = useMemo(() => melds.flatMap((meld) => meld.cards.map((card) => `${meld.id}-${card.id}`)), [melds])
  const currentMeldCardKey = currentMeldCardIds.join('|')
  const hasSeenInitialMeldsRef = useRef(false)
  const seenMeldCardIdsRef = useRef(new Set<string>())
  const [materializingMeldCardIds, setMaterializingMeldCardIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const nextMeldCardIds = currentMeldCardKey ? currentMeldCardKey.split('|') : []
    const nextSeenMeldCardIds = new Set(nextMeldCardIds)

    if (!hasSeenInitialMeldsRef.current) {
      seenMeldCardIdsRef.current = nextSeenMeldCardIds
      hasSeenInitialMeldsRef.current = true
      return
    }

    const nextMaterializingMeldCardIds = new Set(
      nextMeldCardIds.filter((meldCardId) => !seenMeldCardIdsRef.current.has(meldCardId)),
    )

    seenMeldCardIdsRef.current = nextSeenMeldCardIds
    setMaterializingMeldCardIds(nextMaterializingMeldCardIds)

    if (nextMaterializingMeldCardIds.size === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMaterializingMeldCardIds(new Set())
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [currentMeldCardKey])

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

        return (
          <group key={meld.id}>
            {visibleCards.map(({ card, originalIndex }, visibleCardIndex) => {
              const meldCardId = `${meld.id}-${card.id}`
              const shouldMaterialize = materializingMeldCardIds.has(meldCardId)
              const cardSpacing = meld.type === 'sequence' ? CARD_HEIGHT * 0.5 : CARD_HEIGHT * 0.42
              const zDirection = isLocalMeld ? -1 : 1

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
                />
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
