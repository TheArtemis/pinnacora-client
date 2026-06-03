import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { finishTournamentGame } from '../api/client'
import Card from '../components/Card'
import { createInitialGame, dealCards } from '../game/engine'
import type { GameState, Player } from '../game/types'
import { connectSocket, socket } from '../socket'
import { useAuth } from '../auth/useAuth'

type ServerGameState = {
  id: string
  players?: string[]
  state?: string
}

function createLocalPlayers(playerIds: string[]): Player[] {
  return playerIds.map((id, index) => ({
    id,
    name: `Player ${index + 1}`,
    hand: [],
  }))
}

export default function Game() {
  const navigate = useNavigate()
  const { gameId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const tournamentId = searchParams.get('tournamentId')
  const gameDbId = searchParams.get('gameDbId')
  const isTournamentGame = Boolean(tournamentId && gameDbId)
  const [serverState, setServerState] = useState<ServerGameState | null>(null)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [finishError, setFinishError] = useState('')
  const [finishing, setFinishing] = useState(false)

  const previewGame = useMemo<GameState>(() => {
    const initialGame = createInitialGame(gameId)
    const players = createLocalPlayers(serverState?.players ?? ['You', 'Partner'])
    const dealt = dealCards(players, initialGame.deck)

    return {
      ...initialGame,
      players: dealt.players,
      deck: dealt.deck,
      currentPlayerId: dealt.players[0]?.id,
      status: serverState?.state === 'waiting' ? 'waiting' : 'playing',
    }
  }, [gameId, serverState])

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const activeSocket = socket

    function handleConnect() {
      setConnectionStatus('Connected')
      activeSocket.emit('join_game', tournamentId ? { gameId, tournamentId } : gameId)
    }

    function handleDisconnect() {
      setConnectionStatus('Disconnected')
    }

    function handleConnectError() {
      setConnectionStatus('Authentication failed')
    }

    function handleGameState(nextState: ServerGameState) {
      setServerState(nextState)
    }

    function handleGameError(nextError: { error?: string }) {
      setConnectionStatus(nextError.error ?? 'Could not join game')
    }

    activeSocket.on('connect', handleConnect)
    activeSocket.on('disconnect', handleDisconnect)
    activeSocket.on('connect_error', handleConnectError)
    activeSocket.on('game_state', handleGameState)
    activeSocket.on('game_error', handleGameError)

    user
      .getIdToken()
      .then((token) => {
        if (cancelled) {
          return
        }

        connectSocket(token)

        if (activeSocket.connected) {
          handleConnect()
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionStatus('Authentication failed')
        }
      })

    return () => {
      cancelled = true
      activeSocket.off('connect', handleConnect)
      activeSocket.off('disconnect', handleDisconnect)
      activeSocket.off('connect_error', handleConnectError)
      activeSocket.off('game_state', handleGameState)
      activeSocket.off('game_error', handleGameError)
    }
  }, [gameId, tournamentId, user])

  async function handleFinishGame() {
    if (!user || !tournamentId || !gameDbId) {
      return
    }

    setFinishing(true)
    setFinishError('')

    try {
      await finishTournamentGame(user, tournamentId, gameDbId)
      navigate(`/tournaments/${tournamentId}`)
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'Could not finish game.')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <main className="page-shell game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">Game room</p>
          <h1>{gameId}</h1>
          <p className="muted">
            {isTournamentGame
              ? 'This game belongs to your current tournament.'
              : 'Share this code with your girlfriend so she can join.'}
          </p>
        </div>
        <div className="connection-pill">{connectionStatus}</div>
      </header>

      <section className="table">
        <div className="table-zone">
          <h2>Players</h2>
          <div className="players">
            {previewGame.players.map((player) => (
              <article className="player" key={player.id}>
                <strong>{player.name}</strong>
                <span>{player.hand.length} cards</span>
              </article>
            ))}
          </div>
        </div>

        <div className="table-zone">
          <h2>Your hand</h2>
          <div className="hand">
            {previewGame.players[0]?.hand.map((card) => <Card card={card} key={card.id} />)}
          </div>
        </div>
      </section>

      <footer className="game-footer">
        <span>{previewGame.deck.length} cards left in deck</span>
        <div className="game-actions">
          {isTournamentGame ? (
            <button type="button" onClick={handleFinishGame} disabled={finishing}>
              {finishing ? 'Finishing...' : 'Finish game'}
            </button>
          ) : null}
          <Link to={tournamentId ? `/tournaments/${tournamentId}` : '/'}>
            {tournamentId ? 'Back to tournament' : 'Back to lobby'}
          </Link>
        </div>
      </footer>
      {finishError ? <p className="form-error">{finishError}</p> : null}
    </main>
  )
}
