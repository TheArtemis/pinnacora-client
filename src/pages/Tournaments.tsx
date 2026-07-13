import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTournament,
  joinTournament,
  listTournaments,
  type Tournament,
} from '../api/client'
import { useAuth } from '../auth/useAuth'
import TournamentCard from '../components/tournaments/TournamentCard'
import { getActiveGame, tournamentGamePath } from '../tournaments/display'

function riseStyle(index: number): CSSProperties {
  return { '--rise-index': index } as CSSProperties
}

function TournamentSection({
  emptyMessage,
  loading,
  riseOffset,
  title,
  tournaments,
}: {
  emptyMessage: string
  loading: boolean
  riseOffset: number
  title: string
  tournaments: Tournament[]
}) {
  return (
    <section className="tournament-section tournaments-rise" style={riseStyle(riseOffset)}>
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{tournaments.length}</span>
      </div>

      <div className="card-grid">
        {tournaments.map((tournament, index) => (
          <TournamentCard key={tournament.id} tournament={tournament} riseIndex={riseOffset + index + 1} />
        ))}
      </div>

      {!loading && tournaments.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : null}
    </section>
  )
}

export default function Tournaments() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([])
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([])
  const [name, setName] = useState('Pinnacora Tournament')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      return
    }

    const currentUser = user
    let cancelled = false

    async function loadTournaments() {
      setLoading(true)
      setError('')

      try {
        const [activeResponse, pastResponse] = await Promise.all([
          listTournaments(currentUser, 'ACTIVE'),
          listTournaments(currentUser, 'COMPLETED'),
        ])

        if (!cancelled) {
          setActiveTournaments(activeResponse.tournaments)
          setPastTournaments(pastResponse.tournaments)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load tournaments.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadTournaments()

    return () => {
      cancelled = true
    }
  }, [user])

  const resumeGame = activeTournaments
    .map((tournament) => {
      const game = getActiveGame(tournament)
      return game ? { tournament, game } : null
    })
    .find((entry) => entry !== null)

  let riseIndex = 0

  async function handleCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      return
    }

    const tournamentName = name.trim()
    if (!tournamentName) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await createTournament(user, tournamentName)
      navigate(`/tournaments/${response.tournament.id}`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create tournament.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoinTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      return
    }

    const tournamentJoinCode = joinCode.trim()
    if (!tournamentJoinCode) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await joinTournament(user, tournamentJoinCode)
      navigate(`/tournaments/${response.tournament.id}`)
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join tournament.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell tournaments-page">
      <header className="dashboard-header tournaments-rise" style={riseStyle(riseIndex++)}>
        <div>
          <p className="eyebrow">{user?.displayName ?? user?.email ?? 'Signed in'}</p>
          <h1>Tournaments</h1>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" to="/lobby">
            Quick game
          </Link>
          <button type="button" className="secondary-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {resumeGame ? (
        <section className="tournament-actions tournaments-rise" style={riseStyle(riseIndex++)}>
          <Link
            className="tournament-actions__primary"
            to={tournamentGamePath(resumeGame.tournament.id, resumeGame.game)}
          >
            Continue game {resumeGame.game.roomCode}
          </Link>
          <p className="tournament-actions__label">{resumeGame.tournament.name}</p>
        </section>
      ) : null}

      <section className="dashboard-panel dashboard-grid tournaments-rise" style={riseStyle(riseIndex++)}>
        <form className="form-panel" onSubmit={handleCreateTournament}>
          <h2>Create tournament</h2>
          <label htmlFor="tournament-name">Name</label>
          <input
            id="tournament-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekend match"
            required
          />
          <button type="submit" disabled={submitting || !name.trim()}>
            Create
          </button>
        </form>

        <form className="form-panel" onSubmit={handleJoinTournament}>
          <h2>Join with code</h2>
          <label htmlFor="join-code">Code</label>
          <input
            className="uppercase"
            id="join-code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            required
          />
          <button type="submit" disabled={submitting || !joinCode.trim()}>
            Join
          </button>
        </form>
      </section>

      {error ? (
        <p className="form-error tournaments-rise" style={riseStyle(riseIndex++)}>
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="muted tournaments-loading tournaments-rise" style={riseStyle(riseIndex++)}>
          Loading tournaments...
        </p>
      ) : null}

      <TournamentSection
        emptyMessage="No active tournaments."
        loading={loading}
        riseOffset={riseIndex++}
        title="Active"
        tournaments={activeTournaments}
      />

      <TournamentSection
        emptyMessage="No completed tournaments."
        loading={loading}
        riseOffset={riseIndex + activeTournaments.length + 1}
        title="Completed"
        tournaments={pastTournaments}
      />
    </main>
  )
}
