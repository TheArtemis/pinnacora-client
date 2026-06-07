import type { ServerGameState } from '../../game/serverTypes'
import CardMesh from './CardMesh'
import { handFanLayout, localPlayerId } from './layout'

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
          edgeYOffset: 0.56,
          baseZ: -5.56,
          edgeZOffset: 0.84,
        })
        const isHovered = hoveredCardIndexes.has(index)

        return (
          <CardMesh
            hidden
            key={`${opponent.id}-hidden-${index}`}
            position={[x, y, z]}
            rotation={[-0.24, normalizedIndex * 0.08, -fanAngle]}
            hovered={isHovered}
            renderOrder={isHovered ? 80 + index : index}
            layerOnTop
          />
        )
      })}
    </group>
  )
}
