import { useMemo, useState, type DragEvent } from 'react'
import Card from './Card'
import type { Card as CardType } from '../game/cardTypes'
import { getMeldType, isMeldInCardOrder, sortMeldCards } from '../game/melds'
import { calculateMeldPoints } from '../game/scoring'

type MeldOrderPickerProps = {
  cards: CardType[]
  onConfirm: (orderedCardIds: string[]) => void
  onCancel: () => void
}

function reorderCards(cards: CardType[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return cards
  }

  const nextCards = [...cards]
  const [movedCard] = nextCards.splice(fromIndex, 1)
  nextCards.splice(toIndex, 0, movedCard)

  return nextCards
}

export default function MeldOrderPicker({ cards, onConfirm, onCancel }: MeldOrderPickerProps) {
  const meldType = getMeldType(cards)
  const defaultOrdering = useMemo(() => {
    if (!meldType) {
      return cards
    }

    return sortMeldCards(cards, meldType)
  }, [cards, meldType])
  const [orderedCards, setOrderedCards] = useState(defaultOrdering)
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null)
  const isCurrentOrderValid = meldType ? isMeldInCardOrder(orderedCards, meldType) : false
  const meldPoints = meldType && isCurrentOrderValid ? calculateMeldPoints(orderedCards, meldType) : 0

  function handleDragStart(event: DragEvent<HTMLElement>, cardIndex: number) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(cardIndex))
    setDraggedCardIndex(cardIndex)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, cardIndex: number) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    if (draggedCardIndex === null || draggedCardIndex === cardIndex) {
      return
    }

    setOrderedCards((currentCards) => reorderCards(currentCards, draggedCardIndex, cardIndex))
    setDraggedCardIndex(cardIndex)
  }

  function handleDragEnd() {
    setDraggedCardIndex(null)
  }

  function handleConfirm() {
    if (!isCurrentOrderValid) {
      return
    }

    onConfirm(orderedCards.map((card) => card.id))
  }

  return (
    <div className="meld-order-picker__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="meld-order-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meld-order-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="meld-order-picker__header">
          <h2 id="meld-order-picker-title">Choose card order</h2>
          <p className="muted">
            Drag the cards to set where the joker goes in this sequence. The order affects how the
            combination is scored.
          </p>
        </div>

        <div className="meld-order-picker__cards" aria-label="Combination card order">
          {orderedCards.map((card, cardIndex) => (
            <Card
              key={card.id}
              card={card}
              draggable
              selected={draggedCardIndex === cardIndex}
              onDragStart={(event) => handleDragStart(event, cardIndex)}
              onDragEnd={handleDragEnd}
              onDragOver={(event) => handleDragOver(event, cardIndex)}
            />
          ))}
        </div>

        <div className="meld-order-picker__status">
          {isCurrentOrderValid ? (
            <span className="meld-order-picker__status--valid">This order is valid · {meldPoints} points</span>
          ) : (
            <span className="meld-order-picker__status--invalid">Drag the cards into a valid sequence order.</span>
          )}
        </div>

        <div className="meld-order-picker__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={!isCurrentOrderValid}>
            Put down combination
          </button>
        </div>
      </div>
    </div>
  )
}
