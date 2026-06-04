import type { Card } from './cardTypes'

export type Player = {
  id: string
  name: string
  hand: Card[]
}

export type GameStatus = 'waiting' | 'playing' | 'finished'

export type GameState = {
  id: string
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentPlayerId?: string
  status: GameStatus
}
