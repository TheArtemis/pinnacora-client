import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  completeTournament,
  createTournamentGame,
  getTournament,
  type Tournament,
} from '../api/client'
import { useAuth } from '../auth/useAuth'
import {
  displayPlayerName,
  formatGameStatus,
  formatShortDate,
  getActiveGame,
  tournamentGamePath,
} from '../tournaments/display'

function tournamentLink(tournamentId: string) {
  return `${window.location.origin}/tournaments/${tournamentId}`
}

function riseStyle(index: number): CSSProperties {
  return { '--rise-index': index } as CSSProperties
}

export default function TournamentDetail() {
  const navigate = useNavigate()
  const { tournamentId = '' } = useParams()
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (!user || !tournamentId) {
      return
    }

    const currentUser = user
    let cancelled = false

    async function loadTournament() {
      setLoading(true)
      setError('')

      try {
        const response = await getTournament(currentUser, tournamentId)

        if (!cancelled) {
          setTournament(response.tournament)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load tournament.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTournament()

    return () => {
      cancelled = true
    }
  }, [tournamentId, user])

  async function handleCreateGame() {
    if (!user || !tournament) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await createTournamentGame(user, tournament.id)
      navigate(tournamentGamePath(tournament.id, response.game))
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create game.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompleteTournament() {
    if (!user || !tournament) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await completeTournament(user, tournament.id)
      setTournament(response.tournament)
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : 'Could not complete tournament.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyTournamentLink() {
    if (!tournament) {
      return
    }

    await navigator.clipboard.writeText(tournamentLink(tournament.id))
    setCopiedLink(true)
    window.setTimeout(() => setCopiedLink(false), 1800)
  }

  if (loading) {
    return (
      <main className="page-shell tournaments-page">
        <p className="muted tournaments-loading tournaments-rise">Loading tournament...</p>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="page-shell tournaments-page">
        <p className="form-error tournaments-rise">{error || 'Tournament not found.'}</p>
        <Link className="text-link tournaments-rise" style={riseStyle(1)} to="/tournaments">
          Back to tournaments
        </Link>
      </main>
    )
  }

  const isActive = tournament.status === 'ACTIVE'
  const activeGame = getActiveGame(tournament)
  const leader = tournament.results.standings[0]
  const finishedGames = tournament.games.filter((game) => game.status === 'FINISHED')
  const playerNames = tournament.participants.map((participant) => displayPlayerName(participant.user))
  let riseIndex = 0

  return (
    <main className="page-shell tournaments-page">
      <header className="dashboard-panel tournament-detail__header tournaments-rise" style={riseStyle(riseIndex++)}>
        <div className="tournament-detail__intro">
          <Link className="text-link tournament-detail__back" to="/tournaments">
            Tournaments
          </Link>
          <h1>{tournament.name}</h1>
          <div className="tournament-detail__meta">
            <span>{isActive ? 'Active' : 'Completed'}</span>
            <span className="tournament-detail__code">
              Code <strong>{tournament.joinCode}</strong>
              <button type="button" className="tournament-detail__copy" onClick={handleCopyTournamentLink}>
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </span>
            <span>{playerNames.join(' vs ')}</span>
          </div>
        </div>

        {isActive ? (
          <div className="tournament-detail__header-action">
            {activeGame ? (
              <Link
                className="tournament-detail__play"
                to={tournamentGamePath(tournament.id, activeGame)}
              >
                <span className="tournament-detail__play-label tournament-detail__play-label--stacked">
                  <span>Continue</span>
                  <span>{activeGame.roomCode}</span>
                </span>
              </Link>
            ) : (
              <button
                type="button"
                className="tournament-detail__play"
                onClick={handleCreateGame}
                disabled={submitting}
              >
                {submitting ? 'Starting...' : 'Start game'}
              </button>
            )}
          </div>
        ) : null}
      </header>

      {!isActive ? (
        <section
          className="dashboard-panel tournament-detail__result tournaments-rise"
          style={riseStyle(riseIndex++)}
        >
          <p>
            Winner: <strong>{leader ? displayPlayerName(leader.user) : '—'}</strong>
            {leader ? ` (${leader.wins} wins)` : null}
          </p>
        </section>
      ) : null}

      {error ? (
        <p className="form-error tournaments-rise" style={riseStyle(riseIndex++)}>
          {error}
        </p>
      ) : null}

      <section className="dashboard-panel tournaments-rise" style={riseStyle(riseIndex++)}>
        <dl className="stats-grid stats-grid--two">
          <div>
            <dt>Games played</dt>
            <dd>{tournament.results.finishedGames}</dd>
          </div>
          <div>
            <dt>Leader</dt>
            <dd>{leader ? `${displayPlayerName(leader.user)} (${leader.wins})` : '—'}</dd>
          </div>
        </dl>
      </section>

      {tournament.results.standings.length > 0 ? (
        <section className="dashboard-panel tournaments-rise" style={riseStyle(riseIndex++)}>
          <h2>Standings</h2>
          <div className="standings">
            {tournament.results.standings.map((standing, index) => (
              <article className="standing-row" key={standing.user.id}>
                <strong>
                  {index + 1}. {displayPlayerName(standing.user)}
                </strong>
                <span>{standing.wins} wins</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {finishedGames.length > 0 ? (
        <section className="dashboard-panel tournaments-rise" style={riseStyle(riseIndex++)}>
          <h2>Past games</h2>
          <div className="game-list">
            {finishedGames.map((game) => (
              <article className="game-row" key={game.id}>
                <div>
                  <strong>{game.roomCode}</strong>
                  <p className="muted">
                    {formatGameStatus(game.status)}
                    {game.winner ? ` · ${displayPlayerName(game.winner)} won` : ''}
                    {formatShortDate(game.finishedAt) ? ` · ${formatShortDate(game.finishedAt)}` : ''}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isActive ? (
        <footer className="detail-actions tournaments-rise" style={riseStyle(riseIndex++)}>
          <button type="button" className="secondary-button" onClick={handleCompleteTournament} disabled={submitting}>
            Mark complete
          </button>
        </footer>
      ) : null}
    </main>
  )
}
