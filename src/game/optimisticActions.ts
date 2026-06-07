import type { Card } from './cardTypes'
import { canAddCardToMeld, getMeldType, isMeldInCardOrder, sortMeldCards } from './melds'
import { calculateMeldPoints } from './scoring'
import type { ServerGameState } from './serverTypes'

export type OptimisticGameAction =
  | { id: string; type: 'draw_card'; placeholderCard: Card }
  | { id: string; type: 'pick_up_discard_pile'; cardIndex: number; cardIds: string[]; pickupTarget?: DiscardPilePickupTarget }
  | { id: string; type: 'put_down_meld'; cardIds: string[] }
  | { id: string; type: 'swap_meld_joker'; meldId: string; jokerCardId: string; replacementCardId: string }
  | { id: string; type: 'discard_card'; cardId: string }

export type DiscardPilePickupTarget =
  | { type: 'new_meld' }
  | { type: 'extend_meld'; meldId: string }
  | { type: 'swap_joker'; meldId: string; jokerCardId: string }

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

export function createPickUpDiscardPileAction(
  cardIndex: number,
  cardIds: string[],
  pickupTarget?: DiscardPilePickupTarget,
): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'pick_up_discard_pile',
    cardIndex,
    cardIds,
    pickupTarget,
  }
}

export function createPutDownMeldAction(cardIds: string[]): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'put_down_meld',
    cardIds,
  }
}

export function createSwapMeldJokerAction(
  meldId: string,
  jokerCardId: string,
  replacementCardId: string,
): OptimisticGameAction {
  return {
    id: createClientActionId(),
    type: 'swap_meld_joker',
    meldId,
    jokerCardId,
    replacementCardId,
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
      return projectPickUpDiscardPile(state, action.cardIndex, action.cardIds, action.pickupTarget)
    case 'put_down_meld':
      return projectPutDownMeld(state, action.cardIds)
    case 'swap_meld_joker':
      return projectSwapMeldJoker(state, action.meldId, action.jokerCardId, action.replacementCardId)
    case 'discard_card':
      return projectDiscardCard(state, action.cardId)
  }
}

function hasPinnacora(state: ServerGameState, playerId: string) {
  return state.melds.some((meld) => (
    meld.playerId === playerId &&
    meld.type === 'sequence' &&
    meld.cards.length >= 7
  ))
}

function hasFullPoker(state: ServerGameState, playerId: string) {
  return state.melds.some((meld) => (
    meld.playerId === playerId &&
    meld.type === 'set' &&
    meld.cards.length >= 4
  ))
}

function maybeFinishGame(state: ServerGameState, playerId: string): ServerGameState {
  const player = state.players.find((candidatePlayer) => candidatePlayer.id === playerId)

  if (!player || player.handCount > 0 || !hasPinnacora(state, playerId) || !hasFullPoker(state, playerId)) {
    return state
  }

  return {
    ...state,
    status: 'finished',
    phase: 'finished',
    currentPlayerId: undefined,
    winnerId: playerId,
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
  pickupTarget: DiscardPilePickupTarget = { type: 'new_meld' },
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
  if (chosenHandCards.length !== meldCardIds.length) {
    return null
  }

  const nextHandCards = [
    ...currentHand.filter((card) => !uniqueMeldCardIds.has(card.id)),
    ...cardsAddedToHand,
  ]

  const baseState = {
    ...state,
    phase: 'discard' as const,
    discardPile: state.discardPile.slice(0, cardIndex),
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      return {
        ...player,
        hand: nextHandCards,
        handCount: nextHandCards.length,
      }
    }),
  }

  if (pickupTarget.type === 'extend_meld') {
    const targetMeld = state.melds.find((meld) => meld.id === pickupTarget.meldId)

    if (!targetMeld || targetMeld.playerId !== playerId || !canAddCardToMeld(targetMeld, requiredDiscardCard)) {
      return null
    }

    const nextMeldCards = [...targetMeld.cards, requiredDiscardCard]
    const sortedMeldCards = sortMeldCards(nextMeldCards, targetMeld.type)

    return maybeFinishGame({
      ...baseState,
      melds: state.melds.map((meld) => (
        meld.id === targetMeld.id
          ? { ...meld, cards: sortedMeldCards, points: calculateMeldPoints(sortedMeldCards, meld.type) }
          : meld
      )),
    }, playerId)
  }

  if (pickupTarget.type === 'swap_joker') {
    const targetMeld = state.melds.find((meld) => meld.id === pickupTarget.meldId)
    const jokerCard = targetMeld?.cards.find((card) => card.id === pickupTarget.jokerCardId)

    if (!targetMeld || !jokerCard || !isJoker(jokerCard) || isJoker(requiredDiscardCard)) {
      return null
    }

    const nextMeldCards = targetMeld.cards.map((card) => (
      card.id === pickupTarget.jokerCardId ? requiredDiscardCard : card
    ))
    const nextMeldType = getMeldType(nextMeldCards)

    if (nextMeldType !== targetMeld.type || !isMeldInCardOrder(nextMeldCards, nextMeldType)) {
      return null
    }

    const sortedMeldCards = sortMeldCards(nextMeldCards, nextMeldType)

    return maybeFinishGame({
      ...baseState,
      melds: state.melds.map((meld) => (
        meld.id === targetMeld.id
          ? { ...meld, cards: sortedMeldCards, points: calculateMeldPoints(sortedMeldCards, nextMeldType) }
          : meld
      )),
      players: baseState.players.map((player) => {
        if (player.id !== state.youPlayerId || !player.hand) {
          return player
        }

        const hand = [...player.hand, jokerCard]

        return {
          ...player,
          hand,
          handCount: hand.length,
        }
      }),
    }, playerId)
  }

  const meldCards = [requiredDiscardCard, ...chosenHandCards]
  const meldType = getMeldType(meldCards)

  if (!meldType) {
    return null
  }

  const sortedMeldCards = sortMeldCards(meldCards, meldType)

  return maybeFinishGame({
    ...baseState,
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
  }, playerId)
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

  return maybeFinishGame({
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
  }, playerId)
}

function projectSwapMeldJoker(
  state: ServerGameState,
  meldId: string,
  jokerCardId: string,
  replacementCardId: string,
): ServerGameState | null {
  if (!isCurrentPlayerPhase(state, 'discard')) {
    return null
  }

  const currentPlayer = state.players.find((player) => player.id === state.youPlayerId)
  const meld = state.melds.find((candidateMeld) => candidateMeld.id === meldId)
  const replacementCard = currentPlayer?.hand?.find((card) => card.id === replacementCardId)
  const jokerCard = meld?.cards.find((card) => card.id === jokerCardId)

  if (!currentPlayer?.hand || !meld || !replacementCard || !jokerCard || !isJoker(jokerCard) || isJoker(replacementCard)) {
    return null
  }

  const nextMeldCards = meld.cards.map((card) => (card.id === jokerCardId ? replacementCard : card))
  const nextMeldType = getMeldType(nextMeldCards)

  if (nextMeldType !== meld.type || !isMeldInCardOrder(nextMeldCards, nextMeldType)) {
    return null
  }

  const sortedMeldCards = sortMeldCards(nextMeldCards, nextMeldType)

  return maybeFinishGame({
    ...state,
    melds: state.melds.map((candidateMeld) => {
      if (candidateMeld.id !== meldId) {
        return candidateMeld
      }

      return {
        ...candidateMeld,
        cards: sortedMeldCards,
        points: calculateMeldPoints(sortedMeldCards, nextMeldType),
      }
    }),
    players: state.players.map((player) => {
      if (player.id !== state.youPlayerId || !player.hand) {
        return player
      }

      const hand = [
        ...player.hand.filter((card) => card.id !== replacementCardId),
        jokerCard,
      ]

      return {
        ...player,
        hand,
        handCount: hand.length,
      }
    }),
  }, state.youPlayerId)
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

  return maybeFinishGame({
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
  }, state.youPlayerId)
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

function isJoker(card: Card) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}
