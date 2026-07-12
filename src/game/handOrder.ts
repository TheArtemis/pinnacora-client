import type { Card, CardRank, CardSuit } from './cardTypes'

export type HandSortMode = 'suit' | 'value'

const suitOrder: Record<CardSuit, number> = {
  spades: 0,
  hearts: 1,
  clubs: 2,
  diamonds: 3,
  joker: 4,
}

const rankOrder: Record<CardRank, number> = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
  JOKER: 13,
}

export function sortHand(cards: Card[], sortMode: HandSortMode) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const primaryDifference =
        sortMode === 'suit'
          ? suitOrder[left.card.suit] - suitOrder[right.card.suit]
          : rankOrder[left.card.rank] - rankOrder[right.card.rank]
      const secondaryDifference =
        sortMode === 'suit'
          ? rankOrder[left.card.rank] - rankOrder[right.card.rank]
          : suitOrder[left.card.suit] - suitOrder[right.card.suit]

      return primaryDifference || secondaryDifference || left.index - right.index
    })
    .map(({ card }) => card)
}

export function resolveHandOrder(currentOrderIds: string[], cards: Card[], fallbackSortMode: HandSortMode) {
  const cardIds = new Set(cards.map((card) => card.id))
  const orderedExistingIds = currentOrderIds.filter((cardId) => cardIds.has(cardId))
  const baseIds = orderedExistingIds.length > 0
    ? orderedExistingIds
    : sortHand(cards, fallbackSortMode).map((card) => card.id)
  const orderedIdSet = new Set(baseIds)
  const newIds = cards.map((card) => card.id).filter((cardId) => !orderedIdSet.has(cardId))

  return [...baseIds, ...newIds]
}
