import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { finishTournamentGame } from '../api/client'
import Card from '../components/Card'
import type { Card as CardType } from '../game/cardTypes'
import type { ServerGameState } from '../game/serverTypes'
import { connectSocket, socket } from '../socket'
import { useAuth } from '../auth/useAuth'

function statusText(state: ServerGameState | null) {
  if (!state) {
    return 'Waiting for game state...'
  }

  if (state.status === 'waiting') {
    return 'Waiting for both players to connect.'
  }

  if (state.status === 'paused') {
    return 'Game paused until both players reconnect.'
  }

  if (state.status === 'finished') {
    return 'Game finished.'
  }

  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId)
  const currentName = currentPlayer?.id === state.youPlayerId ? 'Your' : `${currentPlayer?.name ?? 'Player'}'s`
  const action = state.phase === 'draw' ? 'draw from the deck or discard pile' : 'discard a card'

  return `${currentName} turn to ${action}.`
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
  const [gameError, setGameError] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedDiscardPileStartIndex, setSelectedDiscardPileStartIndex] = useState<number | null>(null)
  const [hoveredDiscardPileStartIndex, setHoveredDiscardPileStartIndex] = useState<number | null>(null)

  const currentPlayer = useMemo(
    () => serverState?.players.find((player) => player.id === serverState.youPlayerId),
    [serverState],
  )
  const isMyTurn = Boolean(serverState?.youPlayerId && serverState.currentPlayerId === serverState.youPlayerId)
  const canDraw = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'draw'
  const canDiscard = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'discard'
  const hand = currentPlayer?.hand ?? []
  const discardPile = serverState?.discardPile ?? []
  const canPickUpDiscardPile = canDraw && discardPile.length > 0
  const discardPileHighlightStartIndex = hoveredDiscardPileStartIndex ?? selectedDiscardPileStartIndex

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const activeSocket = socket

    function handleConnect() {
      setConnectionStatus('Connected')
      setGameError('')
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
      setSelectedCardId(null)
      setSelectedDiscardPileStartIndex(null)
      setHoveredDiscardPileStartIndex(null)
      setGameError('')
    }

    function handleGameError(nextError: { error?: string }) {
      setGameError(nextError.error ?? 'Could not join game')
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
      activeSocket.disconnect()
    }
  }, [gameId, tournamentId, user])

  function handleDrawCard() {
    if (!canDraw) {
      return
    }

    setGameError('')
    socket.emit('draw_card')
  }

  function handlePickUpDiscardPile(cardIndex: number) {
    if (!canPickUpDiscardPile) {
      return
    }

    if (!discardPile[cardIndex]) {
      return
    }

    setSelectedDiscardPileStartIndex(cardIndex)
    setGameError('')
    socket.emit('pick_up_discard_pile', { count: discardPile.length - cardIndex })
  }

  function handleDiscardCard(card: CardType) {
    if (!canDiscard) {
      return
    }

    setSelectedCardId(card.id)
    setGameError('')
    socket.emit('discard_card', { cardId: card.id })
  }

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
          <div className="section-heading table-heading">
            <h2>Players</h2>
            <span>{statusText(serverState)}</span>
          </div>
          <div className="players">
            {serverState?.players.map((player) => (
              <article className="player" key={player.id}>
                <div>
                  <strong>{player.id === serverState.youPlayerId ? 'You' : player.name}</strong>
                  <small>{player.connected ? 'Connected' : 'Disconnected'}</small>
                </div>
                <span>{player.handCount} cards</span>
                {player.id === serverState.currentPlayerId ? <span className="turn-pill">Turn</span> : null}
              </article>
            ))}
            {!serverState ? <p className="muted">Connecting to the table...</p> : null}
          </div>
        </div>

        <div className="table-zone table-controls">
          <div>
            <h2>Deck</h2>
            <p className="muted">{serverState?.deckCount ?? 0} cards left</p>
          </div>
          <button type="button" onClick={handleDrawCard} disabled={!canDraw}>
            Draw card
          </button>
          {canPickUpDiscardPile ? (
            <p className="muted">Or choose a discard card to pick it up with every newer discard.</p>
          ) : null}
          {canDiscard ? <p className="muted">Choose a card from your hand to discard.</p> : null}
        </div>

        <div className="table-zone">
          <h2>Discard pile</h2>
          <div className="discard-pile" onMouseLeave={() => setHoveredDiscardPileStartIndex(null)}>
            {discardPile.map((card, index) => (
              <Card
                card={card}
                disabled={!canPickUpDiscardPile}
                key={card.id}
                onClick={canPickUpDiscardPile ? () => handlePickUpDiscardPile(index) : undefined}
                onMouseEnter={canPickUpDiscardPile ? () => setHoveredDiscardPileStartIndex(index) : undefined}
                selected={discardPileHighlightStartIndex !== null && index >= discardPileHighlightStartIndex}
              />
            ))}
            {discardPile.length === 0 ? <p className="muted">No discarded cards yet.</p> : null}
          </div>
        </div>

        <div className="table-zone">
          <h2>Your hand</h2>
          <div className="hand">
            {hand.map((card) => (
              <Card
                card={card}
                disabled={!canDiscard}
                key={card.id}
                onClick={canDiscard ? () => handleDiscardCard(card) : undefined}
                selected={selectedCardId === card.id}
              />
            ))}
            {serverState && hand.length === 0 ? <p className="muted">Your cards will appear when both players connect.</p> : null}
          </div>
        </div>
      </section>

      <footer className="game-footer">
        <span>{statusText(serverState)}</span>
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
      {gameError ? <p className="form-error">{gameError}</p> : null}
      {finishError ? <p className="form-error">{finishError}</p> : null}
    </main>
  )
}
