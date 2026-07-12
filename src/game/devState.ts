import type { Card } from './cardTypes'
import { FULL_DECK } from './deckCatalog'
import { getMeldType } from './melds'
import type { GamePhase, ServerGameMeld, ServerGameState } from './serverTypes'

export type DevDraftState = {
  status: ServerGameState['status']
  phase: GamePhase
  currentPlayerId: string
  playerHands: Record<string, Card[]>
  discardPile: Card[]
  melds: ServerGameMeld[]
}

export type DevStatePatch = {
  status: ServerGameState['status']
  phase: GamePhase
  currentPlayerId: string
  playerHands: Record<string, Card[]>
  discardPile: Card[]
  melds: Array<{
    id: string
    playerId: string
    type: ServerGameMeld['type']
    cards: Card[]
  }>
}

function collectUsedCardIds(draft: DevDraftState) {
  const usedIds = new Set<string>()

  for (const hand of Object.values(draft.playerHands)) {
    for (const card of hand) {
      usedIds.add(card.id)
    }
  }

  for (const card of draft.discardPile) {
    usedIds.add(card.id)
  }

  for (const meld of draft.melds) {
    for (const card of meld.cards) {
      usedIds.add(card.id)
    }
  }

  return usedIds
}

export function createDevDraftFromState(state: ServerGameState | null): DevDraftState | null {
  if (!state) {
    return null
  }

  const playerHands: Record<string, Card[]> = {}

  for (const player of state.players) {
    playerHands[player.id] = [...(player.hand ?? [])]
  }

  return {
    status: state.status,
    phase: state.phase,
    currentPlayerId: state.currentPlayerId ?? state.players[0]?.id ?? '',
    playerHands,
    discardPile: [...state.discardPile],
    melds: state.melds.map((meld) => ({
      ...meld,
      cards: [...meld.cards],
    })),
  }
}

export function getAvailableCards(draft: DevDraftState) {
  const usedIds = collectUsedCardIds(draft)
  return FULL_DECK.filter((card) => !usedIds.has(card.id))
}

export function buildDevStatePatch(draft: DevDraftState): DevStatePatch {
  return {
    status: draft.status,
    phase: draft.phase,
    currentPlayerId: draft.currentPlayerId,
    playerHands: draft.playerHands,
    discardPile: draft.discardPile,
    melds: draft.melds.map((meld) => ({
      id: meld.id,
      playerId: meld.playerId,
      type: meld.type,
      cards: meld.cards,
    })),
  }
}

export function addCardToPlayerHand(draft: DevDraftState, playerId: string, card: Card): DevDraftState {
  const currentHand = draft.playerHands[playerId] ?? []

  return {
    ...draft,
    playerHands: {
      ...draft.playerHands,
      [playerId]: [...currentHand, card],
    },
  }
}

export function removeCardFromPlayerHand(draft: DevDraftState, playerId: string, cardId: string): DevDraftState {
  const currentHand = draft.playerHands[playerId] ?? []

  return {
    ...draft,
    playerHands: {
      ...draft.playerHands,
      [playerId]: currentHand.filter((card) => card.id !== cardId),
    },
  }
}

export function addCardToDiscardPile(draft: DevDraftState, card: Card): DevDraftState {
  return {
    ...draft,
    discardPile: [...draft.discardPile, card],
  }
}

export function removeCardFromDiscardPile(draft: DevDraftState, cardId: string): DevDraftState {
  return {
    ...draft,
    discardPile: draft.discardPile.filter((card) => card.id !== cardId),
  }
}

export function addMeldFromCards(
  draft: DevDraftState,
  playerId: string,
  cards: Card[],
  meldType?: ServerGameMeld['type'],
): DevDraftState {
  const resolvedType = meldType ?? getMeldType(cards)

  if (!resolvedType) {
    return draft
  }

  return {
    ...draft,
    melds: [
      ...draft.melds,
      {
        id: `dev-meld-${Date.now()}-${draft.melds.length}`,
        playerId,
        type: resolvedType,
        cards: [...cards],
      },
    ],
  }
}

export function removeMeld(draft: DevDraftState, meldId: string): DevDraftState {
  return {
    ...draft,
    melds: draft.melds.filter((meld) => meld.id !== meldId),
  }
}

export function removeCardFromMeld(draft: DevDraftState, meldId: string, cardId: string): DevDraftState {
  return {
    ...draft,
    melds: draft.melds
      .map((meld) => {
        if (meld.id !== meldId) {
          return meld
        }

        const cards = meld.cards.filter((card) => card.id !== cardId)

        if (cards.length === 0) {
          return null
        }

        const nextType = getMeldType(cards) ?? meld.type

        return {
          ...meld,
          type: nextType,
          cards,
        }
      })
      .filter((meld): meld is ServerGameMeld => meld !== null),
  }
}

export function addCardToMeld(draft: DevDraftState, meldId: string, card: Card): DevDraftState {
  return {
    ...draft,
    melds: draft.melds.map((meld) => {
      if (meld.id !== meldId) {
        return meld
      }

      const cards = [...meld.cards, card]
      const nextType = getMeldType(cards) ?? meld.type

      return {
        ...meld,
        type: nextType,
        cards,
      }
    }),
  }
}

export function moveCardBetweenZones(
  draft: DevDraftState,
  card: Card,
  from: { zone: 'hand' | 'discard' | 'meld'; playerId?: string; meldId?: string },
  to: { zone: 'hand' | 'discard' | 'meld'; playerId?: string; meldId?: string },
): DevDraftState {
  let nextDraft = draft

  if (from.zone === 'hand' && from.playerId) {
    nextDraft = removeCardFromPlayerHand(nextDraft, from.playerId, card.id)
  } else if (from.zone === 'discard') {
    nextDraft = removeCardFromDiscardPile(nextDraft, card.id)
  } else if (from.zone === 'meld' && from.meldId) {
    nextDraft = removeCardFromMeld(nextDraft, from.meldId, card.id)
  }

  if (to.zone === 'hand' && to.playerId) {
    nextDraft = addCardToPlayerHand(nextDraft, to.playerId, card)
  } else if (to.zone === 'discard') {
    nextDraft = addCardToDiscardPile(nextDraft, card)
  } else if (to.zone === 'meld' && to.meldId) {
    nextDraft = addCardToMeld(nextDraft, to.meldId, card)
  }

  return nextDraft
}

export function remainingDeckCount(draft: DevDraftState) {
  return getAvailableCards(draft).length
}
