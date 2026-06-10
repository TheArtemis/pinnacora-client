import type { ServerGameState } from '../../game/serverTypes'

export const emptyMelds: ServerGameState['melds'] = []

export const deckPosition = {
  x: -6.2,
  z: -0.4,
}

export const localHandBaseZ = 8
export const tableCardBaseY = 0.14
/** Lift own meld cards to hand height so clicks reach them without disabling hand selection. */
export const localMeldInteractionY = 2.22
