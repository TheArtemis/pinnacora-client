import type { Card } from './cardTypes'

export type ServerGameStatus = 'waiting' | 'playing' | 'paused' | 'finished'
export type GamePhase = 'waiting' | 'draw' | 'discard' | 'finished'

export type ServerGamePlayer = {
  id: string
  name: string
  connected: boolean
  handCount: number
  hand?: Card[]
}

export type ServerGameMeld = {
  id: string
  playerId: string
  type: 'set' | 'sequence'
  cards: Card[]
  points?: number
}

export type ServerGameState = {
  id: string
  status: ServerGameStatus
  phase: GamePhase
  players: ServerGamePlayer[]
  deckCount: number
  discardPile: Card[]
  melds: ServerGameMeld[]
  currentPlayerId?: string
  youPlayerId?: string
}
