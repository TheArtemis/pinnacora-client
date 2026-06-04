import type { Card } from './cardTypes'
import type { GameState, Player } from './clientTypes'
import { createDeck, shuffleDeck } from './deck'

export function createInitialGame(gameId: string): GameState {
  return {
    id: gameId,
    players: [],
    deck: shuffleDeck(createDeck()),
    discardPile: [],
    status: 'waiting',
  }
}

export function dealCards(players: Player[], deck: Card[], cardsPerPlayer = 5) {
  const nextDeck = [...deck]
  const nextPlayers = players.map((player) => ({
    ...player,
    hand: nextDeck.splice(0, cardsPerPlayer),
  }))

  return {
    players: nextPlayers,
    deck: nextDeck,
  }
}
