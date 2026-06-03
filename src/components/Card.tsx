import type { Card as CardType } from '../game/types'

type CardProps = {
  card: CardType
  hidden?: boolean
}

const suitSymbols: Record<CardType['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

export default function Card({ card, hidden = false }: CardProps) {
  if (hidden) {
    return <div className="playing-card playing-card--hidden">P</div>
  }

  const isRed = card.suit === 'diamonds' || card.suit === 'hearts'

  return (
    <div className={`playing-card ${isRed ? 'playing-card--red' : ''}`}>
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit" aria-label={card.suit}>
        {suitSymbols[card.suit]}
      </span>
    </div>
  )
}
