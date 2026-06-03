import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  const { gameId = '' } = useParams()
  const { user } = useAuth()
  const [serverState, setServerState] = useState<ServerGameState | null>(null)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')

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
      activeSocket.emit('join_game', gameId)
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

    setConnectionStatus('Connecting...')
    activeSocket.on('connect', handleConnect)
    activeSocket.on('disconnect', handleDisconnect)
    activeSocket.on('connect_error', handleConnectError)
    activeSocket.on('game_state', handleGameState)

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
    }
  }, [gameId, user])

  return (
    <main className="page-shell game-page">
      <header className="game-header">
        <div>
          <p className="eyebrow">Game room</p>
          <h1>{gameId}</h1>
          <p className="muted">Share this code with your girlfriend so she can join.</p>
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
        <Link to="/">Back to lobby</Link>
      </footer>
    </main>
  )
}
