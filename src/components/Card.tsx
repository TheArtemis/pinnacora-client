import type { Card as CardType } from '../game/cardTypes'
import type { DragEventHandler } from 'react'

type CardProps = {
  card: CardType
  hidden?: boolean
  selected?: boolean
  disabled?: boolean
  draggable?: boolean
  onClick?: () => void
  onDragEnd?: () => void
  onDragOver?: DragEventHandler<HTMLElement>
  onDragStart?: DragEventHandler<HTMLElement>
  onMouseEnter?: () => void
}

const suitSymbols: Record<CardType['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  joker: 'Joker',
}

export default function Card({
  card,
  hidden = false,
  selected = false,
  disabled = false,
  draggable = false,
  onClick,
  onDragEnd,
  onDragOver,
  onDragStart,
  onMouseEnter,
}: CardProps) {
  if (hidden) {
    return <div className="playing-card playing-card--hidden">P</div>
  }

  const isRed = card.suit === 'diamonds' || card.suit === 'hearts'
  const canDrag = draggable && !disabled
  const className = [
    'playing-card',
    onClick || canDrag ? 'playing-card-button' : '',
    isRed ? 'playing-card--red' : '',
    selected ? 'playing-card--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const contents = (
    <>
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit" aria-label={card.suit}>
        {suitSymbols[card.suit]}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        draggable={canDrag}
        onClick={onClick}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragStart={canDrag ? onDragStart : undefined}
        onMouseEnter={onMouseEnter}
        disabled={disabled}
        aria-pressed={selected}
      >
        {contents}
      </button>
    )
  }

  return (
    <div
      className={className}
      draggable={canDrag}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={canDrag ? onDragStart : undefined}
      onMouseEnter={onMouseEnter}
    >
      {contents}
    </div>
  )
}
