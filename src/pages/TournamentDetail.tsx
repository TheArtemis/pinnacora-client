import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  completeTournament,
  createTournamentGame,
  getTournament,
  type Tournament,
} from '../api/client'
import { useAuth } from '../auth/useAuth'

function formatDate(value: string | null) {
  if (!value) {
    return 'Not finished'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function tournamentLink(tournamentId: string) {
  return `${window.location.origin}/tournaments/${tournamentId}`
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
      navigate(`/game/${response.game.roomCode}?tournamentId=${tournament.id}&gameDbId=${response.game.id}`)
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
        <p className="muted">Loading tournament...</p>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="page-shell tournaments-page">
        <p className="form-error">{error || 'Tournament not found.'}</p>
        <Link className="text-link" to="/tournaments">
          Back to tournaments
        </Link>
      </main>
    )
  }

  const activeGame = tournament.games.find((game) => game.status !== 'FINISHED')
  const hasActiveGame = Boolean(activeGame)
  const canStartGame = tournament.status === 'ACTIVE' && !hasActiveGame

  return (
    <main className="page-shell tournaments-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{tournament.status === 'ACTIVE' ? 'Active tournament' : 'Past tournament'}</p>
          <h1>{tournament.name}</h1>
          <p className="lede">Private join code: {tournament.joinCode}</p>
        </div>
        <div className="header-actions">
          {activeGame ? (
            <Link
              className="primary-link"
              to={`/game/${activeGame.roomCode}?tournamentId=${tournament.id}&gameDbId=${activeGame.id}`}
            >
              Go to game
            </Link>
          ) : null}
          <button type="button" className="secondary-button" onClick={handleCopyTournamentLink}>
            {copiedLink ? 'Copied!' : 'Copy tournament link'}
          </button>
          <Link className="secondary-link" to="/tournaments">
            All tournaments
          </Link>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <h2>Players</h2>
          <div className="player-list">
            {tournament.participants.map((participant) => (
              <span key={participant.id}>
                {participant.user.displayName ?? participant.user.email ?? 'Player'}
              </span>
            ))}
          </div>
        </article>

      </section>

      <section className="dashboard-panel">
        <div className="section-heading section-heading--compact">
          <h2>Standings</h2>
          <span>{tournament.results.finishedGames} finished games</span>
        </div>
        <div className="standings">
          {tournament.results.standings.map((standing, index) => (
            <article className="standing-row" key={standing.user.id}>
              <strong>
                {index + 1}. {standing.user.displayName ?? standing.user.email ?? 'Player'}
              </strong>
              <span>{standing.wins} wins</span>
              <span>{standing.gamesPlayed} played</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <h2>Games</h2>
        </div>
        <div className="game-list">
          {canStartGame ? (
            <button
              type="button"
              className="game-row game-row--action"
              onClick={handleCreateGame}
              disabled={submitting}
            >
              + {submitting ? 'Starting game...' : 'Start new game'}
            </button>
          ) : null}
          {tournament.games.map((game) => (
            <article className="game-row" key={game.id}>
              <div>
                <strong>{game.roomCode}</strong>
                <p className="muted">
                  {game.status} · Winner:{' '}
                  {game.winner?.displayName ?? game.winner?.email ?? 'Not decided'} · Finished:{' '}
                  {formatDate(game.finishedAt)}
                </p>
              </div>
              {game.status !== 'FINISHED' ? (
                <Link
                  className="text-link"
                  to={`/game/${game.roomCode}?tournamentId=${tournament.id}&gameDbId=${game.id}`}
                >
                  Open game
                </Link>
              ) : null}
            </article>
          ))}
          {!canStartGame && tournament.games.length === 0 ? <p className="muted">No games yet.</p> : null}
        </div>
      </section>

      {tournament.status === 'ACTIVE' ? (
        <footer className="detail-actions">
          <button type="button" className="secondary-button" onClick={handleCompleteTournament} disabled={submitting}>
            Mark tournament complete
          </button>
        </footer>
      ) : null}
    </main>
  )
}
