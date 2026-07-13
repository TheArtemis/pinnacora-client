import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Tournament } from '../../api/client'
import {
  displayPlayerName,
  getActiveGame,
  tournamentGamePath,
} from '../../tournaments/display'

function tournamentLink(tournamentId: string) {
  return `${window.location.origin}/tournaments/${tournamentId}`
}

export default function TournamentCard({
  tournament,
  riseIndex = 0,
}: {
  tournament: Tournament
  riseIndex?: number
}) {
  const isCompleted = tournament.status === 'COMPLETED'
  const activeGame = getActiveGame(tournament)
  const leader = tournament.results.standings[0]
  const [copied, setCopied] = useState(false)

  async function handleCopyTournamentLink() {
    await navigator.clipboard.writeText(tournamentLink(tournament.id))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article
      className="tournament-card tournaments-rise"
      style={{ '--rise-index': riseIndex } as CSSProperties}
    >
      <div className="card-header">
        <h3>{tournament.name}</h3>
        <span className="status-pill">{isCompleted ? 'Completed' : 'Active'}</span>
      </div>

      {activeGame ? (
        <Link className="primary-link" to={tournamentGamePath(tournament.id, activeGame)}>
          Continue game {activeGame.roomCode}
        </Link>
      ) : !isCompleted ? (
        <Link className="primary-link" to={`/tournaments/${tournament.id}`}>
          Open tournament
        </Link>
      ) : (
        <Link className="secondary-link" to={`/tournaments/${tournament.id}`}>
          View results
        </Link>
      )}

      <p className="muted tournament-card__meta">
        Code {tournament.joinCode}
        {' · '}
        {tournament.results.finishedGames} games
        {leader && !isCompleted ? ` · ${displayPlayerName(leader.user)} leads` : ''}
        {isCompleted && leader ? ` · ${displayPlayerName(leader.user)} won` : ''}
      </p>

      {!isCompleted ? (
        <div className="tournament-card-actions">
          <button type="button" className="secondary-button" onClick={handleCopyTournamentLink}>
            {copied ? 'Copied!' : 'Copy invite link'}
          </button>
        </div>
      ) : null}
    </article>
  )
}
