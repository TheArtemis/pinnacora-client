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
import TournamentCard from '../components/tournaments/TournamentCard'

const inputClass =
  'h-[3.25rem] w-full rounded-2xl border border-[var(--border)] bg-[var(--input)] px-5 text-base font-bold text-[var(--text-h)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-bg)]'
const primaryButtonClass =
  'inline-flex h-[3.25rem] items-center justify-center rounded-2xl bg-[var(--accent)] px-6 font-black text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-2xl border-2 border-[var(--secondary-border)] bg-[var(--panel)] px-5 text-sm font-black text-[var(--secondary)] transition hover:border-[var(--secondary-strong)] hover:bg-[var(--secondary-hover-bg)] hover:text-[var(--secondary-strong)] disabled:cursor-not-allowed disabled:opacity-60'

function TournamentSection({
  columns = 'two',
  emptyMessage,
  loading,
  title,
  tournaments,
}: {
  columns?: 'one' | 'two'
  emptyMessage: string
  loading: boolean
  title: string
  tournaments: Tournament[]
}) {
  const gridClass = columns === 'one' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 gap-3 md:grid-cols-2'

  return (
    <section className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--text-h)]">{title}</h2>
        <span className="text-sm font-bold text-[var(--muted)]">{tournaments.length}</span>
      </div>

      <div className={gridClass}>
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>

      {!loading && tournaments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] p-5 text-[var(--muted)]">
          <p className="font-bold">{emptyMessage}</p>
        </div>
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
      <div className="grid w-full gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--muted)]">
              {user?.displayName ?? user?.email ?? 'Signed in'}
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-[-0.06em] text-[var(--text-h)]">
              Tournaments
            </h1>
            <p className="mt-2 text-base font-semibold text-[var(--muted)]">
              Create one, join one, or open an active tournament.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={secondaryButtonClass} to="/lobby">
              Quick game
            </Link>
            <button type="button" className={secondaryButtonClass} onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <section className="grid gap-3 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)] md:grid-cols-2">
          <div>
            <h2 className="text-lg font-black text-[var(--text-h)]">Create tournament</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCreateTournament}>
              <label className="sr-only" htmlFor="tournament-name">
                Tournament name
              </label>
              <input
                className={inputClass}
                id="tournament-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekend match"
                required
              />
              <button className={primaryButtonClass} type="submit" disabled={submitting || !name.trim()}>
                Create
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-black text-[var(--text-h)]">Join tournament</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleJoinTournament}>
              <label className="sr-only" htmlFor="join-code">
                Private code
              </label>
              <input
                className={`${inputClass} uppercase`}
                id="join-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                required
              />
              <button className={primaryButtonClass} type="submit" disabled={submitting || !joinCode.trim()}>
                Join
              </button>
            </form>
          </div>
        </section>

        {error ? (
          <p className="rounded-3xl border border-[var(--danger)] bg-[var(--danger-bg)] px-5 py-4 font-bold text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-4 font-bold text-[var(--muted)]">
            Loading tournaments...
          </p>
        ) : null}

        <TournamentSection
          emptyMessage="No active tournaments yet. Create one above to get started."
          loading={loading}
          title="Available now"
          tournaments={activeTournaments}
        />

        <TournamentSection
          columns="one"
          emptyMessage="Completed tournaments will show up here."
          loading={loading}
          title="Archive"
          tournaments={pastTournaments}
        />
      </div>
    </main>
  )
}
