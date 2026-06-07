import type { ServerGameState } from '../../game/serverTypes'

type HandFanLayoutOptions = {
  radius: number
  baseY: number
  edgeYOffset: number
  baseZ: number
  edgeZOffset: number
}

type CardTopFanYOffsetOptions = {
  fanAngle: number
  rotationX: number
  rotationZ: number
  cardHeight: number
  cardWidth: number
  arcRadius: number
}

export function localPlayerId(state: ServerGameState | null) {
  return state?.players.find((player) => player.hand !== undefined)?.id ?? state?.youPlayerId
}

export function cardFanOffset(index: number, total: number, spacing: number, maxWidth: number) {
  if (total <= 1) {
    return 0
  }

  const resolvedSpacing = Math.min(spacing, maxWidth / Math.max(total - 1, 1))

  return (index - (total - 1) / 2) * resolvedSpacing
}

export function handFanLayout(index: number, total: number, options: HandFanLayoutOptions) {
  const centerIndex = (total - 1) / 2
  const normalizedIndex = centerIndex === 0 ? 0 : (index - centerIndex) / centerIndex
  const maxFanAngle = Math.min(0.96, Math.max(0.38, total * 0.085))
  const fanAngle = normalizedIndex * maxFanAngle
  const curveAmount = Math.abs(normalizedIndex) ** 1.35

  return {
    fanAngle,
    normalizedIndex,
    x: Math.sin(fanAngle) * options.radius,
    y: options.baseY - curveAmount * options.edgeYOffset,
    z: options.baseZ + curveAmount * options.edgeZOffset,
  }
}

export function cardTopFanYOffset({
  fanAngle,
  rotationX,
  rotationZ,
  cardHeight,
  cardWidth,
  arcRadius,
}: CardTopFanYOffsetOptions) {
  const halfCardHeight = cardHeight / 2
  const halfCardWidth = cardWidth / 2
  const absoluteRotationZ = Math.abs(rotationZ)
  const centeredTopYOffset = Math.cos(rotationX) * halfCardHeight
  const topCornerYOffset =
    Math.cos(rotationX) *
    (halfCardHeight * Math.cos(absoluteRotationZ) + halfCardWidth * Math.sin(absoluteRotationZ))
  const topEdgeCompensation = Math.max(0, topCornerYOffset - centeredTopYOffset)
  const topArcDrop = (1 - Math.cos(fanAngle)) * arcRadius

  return topArcDrop + topEdgeCompensation
}
