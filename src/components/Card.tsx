import type { Card as CardType } from '../game/cardTypes'

type CardProps = {
  card: CardType
  hidden?: boolean
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
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
  onClick,
  onMouseEnter,
}: CardProps) {
  if (hidden) {
    return <div className="playing-card playing-card--hidden">P</div>
  }

  const isRed = card.suit === 'diamonds' || card.suit === 'hearts'
  const className = [
    'playing-card',
    onClick ? 'playing-card-button' : '',
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
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        disabled={disabled}
        aria-pressed={selected}
      >
        {contents}
      </button>
    )
  }

  return (
    <div className={className} onMouseEnter={onMouseEnter}>
      {contents}
    </div>
  )
}
