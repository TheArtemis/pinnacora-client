import type { Card, CardRank, CardSuit } from './cardTypes'
import type { ServerGameMeld } from './serverTypes'

const rankOrder: Record<CardRank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 0,
}

const meldSuitOrder: Record<CardSuit, number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  joker: 4,
}

function sequenceValues(cards: Card[], aceHigh: boolean) {
  return cards
    .filter((card) => !isJoker(card))
    .map((card) => (aceHigh && card.rank === 'A' ? 14 : rankOrder[card.rank]))
    .sort((left, right) => left - right)
}

function isJoker(card: Card) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}

function canFitSequence(values: number[], totalCards: number) {
  const firstValue = values[0]
  const lastValue = values[values.length - 1]

  if (firstValue === undefined || lastValue === undefined) {
    return false
  }

  return lastValue - firstValue + 1 <= totalCards
}

export function validateMeld(cards: Card[]) {
  if (cards.length < 3) {
    return 'Choose at least three cards for a combination.'
  }

  const naturalCards = cards.filter((card) => !isJoker(card))

  if (naturalCards.length === 0) {
    return 'Choose at least one non-joker card for the combination.'
  }

  const uniqueRanks = new Set(naturalCards.map((card) => card.rank))
  const uniqueSuits = new Set(naturalCards.map((card) => card.suit))

  if (uniqueRanks.size === 1) {
    if (cards.length > 4) {
      return 'Same-value combinations can only use four cards, one for each suit.'
    }

    return uniqueSuits.size === naturalCards.length ? '' : 'Same-value combinations need different suits.'
  }

  if (uniqueSuits.size !== 1) {
    return 'Sequences must all be the same suit.'
  }

  if (uniqueRanks.size !== naturalCards.length) {
    return 'Sequences cannot contain duplicate values.'
  }

  if (canFitSequence(sequenceValues(naturalCards, false), cards.length) ||
    canFitSequence(sequenceValues(naturalCards, true), cards.length)) {
    return ''
  }

  return 'Choose consecutive values for a sequence, like A-2-3, 4-5-6, or J-Q-K-A.'
}

export function getMeldType(cards: Card[]): ServerGameMeld['type'] | undefined {
  if (cards.length < 3) {
    return undefined
  }

  const naturalCards = cards.filter((card) => !isJoker(card))

  if (naturalCards.length === 0) {
    return undefined
  }

  const uniqueRanks = new Set(naturalCards.map((card) => card.rank))
  const uniqueSuits = new Set(naturalCards.map((card) => card.suit))

  if (uniqueRanks.size === 1) {
    return cards.length <= 4 && uniqueSuits.size === naturalCards.length ? 'set' : undefined
  }

  if (uniqueSuits.size !== 1 || uniqueRanks.size !== naturalCards.length) {
    return undefined
  }

  return canFitSequence(sequenceValues(naturalCards, false), cards.length) ||
    canFitSequence(sequenceValues(naturalCards, true), cards.length)
    ? 'sequence'
    : undefined
}

export function sortMeldCards(cards: Card[], type: ServerGameMeld['type']) {
  if (type === 'set') {
    return [...cards].sort((left, right) => meldSuitOrder[left.suit] - meldSuitOrder[right.suit])
  }

  const lowValues = sequenceValues(cards, false)
  const highValues = sequenceValues(cards, true)
  const useAceHigh = !canFitSequence(lowValues, cards.length) && canFitSequence(highValues, cards.length)

  return [...cards].sort((left, right) => {
    if (isJoker(left) || isJoker(right)) {
      return Number(isJoker(left)) - Number(isJoker(right))
    }

    const leftRank = useAceHigh && left.rank === 'A' ? 14 : rankOrder[left.rank]
    const rightRank = useAceHigh && right.rank === 'A' ? 14 : rankOrder[right.rank]

    return leftRank - rightRank
  })
}
