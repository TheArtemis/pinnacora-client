import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { finishTournamentGame } from '../api/client'
import GameTableScene from '../components/game3d'
import type { Card as CardType } from '../game/cardTypes'
import type { ServerGameState } from '../game/serverTypes'
import { connectSocket, socket } from '../socket'
import { useAuth } from '../auth/useAuth'

type HandSortMode = 'suit' | 'value'

const suitOrder: Record<CardType['suit'], number> = {
  spades: 0,
  hearts: 1,
  clubs: 2,
  diamonds: 3,
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
  const [puttingDownCards, setPuttingDownCards] = useState<CardType[]>([])
  const [selectedDiscardPileStartIndex, setSelectedDiscardPileStartIndex] = useState<number | null>(null)
  const [hoveredDiscardPileStartIndex, setHoveredDiscardPileStartIndex] = useState<number | null>(null)
  const [opponentHandHover, setOpponentHandHover] = useState<{ playerId: string; cardIndexes: number[] } | null>(null)
  const [handSortMode, setHandSortMode] = useState<HandSortMode>('suit')
  const [isHandGatheringForSort, setIsHandGatheringForSort] = useState(false)
  const puttingDownAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const handSortAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

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
  const sceneSelectedCardIds = useMemo(() => {
    const cardIds = new Set(selectedMeldCardIds)

    if (selectedCardId) {
      cardIds.add(selectedCardId)
    }

    return cardIds
  }, [selectedCardId, selectedMeldCardIds])
  const opponentHoveredHandIndexes = useMemo(() => {
    const opponentPlayerIds = new Set(
      serverState?.players
        .filter((player) => player.id !== serverState.youPlayerId)
        .map((player) => player.id) ?? [],
    )

    if (!opponentHandHover || !opponentPlayerIds.has(opponentHandHover.playerId)) {
      return new Set<number>()
    }

    return new Set(opponentHandHover.cardIndexes)
  }, [opponentHandHover, serverState])
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
  const tableHint = useMemo(() => {
    if (!serverState) {
      return 'Connecting to the table...'
    }

    if (canPickUpDiscardPile) {
      if (discardPileCombinationCard) {
        return discardPilePickupError
          ? `No pickup combination yet: ${discardPilePickupError}`
          : `Valid pickup: ${discardPilePickupCombination.length} cards go down and ${discardPileCardsAddedToHand.length} newer cards join your hand.`
      }

      return 'Click the deck pile to draw, or select hand cards and choose a discard card to pick up.'
    }

    if (canDraw) {
      return 'Click the deck pile to draw.'
    }

    if (canDiscard) {
      return 'Select one hand card and click the discard pile to discard, or select three or more cards to put down a combination.'
    }

    return statusText(serverState)
  }, [
    canDiscard,
    canDraw,
    canPickUpDiscardPile,
    discardPileCardsAddedToHand.length,
    discardPileCombinationCard,
    discardPilePickupCombination.length,
    discardPilePickupError,
    serverState,
  ])

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
      setOpponentHandHover(null)
      setGameError('')
    }

    function handleGameError(nextError: { error?: string }) {
      setPuttingDownCards([])
      setGameError(nextError.error ?? 'Could not join game')
    }

    function handleOpponentHandHover(payload: { playerId?: unknown; cardIndexes?: unknown }) {
      if (typeof payload.playerId !== 'string' || !Array.isArray(payload.cardIndexes)) {
        return
      }

      setOpponentHandHover({
        playerId: payload.playerId,
        cardIndexes: payload.cardIndexes.filter((cardIndex): cardIndex is number => Number.isInteger(cardIndex) && cardIndex >= 0),
      })
    }

    activeSocket.on('connect', handleConnect)
    activeSocket.on('disconnect', handleDisconnect)
    activeSocket.on('connect_error', handleConnectError)
    activeSocket.on('game_state', handleGameState)
    activeSocket.on('game_error', handleGameError)
    activeSocket.on('opponent_hand_hover', handleOpponentHandHover)

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
      if (puttingDownAnimationTimeoutRef.current) {
        window.clearTimeout(puttingDownAnimationTimeoutRef.current)
      }
      if (handSortAnimationTimeoutRef.current) {
        window.clearTimeout(handSortAnimationTimeoutRef.current)
      }
      activeSocket.off('connect', handleConnect)
      activeSocket.off('disconnect', handleDisconnect)
      activeSocket.off('connect_error', handleConnectError)
      activeSocket.off('game_state', handleGameState)
      activeSocket.off('game_error', handleGameError)
      activeSocket.off('opponent_hand_hover', handleOpponentHandHover)
      activeSocket.emit('hover_hand_cards', { cardIndexes: [] })
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

  function handleDiscardSelectedCard() {
    if (!canDiscard) {
      return
    }

    if (selectedMeldCardIds.length !== 1) {
      setGameError('Select exactly one card from your hand, then click the discard pile.')
      return
    }

    handleDiscardCard(selectedMeldCardIds[0])
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

  const handleHandCardHover = useCallback((cardIndexes: number[]) => {
    if (!serverState?.youPlayerId) {
      return
    }

    socket.emit('hover_hand_cards', { cardIndexes })
  }, [serverState?.youPlayerId])

  function handleChangeHandSortMode(nextSortMode: HandSortMode) {
    setHandSortMode(nextSortMode)
    setIsHandGatheringForSort(true)

    if (handSortAnimationTimeoutRef.current) {
      window.clearTimeout(handSortAnimationTimeoutRef.current)
    }

    handSortAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsHandGatheringForSort(false)
    }, 280)
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
    setPuttingDownCards(selectedMeldCards)

    if (puttingDownAnimationTimeoutRef.current) {
      window.clearTimeout(puttingDownAnimationTimeoutRef.current)
    }

    puttingDownAnimationTimeoutRef.current = window.setTimeout(() => {
      setPuttingDownCards([])
    }, 850)

    socket.emit('put_down_meld', { cardIds: selectedMeldCardIds })
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
          {isTournamentGame ? (
            <button type="button" className="secondary-button" onClick={handleFinishGame} disabled={finishing}>
              {finishing ? 'Finishing...' : 'Finish game'}
            </button>
          ) : null}
          <Link className="secondary-link" to={tournamentId ? `/tournaments/${tournamentId}` : '/'}>
            {tournamentId ? 'Back to tournament' : 'Back to lobby'}
          </Link>
          <div className="connection-pill">{connectionStatus}</div>
        </div>
      </header>

      <section className="table table--three">
        <div className="table-zone table-status-panel">
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

        <GameTableScene
          state={serverState}
          hand={sortedHand}
          puttingDownCards={puttingDownCards}
          isHandGatheringForSort={isHandGatheringForSort}
          selectedCardIds={sceneSelectedCardIds}
          opponentHoveredHandIndexes={opponentHoveredHandIndexes}
          discardPileHighlightStartIndex={discardPileHighlightStartIndex}
          tableHint={tableHint}
          handSortMode={handSortMode}
          canDraw={canDraw}
          canDiscard={canDiscard}
          canPickUpDiscardPile={canPickUpDiscardPile}
          canPutDownMeld={canPutDownMeld}
          canPutDownSelectedMeld={selectedMeldCardIds.length > 0}
          onDrawCard={handleDrawCard}
          onHandCardClick={handleToggleMeldCard}
          onHandCardHover={handleHandCardHover}
          onHandSortModeChange={handleChangeHandSortMode}
          onDiscardPileCardClick={handlePickUpDiscardPile}
          onDiscardPileCardHover={setHoveredDiscardPileStartIndex}
          onDiscardSelectedCard={handleDiscardSelectedCard}
          onPutDownMeld={handlePutDownMeld}
        />
      </section>
      {gameError ? <p className="form-error">{gameError}</p> : null}
      {finishError ? <p className="form-error">{finishError}</p> : null}
    </main>
  )
}
