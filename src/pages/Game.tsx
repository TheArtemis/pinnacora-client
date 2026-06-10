import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { finishTournamentGame } from '../api/client'
import GameTableScene from '../components/game3d'
import type { Card as CardType } from '../game/cardTypes'
import { buildDiscardPilePickupMeld, canAddCardToMeld, canAttachCardToOwnMeld, canReplaceMeldJoker, getMeldType, handCardsForDiscardPickup, resolveDiscardPilePickupStartIndex, validateDiscardPilePickupMeld, validateMeld } from '../game/melds'
import {
  createAttachToMeldAction,
  createDiscardCardAction,
  createDrawCardAction,
  createPickUpDiscardPileAction,
  createPutDownMeldAction,
  createSwapMeldJokerAction,
  hiddenCardIdsForOptimisticActions,
  projectOptimisticAction,
  projectOptimisticActions,
  type DiscardPilePickupTarget,
  type OptimisticGameAction,
} from '../game/optimisticActions'
import { calculateMeldPoints, getMeldPoints } from '../game/scoring'
import type { ServerGameState } from '../game/serverTypes'
import { connectSocket, socket } from '../socket'
import { useAuth } from '../auth/useAuth'

type HandSortMode = 'suit' | 'value'

const cardSelectSoundPath = '/sounds/card-select.mp3'

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

const emptyHand: CardType[] = []

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
    const winner = state.players.find((player) => player.id === state.winnerId)
    const winnerName = winner?.id === state.youPlayerId ? 'You' : winner?.name

    return winnerName ? `${winnerName} won the game.` : 'Game finished.'
  }

  const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId)
  const currentName = currentPlayer?.id === state.youPlayerId ? 'Your' : `${currentPlayer?.name ?? 'Player'}'s`
  const action = state.phase === 'draw' ? 'draw from the deck or discard pile' : 'discard a card'

  return `${currentName} turn to ${action}.`
}

function sortHand(cards: CardType[], sortMode: HandSortMode) {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const primaryDifference =
        sortMode === 'suit'
          ? suitOrder[left.card.suit] - suitOrder[right.card.suit]
          : rankOrder[left.card.rank] - rankOrder[right.card.rank]
      const secondaryDifference =
        sortMode === 'suit'
          ? rankOrder[left.card.rank] - rankOrder[right.card.rank]
          : suitOrder[left.card.suit] - suitOrder[right.card.suit]

      return primaryDifference || secondaryDifference || left.index - right.index
    })
    .map(({ card }) => card)
}

function resolveHandOrder(currentOrderIds: string[], cards: CardType[], fallbackSortMode: HandSortMode) {
  const cardIds = new Set(cards.map((card) => card.id))
  const orderedExistingIds = currentOrderIds.filter((cardId) => cardIds.has(cardId))
  const baseIds = orderedExistingIds.length > 0
    ? orderedExistingIds
    : sortHand(cards, fallbackSortMode).map((card) => card.id)
  const orderedIdSet = new Set(baseIds)
  const newIds = cards.map((card) => card.id).filter((cardId) => !orderedIdSet.has(cardId))

  return [...baseIds, ...newIds]
}

function isJokerCard(card: CardType) {
  return card.rank === 'JOKER' || card.suit === 'joker'
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
  const [handHoverCameraFocusEnabled, setHandHoverCameraFocusEnabled] = useState(false)
  const [handOrderIds, setHandOrderIds] = useState<string[]>([])
  const [isHandGatheringForSort, setIsHandGatheringForSort] = useState(false)
  const puttingDownAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const handSortAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const cardSelectSoundRef = useRef<HTMLAudioElement | null>(null)
  const confirmedServerStateRef = useRef<ServerGameState | null>(null)
  const pendingOptimisticActionsRef = useRef<OptimisticGameAction[]>([])
  const [pendingOptimisticActions, setPendingOptimisticActions] = useState<OptimisticGameAction[]>([])

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
  const selectedJokerSwapReplacementCard = selectedMeldCards.length === 1 ? selectedMeldCards[0] : undefined
  const swappableMeldJokerIds = useMemo(() => {
    if (!canDiscard || !selectedJokerSwapReplacementCard) {
      return new Set<string>()
    }

    const meldJokerIds = new Set<string>()

    for (const meld of serverState?.melds ?? []) {
      for (const card of meld.cards) {
        if (canReplaceMeldJoker(meld, card.id, selectedJokerSwapReplacementCard)) {
          meldJokerIds.add(`${meld.id}:${card.id}`)
        }
      }
    }

    return meldJokerIds
  }, [canDiscard, selectedJokerSwapReplacementCard, serverState?.melds])
  const ownMeldAttachTargetIds = useMemo(() => {
    if (!canDiscard || !selectedJokerSwapReplacementCard || !serverState?.youPlayerId) {
      return new Set<string>()
    }

    return new Set(
      serverState.melds
        .filter(
          (meld) =>
            canAttachCardToOwnMeld(meld, serverState.youPlayerId!, selectedJokerSwapReplacementCard),
        )
        .map((meld) => meld.id),
    )
  }, [canDiscard, selectedJokerSwapReplacementCard, serverState?.melds, serverState?.youPlayerId])
  const selectedMeldError = useMemo(
    () => (selectedMeldCards.length > 0 ? validateMeld(selectedMeldCards) : ''),
    [selectedMeldCards],
  )
  const sortedHand = useMemo(() => {
    const cardsById = new Map(hand.map((card) => [card.id, card]))
    const orderIds = resolveHandOrder(handOrderIds, hand, handSortMode)

    return orderIds
      .map((cardId) => cardsById.get(cardId))
      .filter((card): card is CardType => Boolean(card))
  }, [hand, handOrderIds, handSortMode])

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
  const discardPilePickupHandCards = useMemo(
    () => handCardsForDiscardPickup(hand, selectedMeldCards),
    [hand, selectedMeldCards],
  )
  const discardPilePickupResolvedStartIndex = useMemo(() => {
    if (!canPickUpDiscardPile || discardPileHighlightStartIndex === null) {
      return null
    }

    return resolveDiscardPilePickupStartIndex(
      discardPile,
      discardPileHighlightStartIndex,
      discardPilePickupHandCards,
    )
  }, [canPickUpDiscardPile, discardPile, discardPileHighlightStartIndex, discardPilePickupHandCards])
  const discardPileCombinationCard =
    discardPilePickupResolvedStartIndex === null
      ? undefined
      : discardPile[discardPilePickupResolvedStartIndex]
  const discardPilePickupPlan = useMemo(() => {
    if (discardPilePickupResolvedStartIndex === null) {
      return null
    }

    return buildDiscardPilePickupMeld(
      discardPile,
      discardPilePickupResolvedStartIndex,
      discardPilePickupHandCards,
    )
  }, [discardPile, discardPilePickupHandCards, discardPilePickupResolvedStartIndex])
  const discardPileCardsAddedToHand = discardPilePickupPlan?.cardsAddedToHand ?? []
  const discardPileMeldTargetIds = useMemo(() => {
    if (!canPickUpDiscardPile || !discardPileCombinationCard || !serverState?.youPlayerId) {
      return new Set<string>()
    }

    return new Set(
      serverState.melds
        .filter((meld) => meld.playerId === serverState.youPlayerId && canAddCardToMeld(meld, discardPileCombinationCard))
        .map((meld) => meld.id),
    )
  }, [canPickUpDiscardPile, discardPileCombinationCard, serverState])
  const discardPileJokerTargetIds = useMemo(() => {
    if (!canPickUpDiscardPile || !discardPileCombinationCard) {
      return new Set<string>()
    }

    const jokerIds = new Set<string>()

    for (const meld of serverState?.melds ?? []) {
      for (const card of meld.cards) {
        if (canReplaceMeldJoker(meld, card.id, discardPileCombinationCard)) {
          jokerIds.add(`${meld.id}:${card.id}`)
        }
      }
    }

    return jokerIds
  }, [canPickUpDiscardPile, discardPileCombinationCard, serverState?.melds])
  const hasDiscardPileTablePickupTarget = discardPileMeldTargetIds.size > 0 || discardPileJokerTargetIds.size > 0
  const discardPilePickupError =
    canPickUpDiscardPile && discardPileHighlightStartIndex !== null
      ? validateDiscardPilePickupMeld(discardPile, discardPileHighlightStartIndex, discardPilePickupHandCards)
      : ''
  const selectedMeldType = selectedMeldError ? undefined : getMeldType(selectedMeldCards)
  const selectedMeldPoints = selectedMeldType ? calculateMeldPoints(selectedMeldCards, selectedMeldType) : 0
  const hasEnoughSelectedCombinationCards = discardPileCombinationCard
    ? discardPilePickupPlan !== null
    : selectedMeldCards.length >= 3
  const isSelectedCombinationValid =
    hasEnoughSelectedCombinationCards && (discardPileCombinationCard ? !discardPilePickupError : !selectedMeldError)
  const selectedCardOutlineColor =
    selectedMeldCards.length === 1
      ? (swappableMeldJokerIds.size > 0 || ownMeldAttachTargetIds.size > 0 ? '#15803d' : undefined)
      : selectedMeldCards.length > 0
        ? (isSelectedCombinationValid ? '#15803d' : '#b91c1c')
        : undefined
  const discardPilePickupCombination = discardPilePickupPlan?.meldCards ?? (
    discardPileCombinationCard
      ? [discardPileCombinationCard, ...discardPilePickupHandCards]
      : selectedMeldCards
  )
  const discardPilePickupType = discardPilePickupError ? undefined : getMeldType(discardPilePickupCombination)
  const discardPilePickupPoints = discardPilePickupType
    ? calculateMeldPoints(discardPilePickupCombination, discardPilePickupType)
    : 0
  const playerMeldPoints = useMemo(() => {
    const pointsByPlayer = new Map<string, number>()

    for (const meld of serverState?.melds ?? []) {
      pointsByPlayer.set(meld.playerId, (pointsByPlayer.get(meld.playerId) ?? 0) + getMeldPoints(meld))
    }

    return pointsByPlayer
  }, [serverState?.melds])
  const hiddenHandCardIds = useMemo(
    () => hiddenCardIdsForOptimisticActions(pendingOptimisticActions),
    [pendingOptimisticActions],
  )

  const tableHint = useMemo(() => {
    if (!serverState) {
      return 'Connecting to the table...'
    }

    if (canPickUpDiscardPile) {
      if (discardPileCombinationCard) {
        if (hasDiscardPileTablePickupTarget && discardPilePickupError) {
          return 'Click a highlighted table combination or joker to pick up from this discard card.'
        }

        return discardPilePickupError
          ? `No pickup combination yet: ${discardPilePickupError}`
          : `Valid pickup: ${discardPilePickupCombination.length} cards worth ${discardPilePickupPoints} points go down and ${discardPileCardsAddedToHand.length} newer cards join your hand.`
      }

      return 'Click the deck pile to draw, or select hand cards and choose a discard card to pick up.'
    }

    if (canDraw) {
      return 'Click the deck pile to draw.'
    }

    if (canDiscard) {
      if (selectedJokerSwapReplacementCard) {
        if (isJokerCard(selectedJokerSwapReplacementCard)) {
          return 'Selected joker can be discarded. Select a non-joker card to replace a table joker.'
        }

        if (ownMeldAttachTargetIds.size > 0 && swappableMeldJokerIds.size > 0) {
          return 'Click a highlighted combination of yours to attach this card, click a joker to swap it, or discard.'
        }

        if (ownMeldAttachTargetIds.size > 0) {
          return 'Click a highlighted combination of yours to attach this card, click the discard pile to discard, or select more cards for a new combination.'
        }

        if (swappableMeldJokerIds.size > 0) {
          return 'Click a highlighted joker on the table (yours or your opponent\'s) to swap it, click the discard pile to discard, or select more cards for a combination.'
        }

        return 'Selected card can be discarded. It cannot attach to or replace any table combination right now.'
      }

      if (selectedMeldCards.length > 0) {
        return selectedMeldError
          ? `Combination not ready: ${selectedMeldError}`
          : `Selected combination is worth ${selectedMeldPoints} points.`
      }

      return 'Select one hand card to discard, attach to one of your combinations, swap for a table joker, or select three or more cards to put down a combination.'
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
    discardPilePickupPoints,
    hasDiscardPileTablePickupTarget,
    serverState,
    selectedJokerSwapReplacementCard,
    selectedMeldCards.length,
    selectedMeldError,
    selectedMeldPoints,
    ownMeldAttachTargetIds.size,
    swappableMeldJokerIds.size,
  ])

  function setPendingActions(actions: OptimisticGameAction[]) {
    pendingOptimisticActionsRef.current = actions
    setPendingOptimisticActions(actions)
  }

  function applyOptimisticAction(action: OptimisticGameAction) {
    if (!serverState) {
      return false
    }

    const projectedState = projectOptimisticAction(serverState, action)

    if (!projectedState) {
      return false
    }

    setPendingActions([...pendingOptimisticActionsRef.current, action])
    setServerState(projectedState)
    return true
  }

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
      confirmedServerStateRef.current = nextState
      setServerState(projectOptimisticActions(nextState, pendingOptimisticActionsRef.current))
      setSelectedCardId(null)
      setSelectedMeldCardIds([])
      setSelectedDiscardPileStartIndex(null)
      setHoveredDiscardPileStartIndex(null)
      setOpponentHandHover(null)
      setGameError('')
    }

    function handleGameError(nextError: { error?: string; clientActionId?: unknown }) {
      const failedActionId = typeof nextError.clientActionId === 'string' ? nextError.clientActionId : null
      const nextPending = failedActionId
        ? pendingOptimisticActionsRef.current.filter((action) => action.id !== failedActionId)
        : []

      setPendingActions(nextPending)
      setPuttingDownCards([])
      setGameError(nextError.error ?? 'Could not complete game action')
      activeSocket.emit('join_game', tournamentId ? { gameId, tournamentId } : gameId)
    }

    function handleGameActionAck(payload: { clientActionId?: unknown }) {
      if (typeof payload.clientActionId !== 'string') {
        return
      }

      setPendingActions(
        pendingOptimisticActionsRef.current.filter((action) => action.id !== payload.clientActionId),
      )
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
    activeSocket.on('game_action_ack', handleGameActionAck)
    activeSocket.on('game_error', handleGameError)
    activeSocket.on('opponent_hand_hover', handleOpponentHandHover)

    function handleWindowFocus() {
      if (activeSocket.connected) {
        activeSocket.emit('join_game', tournamentId ? { gameId, tournamentId } : gameId)
      }
    }

    window.addEventListener('focus', handleWindowFocus)

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
      activeSocket.off('game_action_ack', handleGameActionAck)
      activeSocket.off('game_error', handleGameError)
      activeSocket.off('opponent_hand_hover', handleOpponentHandHover)
      window.removeEventListener('focus', handleWindowFocus)
      activeSocket.emit('hover_hand_cards', { cardIndexes: [] })
      activeSocket.disconnect()
    }
  }, [gameId, tournamentId, user])

  function handleDrawCard() {
    if (!canDraw) {
      return
    }

    setGameError('')
    setSelectedCardId(null)
    setSelectedMeldCardIds([])
    setSelectedDiscardPileStartIndex(null)
    const action = createDrawCardAction()

    if (applyOptimisticAction(action)) {
      socket.emit('draw_card', { clientActionId: action.id })
    }
  }

  function handlePickUpDiscardPile(cardIndex: number) {
    if (!canPickUpDiscardPile) {
      return
    }

    if (!discardPile[cardIndex]) {
      return
    }

    setSelectedDiscardPileStartIndex(cardIndex)

    const pickupHandCards = handCardsForDiscardPickup(hand, selectedMeldCards)
    const pickupHandCardIds = pickupHandCards.map((card) => card.id)
    const resolvedIndex = resolveDiscardPilePickupStartIndex(discardPile, cardIndex, pickupHandCards)
    const combinationCard = resolvedIndex !== null ? discardPile[resolvedIndex] : discardPile[cardIndex]
    const meldError =
      resolvedIndex === null
        ? validateDiscardPilePickupMeld(discardPile, cardIndex, pickupHandCards)
        : ''
    const tablePickupTargets = serverState?.melds.flatMap((meld): DiscardPilePickupTarget[] => {
      const targets: DiscardPilePickupTarget[] = []

      if (!combinationCard) {
        return targets
      }

      if (meld.playerId === serverState.youPlayerId && canAddCardToMeld(meld, combinationCard)) {
        targets.push({ type: 'extend_meld', meldId: meld.id })
      }

      for (const card of meld.cards) {
        if (canReplaceMeldJoker(meld, card.id, combinationCard)) {
          targets.push({ type: 'swap_joker', meldId: meld.id, jokerCardId: card.id })
        }
      }

      return targets
    }) ?? []

    if (meldError || resolvedIndex === null) {
      if (tablePickupTargets.length === 1) {
        pickUpDiscardPileWithTarget(cardIndex, [], tablePickupTargets[0])
        return
      }

      if (tablePickupTargets.length > 1) {
        setGameError('Choose one of the highlighted table combinations or jokers for this discard card.')
        return
      }

      setGameError(`Cannot pick up from that card: ${meldError}`)
      return
    }

    pickUpDiscardPileWithTarget(resolvedIndex, pickupHandCardIds)
  }

  function pickUpDiscardPileWithTarget(
    cardIndex: number,
    cardIds: string[],
    pickupTarget?: DiscardPilePickupTarget,
  ) {
    setGameError('')
    const action = createPickUpDiscardPileAction(cardIndex, cardIds, pickupTarget)
    applyOptimisticAction(action)
    setSelectedMeldCardIds([])
    setSelectedDiscardPileStartIndex(null)
    socket.emit('pick_up_discard_pile', {
      clientActionId: action.id,
      count: discardPile.length - cardIndex,
      cardIds,
      pickupTarget,
    })
  }

  function handlePickUpDiscardPileIntoMeld(meldId: string) {
    if (discardPileHighlightStartIndex === null) {
      return
    }

    pickUpDiscardPileWithTarget(discardPileHighlightStartIndex, [], { type: 'extend_meld', meldId })
  }

  function handlePickUpDiscardPileBySwappingJoker(meldId: string, jokerCardId: string) {
    if (discardPileHighlightStartIndex === null) {
      return
    }

    pickUpDiscardPileWithTarget(discardPileHighlightStartIndex, [], { type: 'swap_joker', meldId, jokerCardId })
  }

  function handleDiscardCard(cardId: string) {
    if (!canDiscard) {
      return
    }

    setGameError('')
    setSelectedMeldCardIds([])
    const action = createDiscardCardAction(cardId)

    if (!applyOptimisticAction(action)) {
      setGameError('Cannot discard right now.')
      return
    }

    setSelectedCardId(null)
    socket.emit('discard_card', { clientActionId: action.id, cardId })
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

  function handleSwapMeldJoker(meldId: string, jokerCardId: string) {
    if (!canDiscard) {
      return
    }

    if (selectedMeldCardIds.length !== 1) {
      setGameError('Select exactly one non-joker card from your hand, then click a table joker.')
      return
    }

    const replacementCardId = selectedMeldCardIds[0]

    handleSwapMeldJokerWithCard(meldId, jokerCardId, replacementCardId)
  }

  function handleSwapMeldJokerWithCard(meldId: string, jokerCardId: string, replacementCardId: string) {
    if (!canDiscard) {
      return
    }

    const replacementCard = hand.find((card) => card.id === replacementCardId)
    const meld = serverState?.melds.find((candidateMeld) => candidateMeld.id === meldId)

    if (!replacementCard || isJokerCard(replacementCard)) {
      setGameError('Use a non-joker card from your hand to replace a table joker.')
      return
    }

    if (!meld || !canReplaceMeldJoker(meld, jokerCardId, replacementCard)) {
      setGameError('That card cannot replace this joker while keeping the combination valid.')
      return
    }

    setGameError('')
    setSelectedDiscardPileStartIndex(null)
    const action = createSwapMeldJokerAction(meldId, jokerCardId, replacementCardId)

    if (!applyOptimisticAction(action)) {
      setGameError('That joker swap is not available right now.')
      return
    }

    setSelectedCardId(null)
    setSelectedMeldCardIds([])
    socket.emit('swap_meld_joker', {
      clientActionId: action.id,
      meldId,
      jokerCardId,
      replacementCardId,
    })
  }

  function handleAttachToMeld(meldId: string) {
    if (!canDiscard) {
      return
    }

    if (selectedMeldCardIds.length !== 1) {
      setGameError('Select exactly one card from your hand, then click one of your combinations.')
      return
    }

    handleAttachToMeldWithCard(meldId, selectedMeldCardIds[0])
  }

  function handleAttachToMeldWithCard(meldId: string, cardId: string) {
    if (!canDiscard) {
      return
    }

    const card = hand.find((candidateCard) => candidateCard.id === cardId)
    const meld = serverState?.melds.find((candidateMeld) => candidateMeld.id === meldId)

    if (!card || !meld || !serverState?.youPlayerId || !canAttachCardToOwnMeld(meld, serverState.youPlayerId, card)) {
      setGameError('That card cannot be added to this combination.')
      return
    }

    setGameError('')
    setSelectedDiscardPileStartIndex(null)
    const action = createAttachToMeldAction(meldId, cardId)

    if (!applyOptimisticAction(action)) {
      setGameError('That card cannot be attached right now.')
      return
    }

    setSelectedCardId(null)
    setSelectedMeldCardIds([])
    socket.emit('attach_to_meld', {
      clientActionId: action.id,
      meldId,
      cardId,
    })
  }

  function playCardSelectSound() {
    const sound = cardSelectSoundRef.current ?? new Audio(cardSelectSoundPath)
    cardSelectSoundRef.current = sound
    sound.currentTime = 0

    void sound.play().catch(() => undefined)
  }

  function handleToggleMeldCard(card: CardType) {
    if (!canSelectMeldCards) {
      return
    }

    setGameError('')
    setSelectedMeldCardIds((currentCardIds) => {
      if (currentCardIds.includes(card.id)) {
        return currentCardIds.filter((cardId) => cardId !== card.id)
      }

      playCardSelectSound()
      return [...currentCardIds, card.id]
    })
  }

  const handleHandCardHover = useCallback((cardIndexes: number[]) => {
    if (!serverState?.youPlayerId) {
      return
    }

    socket.emit('hover_hand_cards', { cardIndexes })
  }, [serverState?.youPlayerId])

  function handleHandCardReorder(draggedCardId: string, targetCardId: string) {
    if (draggedCardId === targetCardId) {
      return
    }

    setHandOrderIds((currentOrderIds) => {
      const nextOrderIds = resolveHandOrder(currentOrderIds, hand, handSortMode)
      const draggedIndex = nextOrderIds.indexOf(draggedCardId)
      const targetIndex = nextOrderIds.indexOf(targetCardId)

      if (draggedIndex === -1 || targetIndex === -1) {
        return currentOrderIds
      }

      nextOrderIds.splice(draggedIndex, 1)
      nextOrderIds.splice(targetIndex, 0, draggedCardId)

      return nextOrderIds
    })
  }

  function handleChangeHandSortMode(nextSortMode: HandSortMode) {
    setHandSortMode(nextSortMode)
    setHandOrderIds(sortHand(hand, nextSortMode).map((card) => card.id))
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
    const action = createPutDownMeldAction(selectedMeldCardIds)
    applyOptimisticAction(action)
    setSelectedMeldCardIds([])

    if (puttingDownAnimationTimeoutRef.current) {
      window.clearTimeout(puttingDownAnimationTimeoutRef.current)
    }

    puttingDownAnimationTimeoutRef.current = window.setTimeout(() => {
      setPuttingDownCards([])
    }, 850)

    socket.emit('put_down_meld', { clientActionId: action.id, cardIds: selectedMeldCardIds })
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
          <label className="game-header-toggle">
            <span>Hand zoom</span>
            <input
              type="checkbox"
              role="switch"
              checked={handHoverCameraFocusEnabled}
              onChange={(event) => setHandHoverCameraFocusEnabled(event.target.checked)}
              aria-label="Zoom camera when hovering hand cards"
            />
          </label>
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
                <span>{player.handCount} cards · {playerMeldPoints.get(player.id) ?? 0} points</span>
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
          hiddenHandCardIds={hiddenHandCardIds}
          isHandGatheringForSort={isHandGatheringForSort}
          selectedCardIds={sceneSelectedCardIds}
          selectedCardOutlineColor={selectedCardOutlineColor}
          opponentHoveredHandIndexes={opponentHoveredHandIndexes}
          discardPileHighlightStartIndex={discardPilePickupResolvedStartIndex ?? discardPileHighlightStartIndex}
          discardPileMeldTargetIds={discardPileMeldTargetIds}
          discardPileJokerTargetIds={discardPileJokerTargetIds}
          swappableMeldJokerIds={swappableMeldJokerIds}
          ownMeldAttachTargetIds={ownMeldAttachTargetIds}
          tableHint={tableHint}
          handSortMode={handSortMode}
          handHoverCameraFocusEnabled={handHoverCameraFocusEnabled}
          canDraw={canDraw}
          canDiscard={canDiscard}
          canPickUpDiscardPile={canPickUpDiscardPile}
          canPutDownMeld={canPutDownMeld}
          canPutDownSelectedMeld={selectedMeldCards.length >= 3 && !selectedMeldError}
          onDrawCard={handleDrawCard}
          onHandCardClick={handleToggleMeldCard}
          onHandCardReorder={handleHandCardReorder}
          onHandCardHover={handleHandCardHover}
          onHandSortModeChange={handleChangeHandSortMode}
          onDiscardPileCardClick={handlePickUpDiscardPile}
          onDiscardPileCardHover={setHoveredDiscardPileStartIndex}
          onDiscardPileMeldTargetClick={handlePickUpDiscardPileIntoMeld}
          onDiscardPileJokerTargetClick={handlePickUpDiscardPileBySwappingJoker}
          onDiscardHandCard={handleDiscardCard}
          onDiscardSelectedCard={handleDiscardSelectedCard}
          onMeldJokerClick={handleSwapMeldJoker}
          onMeldJokerDrop={handleSwapMeldJokerWithCard}
          onAttachToMeld={handleAttachToMeld}
          onAttachToMeldDrop={handleAttachToMeldWithCard}
          onPutDownMeld={handlePutDownMeld}
        />
      </section>
      {gameError ? <p className="form-error">{gameError}</p> : null}
      {finishError ? <p className="form-error">{finishError}</p> : null}
    </main>
  )
}
