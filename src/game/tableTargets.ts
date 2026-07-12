import type { Card } from './cardTypes'
import { canAttachCardToOwnMeld, canReplaceMeldJoker } from './melds'
import type { ServerGameMeld } from './serverTypes'

export type HandCardTableTargets = {
  ownMeldAttachTargetIds: Set<string>
  swappableMeldJokerIds: Set<string>
}

const emptyTargets: HandCardTableTargets = {
  ownMeldAttachTargetIds: new Set(),
  swappableMeldJokerIds: new Set(),
}

export function getHandCardTableTargets(
  card: Card | undefined,
  melds: ServerGameMeld[],
  viewerPlayerId: string | undefined,
  canUseTableTargets: boolean,
): HandCardTableTargets {
  if (!card || !viewerPlayerId || !canUseTableTargets) {
    return emptyTargets
  }

  const ownMeldAttachTargetIds = new Set<string>()
  const swappableMeldJokerIds = new Set<string>()

  for (const meld of melds) {
    if (canAttachCardToOwnMeld(meld, viewerPlayerId, card)) {
      ownMeldAttachTargetIds.add(meld.id)
    }

    for (const meldCard of meld.cards) {
      if (canReplaceMeldJoker(meld, meldCard.id, card)) {
        swappableMeldJokerIds.add(`${meld.id}:${meldCard.id}`)
      }
    }
  }

  return { ownMeldAttachTargetIds, swappableMeldJokerIds }
}

export function handCardHasTableTargets(targets: HandCardTableTargets) {
  return targets.ownMeldAttachTargetIds.size > 0 || targets.swappableMeldJokerIds.size > 0
}
