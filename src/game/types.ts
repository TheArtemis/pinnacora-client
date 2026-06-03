export type CardSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'joker'

export type CardRank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER'

export type Card = {
  id: string
  suit: CardSuit
  rank: CardRank
}

export type Player = {
  id: string
  name: string
  hand: Card[]
}

export type GameStatus = 'waiting' | 'playing' | 'finished'
export type ServerGameStatus = 'waiting' | 'playing' | 'paused' | 'finished'
export type GamePhase = 'waiting' | 'draw' | 'discard' | 'finished'

export type GameState = {
  id: string
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentPlayerId?: string
  status: GameStatus
}

export type ServerGamePlayer = {
  id: string
  name: string
  connected: boolean
  handCount: number
  hand?: Card[]
}

export type ServerGameState = {
  id: string
  status: ServerGameStatus
  phase: GamePhase
  players: ServerGamePlayer[]
  deckCount: number
  discardPile: Card[]
  currentPlayerId?: string
  youPlayerId?: string
}
