import type { Card as CardType } from '../../game/cardTypes'
import CardMesh from './CardMesh'
import { localHandBaseZ } from './constants'
import { cardFanOffset } from './layout'

type PuttingDownCardsProps = {
  cards: CardType[]
}

export default function PuttingDownCards({ cards }: PuttingDownCardsProps) {
  if (cards.length === 0) {
    return null
  }

  return (
    <group>
      {cards.map((card, index) => {
        const x = cardFanOffset(index, cards.length, 0.42, 2)

        return (
          <CardMesh
            card={card}
            key={`putting-down-${card.id}`}
            position={[x, 2.18, localHandBaseZ]}
            rotation={[-0.28, 0, cardFanOffset(index, cards.length, 0.1, 0.35)]}
            opacity={0}
            scale={0.62}
            renderOrder={100 + index}
            layerOnTop
          />
        )
      })}
    </group>
  )
}
