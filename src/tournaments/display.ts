import type { Tournament, TournamentGame } from '../api/client'

export function displayPlayerName(user: { displayName: string | null; email: string | null }) {
  return user.displayName ?? user.email ?? 'Player'
}

export function getActiveGame(tournament: Tournament) {
  return tournament.games.find((game) => game.status !== 'FINISHED')
}

export function tournamentGamePath(tournamentId: string, game: TournamentGame) {
  return `/game/${game.roomCode}?tournamentId=${tournamentId}&gameDbId=${game.id}`
}

export function formatGameStatus(status: TournamentGame['status']) {
  switch (status) {
    case 'WAITING':
      return 'Waiting'
    case 'PLAYING':
      return 'In progress'
    case 'FINISHED':
      return 'Finished'
    default: {
      const unexpectedStatus: never = status
      return unexpectedStatus
    }
  }
}

export function formatShortDate(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
