import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '../../../game/cardTypes'
import { getMeldType, validateMeld } from '../../../game/melds'
import { calculateMeldPoints } from '../../../game/scoring'
import { getHandCardsTableTargets } from '../../../game/tableTargets'
import type { ServerGameState } from '../../../game/serverTypes'

const cardSelectSoundPath = '/sounds/card-select.mp3'

export function useMeldSelection({
  hand,
  canSelectMeldCards,
  canDiscard,
  serverState,
}: {
  hand: Card[]
  canSelectMeldCards: boolean
  canDiscard: boolean
  serverState: ServerGameState | null
}) {
  const [selectedMeldCardIds, setSelectedMeldCardIds] = useState<string[]>([])
  const [meldOrderPickerCards, setMeldOrderPickerCards] = useState<Card[] | null>(null)
  const cardSelectSoundRef = useRef<HTMLAudioElement | null>(null)

  const selectedMeldCards = useMemo(() => {
    return selectedMeldCardIds
      .map((cardId) => hand.find((card) => card.id === cardId))
      .filter((card): card is Card => Boolean(card))
  }, [hand, selectedMeldCardIds])

  const selectedJokerSwapReplacementCard = selectedMeldCards.length === 1 ? selectedMeldCards[0] : undefined

  const tableTargets = useMemo(
    () => getHandCardsTableTargets(
      selectedMeldCards,
      serverState?.melds ?? [],
      serverState?.youPlayerId,
      canDiscard,
    ),
    [canDiscard, selectedMeldCards, serverState?.melds, serverState?.youPlayerId],
  )

  const selectedMeldError = useMemo(
    () => (selectedMeldCards.length > 0 ? validateMeld(selectedMeldCards) : ''),
    [selectedMeldCards],
  )

  const selectedMeldType = selectedMeldError ? undefined : getMeldType(selectedMeldCards)
  const selectedMeldPoints = selectedMeldType ? calculateMeldPoints(selectedMeldCards, selectedMeldType) : 0

  const sceneSelectedCardIds = useMemo(() => {
    const handIds = new Set(hand.map((card) => card.id))
    return new Set(selectedMeldCardIds.filter((cardId) => handIds.has(cardId)))
  }, [hand, selectedMeldCardIds])

  useEffect(() => {
    const handIds = new Set(hand.map((card) => card.id))

    setSelectedMeldCardIds((currentCardIds) => {
      const nextCardIds = currentCardIds.filter((cardId) => handIds.has(cardId))
      return nextCardIds.length === currentCardIds.length ? currentCardIds : nextCardIds
    })

    if (!canDiscard) {
      setMeldOrderPickerCards(null)
    }
  }, [canDiscard, hand])

  const clearSelection = useCallback(() => {
    setSelectedMeldCardIds([])
  }, [])

  function handleToggleMeldCard(card: Card) {
    if (!canSelectMeldCards) {
      return
    }

    setSelectedMeldCardIds((currentCardIds) => {
      if (currentCardIds.includes(card.id)) {
        return currentCardIds.filter((cardId) => cardId !== card.id)
      }

      const sound = cardSelectSoundRef.current ?? new Audio(cardSelectSoundPath)
      cardSelectSoundRef.current = sound
      sound.currentTime = 0
      void sound.play().catch(() => undefined)
      return [...currentCardIds, card.id]
    })
  }

  return {
    selectedMeldCardIds,
    selectedMeldCards,
    selectedJokerSwapReplacementCard,
    selectedMeldError,
    selectedMeldPoints,
    sceneSelectedCardIds,
    ownMeldAttachTargetIds: tableTargets.ownMeldAttachTargetIds,
    swappableMeldJokerIds: tableTargets.swappableMeldJokerIds,
    meldOrderPickerCards,
    setMeldOrderPickerCards,
    clearSelection,
    handleToggleMeldCard,
  }
}
