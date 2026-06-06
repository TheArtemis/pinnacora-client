import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { finishTournamentGame } from '../api/client'
import Card from '../components/Card'
import type { Card as CardType } from '../game/cardTypes'
import type { ServerGameState } from '../game/serverTypes'
import { connectSocket, socket } from '../socket'
import { useAuth } from '../auth/useAuth'

type HandSortMode = 'suit' | 'value'

const suitOrder: Record<CardType['suit'], number> = {
  clubs: 0,
  diamonds: 1,
  hearts: 2,
  spades: 3,
  joker: 4,
}

const rankOrder: Record<CardType['rank'], number> = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
  JOKER: 13,
}

const sequenceRankOrder: Record<CardType['rank'], number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 0,
}

const emptyHand: CardType[] = []

function sequenceValues(cards: CardType[], aceHigh: boolean) {
  return cards
    .filter((card) => card.rank !== 'JOKER')
    .map((card) => (aceHigh && card.rank === 'A' ? 14 : sequenceRankOrder[card.rank]))
    .sort((left, right) => left - right)
}

function isJoker(card: CardType) {
  return card.rank === 'JOKER' || card.suit === 'joker'
}

function canFitSequence(values: number[], totalCards: number) {
  const firstValue = values[0]
  const lastValue = values[values.length - 1]

  if (firstValue === undefined || lastValue === undefined) {
    return false
  }

  return lastValue - firstValue + 1 <= totalCards
}

function validateMeld(cards: CardType[]) {
  if (cards.length < 3) {
    return 'Choose at least three cards for a combination.'
  }

  const naturalCards = cards.filter((card) => !isJoker(card))

  if (naturalCards.length === 0) {
    return 'Choose at least one non-joker card for the combination.'
  }

  const uniqueRanks = new Set(naturalCards.map((card) => card.rank))
  const uniqueSuits = new Set(naturalCards.map((card) => card.suit))

  if (uniqueRanks.size === 1) {
    if (cards.length > 4) {
      return 'Same-value combinations can only use four cards, one for each suit.'
    }

    return uniqueSuits.size === naturalCards.length ? '' : 'Same-value combinations need different suits.'
  }

  if (uniqueSuits.size !== 1) {
    return 'Sequences must all be the same suit.'
  }

  if (uniqueRanks.size !== naturalCards.length) {
    return 'Sequences cannot contain duplicate values.'
  }

  if (canFitSequence(sequenceValues(naturalCards, false), cards.length) ||
    canFitSequence(sequenceValues(naturalCards, true), cards.length)) {
    return ''
  }

  return 'Choose consecutive values for a sequence, like A-2-3, 4-5-6, or J-Q-K-A.'
}

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
  const [copiedGameLink, setCopiedGameLink] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedMeldCardIds, setSelectedMeldCardIds] = useState<string[]>([])
  const [selectedDiscardPileStartIndex, setSelectedDiscardPileStartIndex] = useState<number | null>(null)
  const [hoveredDiscardPileStartIndex, setHoveredDiscardPileStartIndex] = useState<number | null>(null)
  const [handSortMode, setHandSortMode] = useState<HandSortMode>('suit')
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [isDiscardPileDropTargetActive, setIsDiscardPileDropTargetActive] = useState(false)

  const currentPlayer = useMemo(
    () => serverState?.players.find((player) => player.id === serverState.youPlayerId),
    [serverState],
  )
  const isMyTurn = Boolean(serverState?.youPlayerId && serverState.currentPlayerId === serverState.youPlayerId)
  const canDraw = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'draw'
  const canDiscard = serverState?.status === 'playing' && isMyTurn && serverState.phase === 'discard'
  const canPutDownMeld = canDiscard
  const hand = currentPlayer?.hand ?? emptyHand
  const selectedMeldCards = useMemo(() => {
    return selectedMeldCardIds
      .map((cardId) => hand.find((card) => card.id === cardId))
      .filter((card): card is CardType => Boolean(card))
  }, [hand, selectedMeldCardIds])
  const sortedHand = useMemo(() => {
    return hand
      .map((card, index) => ({ card, index }))
      .sort((left, right) => {
        const primaryDifference =
          handSortMode === 'suit'
            ? suitOrder[left.card.suit] - suitOrder[right.card.suit]
            : rankOrder[left.card.rank] - rankOrder[right.card.rank]
        const secondaryDifference =
          handSortMode === 'suit'
            ? rankOrder[left.card.rank] - rankOrder[right.card.rank]
            : suitOrder[left.card.suit] - suitOrder[right.card.suit]

        return primaryDifference || secondaryDifference || left.index - right.index
      })
      .map(({ card }) => card)
  }, [hand, handSortMode])
  const discardPile = serverState?.discardPile ?? []
  const canPickUpDiscardPile = canDraw && discardPile.length > 0
  const canSelectMeldCards = canPutDownMeld || canPickUpDiscardPile
  const discardPileHighlightStartIndex = hoveredDiscardPileStartIndex ?? selectedDiscardPileStartIndex
  const selectedMeldCardIdSet = useMemo(() => new Set(selectedMeldCardIds), [selectedMeldCardIds])
  const discardPileCombinationCard =
    discardPileHighlightStartIndex === null ? undefined : discardPile[discardPileHighlightStartIndex]
  const discardPileCardsAddedToHand =
    discardPileHighlightStartIndex === null ? [] : discardPile.slice(discardPileHighlightStartIndex + 1)
  const discardPilePickupError =
    canPickUpDiscardPile && discardPileCombinationCard
      ? validateMeld([discardPileCombinationCard, ...selectedMeldCards])
      : ''
  const discardPilePickupCombination = discardPileCombinationCard
    ? [discardPileCombinationCard, ...selectedMeldCards]
    : selectedMeldCards

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
      setSelectedMeldCardIds([])
      setSelectedDiscardPileStartIndex(null)
      setHoveredDiscardPileStartIndex(null)
      setDraggedCardId(null)
      setIsDiscardPileDropTargetActive(false)
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

    const meldError = validateMeld([discardPile[cardIndex], ...selectedMeldCards])

    if (meldError) {
      setGameError(`Cannot pick up from that card: ${meldError}`)
      return
    }

    setGameError('')
    socket.emit('pick_up_discard_pile', { count: discardPile.length - cardIndex, cardIds: selectedMeldCardIds })
  }

  function handleDiscardCard(cardId: string) {
    if (!canDiscard) {
      return
    }

    setSelectedCardId(cardId)
    setGameError('')
    socket.emit('discard_card', { cardId })
  }

  function handleToggleMeldCard(card: CardType) {
    if (!canSelectMeldCards) {
      return
    }

    setGameError('')
    setSelectedMeldCardIds((currentCardIds) =>
      currentCardIds.includes(card.id)
        ? currentCardIds.filter((cardId) => cardId !== card.id)
        : [...currentCardIds, card.id],
    )
  }

  function handlePutDownMeld() {
    if (!canPutDownMeld) {
      return
    }

    const meldError = validateMeld(selectedMeldCards)

    if (meldError) {
      setGameError(meldError)
      return
    }

    setGameError('')
    socket.emit('put_down_meld', { cardIds: selectedMeldCardIds })
  }

  function handleHandCardDragStart(event: DragEvent<HTMLElement>, card: CardType) {
    if (!canDiscard) {
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', card.id)
    setDraggedCardId(card.id)
    setSelectedCardId(card.id)
    setGameError('')
  }

  function handleHandCardDragEnd() {
    setDraggedCardId(null)
    setIsDiscardPileDropTargetActive(false)
  }

  function handleDiscardPileDragOver(event: DragEvent<HTMLDivElement>) {
    if (!canDiscard || !draggedCardId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDiscardPileDropTargetActive(true)
  }

  function handleDiscardPileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()

    const droppedCardId = draggedCardId || event.dataTransfer.getData('text/plain')

    if (!canDiscard || !droppedCardId) {
      setIsDiscardPileDropTargetActive(false)
      return
    }

    handleDiscardCard(droppedCardId)
    setDraggedCardId(null)
    setIsDiscardPileDropTargetActive(false)
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

  async function handleCopyGameLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopiedGameLink(true)
    window.setTimeout(() => setCopiedGameLink(false), 1800)
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
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={handleCopyGameLink}>
            {copiedGameLink ? 'Copied!' : 'Copy game link'}
          </button>
          <div className="connection-pill">{connectionStatus}</div>
        </div>
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
            <p className="muted">
              To pick up discards, select hand cards first, then choose the deepest discard card they combine with.
            </p>
          ) : null}
          {canDiscard ? <p className="muted">Drag a card from your hand to the discard pile.</p> : null}
        </div>

        <div className="table-zone">
          <h2>Combinations on table</h2>
          <div className="meld-list">
            {serverState?.players.map((player) => {
              const playerMelds = serverState.melds.filter((meld) => meld.playerId === player.id)
              const playerName = player.id === serverState.youPlayerId ? 'Your combinations' : `${player.name}'s combinations`

              return (
                <section className="player-melds" key={player.id}>
                  <div className="meld-owner-heading">
                    <strong>{playerName}</strong>
                    <span>{playerMelds.length}</span>
                  </div>
                  {playerMelds.map((meld) => (
                    <article className="meld" key={meld.id}>
                      <div className="meld-header">
                        <strong>{meld.type === 'set' ? 'Same value' : 'Sequence'}</strong>
                        <span>{meld.cards.length} cards</span>
                      </div>
                      <div className="meld-cards">
                        {meld.cards.map((card) => (
                          <Card card={card} key={card.id} />
                        ))}
                      </div>
                    </article>
                  ))}
                  {playerMelds.length === 0 ? <p className="muted">No combinations put down yet.</p> : null}
                </section>
              )
            })}
            {!serverState ? <p className="muted">Combinations will appear here.</p> : null}
          </div>
        </div>

        <div className="table-zone">
          <h2>Discard pile</h2>
          {canPickUpDiscardPile ? (
            <p className={discardPileCombinationCard && !discardPilePickupError ? 'pickup-hint pickup-hint--valid' : 'pickup-hint'}>
              {discardPileCombinationCard
                ? discardPilePickupError
                  ? `No pickup combination yet: ${discardPilePickupError}`
                  : 'Valid pickup: that discard card combines with your selected hand cards.'
                : 'Select hand cards, then hover a discard card to check whether you can pick up that sequence.'}
            </p>
          ) : null}
          {canPickUpDiscardPile && discardPileCombinationCard ? (
            <div className="pickup-preview">
              <section className="pickup-preview-section">
                <div className="pickup-preview-heading">
                  <strong>Will be put down</strong>
                  <span>{discardPilePickupCombination.length} cards</span>
                </div>
                <div className="pickup-preview-cards">
                  {discardPilePickupCombination.map((card) => (
                    <Card card={card} key={card.id} selected={card.id === discardPileCombinationCard.id} />
                  ))}
                </div>
                <p className="muted">The highlighted discard card must be part of this combination.</p>
              </section>
              <section className="pickup-preview-section">
                <div className="pickup-preview-heading">
                  <strong>Will be added to hand</strong>
                  <span>{discardPileCardsAddedToHand.length} cards</span>
                </div>
                <div className="pickup-preview-cards">
                  {discardPileCardsAddedToHand.map((card) => (
                    <Card card={card} key={card.id} />
                  ))}
                  {discardPileCardsAddedToHand.length === 0 ? (
                    <p className="muted">No newer discard cards above it.</p>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
          <div
            className={isDiscardPileDropTargetActive ? 'discard-pile discard-pile--drop-target' : 'discard-pile'}
            onDragLeave={() => setIsDiscardPileDropTargetActive(false)}
            onDragOver={handleDiscardPileDragOver}
            onDrop={handleDiscardPileDrop}
            onMouseLeave={() => setHoveredDiscardPileStartIndex(null)}
          >
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
          <div className="section-heading table-heading">
            <h2>Your hand</h2>
            {canPutDownMeld ? (
              <button type="button" onClick={handlePutDownMeld} disabled={selectedMeldCardIds.length === 0}>
                Put down combination
              </button>
            ) : null}
          </div>
          <div className="hand">
            {sortedHand.map((card) => (
              <Card
                card={card}
                draggable={canDiscard}
                disabled={!canSelectMeldCards}
                key={card.id}
                onClick={canSelectMeldCards ? () => handleToggleMeldCard(card) : undefined}
                onDragEnd={handleHandCardDragEnd}
                onDragStart={canDiscard ? (event) => handleHandCardDragStart(event, card) : undefined}
                selected={selectedMeldCardIdSet.has(card.id) || selectedCardId === card.id || draggedCardId === card.id}
              />
            ))}
            {serverState && hand.length === 0 ? <p className="muted">Your cards will appear when both players connect.</p> : null}
          </div>
        </div>
      </section>

      <footer className="game-footer">
        <span>{statusText(serverState)}</span>
        <div className="hand-sort-actions" aria-label="Hand sorting">
          <button
            type="button"
            className={handSortMode === 'suit' ? 'secondary-button secondary-button--active' : 'secondary-button'}
            onClick={() => setHandSortMode('suit')}
            aria-pressed={handSortMode === 'suit'}
          >
            Order by suit
          </button>
          <button
            type="button"
            className={handSortMode === 'value' ? 'secondary-button secondary-button--active' : 'secondary-button'}
            onClick={() => setHandSortMode('value')}
            aria-pressed={handSortMode === 'value'}
          >
            Order by value
          </button>
        </div>
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
