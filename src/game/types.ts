export type CardSuit = 'clubs' | 'diamonds' | 'hearts' | 'spades'

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

export type GameState = {
  id: string
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentPlayerId?: string
  status: GameStatus
}
