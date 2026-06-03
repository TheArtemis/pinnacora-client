import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createTournament,
  joinTournament,
  listTournaments,
  type Tournament,
} from '../api/client'
import { useAuth } from '../auth/useAuth'

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const leader = tournament.results.standings[0]

  return (
    <article className="tournament-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">{tournament.status === 'ACTIVE' ? 'Active' : 'Past'}</p>
          <h3>{tournament.name}</h3>
        </div>
        <span className="status-pill">{tournament.status}</span>
      </div>
      <p className="muted">Join code: {tournament.joinCode}</p>
      <dl className="stats-grid">
        <div>
          <dt>Players</dt>
          <dd>{tournament.participants.length}</dd>
        </div>
        <div>
          <dt>Games</dt>
          <dd>{tournament.results.finishedGames}</dd>
        </div>
        <div>
          <dt>Leader</dt>
          <dd>{leader?.user.displayName ?? leader?.user.email ?? 'No results yet'}</dd>
        </div>
      </dl>
      <Link className="text-link" to={`/tournaments/${tournament.id}`}>
        Open tournament
      </Link>
    </article>
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

  async function handleCreateTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await createTournament(user, name)
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

    setSubmitting(true)
    setError('')

    try {
      const response = await joinTournament(user, joinCode)
      navigate(`/tournaments/${response.tournament.id}`)
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join tournament.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell tournaments-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Tournaments</p>
          <h1>Your Pinnacora tournaments.</h1>
          <p className="lede">Keep multiple private tournaments active and review past results.</p>
        </div>
        <button type="button" className="secondary-button" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="dashboard-grid">
        <form className="dashboard-panel form-panel" onSubmit={handleCreateTournament}>
          <h2>Create tournament</h2>
          <label htmlFor="tournament-name">Name</label>
          <input
            id="tournament-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekend match"
            required
          />
          <button type="submit" disabled={submitting}>
            Create tournament
          </button>
        </form>

        <form className="dashboard-panel form-panel" onSubmit={handleJoinTournament}>
          <h2>Join tournament</h2>
          <label htmlFor="join-code">Private code</label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            required
          />
          <button type="submit" disabled={submitting}>
            Join tournament
          </button>
        </form>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted">Loading tournaments...</p> : null}

      <section className="tournament-section">
        <div className="section-heading">
          <h2>Active tournaments</h2>
          <span>{activeTournaments.length}</span>
        </div>
        <div className="card-grid">
          {activeTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
          {!loading && activeTournaments.length === 0 ? (
            <p className="muted">No active tournaments yet.</p>
          ) : null}
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-heading">
          <h2>Past tournaments</h2>
          <span>{pastTournaments.length}</span>
        </div>
        <div className="card-grid">
          {pastTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
          {!loading && pastTournaments.length === 0 ? (
            <p className="muted">Completed tournaments will show up here.</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
