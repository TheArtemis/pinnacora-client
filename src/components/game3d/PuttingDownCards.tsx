import type { Card as CardType } from '../../game/cardTypes'
import CardMesh from './CardMesh'
import { localHandBaseZ } from './constants'
import { cardFanOffset } from './layout'
import DevOutline from './DevOutline'

type PuttingDownCardsProps = {
  cards: CardType[]
}

export default function PuttingDownCards({ cards }: PuttingDownCardsProps) {
  if (cards.length === 0) {
    return null
  }

  return (
    <group>
      <DevOutline
        width={Math.max(2.4, cards.length * 0.42)}
        height={2.8}
        position={[0, 2.18, localHandBaseZ]}
        rotation={[-0.28, 0, 0]}
        color="#14b8a6"
      />
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
