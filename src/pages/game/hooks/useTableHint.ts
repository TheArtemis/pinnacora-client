import { useMemo } from 'react'
import { isJoker } from '../../../game/cards'
import { statusText } from '../../../game/gameStatus'
import type { Card } from '../../../game/cardTypes'
import type { ServerGameState } from '../../../game/serverTypes'

export function useTableHint({
  serverState,
  canPickUpDiscardPile,
  canDraw,
  canDiscard,
  combinationCard,
  meldTargetIds,
  jokerTargetIds,
  pickupError,
  pickupCombination,
  pickupPoints,
  cardsAddedToHand,
  selectedJokerSwapReplacementCard,
  selectedMeldCards,
  selectedMeldError,
  selectedMeldPoints,
  ownMeldAttachTargetIds,
  swappableMeldJokerIds,
}: {
  serverState: ServerGameState | null
  canPickUpDiscardPile: boolean
  canDraw: boolean
  canDiscard: boolean
  combinationCard: Card | undefined
  meldTargetIds: Set<string>
  jokerTargetIds: Set<string>
  pickupError: string
  pickupCombination: Card[]
  pickupPoints: number
  cardsAddedToHand: Card[]
  selectedJokerSwapReplacementCard: Card | undefined
  selectedMeldCards: Card[]
  selectedMeldError: string
  selectedMeldPoints: number
  ownMeldAttachTargetIds: Set<string>
  swappableMeldJokerIds: Set<string>
}) {
  return useMemo(() => {
    if (!serverState) {
      return 'Connecting to the table...'
    }

    const hasTablePickupTarget = meldTargetIds.size > 0 || jokerTargetIds.size > 0
    const canAttachSelectedCards = ownMeldAttachTargetIds.size > 0

    if (canPickUpDiscardPile) {
      if (combinationCard) {
        if (hasTablePickupTarget && pickupError) {
          return 'Click a highlighted table combination or joker to pick up from this discard card.'
        }

        return pickupError
          ? `No pickup combination yet: ${pickupError}`
          : `Valid pickup: ${pickupCombination.length} cards worth ${pickupPoints} points go down and ${cardsAddedToHand.length} newer cards join your hand.`
      }

      return 'Click the deck pile to draw, or select hand cards and choose a discard card to pick up.'
    }

    if (canDraw) {
      return 'Click the deck pile to draw.'
    }

    if (canDiscard) {
      if (selectedJokerSwapReplacementCard) {
        if (isJoker(selectedJokerSwapReplacementCard)) {
          return 'Selected joker can be discarded. Select a non-joker card to replace a table joker.'
        }

        if (canAttachSelectedCards && swappableMeldJokerIds.size > 0) {
          return 'Click a highlighted combination of yours to attach this card, click a joker to swap it, or discard.'
        }

        if (canAttachSelectedCards) {
          return 'Click a highlighted combination of yours to attach this card, click the discard pile to discard, or select more cards for a new combination.'
        }

        if (swappableMeldJokerIds.size > 0) {
          return 'Click a highlighted joker on the table (yours or your opponent\'s) to swap it, click the discard pile to discard, or select more cards for a combination.'
        }

        return 'Selected card can be discarded. It cannot attach to or replace any table combination right now.'
      }

      if (selectedMeldCards.length > 0) {
        if (canAttachSelectedCards && selectedMeldError) {
          const cardLabel = selectedMeldCards.length === 1 ? 'card' : `${selectedMeldCards.length} cards`
          return `Click a highlighted combination of yours to attach ${selectedMeldCards.length === 1 ? 'this' : 'these'} ${cardLabel}, or select more cards for a new combination.`
        }

        return selectedMeldError
          ? `Combination not ready: ${selectedMeldError}`
          : `Selected combination is worth ${selectedMeldPoints} points.`
      }

      return 'Select hand cards to discard, attach to one of your combinations, swap for a table joker, or put down a new combination.'
    }

    return statusText(serverState)
  }, [
    canDiscard,
    canDraw,
    canPickUpDiscardPile,
    cardsAddedToHand.length,
    combinationCard,
    jokerTargetIds.size,
    meldTargetIds.size,
    ownMeldAttachTargetIds.size,
    pickupCombination.length,
    pickupError,
    pickupPoints,
    selectedJokerSwapReplacementCard,
    selectedMeldCards,
    selectedMeldError,
    selectedMeldPoints,
    serverState,
    swappableMeldJokerIds.size,
  ])
}
