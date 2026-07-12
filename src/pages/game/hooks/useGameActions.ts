import { useCallback, useRef } from 'react'
import { isJoker } from '../../../game/cards'
import type { Card } from '../../../game/cardTypes'
import { getDiscardPileTableTargets } from '../../../game/discardPilePickup'
import {
  canAttachCardsToOwnMeld,
  canReplaceMeldJoker,
  handCardsForDiscardPickup,
  hasAmbiguousMeldOrder,
  resolveDiscardPilePickupStartIndex,
  validateDiscardPilePickupMeld,
  validateMeld,
} from '../../../game/melds'
import {
  createAttachToMeldAction,
  createDiscardCardAction,
  createDrawCardAction,
  createPickUpDiscardPileAction,
  createPutDownMeldAction,
  createSwapMeldJokerAction,
  type DiscardPilePickupTarget,
  type OptimisticGameAction,
} from '../../../game/optimisticActions'
import type { ServerGameState } from '../../../game/serverTypes'
import { socket } from '../../../socket'

type UseGameActionsOptions = {
  serverState: ServerGameState | null
  hand: Card[]
  discardPile: Card[]
  canDraw: boolean
  canDiscard: boolean
  canPutDownMeld: boolean
  canPickUpDiscardPile: boolean
  selectedMeldCardIds: string[]
  selectedMeldCards: Card[]
  highlightStartIndex: number | null
  applyOptimisticAction: (action: OptimisticGameAction) => boolean
  setGameError: (error: string) => void
  clearMeldSelection: () => void
  clearDiscardPileSelection: () => void
  setMeldOrderPickerCards: (cards: Card[] | null) => void
  setPuttingDownCards: (cards: Card[]) => void
  setSelectedStartIndex: (index: number | null) => void
}

export function useGameActions({
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
}: UseGameActionsOptions) {
  const puttingDownAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearPuttingDownAnimation = useCallback(() => {
    if (puttingDownAnimationTimeoutRef.current) {
      window.clearTimeout(puttingDownAnimationTimeoutRef.current)
    }
  }, [])

  function pickUpDiscardPileWithTarget(
    cardIndex: number,
    cardIds: string[],
    pickupTarget?: DiscardPilePickupTarget,
  ) {
    setGameError('')
    const action = createPickUpDiscardPileAction(cardIndex, cardIds, pickupTarget)
    applyOptimisticAction(action)
    clearMeldSelection()
    clearDiscardPileSelection()
    socket.emit('pick_up_discard_pile', {
      clientActionId: action.id,
      count: discardPile.length - cardIndex,
      cardIds,
      pickupTarget,
    })
  }

  function handleDrawCard() {
    if (!canDraw) {
      return
    }

    setGameError('')
    clearMeldSelection()
    clearDiscardPileSelection()
    const action = createDrawCardAction()

    if (applyOptimisticAction(action)) {
      socket.emit('draw_card', { clientActionId: action.id })
    }
  }

  function handlePickUpDiscardPile(cardIndex: number) {
    if (!canPickUpDiscardPile || !discardPile[cardIndex]) {
      return
    }

    setSelectedStartIndex(cardIndex)

    const pickupHandCards = handCardsForDiscardPickup(hand, selectedMeldCards)
    const pickupHandCardIds = pickupHandCards.map((card) => card.id)
    const resolvedIndex = resolveDiscardPilePickupStartIndex(discardPile, cardIndex, pickupHandCards)
    const combinationCard = resolvedIndex !== null ? discardPile[resolvedIndex] : discardPile[cardIndex]
    const meldError =
      resolvedIndex === null
        ? validateDiscardPilePickupMeld(discardPile, cardIndex, pickupHandCards)
        : ''

    const tablePickupTargets = combinationCard
      ? getDiscardPileTableTargets(
        serverState?.melds ?? [],
        serverState?.youPlayerId,
        combinationCard,
      ).pickupTargets
      : []

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

  function handlePickUpDiscardPileIntoMeld(meldId: string) {
    if (highlightStartIndex === null) {
      return
    }

    pickUpDiscardPileWithTarget(highlightStartIndex, [], { type: 'extend_meld', meldId })
  }

  function handlePickUpDiscardPileBySwappingJoker(meldId: string, jokerCardId: string) {
    if (highlightStartIndex === null) {
      return
    }

    pickUpDiscardPileWithTarget(highlightStartIndex, [], { type: 'swap_joker', meldId, jokerCardId })
  }

  function handleDiscardCard(cardId: string) {
    if (!canDiscard) {
      return
    }

    setGameError('')
    clearMeldSelection()
    const action = createDiscardCardAction(cardId)

    if (!applyOptimisticAction(action)) {
      setGameError('Cannot discard right now.')
      return
    }

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

  function handleSwapMeldJokerWithCard(meldId: string, jokerCardId: string, replacementCardId: string) {
    if (!canDiscard) {
      return
    }

    const replacementCard = hand.find((card) => card.id === replacementCardId)
    const meld = serverState?.melds.find((candidateMeld) => candidateMeld.id === meldId)

    if (!replacementCard || isJoker(replacementCard)) {
      setGameError('Use a non-joker card from your hand to replace a table joker.')
      return
    }

    if (!meld || !canReplaceMeldJoker(meld, jokerCardId, replacementCard)) {
      setGameError('That card cannot replace this joker while keeping the combination valid.')
      return
    }

    setGameError('')
    clearDiscardPileSelection()
    const action = createSwapMeldJokerAction(meldId, jokerCardId, replacementCardId)

    if (!applyOptimisticAction(action)) {
      setGameError('That joker swap is not available right now.')
      return
    }

    clearMeldSelection()
    socket.emit('swap_meld_joker', {
      clientActionId: action.id,
      meldId,
      jokerCardId,
      replacementCardId,
    })
  }

  function handleSwapMeldJoker(meldId: string, jokerCardId: string) {
    if (selectedMeldCardIds.length !== 1) {
      setGameError('Select exactly one non-joker card from your hand, then click a table joker.')
      return
    }

    handleSwapMeldJokerWithCard(meldId, jokerCardId, selectedMeldCardIds[0])
  }

  function handleAttachToMeldWithCards(meldId: string, cardIds: string[]) {
    if (!canDiscard) {
      return
    }

    const uniqueCardIds = [...new Set(cardIds)]
    const meld = serverState?.melds.find((candidateMeld) => candidateMeld.id === meldId)
    const cards = uniqueCardIds
      .map((cardId) => hand.find((candidateCard) => candidateCard.id === cardId))
      .filter((card): card is Card => Boolean(card))

    if (
      !meld ||
      !serverState?.youPlayerId ||
      cards.length !== uniqueCardIds.length ||
      !canAttachCardsToOwnMeld(meld, serverState.youPlayerId, cards)
    ) {
      setGameError('Those cards cannot be added to this combination.')
      return
    }

    setGameError('')
    clearDiscardPileSelection()
    const action = createAttachToMeldAction(meldId, uniqueCardIds)

    if (!applyOptimisticAction(action)) {
      setGameError('Those cards cannot be attached right now.')
      return
    }

    clearMeldSelection()
    socket.emit('attach_to_meld', {
      clientActionId: action.id,
      meldId,
      cardIds: uniqueCardIds,
    })
  }

  function handleAttachToMeld(meldId: string) {
    if (selectedMeldCardIds.length === 0) {
      setGameError('Select one or more cards from your hand, then click one of your combinations.')
      return
    }

    handleAttachToMeldWithCards(meldId, selectedMeldCardIds)
  }

  function handleAttachToMeldWithCard(meldId: string, cardId: string) {
    handleAttachToMeldWithCards(meldId, [cardId])
  }

  function executePutDownMeld(cardIds: string[]) {
    const meldCards = cardIds
      .map((cardId) => hand.find((card) => card.id === cardId))
      .filter((card): card is Card => Boolean(card))

    setGameError('')
    setPuttingDownCards(meldCards)
    const action = createPutDownMeldAction(cardIds)
    applyOptimisticAction(action)
    clearMeldSelection()

    clearPuttingDownAnimation()
    puttingDownAnimationTimeoutRef.current = window.setTimeout(() => {
      setPuttingDownCards([])
    }, 850)

    socket.emit('put_down_meld', { clientActionId: action.id, cardIds })
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

    if (hasAmbiguousMeldOrder(selectedMeldCards)) {
      setMeldOrderPickerCards(selectedMeldCards)
      return
    }

    executePutDownMeld(selectedMeldCardIds)
  }

  function handleConfirmMeldOrder(orderedCardIds: string[]) {
    setMeldOrderPickerCards(null)
    executePutDownMeld(orderedCardIds)
  }

  function handleCancelMeldOrder() {
    setMeldOrderPickerCards(null)
  }

  return {
    handleDrawCard,
    handlePickUpDiscardPile,
    handlePickUpDiscardPileIntoMeld,
    handlePickUpDiscardPileBySwappingJoker,
    handleDiscardCard,
    handleDiscardSelectedCard,
    handleSwapMeldJoker,
    handleSwapMeldJokerWithCard,
    handleAttachToMeld,
    handleAttachToMeldWithCard,
    handlePutDownMeld,
    handleConfirmMeldOrder,
    handleCancelMeldOrder,
    clearPuttingDownAnimation,
  }
}
