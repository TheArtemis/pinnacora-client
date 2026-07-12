import { useMemo } from 'react'
import { formatPlayerPoints } from '../../game/gameStatus'
import { getMeldPoints } from '../../game/scoring'
import type { ServerGameState } from '../../game/serverTypes'

type GamePlayersPanelProps = {
  serverState: ServerGameState | null
}

export default function GamePlayersPanel({ serverState }: GamePlayersPanelProps) {
  const playerMeldPoints = useMemo(() => {
    const pointsByPlayer = new Map<string, number>()

    for (const meld of serverState?.melds ?? []) {
      pointsByPlayer.set(meld.playerId, (pointsByPlayer.get(meld.playerId) ?? 0) + getMeldPoints(meld))
    }

    return pointsByPlayer
  }, [serverState?.melds])

  return (
    <div className="table-zone table-status-panel">
      <div className="players">
        {serverState?.players.map((player) => (
          <article className="player" key={player.id}>
            <div>
              <strong>{player.id === serverState.youPlayerId ? 'You' : player.name}</strong>
              <small>{player.connected ? 'Connected' : 'Disconnected'}</small>
            </div>
            <span>
              {player.handCount} cards · {formatPlayerPoints(serverState, player.id, playerMeldPoints.get(player.id) ?? 0)}
            </span>
            {player.id === serverState.currentPlayerId ? <span className="turn-pill">Turn</span> : null}
          </article>
        ))}
        {!serverState ? <p className="muted">Connecting to the table...</p> : null}
      </div>
    </div>
  )
}
