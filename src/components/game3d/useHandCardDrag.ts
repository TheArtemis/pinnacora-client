import { useEffect, useRef, useState } from 'react'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { useThree } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import { tableCardBaseY } from './constants'

const DRAG_CLICK_DISTANCE = 6
const DRAG_REORDER_DISTANCE = 10
const DRAGGED_CARD_Y = tableCardBaseY + 0.34

type HandDragState = {
  cardId: string
  startX: number
  startY: number
  handStartPosition: Vector3
  tableStartPosition: Vector3
  handStartPointerWorld: Vector3
  tableStartPointerWorld: Vector3
  handDragPlane: Plane
  tableDragPlane: Plane
  moved: boolean
  lastReorderX?: number
}

type UseHandCardDragOptions = {
  cards: CardType[]
  hiddenCardIds: Set<string>
  puttingDownCardIds: Set<string>
  enabled: boolean
  onDragChange: (cardId: string | null) => void
  onDragEnd: (cardId: string) => void
  onCardClick: (card: CardType) => void
  onReorder: (draggedCardId: string, targetCardId: string) => void
}

export function useHandCardDrag({
  cards,
  hiddenCardIds,
  puttingDownCardIds,
  enabled,
  onDragChange,
  onDragEnd,
  onCardClick,
  onReorder,
}: UseHandCardDragOptions) {
  const { camera, gl } = useThree()
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [isDraggingOverHandArea, setIsDraggingOverHandArea] = useState(true)
  const dragStateRef = useRef<HandDragState | null>(null)
  const dragVisualPositionRef = useRef<[number, number, number]>([0, 0, 0])
  const isDraggingOverHandAreaRef = useRef(true)
  const dragRaycasterRef = useRef(new Raycaster())
  const dragPointerRef = useRef(new Vector2())
  const dragIntersectionRef = useRef(new Vector3())
  const cardsRef = useRef(cards)
  const onDragChangeRef = useRef(onDragChange)
  const onDragEndRef = useRef(onDragEnd)
  const onCardClickRef = useRef(onCardClick)
  const onReorderRef = useRef(onReorder)

  useEffect(() => {
    cardsRef.current = cards
    onDragChangeRef.current = onDragChange
    onDragEndRef.current = onDragEnd
    onCardClickRef.current = onCardClick
    onReorderRef.current = onReorder
  })

  function updateIsDraggingOverHandArea(nextIsDraggingOverHandArea: boolean) {
    if (isDraggingOverHandAreaRef.current === nextIsDraggingOverHandArea) {
      return
    }

    isDraggingOverHandAreaRef.current = nextIsDraggingOverHandArea
    setIsDraggingOverHandArea(nextIsDraggingOverHandArea)
  }

  function updateDragVisualPosition(nextPosition: [number, number, number]) {
    dragVisualPositionRef.current = nextPosition
  }

  function pointerWorldOnPlane(clientX: number, clientY: number, dragPlane: Plane, bounds: DOMRect) {
    dragPointerRef.current.set(
      ((clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
      -(((clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1),
    )
    dragRaycasterRef.current.setFromCamera(dragPointerRef.current, camera)

    return dragRaycasterRef.current.ray.intersectPlane(dragPlane, dragIntersectionRef.current)
  }

  function isPointerInHandArea(clientY: number, bounds: DOMRect) {
    return clientY - bounds.top > bounds.height * 0.5
  }

  function cancelDrag() {
    dragStateRef.current = null
    setDraggingCardId(null)
    updateIsDraggingOverHandArea(true)
    onDragChangeRef.current(null)
  }

  function completeDrag() {
    const dragState = dragStateRef.current

    if (!dragState) {
      return
    }

    const card = cardsRef.current.find((candidateCard) => candidateCard.id === dragState.cardId)

    if (dragState.moved) {
      onDragEndRef.current(dragState.cardId)
    } else if (card) {
      onCardClickRef.current(card)
    }

    cancelDrag()
  }

  function updateDragStateFromCoordinates(clientX: number, clientY: number) {
    const dragState = dragStateRef.current

    if (!dragState) {
      return undefined
    }

    const deltaX = clientX - dragState.startX
    const deltaY = clientY - dragState.startY

    if (!dragState.moved && Math.hypot(deltaX, deltaY) >= DRAG_CLICK_DISTANCE) {
      dragState.moved = true
      setDraggingCardId(dragState.cardId)
      onDragChangeRef.current(dragState.cardId)
    }

    if (!dragState.moved) {
      return dragState
    }

    const bounds = gl.domElement.getBoundingClientRect()
    const nextIsDraggingOverHandArea = isPointerInHandArea(clientY, bounds)
    const previousIsDraggingOverHandArea = isDraggingOverHandAreaRef.current

    if (nextIsDraggingOverHandArea !== previousIsDraggingOverHandArea) {
      const [currentX, currentY, currentZ] = dragVisualPositionRef.current
      const currentPosition = new Vector3(currentX, currentY, currentZ)

      if (nextIsDraggingOverHandArea) {
        const handDragPlane = new Plane().setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new Vector3()).normalize(),
          currentPosition,
        )

        dragState.handStartPosition = currentPosition
        dragState.handDragPlane = handDragPlane
        dragState.handStartPointerWorld = pointerWorldOnPlane(
          clientX,
          clientY,
          dragState.handDragPlane,
          bounds,
        )?.clone() ?? currentPosition.clone()
      } else {
        dragState.tableStartPosition = new Vector3(currentPosition.x, DRAGGED_CARD_Y, currentPosition.z)
        dragState.tableDragPlane = new Plane().setFromNormalAndCoplanarPoint(
          new Vector3(0, 1, 0),
          dragState.tableStartPosition,
        )
        dragState.tableStartPointerWorld = pointerWorldOnPlane(
          clientX,
          clientY,
          dragState.tableDragPlane,
          bounds,
        )?.clone() ?? dragState.tableStartPosition.clone()
      }

      updateIsDraggingOverHandArea(nextIsDraggingOverHandArea)
      const nextStartPosition = nextIsDraggingOverHandArea ? dragState.handStartPosition : dragState.tableStartPosition
      updateDragVisualPosition([nextStartPosition.x, nextStartPosition.y, nextStartPosition.z])
      return dragState
    }

    const dragPlane = nextIsDraggingOverHandArea ? dragState.handDragPlane : dragState.tableDragPlane
    const startPointerWorld = nextIsDraggingOverHandArea
      ? dragState.handStartPointerWorld
      : dragState.tableStartPointerWorld
    const startPosition = nextIsDraggingOverHandArea ? dragState.handStartPosition : dragState.tableStartPosition
    const pointerWorld = pointerWorldOnPlane(clientX, clientY, dragPlane, bounds)

    updateIsDraggingOverHandArea(nextIsDraggingOverHandArea)

    if (pointerWorld) {
      updateDragVisualPosition([
        startPosition.x + pointerWorld.x - startPointerWorld.x,
        startPosition.y + pointerWorld.y - startPointerWorld.y,
        startPosition.z + pointerWorld.z - startPointerWorld.z,
      ])
    }

    return dragState
  }

  function startDrag(card: CardType, startPosition: [number, number, number], clientX: number, clientY: number) {
    if (!enabled) {
      return
    }

    const bounds = gl.domElement.getBoundingClientRect()
    const handStartPosition = new Vector3(...startPosition)
    const tableStartPosition = new Vector3(startPosition[0], DRAGGED_CARD_Y, startPosition[2])
    const handDragPlane = new Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new Vector3()).normalize(),
      handStartPosition,
    )
    const tableDragPlane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), tableStartPosition)
    const handStartPointerWorld = pointerWorldOnPlane(clientX, clientY, handDragPlane, bounds)?.clone() ?? handStartPosition.clone()
    const tableStartPointerWorld = pointerWorldOnPlane(clientX, clientY, tableDragPlane, bounds)?.clone() ?? tableStartPosition.clone()

    dragStateRef.current = {
      cardId: card.id,
      startX: clientX,
      startY: clientY,
      handStartPosition,
      tableStartPosition,
      handStartPointerWorld,
      tableStartPointerWorld,
      handDragPlane,
      tableDragPlane,
      moved: false,
    }
    updateDragVisualPosition(startPosition)
    updateIsDraggingOverHandArea(true)
  }

  function handlePointerMove(clientX: number, clientY: number) {
    return updateDragStateFromCoordinates(clientX, clientY)
  }

  function handlePointerOverReorder(clientX: number, clientY: number, targetCard: CardType) {
    const dragState = updateDragStateFromCoordinates(clientX, clientY)

    if (!dragState?.moved || dragState.cardId === targetCard.id) {
      return
    }

    const lastReorderX = dragState.lastReorderX ?? dragState.startX

    if (Math.abs(clientX - lastReorderX) < DRAG_REORDER_DISTANCE) {
      return
    }

    dragState.lastReorderX = clientX
    onReorderRef.current(dragState.cardId, targetCard.id)
  }

  useEffect(() => {
    if (enabled) {
      return
    }

    cancelDrag()
  }, [enabled])

  useEffect(() => {
    const dragState = dragStateRef.current

    if (!dragState) {
      return
    }

    if (!cards.some((card) => card.id === dragState.cardId)) {
      cancelDrag()
    }
  }, [cards])

  useEffect(() => {
    if (!draggingCardId) {
      return
    }

    if (hiddenCardIds.has(draggingCardId) || puttingDownCardIds.has(draggingCardId)) {
      cancelDrag()
    }
  }, [draggingCardId, hiddenCardIds, puttingDownCardIds])

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      updateDragStateFromCoordinates(event.clientX, event.clientY)
    }

    function handleWindowPointerEnd() {
      completeDrag()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)
    window.addEventListener('blur', handleWindowPointerEnd)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
      window.removeEventListener('blur', handleWindowPointerEnd)
    }
  }, [])

  useEffect(() => {
    return () => {
      onDragChangeRef.current(null)
    }
  }, [])

  return {
    draggingCardId,
    dragVisualPositionRef,
    isDraggingOverHandArea,
    startDrag,
    handlePointerMove,
    handlePointerOverReorder,
    cancelDrag,
  }
}
