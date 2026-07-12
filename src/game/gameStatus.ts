import type { ServerGameState } from './serverTypes'

export function statusText(state: ServerGameState | null) {
  if (!state) {
    return 'Waiting for game state...'
  }

  if (state.status === 'waiting') {
    return 'Waiting for both players to connect.'
  }

  if (state.status === 'paused') {
    return 'Game paused until both players reconnect.'
  }

  if (state.status === 'finished') {
    const winner = state.players.find((player) => player.id === state.winnerId)
    const winnerName = winner?.id === state.youPlayerId ? 'You' : winner?.name
    const winnerScore = state.winnerId ? state.finalScores?.[state.winnerId]?.total : undefined

    if (winnerName && winnerScore !== undefined) {
      return `${winnerName} won with ${winnerScore} points.`
    }

    return winnerName ? `${winnerName} won the game.` : 'Game finished.'
  }

  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId)
  const currentName = currentPlayer?.id === state.youPlayerId ? 'Your' : `${currentPlayer?.name ?? 'Player'}'s`
  const action = state.phase === 'draw' ? 'draw from the deck or discard pile' : 'discard a card'

  return `${currentName} turn to ${action}.`
}

export function formatPlayerPoints(state: ServerGameState, playerId: string, meldPoints: number) {
  const finalScore = state.finalScores?.[playerId]

  if (state.status === 'finished' && finalScore) {
    const breakdown = [
      `${finalScore.meldPoints} table`,
      finalScore.finishBonus > 0 ? `+${finalScore.finishBonus} finish` : null,
      finalScore.handPenalty > 0 ? `-${finalScore.handPenalty} hand` : null,
    ].filter(Boolean).join(' · ')

    return `${finalScore.total} points (${breakdown})`
  }

  return `${meldPoints} points`
}
