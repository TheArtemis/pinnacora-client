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
