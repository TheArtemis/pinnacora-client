import type { Card, CardRank, CardSuit } from './cardTypes'

const suits: CardSuit[] = ['clubs', 'diamonds', 'hearts', 'spades']
const ranks: Exclude<CardRank, 'JOKER'>[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
]

export const jokersPerDeck = 2

export function createFullDeck(): Card[] {
  const cards: Card[] = []

  for (let deckIndex = 1; deckIndex <= 2; deckIndex += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({
          id: `deck-${deckIndex}-${rank}-${suit}`,
          suit,
          rank,
        })
      }
    }

    for (let jokerIndex = 1; jokerIndex <= jokersPerDeck; jokerIndex += 1) {
      cards.push({
        id: `deck-${deckIndex}-JOKER-${jokerIndex}`,
        suit: 'joker',
        rank: 'JOKER',
      })
    }
  }

  return cards
}

export const FULL_DECK = createFullDeck()

export function cardLabel(card: Card) {
  if (card.rank === 'JOKER') {
    return 'Joker'
  }

  const suitSymbol: Record<Exclude<CardSuit, 'joker'>, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
  }

  return `${card.rank}${suitSymbol[card.suit as Exclude<CardSuit, 'joker'>] ?? ''}`
}
