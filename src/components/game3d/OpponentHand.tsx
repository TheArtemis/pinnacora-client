import type { ServerGameState } from '../../game/serverTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { cardTopFanYOffset, handFanLayout, localPlayerId } from './layout'

const OPPONENT_HAND_TOP_ARC_RADIUS = 3.8

type OpponentHandProps = {
  state: ServerGameState | null
  hoveredCardIndexes: Set<number>
}

export default function OpponentHand({ state, hoveredCardIndexes }: OpponentHandProps) {
  const viewerPlayerId = localPlayerId(state)
  const opponents = state?.players.filter((player) => player.id !== viewerPlayerId) ?? []
  const opponent = opponents[0]

  if (!opponent) {
    return null
  }

  return (
    <group>
      {Array.from({ length: opponent.handCount }).map((_, index) => {
        const { fanAngle, normalizedIndex, x, y, z } = handFanLayout(index, opponent.handCount, {
          radius: 6.9,
          baseY: 1.8,
          edgeYOffset: 0,
          baseZ: -9.35,
          edgeZOffset: 0.84,
        })
        const isHovered = hoveredCardIndexes.has(index)
        const targetRotation: [number, number, number] = [-0.24, normalizedIndex * 0.08, -fanAngle]
        const topFanYOffset = cardTopFanYOffset({
          fanAngle,
          rotationX: targetRotation[0],
          rotationZ: targetRotation[2],
          cardHeight: CARD_HEIGHT,
          cardWidth: CARD_WIDTH,
          arcRadius: OPPONENT_HAND_TOP_ARC_RADIUS,
        })

        return (
          <CardMesh
            hidden
            key={`${opponent.id}-hidden-${index}`}
            position={[x, y - topFanYOffset, z]}
            rotation={targetRotation}
            hovered={isHovered}
            renderOrder={isHovered ? 80 + index : index}
            layerOnTop
          />
        )
      })}
    </group>
  )
}
