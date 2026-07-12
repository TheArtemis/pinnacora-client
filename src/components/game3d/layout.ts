import type { ServerGameState } from '../../game/serverTypes'
import { CARD_HEIGHT } from './CardMesh'
import { DISCARD_AREA_DEPTH, discardAreaPosition } from './constants'

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

export const MELOD_SEQUENCE_COMPACT_VISIBLE_SLOTS = 3
export const MELOD_SEQUENCE_SLOT_SPACING_FACTOR = 0.48
export const MELOD_SEQUENCE_MIDDLE_STACK_OFFSET = 0.018

export function sequenceMeldUsesCompactLayout(
  meldType: 'sequence' | 'set',
  cardCount: number,
  hasJoker: boolean,
  isComplete: boolean,
) {
  return (
    meldType === 'sequence' &&
    !hasJoker &&
    !isComplete &&
    cardCount > MELOD_SEQUENCE_COMPACT_VISIBLE_SLOTS
  )
}

const OPPONENT_MELD_DISCARD_MARGIN = 0.3

export function clampOpponentMeldStartZ(
  startZ: number,
  visibleSlotCount: number,
  cardSpacing: number,
) {
  const meldTrailingExtent = (visibleSlotCount - 1) * cardSpacing + CARD_HEIGHT / 2
  const discardNearZ = discardAreaPosition.z - DISCARD_AREA_DEPTH / 2
  const maxTrailingZ = discardNearZ - OPPONENT_MELD_DISCARD_MARGIN
  const trailingZ = startZ + meldTrailingExtent

  if (trailingZ <= maxTrailingZ) {
    return startZ
  }

  return maxTrailingZ - meldTrailingExtent
}

export function sequenceMeldCardSlot(originalIndex: number, cardCount: number) {
  if (cardCount <= MELOD_SEQUENCE_COMPACT_VISIBLE_SLOTS) {
    return { slotIndex: originalIndex, stackLayer: 0 }
  }

  if (originalIndex === 0) {
    return { slotIndex: 0, stackLayer: 0 }
  }

  if (originalIndex === cardCount - 1) {
    return { slotIndex: MELOD_SEQUENCE_COMPACT_VISIBLE_SLOTS - 1, stackLayer: 0 }
  }

  return { slotIndex: 1, stackLayer: originalIndex - 1 }
}

export function sequenceMeldVisibleSlotCount(cardCount: number, usesCompactLayout: boolean) {
  if (!usesCompactLayout) {
    return cardCount
  }

  return Math.min(MELOD_SEQUENCE_COMPACT_VISIBLE_SLOTS, cardCount)
}
