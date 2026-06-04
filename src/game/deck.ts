import type { Card, CardRank, CardSuit } from './cardTypes'

const suits: CardSuit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function createDeck(): Card[] {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({
      id: `${rank}-${suit}`,
      suit,
      rank,
    })),
  )
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentCard = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = currentCard
  }

  return shuffled
}
