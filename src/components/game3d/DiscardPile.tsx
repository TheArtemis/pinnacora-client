import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import type { GameTableSceneProps } from './types'

type DiscardPileProps = Pick<
  GameTableSceneProps,
  | 'canDiscard'
  | 'canPickUpDiscardPile'
  | 'discardPileHighlightStartIndex'
  | 'onDiscardPileCardClick'
  | 'onDiscardPileCardHover'
  | 'onDiscardSelectedCard'
> & {
  cards: CardType[]
}

export default function DiscardPile({
  cards,
  canDiscard,
  canPickUpDiscardPile,
  discardPileHighlightStartIndex,
  onDiscardPileCardClick,
  onDiscardPileCardHover,
  onDiscardSelectedCard,
}: DiscardPileProps) {
  const cardSpread = Math.max(0.28, Math.min(0.48, 8.4 / Math.max(cards.length - 1, 1)))

  return (
    <group>
      <mesh position={[-2.36, 0.035, -0.4]} rotation={[-Math.PI / 2, 0, 0]} onClick={canDiscard ? onDiscardSelectedCard : undefined}>
        <planeGeometry args={[CARD_WIDTH * 1.35, CARD_HEIGHT * 1.24]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={canDiscard ? 0.22 : 0.1} />
      </mesh>
      {cards.map((card, index) => {
        const selected = discardPileHighlightStartIndex !== null && index >= discardPileHighlightStartIndex
        const offset = index

        return (
          <CardMesh
            card={card}
            key={card.id}
            position={[-2.36 + offset * cardSpread, 0.08 + index * 0.02, -0.4 - offset * 0.09]}
            rotation={[-Math.PI / 2, 0, -0.08]}
            selected={selected}
            onClick={canPickUpDiscardPile ? () => onDiscardPileCardClick(index) : canDiscard ? onDiscardSelectedCard : undefined}
            onPointerOver={canPickUpDiscardPile ? () => onDiscardPileCardHover(index) : undefined}
            onPointerOut={canPickUpDiscardPile ? () => onDiscardPileCardHover(null) : undefined}
          />
        )
      })}
    </group>
  )
}
