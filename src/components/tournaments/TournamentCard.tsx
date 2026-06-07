import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Tournament } from '../../api/client'

function tournamentLink(tournamentId: string) {
  return `${window.location.origin}/tournaments/${tournamentId}`
}

function displayPlayer(user: Tournament['participants'][number]['user']) {
  return user.displayName ?? user.email ?? 'Player'
}

export default function TournamentCard({ tournament }: { tournament: Tournament }) {
  const isCompleted = tournament.status === 'COMPLETED'
  const leader = tournament.results.standings[0]
  const loser =
    tournament.results.standings.length > 1
      ? tournament.results.standings[tournament.results.standings.length - 1]
      : undefined
  const fallbackLoser = leader
    ? tournament.participants.find((participant) => participant.user.id !== leader.user.id)
    : undefined
  const [copied, setCopied] = useState(false)

  async function handleCopyTournamentLink() {
    await navigator.clipboard.writeText(tournamentLink(tournament.id))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)] transition hover:border-[var(--accent)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--text-h)]">
            {tournament.name}
          </h3>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
            {isCompleted
              ? `${tournament.results.finishedGames} finished games`
              : `Code ${tournament.joinCode} · ${tournament.participants.length} players · ${tournament.results.finishedGames} games`}
          </p>
        </div>
        <span className="rounded-2xl bg-[var(--secondary-bg)] px-3 py-1 text-xs font-black text-[var(--secondary)]">
          {tournament.status}
        </span>
      </div>

      {isCompleted ? (
        <div className="mt-4 grid gap-2 text-sm font-bold">
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--text-h)]">
            Winner: {leader ? displayPlayer(leader.user) : 'Not decided'}
          </p>
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3 text-[var(--text-h)]">
            Loser:{' '}
            {loser ? displayPlayer(loser.user) : fallbackLoser ? displayPlayer(fallbackLoser.user) : 'Not decided'}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
            Leader: {leader ? displayPlayer(leader.user) : 'No results yet'}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-black text-white transition hover:bg-[var(--accent-strong)]"
              style={{ color: '#ffffff' }}
              to={`/tournaments/${tournament.id}`}
            >
              Open tournament
            </Link>
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[var(--secondary-border)] bg-[var(--panel)] text-[var(--secondary)] transition hover:border-[var(--secondary-strong)] hover:bg-[var(--secondary-hover-bg)] hover:text-[var(--secondary-strong)]"
              aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
              onClick={handleCopyTournamentLink}
              title={copied ? 'Copied' : 'Copy invite'}
            >
              {copied ? <Check aria-hidden="true" size={24} strokeWidth={2.5} /> : <Copy aria-hidden="true" size={24} strokeWidth={2.5} />}
            </button>
          </div>
        </>
      )}
    </article>
  )
}
