import { useMemo } from 'react'
import type { Card } from '../../../game/cardTypes'
import type { ServerGameState } from '../../../game/serverTypes'

const emptyHand: Card[] = []

export function useGamePhase(serverState: ServerGameState | null) {
  const currentPlayer = useMemo(
    () => serverState?.players.find((player) => player.id === serverState.youPlayerId),
    [serverState],
  )

  const isMyTurn = Boolean(serverState?.youPlayerId && serverState.currentPlayerId === serverState.youPlayerId)
  const canDraw = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'draw'
  const canDiscard = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'discard'
  const canPutDownMeld = canDiscard
  const hand = currentPlayer?.hand ?? emptyHand
  const discardPile = serverState?.discardPile ?? []
  const canPickUpDiscardPile = canDraw && discardPile.length > 0
  const canSelectMeldCards = canPutDownMeld || canPickUpDiscardPile

  return {
    canDraw,
    canDiscard,
    canPutDownMeld,
    canPickUpDiscardPile,
    canSelectMeldCards,
    hand,
    discardPile,
  }
}
