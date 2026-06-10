import type { ServerGameState } from '../../game/serverTypes'

export const emptyMelds: ServerGameState['melds'] = []

export const TABLE = {
  outerWidth: 48,
  outerDepth: 22,
  playingWidth: 42,
  playingDepth: 17,
  railThickness: 0.52,
  railHeight: 0.32,
  playingInset: 1.3,
} as const

export const MELD_LAYOUT = {
  maxColumnsPerRow: 12,
  columnSpacing: 2.5,
  rowSpacing: 3,
  localBaseZ: 6,
  opponentBaseZ: -6,
  completedX: 19,
  completedRowSpacing: 1.28,
} as const

export const deckPosition = {
  x: -14,
  z: -0.4,
}

export const localHandBaseZ = 8
export const tableCardBaseY = 0.14
/** Lift own meld cards to hand height so clicks reach them without disabling hand selection. */
export const localMeldInteractionY = 2.22
