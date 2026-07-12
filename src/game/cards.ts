import type { Card } from './cardTypes'

export function isJoker(card: Card) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}
