import { useCallback, useMemo, useRef, useState } from 'react'
import type { Card } from '../../../game/cardTypes'
import { resolveHandOrder, sortHand, type HandSortMode } from '../../../game/handOrder'

export function useSortedHand(hand: Card[]) {
  const [handSortMode, setHandSortMode] = useState<HandSortMode>('suit')
  const [handOrderIds, setHandOrderIds] = useState<string[]>([])
  const [isHandGatheringForSort, setIsHandGatheringForSort] = useState(false)
  const handSortAnimationTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const sortedHand = useMemo(() => {
    const cardsById = new Map(hand.map((card) => [card.id, card]))
    const orderIds = resolveHandOrder(handOrderIds, hand, handSortMode)

    return orderIds
      .map((cardId) => cardsById.get(cardId))
      .filter((card): card is Card => Boolean(card))
  }, [hand, handOrderIds, handSortMode])

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

  const clearHandSortTimeout = useCallback(() => {
    if (handSortAnimationTimeoutRef.current) {
      window.clearTimeout(handSortAnimationTimeoutRef.current)
    }
  }, [])

  return {
    handSortMode,
    sortedHand,
    isHandGatheringForSort,
    handleHandCardReorder,
    handleChangeHandSortMode,
    clearHandSortTimeout,
  }
}
