import type { Card } from './cardTypes'
import { canAddCardToMeld, canReplaceMeldJoker } from './melds'
import type { DiscardPilePickupTarget } from './optimisticActions'
import type { ServerGameMeld } from './serverTypes'

type DiscardPileTableTargets = {
  meldTargetIds: Set<string>
  jokerTargetIds: Set<string>
  pickupTargets: DiscardPilePickupTarget[]
}

const emptyTargets: DiscardPileTableTargets = {
  meldTargetIds: new Set(),
  jokerTargetIds: new Set(),
  pickupTargets: [],
}

export function getDiscardPileTableTargets(
  melds: ServerGameMeld[],
  youPlayerId: string | undefined,
  combinationCard: Card | undefined,
): DiscardPileTableTargets {
  if (!combinationCard) {
    return emptyTargets
  }

  const meldTargetIds = new Set<string>()
  const jokerTargetIds = new Set<string>()
  const pickupTargets: DiscardPilePickupTarget[] = []

  for (const meld of melds) {
    if (youPlayerId && meld.playerId === youPlayerId && canAddCardToMeld(meld, combinationCard)) {
      meldTargetIds.add(meld.id)
      pickupTargets.push({ type: 'extend_meld', meldId: meld.id })
    }

    for (const card of meld.cards) {
      if (canReplaceMeldJoker(meld, card.id, combinationCard)) {
        jokerTargetIds.add(`${meld.id}:${card.id}`)
        pickupTargets.push({ type: 'swap_joker', meldId: meld.id, jokerCardId: card.id })
      }
    }
  }

  return { meldTargetIds, jokerTargetIds, pickupTargets }
}
