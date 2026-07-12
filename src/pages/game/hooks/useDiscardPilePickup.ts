import { useCallback, useMemo, useState } from 'react'
import type { Card } from '../../../game/cardTypes'
import {
  buildDiscardPilePickupMeld,
  getMeldType,
  handCardsForDiscardPickup,
  resolveDiscardPilePickupStartIndex,
  validateDiscardPilePickupMeld,
} from '../../../game/melds'
import { getDiscardPileTableTargets } from '../../../game/discardPilePickup'
import { calculateMeldPoints } from '../../../game/scoring'
import type { ServerGameState } from '../../../game/serverTypes'

export function useDiscardPilePickup({
  canPickUpDiscardPile,
  discardPile,
  hand,
  selectedMeldCards,
  serverState,
}: {
  canPickUpDiscardPile: boolean
  discardPile: Card[]
  hand: Card[]
  selectedMeldCards: Card[]
  serverState: ServerGameState | null
}) {
  const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(null)
  const [hoveredStartIndex, setHoveredStartIndex] = useState<number | null>(null)

  const highlightStartIndex = hoveredStartIndex ?? selectedStartIndex

  const pickupHandCards = useMemo(
    () => handCardsForDiscardPickup(hand, selectedMeldCards),
    [hand, selectedMeldCards],
  )

  const resolvedStartIndex = useMemo(() => {
    if (!canPickUpDiscardPile || highlightStartIndex === null) {
      return null
    }

    return resolveDiscardPilePickupStartIndex(discardPile, highlightStartIndex, pickupHandCards)
  }, [canPickUpDiscardPile, discardPile, highlightStartIndex, pickupHandCards])

  const combinationCard =
    resolvedStartIndex === null ? undefined : discardPile[resolvedStartIndex]

  const pickupPlan = useMemo(() => {
    if (resolvedStartIndex === null) {
      return null
    }

    return buildDiscardPilePickupMeld(discardPile, resolvedStartIndex, pickupHandCards)
  }, [discardPile, pickupHandCards, resolvedStartIndex])

  const cardsAddedToHand = pickupPlan?.cardsAddedToHand ?? []

  const tableTargets = useMemo(
    () => getDiscardPileTableTargets(
      serverState?.melds ?? [],
      serverState?.youPlayerId,
      combinationCard,
    ),
    [combinationCard, serverState?.melds, serverState?.youPlayerId],
  )

  const pickupError =
    canPickUpDiscardPile && highlightStartIndex !== null
      ? validateDiscardPilePickupMeld(discardPile, highlightStartIndex, pickupHandCards)
      : ''

  const pickupCombination = pickupPlan?.meldCards ?? (
    combinationCard
      ? [combinationCard, ...pickupHandCards]
      : selectedMeldCards
  )

  const pickupType = pickupError ? undefined : getMeldType(pickupCombination)
  const pickupPoints = pickupType ? calculateMeldPoints(pickupCombination, pickupType) : 0

  const clearSelection = useCallback(() => {
    setSelectedStartIndex(null)
    setHoveredStartIndex(null)
  }, [])

  return {
    setSelectedStartIndex,
    setHoveredStartIndex,
    highlightStartIndex,
    resolvedStartIndex,
    combinationCard,
    pickupPlan,
    cardsAddedToHand,
    meldTargetIds: tableTargets.meldTargetIds,
    jokerTargetIds: tableTargets.jokerTargetIds,
    pickupError,
    pickupCombination,
    pickupPoints,
    clearSelection,
  }
}
