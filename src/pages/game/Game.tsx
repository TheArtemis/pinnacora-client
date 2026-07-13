import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DevStatePanel from '../../components/dev/DevStatePanel'
import GameEndOverlay from '../../components/game/GameEndOverlay'
import SurrenderConfirmDialog from '../../components/game/SurrenderConfirmDialog'
import GameTableScene from '../../components/game3d'
import MeldOrderPicker from '../../components/MeldOrderPicker'
import { useAuth } from '../../auth/useAuth'
import { devMode } from '../../config/dev'
import type { Card } from '../../game/cardTypes'
import { hiddenCardIdsForOptimisticActions } from '../../game/optimisticActions'
import { socket } from '../../socket'
import GameHeader from './GameHeader'
import GamePlayersPanel from './GamePlayersPanel'
import { useDiscardPilePickup } from './hooks/useDiscardPilePickup'
import { useGameActions } from './hooks/useGameActions'
import { useGamePhase } from './hooks/useGamePhase'
import { useGameSocket } from './hooks/useGameSocket'
import { useMeldSelection } from './hooks/useMeldSelection'
import { useOptimisticGameState } from './hooks/useOptimisticGameState'
import { useSortedHand } from './hooks/useSortedHand'
import { useTableHint } from './hooks/useTableHint'
import { useDrawnCardHighlight } from './hooks/useDrawnCardHighlight'

export default function Game() {
  const { gameId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const tournamentId = searchParams.get('tournamentId')
  const gameDbId = searchParams.get('gameDbId')
  const isTournamentGame = Boolean(tournamentId && gameDbId)

  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false)
  const [surrendering, setSurrendering] = useState(false)
  const [copiedGameLink, setCopiedGameLink] = useState(false)
  const [handHoverCameraFocusEnabled, setHandHoverCameraFocusEnabled] = useState(false)
  const [puttingDownCards, setPuttingDownCards] = useState<Card[]>([])

  const {
    serverState,
    pendingActions,
    syncFromServer,
    applyOptimisticAction,
    dropPendingAction,
    clearPendingActions,
  } = useOptimisticGameState()

  const {
    hand,
    discardPile,
    canDraw,
    canDiscard,
    canPutDownMeld,
    canPickUpDiscardPile,
    canSelectMeldCards,
  } = useGamePhase(serverState)

  const {
    clearSelection: clearMeldSelection,
    selectedMeldCardIds,
    selectedMeldCards,
    selectedJokerSwapReplacementCard,
    selectedMeldError,
    selectedMeldPoints,
    sceneSelectedCardIds,
    ownMeldAttachTargetIds,
    swappableMeldJokerIds,
    meldOrderPickerCards,
    setMeldOrderPickerCards,
    handleToggleMeldCard,
  } = useMeldSelection({
    hand,
    canSelectMeldCards,
    canDiscard,
    serverState,
  })

  const {
    highlightStartIndex,
    resolvedStartIndex,
    combinationCard,
    pickupPlan,
    meldTargetIds,
    jokerTargetIds,
    pickupError,
    pickupCombination,
    pickupPoints,
    cardsAddedToHand,
    clearSelection: clearDiscardPileSelection,
    setSelectedStartIndex,
    setHoveredStartIndex,
  } = useDiscardPilePickup({
    canPickUpDiscardPile,
    discardPile,
    hand,
    selectedMeldCards,
    serverState,
  })

  const outlineColor = useMemo(() => {
    const canAttachSelectedCards = ownMeldAttachTargetIds.size > 0

    if (selectedMeldCards.length === 1) {
      return swappableMeldJokerIds.size > 0 || canAttachSelectedCards ? '#15803d' : undefined
    }

    if (selectedMeldCards.length > 0) {
      const isValid = combinationCard
        ? pickupPlan !== null && !pickupError
        : selectedMeldCards.length >= 3 && !selectedMeldError

      return isValid || canAttachSelectedCards ? '#15803d' : '#b91c1c'
    }

    return undefined
  }, [
    combinationCard,
    ownMeldAttachTargetIds.size,
    pickupError,
    pickupPlan,
    selectedMeldCards.length,
    selectedMeldError,
    swappableMeldJokerIds.size,
  ])

  const {
    clearHandSortTimeout,
    sortedHand,
    handSortMode,
    isHandGatheringForSort,
    handleHandCardReorder,
    handleChangeHandSortMode,
  } = useSortedHand(hand)

  const resetInteractionState = useCallback(() => {
    clearMeldSelection()
    clearDiscardPileSelection()
  }, [clearDiscardPileSelection, clearMeldSelection])

  const clearActionVisuals = useCallback(() => setPuttingDownCards([]), [])

  const {
    connectionStatus,
    gameError,
    setGameError,
    opponentHoveredHandIndexes,
    applyDevState,
    syncDevPanel,
    devApplying,
    devError,
    devResetKey,
  } = useGameSocket({
    gameId,
    tournamentId,
    user,
    serverState,
    syncFromServer,
    dropPendingAction,
    clearPendingActions,
    onStateReset: resetInteractionState,
    onActionFailure: clearActionVisuals,
  })

  const { clearPuttingDownAnimation, ...gameActions } = useGameActions({
    serverState,
    hand,
    discardPile,
    canDraw,
    canDiscard,
    canPutDownMeld,
    canPickUpDiscardPile,
    selectedMeldCardIds,
    selectedMeldCards,
    highlightStartIndex,
    applyOptimisticAction,
    setGameError,
    clearMeldSelection,
    clearDiscardPileSelection,
    setMeldOrderPickerCards,
    setPuttingDownCards,
    setSelectedStartIndex,
  })

  useEffect(() => {
    return () => {
      clearPuttingDownAnimation()
      clearHandSortTimeout()
    }
  }, [clearHandSortTimeout, clearPuttingDownAnimation])

  const hiddenHandCardIds = useMemo(
    () => hiddenCardIdsForOptimisticActions(pendingActions),
    [pendingActions],
  )

  const { highlightedDrawnCardIds, dismissDrawnCardHighlight } = useDrawnCardHighlight(
    hand,
    serverState,
    pendingActions,
  )

  const tableHint = useTableHint({
    serverState,
    canPickUpDiscardPile,
    canDraw,
    canDiscard,
    combinationCard,
    meldTargetIds,
    jokerTargetIds,
    pickupError,
    pickupCombination,
    pickupPoints,
    cardsAddedToHand,
    selectedJokerSwapReplacementCard,
    selectedMeldCards,
    selectedMeldError,
    selectedMeldPoints,
    ownMeldAttachTargetIds,
    swappableMeldJokerIds,
  })

  function handleHandCardHover(cardIndexes: number[]) {
    if (!serverState?.youPlayerId) {
      return
    }

    socket.emit('hover_hand_cards', { cardIndexes })
  }

  const canSurrender = isTournamentGame && serverState?.status === 'playing' && !surrendering

  useEffect(() => {
    if (serverState?.status === 'finished') {
      setShowSurrenderConfirm(false)
      setSurrendering(false)
    }
  }, [serverState?.status])

  useEffect(() => {
    if (gameError && surrendering) {
      setSurrendering(false)
    }
  }, [gameError, surrendering])

  const gameEndOutcome = useMemo(() => {
    if (!serverState || serverState.status !== 'finished' || !serverState.youPlayerId || !serverState.winnerId) {
      return null
    }

    return serverState.winnerId === serverState.youPlayerId ? 'win' : 'loss'
  }, [serverState])

  const handleSurrender = () => {
    if (!canSurrender) {
      return
    }

    setShowSurrenderConfirm(true)
  }

  const handleConfirmSurrender = () => {
    if (!canSurrender) {
      return
    }

    setGameError('')
    setSurrendering(true)
    socket.emit('surrender')
  }

  const handleCancelSurrender = () => {
    if (surrendering) {
      return
    }

    setShowSurrenderConfirm(false)
  }

  const handleCopyGameLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopiedGameLink(true)
    window.setTimeout(() => setCopiedGameLink(false), 1800)
  }

  return (
    <main className="page-shell game-page">
      <GameHeader
        gameId={gameId}
        isTournamentGame={isTournamentGame}
        tournamentId={tournamentId}
        connectionStatus={connectionStatus}
        handHoverCameraFocusEnabled={handHoverCameraFocusEnabled}
        copiedGameLink={copiedGameLink}
        canSurrender={canSurrender}
        onHandHoverCameraFocusChange={setHandHoverCameraFocusEnabled}
        onCopyGameLink={handleCopyGameLink}
        onSurrender={handleSurrender}
      />

      <section className="table table--three">
        <GamePlayersPanel serverState={serverState} />

        <GameTableScene
          state={serverState}
          hand={sortedHand}
          puttingDownCards={puttingDownCards}
          hiddenHandCardIds={hiddenHandCardIds}
          isHandGatheringForSort={isHandGatheringForSort}
          selectedCardIds={sceneSelectedCardIds}
          highlightedDrawnCardIds={highlightedDrawnCardIds}
          selectedCardOutlineColor={outlineColor}
          opponentHoveredHandIndexes={opponentHoveredHandIndexes}
          discardPileHighlightStartIndex={resolvedStartIndex ?? highlightStartIndex}
          discardPileMeldTargetIds={meldTargetIds}
          discardPileJokerTargetIds={jokerTargetIds}
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
          onDrawCard={gameActions.handleDrawCard}
          onHandCardClick={(card) => {
            setGameError('')
            handleToggleMeldCard(card)
          }}
          onHandCardReorder={handleHandCardReorder}
          onDismissDrawnCardHighlight={dismissDrawnCardHighlight}
          onHandCardHover={handleHandCardHover}
          onHandSortModeChange={handleChangeHandSortMode}
          onDiscardPileCardClick={gameActions.handlePickUpDiscardPile}
          onDiscardPileCardHover={setHoveredStartIndex}
          onDiscardPileMeldTargetClick={gameActions.handlePickUpDiscardPileIntoMeld}
          onDiscardPileJokerTargetClick={gameActions.handlePickUpDiscardPileBySwappingJoker}
          onDiscardHandCard={gameActions.handleDiscardCard}
          onDiscardSelectedCard={gameActions.handleDiscardSelectedCard}
          onMeldJokerClick={gameActions.handleSwapMeldJoker}
          onMeldJokerDrop={gameActions.handleSwapMeldJokerWithCard}
          onAttachToMeld={gameActions.handleAttachToMeld}
          onAttachToMeldDrop={gameActions.handleAttachToMeldWithCard}
          onPutDownMeld={gameActions.handlePutDownMeld}
        />
      </section>

      {gameError ? <p className="form-error">{gameError}</p> : null}

      {showSurrenderConfirm ? (
        <SurrenderConfirmDialog
          surrendering={surrendering}
          onConfirm={handleConfirmSurrender}
          onCancel={handleCancelSurrender}
        />
      ) : null}

      {gameEndOutcome && serverState ? (
        <GameEndOverlay
          outcome={gameEndOutcome}
          state={serverState}
          returnTo={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'}
        />
      ) : null}

      {meldOrderPickerCards ? (
        <MeldOrderPicker
          cards={meldOrderPickerCards}
          onConfirm={gameActions.handleConfirmMeldOrder}
          onCancel={gameActions.handleCancelMeldOrder}
        />
      ) : null}

      {devMode ? (
        <DevStatePanel
          state={serverState}
          resetKey={devResetKey}
          onApply={applyDevState}
          onSync={syncDevPanel}
          applying={devApplying}
          error={devError}
        />
      ) : null}
    </main>
  )
}
