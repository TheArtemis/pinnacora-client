import type { Card } from './cardTypes'
import { canAttachCardsToOwnMeld, canReplaceMeldJoker } from './melds'
import type { ServerGameMeld } from './serverTypes'

export type HandCardTableTargets = {
  ownMeldAttachTargetIds: Set<string>
  swappableMeldJokerIds: Set<string>
}

const emptyTargets: HandCardTableTargets = {
  ownMeldAttachTargetIds: new Set(),
  swappableMeldJokerIds: new Set(),
}

export function getHandCardsTableTargets(
  cards: Card[],
  melds: ServerGameMeld[],
  viewerPlayerId: string | undefined,
  canUseTableTargets: boolean,
): HandCardTableTargets {
  if (cards.length === 0 || !viewerPlayerId || !canUseTableTargets) {
    return emptyTargets
  }

  const ownMeldAttachTargetIds = new Set<string>()
  const swappableMeldJokerIds = new Set<string>()

  for (const meld of melds) {
    if (canAttachCardsToOwnMeld(meld, viewerPlayerId, cards)) {
      ownMeldAttachTargetIds.add(meld.id)
    }
  }

  if (cards.length === 1) {
    const [card] = cards

    for (const meld of melds) {
      for (const meldCard of meld.cards) {
        if (canReplaceMeldJoker(meld, meldCard.id, card)) {
          swappableMeldJokerIds.add(`${meld.id}:${meldCard.id}`)
        }
      }
    }
  }

  return { ownMeldAttachTargetIds, swappableMeldJokerIds }
}

export function handCardHasTableTargets(targets: HandCardTableTargets) {
  return targets.ownMeldAttachTargetIds.size > 0 || targets.swappableMeldJokerIds.size > 0
}
