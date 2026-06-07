import type { Card } from './cardTypes'
import { getMeldType, sortMeldCards } from './melds'
import { calculateMeldPoints } from './scoring'
import type { ServerGameState } from './serverTypes'

export type OptimisticGameAction =
  | { id: string; type: 'draw_card'; placeholderCard: Card }
  | { id: string; type: 'pick_up_discard_pile'; cardIndex: number; cardIds: string[] }
  | { id: string; type: 'put_down_meld'; cardIds: string[] }
  | { id: string; type: 'discard_card'; cardId: string }

function createClientActionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createPlaceholderCard(actionId: string): Card {
  return {
    id: `pending-draw:${actionId}`,
    rank: 'JOKER',
    suit: 'joker',
  }
}

export function createDrawCardAction(): OptimisticGameAction {
  const id = createClientActionId()

  return {
    id,
    type: 'draw_card',
    placeholderCard: createPlaceholderCard(id),
  }
}

export function createPickUpDiscardPileAction(cardIndex: number, cardIds: string[]): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'pick_up_discard_pile',
    cardIndex,
    cardIds,
  }
}

export function createPutDownMeldAction(cardIds: string[]): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'put_down_meld',
    cardIds,
  }
}

export function createDiscardCardAction(cardId: string): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'discard_card',
    cardId,
  }
}

export function hiddenCardIdsForOptimisticActions(actions: OptimisticGameAction[]) {
  return new Set(
    actions
      .filter((action): action is Extract<OptimisticGameAction, { type: 'draw_card' }> => action.type === 'draw_card')
      .map((action) => action.placeholderCard.id),
  )
}

export function projectOptimisticActions(state: ServerGameState, actions: OptimisticGameAction[]): ServerGameState {
  return actions.reduce<ServerGameState>((projectedState, action) => {
    return projectOptimisticAction(projectedState, action) ?? projectedState
  }, state)
}

export function projectOptimisticAction(state: ServerGameState, action: OptimisticGameAction): ServerGameState | null {
  switch (action.type) {
    case 'draw_card':
      return projectDrawCard(state, action.placeholderCard)
    case 'pick_up_discard_pile':
      return projectPickUpDiscardPile(state, action.cardIndex, action.cardIds)
    case 'put_down_meld':
      return projectPutDownMeld(state, action.cardIds)
    case 'discard_card':
      return projectDiscardCard(state, action.cardId)
  }
}

function projectDrawCard(state: ServerGameState, drawCard: Card): ServerGameState | null {
  if (!isCurrentPlayerPhase(state, 'draw') || state.deckCount <= 0) {
    return null
  }

  return {
    ...state,
    phase: 'discard' as const,
    deckCount: Math.max(0, state.deckCount - 1),
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      const hand = [...player.hand, drawCard]

      return {
        ...player,
        hand,
        handCount: hand.length,
      }
    }),
  }
}

function projectPickUpDiscardPile(
  state: ServerGameState,
  cardIndex: number,
  meldCardIds: string[],
): ServerGameState | null {
  if (!isCurrentPlayerPhase(state, 'draw') || !state.discardPile[cardIndex]) {
    return null
  }

  const playerId = state.youPlayerId
  const currentPlayer = state.players.find((player) => player.id === state.youPlayerId)

  if (!currentPlayer?.hand) {
    return null
  }

  const currentHand = currentPlayer.hand
  const uniqueMeldCardIds = new Set(meldCardIds)

  if (uniqueMeldCardIds.size !== meldCardIds.length) {
    return null
  }

  const requiredDiscardCard = state.discardPile[cardIndex]
  const pickedUpCards = state.discardPile.slice(cardIndex)
  const cardsAddedToHand = pickedUpCards.slice(1)
  const chosenHandCards = meldCardIds
    .map((cardId) => currentHand.find((card) => card.id === cardId))
    .filter((card): card is Card => Boolean(card))
  const meldCards = [requiredDiscardCard, ...chosenHandCards]
  const meldType = getMeldType(meldCards)

  if (chosenHandCards.length !== meldCardIds.length || !meldType) {
    return null
  }

  const sortedMeldCards = sortMeldCards(meldCards, meldType)

  return {
    ...state,
    phase: 'discard' as const,
    discardPile: state.discardPile.slice(0, cardIndex),
    melds: [
      ...state.melds,
      {
        id: `${playerId}-${state.melds.length + 1}-${[requiredDiscardCard.id, ...meldCardIds].join('-')}`,
        playerId,
        type: meldType,
        cards: sortedMeldCards,
        points: calculateMeldPoints(sortedMeldCards, meldType),
      },
    ],
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      const hand = [
        ...player.hand.filter((card) => !uniqueMeldCardIds.has(card.id)),
        ...cardsAddedToHand,
      ]

      return {
        ...player,
        hand,
        handCount: hand.length,
      }
    }),
  }
}

function projectPutDownMeld(state: ServerGameState, cardIds: string[]): ServerGameState | null {
  if (!isCurrentPlayerPhase(state, 'discard')) {
    return null
  }

  const playerId = state.youPlayerId
  const currentPlayer = state.players.find((player) => player.id === state.youPlayerId)

  if (!currentPlayer?.hand) {
    return null
  }

  const currentHand = currentPlayer.hand
  const uniqueCardIds = new Set(cardIds)

  if (uniqueCardIds.size !== cardIds.length) {
    return null
  }

  const chosenCards = cardIds
    .map((cardId) => currentHand.find((card) => card.id === cardId))
    .filter((card): card is Card => Boolean(card))
  const meldType = getMeldType(chosenCards)

  if (chosenCards.length !== cardIds.length || !meldType) {
    return null
  }

  const sortedMeldCards = sortMeldCards(chosenCards, meldType)

  return {
    ...state,
    melds: [
      ...state.melds,
      {
        id: `${playerId}-${state.melds.length + 1}-${cardIds.join('-')}`,
        playerId,
        type: meldType,
        cards: sortedMeldCards,
        points: calculateMeldPoints(sortedMeldCards, meldType),
      },
    ],
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      const hand = player.hand.filter((card) => !uniqueCardIds.has(card.id))

      return {
        ...player,
        hand,
        handCount: hand.length,
      }
    }),
  }
}

function projectDiscardCard(state: ServerGameState, cardId: string): ServerGameState | null {
  if (!isCurrentPlayerPhase(state, 'discard')) {
    return null
  }

  const currentPlayerIndex = state.players.findIndex((player) => player.id === state.youPlayerId)
  const currentPlayer = state.players[currentPlayerIndex]
  const discardedCard = currentPlayer?.hand?.find((card) => card.id === cardId)
  const nextPlayer = state.players[(currentPlayerIndex + 1) % state.players.length]

  if (!currentPlayer?.hand || !discardedCard || !nextPlayer) {
    return null
  }

  return {
    ...state,
    phase: 'draw' as const,
    currentPlayerId: nextPlayer.id,
    discardPile: [...state.discardPile, discardedCard],
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      const hand = player.hand.filter((card) => card.id !== cardId)

      return {
        ...player,
        hand,
        handCount: hand.length,
      }
    }),
  }
}

function isCurrentPlayerPhase(
  state: ServerGameState,
  phase: ServerGameState['phase'],
): state is ServerGameState & { youPlayerId: string } {
  return (
    state.status === 'playing' &&
    Boolean(state.youPlayerId) &&
    state.currentPlayerId === state.youPlayerId &&
    state.phase === phase
  )
}
