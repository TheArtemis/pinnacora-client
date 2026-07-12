import type { ServerGameState } from '../../game/serverTypes'
import { CARD_HEIGHT } from './CardMesh'

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

export const discardAreaPosition = {
  x: 0,
  z: -0.62,
} as const

/** Matches DiscardPile area depth. */
export const DISCARD_AREA_DEPTH = CARD_HEIGHT * 1.34

export const TABLE_CAMERA_FOCUS = {
  lookAt: {
    x: discardAreaPosition.x,
    y: 0.38,
    z: 0.15,
  },
  camera: {
    wide: { y: 10.6, z: 6.2 },
    tall: { y: 12.2, z: 7.1 },
  },
  tableLift: {
    y: 1.08,
    z: 1.18,
  },
} as const

export const TABLE_PRESS_ZOOM = {
  holdDurationMs: 350,
  moveThreshold: 6,
  camera: {
    wide: { y: 11.8, zOffset: 4.2 },
    tall: { y: 13.2, zOffset: 4.8 },
  },
  lookAt: {
    y: 0.38,
  },
} as const

export const localHandBaseZ = 9.75
export const tableCardBaseY = 0.14
/** Lift own meld cards to hand height so clicks reach them without disabling hand selection. */
export const localMeldInteractionY = 2.22
