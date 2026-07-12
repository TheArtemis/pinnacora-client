import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '../../../game/cardTypes'
import type { OptimisticGameAction } from '../../../game/optimisticActions'
import type { ServerGameState } from '../../../game/serverTypes'

function isDrawCardAction(
  action: OptimisticGameAction,
): action is Extract<OptimisticGameAction, { type: 'draw_card' }> {
  return action.type === 'draw_card'
}

export function useDrawnCardHighlight(
  hand: Card[],
  serverState: ServerGameState | null,
  pendingActions: OptimisticGameAction[],
) {
  const [highlightedCardIds, setHighlightedCardIds] = useState<Set<string>>(() => new Set())
  const previousHandIdsRef = useRef<Set<string>>(new Set(hand.map((card) => card.id)))

  const dismissDrawnCardHighlight = useCallback((cardId: string) => {
    setHighlightedCardIds((current) => {
      if (!current.has(cardId)) {
        return current
      }

      const next = new Set(current)
      next.delete(cardId)
      return next
    })
  }, [])

  useEffect(() => {
    const drawPlaceholderIds = pendingActions
      .filter(isDrawCardAction)
      .map((action) => action.placeholderCard.id)

    if (drawPlaceholderIds.length === 0) {
      return
    }

    setHighlightedCardIds((current) => {
      const next = new Set(current)
      let changed = false

      for (const placeholderId of drawPlaceholderIds) {
        if (!next.has(placeholderId)) {
          next.add(placeholderId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [pendingActions])

  useEffect(() => {
    const currentHandIds = new Set(hand.map((card) => card.id))
    const previousHandIds = previousHandIdsRef.current
    const addedCardIds = hand.filter((card) => !previousHandIds.has(card.id)).map((card) => card.id)
    const activeDrawPlaceholders = new Set(
      pendingActions.filter(isDrawCardAction).map((action) => action.placeholderCard.id),
    )

    setHighlightedCardIds((current) => {
      let next = current
      let changed = false

      function ensureNext() {
        if (!changed) {
          next = new Set(current)
          changed = true
        }
      }

      for (const highlightedId of current) {
        if (!highlightedId.startsWith('pending-draw:')) {
          continue
        }

        if (currentHandIds.has(highlightedId)) {
          continue
        }

        if (activeDrawPlaceholders.has(highlightedId)) {
          continue
        }

        const resolvedCardId = addedCardIds.find((cardId) => !cardId.startsWith('pending-draw:'))

        ensureNext()
        next.delete(highlightedId)

        if (resolvedCardId) {
          next.add(resolvedCardId)
        }
      }

      return changed ? next : current
    })

    previousHandIdsRef.current = currentHandIds
  }, [hand, pendingActions])

  useEffect(() => {
    const isMyTurn = Boolean(
      serverState?.youPlayerId && serverState.currentPlayerId === serverState.youPlayerId,
    )

    if (isMyTurn) {
      return
    }

    setHighlightedCardIds(new Set())
  }, [serverState?.currentPlayerId, serverState?.youPlayerId])

  return {
    highlightedDrawnCardIds: highlightedCardIds,
    dismissDrawnCardHighlight,
  }
}
