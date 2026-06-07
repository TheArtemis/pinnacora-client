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
    .map((card) => sequenceCardValue(card, aceHigh))
    .sort((left, right) => left - right)
}

function isJoker(card: Card) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}

function sequenceCardValue(card: Card, aceHigh: boolean) {
  return aceHigh && card.rank === 'A' ? 14 : rankOrder[card.rank]
}

function canFitSequence(values: number[], totalCards: number) {
  const firstValue = values[0]
  const lastValue = values[values.length - 1]

  if (firstValue === undefined || lastValue === undefined) {
    return false
  }

  return lastValue - firstValue + 1 <= totalCards
}

function orderedSequenceAceHigh(cards: Card[]) {
  const lowBase = orderedSequenceBase(cards, false)

  if (lowBase !== undefined) {
    return false
  }

  return orderedSequenceBase(cards, true) !== undefined ? true : undefined
}

function orderedSequenceBase(cards: Card[], aceHigh: boolean) {
  let sequenceBase: number | undefined

  for (const [index, card] of cards.entries()) {
    if (isJoker(card)) {
      continue
    }

    const cardBase = sequenceCardValue(card, aceHigh) - index

    if (sequenceBase === undefined) {
      sequenceBase = cardBase
    } else if (sequenceBase !== cardBase) {
      return undefined
    }
  }

  if (sequenceBase === undefined) {
    return undefined
  }

  const highestValue = sequenceBase + cards.length - 1

  if (sequenceBase < 1 || highestValue > (aceHigh ? 14 : 13)) {
    return undefined
  }

  return sequenceBase
}

function sequenceUsesAceHigh(cards: Card[]) {
  const orderedAceHigh = orderedSequenceAceHigh(cards)

  if (orderedAceHigh !== undefined) {
    return orderedAceHigh
  }

  const lowValues = sequenceValues(cards, false)
  const highValues = sequenceValues(cards, true)

  return !canFitSequence(lowValues, cards.length) && canFitSequence(highValues, cards.length)
}

function sortSequenceCards(cards: Card[]) {
  const useAceHigh = sequenceUsesAceHigh(cards)

  if (cards.some(isJoker) && orderedSequenceAceHigh(cards) !== undefined) {
    return [...cards]
  }

  const jokers = cards.filter(isJoker)
  const naturalCards = cards
    .filter((card) => !isJoker(card))
    .sort((left, right) => sequenceCardValue(left, useAceHigh) - sequenceCardValue(right, useAceHigh))
  const sortedCards: Card[] = []
  const maxValue = useAceHigh ? 14 : 13

  for (const card of naturalCards) {
    const previousNaturalCard = [...sortedCards].reverse().find((candidateCard) => !isJoker(candidateCard))

    if (previousNaturalCard) {
      const gapSize = sequenceCardValue(card, useAceHigh) - sequenceCardValue(previousNaturalCard, useAceHigh) - 1

      for (let gapIndex = 0; gapIndex < gapSize && jokers.length > 0; gapIndex += 1) {
        const joker = jokers.shift()

        if (joker) {
          sortedCards.push(joker)
        }
      }
    }

    sortedCards.push(card)
  }

  while (jokers.length > 0) {
    const firstNaturalCard = sortedCards.find((card) => !isJoker(card))
    const lastNaturalCard = [...sortedCards].reverse().find((card) => !isJoker(card))
    const joker = jokers.shift()

    if (!joker) {
      continue
    }

    if (lastNaturalCard && sequenceCardValue(lastNaturalCard, useAceHigh) + 1 > maxValue && firstNaturalCard) {
      sortedCards.unshift(joker)
    } else {
      sortedCards.push(joker)
    }
  }

  return sortedCards
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

  return sortSequenceCards(cards)
}

export function isMeldInCardOrder(cards: Card[], type: ServerGameMeld['type']) {
  if (type === 'set') {
    return getMeldType(cards) === type
  }

  return orderedSequenceAceHigh(cards) !== undefined
}

export function canReplaceMeldJoker(
  meld: ServerGameMeld,
  jokerCardId: string,
  replacementCard: Card,
) {
  if (isJoker(replacementCard)) {
    return false
  }

  const jokerCard = meld.cards.find((card) => card.id === jokerCardId)

  if (!jokerCard || !isJoker(jokerCard)) {
    return false
  }

  const replacementMeldCards = meld.cards.map((card) => (card.id === jokerCardId ? replacementCard : card))
  const replacementMeldType = getMeldType(replacementMeldCards)

  return replacementMeldType === meld.type && isMeldInCardOrder(replacementMeldCards, replacementMeldType)
}

export function canAddCardToMeld(meld: ServerGameMeld, card: Card) {
  const nextMeldCards = [...meld.cards, card]
  const nextMeldType = getMeldType(nextMeldCards)

  return nextMeldType === meld.type
}
