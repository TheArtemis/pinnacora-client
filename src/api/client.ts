import type { User } from 'firebase/auth'
import { getApiUrl } from '../config/api'

const apiUrl = getApiUrl()

export type TournamentStatus = 'ACTIVE' | 'COMPLETED'
export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED'

export type ApiUser = {
  id: string
  displayName: string | null
  email: string | null
  photoUrl: string | null
}

export type TournamentGame = {
  id: string
  roomCode: string
  status: GameStatus
  startedAt: string
  finishedAt: string | null
  winner: ApiUser | null
}

export type TournamentParticipant = {
  id: string
  joinedAt: string
  user: ApiUser
}

export type TournamentStanding = {
  user: ApiUser
  gamesPlayed: number
  wins: number
}

export type Tournament = {
  id: string
  name: string
  joinCode: string
  status: TournamentStatus
  createdAt: string
  completedAt: string | null
  participants: TournamentParticipant[]
  games: TournamentGame[]
  results: {
    totalGames: number
    finishedGames: number
    standings: TournamentStanding[]
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
}

function getErrorMessage(payload: unknown) {
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) {
    return undefined
  }

  return typeof payload.error === 'string' ? payload.error : undefined
}

async function apiRequest<T>(user: User, path: string, options: RequestOptions = {}) {
  const token = await user.getIdToken(true)
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null

  if (!response.ok) {
    throw new Error(getErrorMessage(payload) ?? 'Request failed')
  }

  return payload as T
}

export function listTournaments(user: User, status?: TournamentStatus) {
  const query = status ? `?status=${status.toLowerCase()}` : ''
  return apiRequest<{ tournaments: Tournament[] }>(user, `/tournaments${query}`)
}

export function createTournament(user: User, name: string) {
  return apiRequest<{ tournament: Tournament }>(user, '/tournaments', {
    method: 'POST',
    body: { name },
  })
}

export function joinTournament(user: User, joinCode: string) {
  return apiRequest<{ tournament: Tournament }>(user, '/tournaments/join', {
    method: 'POST',
    body: { joinCode },
  })
}

export function getTournament(user: User, tournamentId: string) {
  return apiRequest<{ tournament: Tournament }>(user, `/tournaments/${tournamentId}`)
}

export function completeTournament(user: User, tournamentId: string) {
  return apiRequest<{ tournament: Tournament }>(user, `/tournaments/${tournamentId}/complete`, {
    method: 'POST',
  })
}

export function createTournamentGame(user: User, tournamentId: string) {
  return apiRequest<{ game: TournamentGame }>(user, `/tournaments/${tournamentId}/games`, {
    method: 'POST',
  })
}

export function finishTournamentGame(user: User, tournamentId: string, gameId: string, winnerId?: string) {
  return apiRequest<{ game: TournamentGame }>(
    user,
    `/tournaments/${tournamentId}/games/${gameId}/finish`,
    {
      method: 'POST',
      body: { winnerId },
    },
  )
}
