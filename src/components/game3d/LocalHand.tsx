import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DoubleSide, MeshBasicMaterial, Plane, PlaneGeometry, Raycaster, Vector2, Vector3 } from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, localHandBaseZ, tableCardBaseY } from './constants'
import { cardFanOffset } from './layout'
import type { GameTableSceneProps } from './types'

const LOCAL_HAND_CARD_SPACING = 1.08
const LOCAL_HAND_MAX_WIDTH = 11.6
const LOCAL_HAND_CLOSEUP_Z_OFFSET = 0.58
const DRAG_CLICK_DISTANCE = 6
const DRAG_REORDER_DISTANCE = 10
const DRAGGED_CARD_Y = tableCardBaseY + 0.34
const handInteractionGeometry = new PlaneGeometry(1, CARD_HEIGHT)
const handInteractionMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, side: DoubleSide, depthWrite: false })

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

type LocalHandProps = Pick<
  GameTableSceneProps,
  'selectedCardIds' | 'onHandCardClick' | 'onHandCardReorder' | 'onHandCardHover'
> & {
  cards: CardType[]
  hiddenCardIds: Set<string>
  puttingDownCardIds: Set<string>
  isGatheringForSort: boolean
  isCloseUp: boolean
  handHoverCameraFocusEnabled: boolean
  selectedCardOutlineColor?: string
  onHandAreaFocusChange: (isFocused: boolean) => void
  onHandCardDragChange: (cardId: string | null) => void
  onHandCardDragEnd: (cardId: string) => void
  passthroughInteractionForOwnJokerSwap?: boolean
}

export default function LocalHand({
  cards,
  selectedCardIds,
  hiddenCardIds,
  puttingDownCardIds,
  isGatheringForSort,
  isCloseUp,
  handHoverCameraFocusEnabled,
  selectedCardOutlineColor,
  onHandAreaFocusChange,
  onHandCardClick,
  onHandCardReorder,
  onHandCardDragChange,
  onHandCardDragEnd,
  onHandCardHover,
  passthroughInteractionForOwnJokerSwap = false,
}: LocalHandProps) {
  const { camera, gl } = useThree()
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [isDraggingOverHandArea, setIsDraggingOverHandArea] = useState(true)
  const [enteringCardIds, setEnteringCardIds] = useState<Set<string>>(() => new Set())
  const [isHandAreaHovered, setIsHandAreaHovered] = useState(false)
  const handAreaLeaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const enteringCardsTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const seenCardIdsRef = useRef<Set<string> | null>(null)
  const seenHiddenCardIdsRef = useRef<Set<string>>(new Set())
  const dragStateRef = useRef<HandDragState | null>(null)
  const dragVisualPositionRef = useRef<[number, number, number]>([0, 0, 0])
  const isDraggingOverHandAreaRef = useRef(true)
  const dragRaycasterRef = useRef(new Raycaster())
  const dragPointerRef = useRef(new Vector2())
  const dragIntersectionRef = useRef(new Vector3())
  const suppressNextClickRef = useRef(false)
  const finishDragRef = useRef<() => void>(() => undefined)
  const updateDragStateFromCoordinatesRef = useRef<(clientX: number, clientY: number) => HandDragState | undefined>(
    () => undefined,
  )
  const cardMembershipKey = [...cards.map((card) => card.id)].sort().join('|')
  const hiddenCardMembershipKey = [...hiddenCardIds].sort().join('|')
  const isDraggingOverActiveHandArea = Boolean(draggingCardId) && isDraggingOverHandArea
  const isHandPresentationActive =
    handHoverCameraFocusEnabled && (isHandAreaHovered || isDraggingOverActiveHandArea)

  useEffect(() => {
    onHandCardHover(hoveredCardIndex === null ? [] : [hoveredCardIndex])
  }, [hoveredCardIndex, onHandCardHover])

  useEffect(() => {
    if (!handHoverCameraFocusEnabled) {
      onHandAreaFocusChange(false)
      return
    }

    onHandAreaFocusChange(isHandPresentationActive)
  }, [handHoverCameraFocusEnabled, isHandPresentationActive, onHandAreaFocusChange])

  useLayoutEffect(() => {
    const nextCardIds = new Set(cardMembershipKey ? cardMembershipKey.split('|') : [])
    const previousCardIds = seenCardIdsRef.current
    const previousHiddenCardIds = new Set(seenHiddenCardIdsRef.current)
    seenCardIdsRef.current = nextCardIds
    seenHiddenCardIdsRef.current = hiddenCardMembershipKey ? new Set(hiddenCardMembershipKey.split('|')) : new Set()

    if (!previousCardIds) {
      return
    }

    const nextEnteringCardIds = new Set(
      [...nextCardIds].filter((cardId) => {
        if (previousCardIds.has(cardId)) {
          return false
        }

        if (!hiddenCardIds.has(cardId) && previousHiddenCardIds.size > 0) {
          const [previousHiddenCardId] = previousHiddenCardIds
          if (previousHiddenCardId) {
            previousHiddenCardIds.delete(previousHiddenCardId)
          }
          return false
        }

        return true
      }),
    )

    if (nextEnteringCardIds.size === 0) {
      return
    }

    setEnteringCardIds(nextEnteringCardIds)

    if (enteringCardsTimeoutRef.current) {
      window.clearTimeout(enteringCardsTimeoutRef.current)
    }

    enteringCardsTimeoutRef.current = window.setTimeout(() => {
      setEnteringCardIds(new Set())
    }, 900)
  }, [cardMembershipKey, hiddenCardIds, hiddenCardMembershipKey])

  useEffect(() => {
    return () => {
      if (handAreaLeaveTimeoutRef.current) {
        window.clearTimeout(handAreaLeaveTimeoutRef.current)
      }
      if (enteringCardsTimeoutRef.current) {
        window.clearTimeout(enteringCardsTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    finishDragRef.current = finishDrag
    updateDragStateFromCoordinatesRef.current = updateDragStateFromCoordinates
  })

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      updateDragStateFromCoordinatesRef.current(event.clientX, event.clientY)
    }

    function handleWindowPointerUp() {
      finishDragRef.current()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [])

  useEffect(() => {
    const previousCursor = document.body.style.cursor

    if (draggingCardId) {
      document.body.style.cursor = 'grabbing'
    } else if (hoveredCardIndex !== null) {
      document.body.style.cursor = 'grab'
    }

    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [draggingCardId, hoveredCardIndex])

  function handleHandAreaOver() {
    if (handAreaLeaveTimeoutRef.current) {
      window.clearTimeout(handAreaLeaveTimeoutRef.current)
    }

    setIsHandAreaHovered(true)
  }

  function handleHandAreaOut() {
    if (handAreaLeaveTimeoutRef.current) {
      window.clearTimeout(handAreaLeaveTimeoutRef.current)
    }

    handAreaLeaveTimeoutRef.current = window.setTimeout(() => {
      setIsHandAreaHovered(false)
    }, 90)
  }

  function handleCardClick(event: ThreeEvent<MouseEvent>, card: CardType) {
    event.stopPropagation()

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      return
    }

    onHandCardClick(card)
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

  function updateDragVisualPosition(nextPosition: [number, number, number]) {
    dragVisualPositionRef.current = nextPosition
  }

  function updateIsDraggingOverHandArea(nextIsDraggingOverHandArea: boolean) {
    if (isDraggingOverHandAreaRef.current === nextIsDraggingOverHandArea) {
      return
    }

    isDraggingOverHandAreaRef.current = nextIsDraggingOverHandArea
    setIsDraggingOverHandArea(nextIsDraggingOverHandArea)
  }

  function finishDrag() {
    const dragState = dragStateRef.current

    if (dragState?.moved) {
      suppressNextClickRef.current = true
      onHandCardDragEnd(dragState.cardId)
    }

    dragStateRef.current = null
    setDraggingCardId(null)
    updateIsDraggingOverHandArea(true)
    onHandCardDragChange(null)
  }

  function handleCardPointerDown(event: ThreeEvent<PointerEvent>, card: CardType, startPosition: [number, number, number]) {
    event.stopPropagation()
    handleHandAreaOver()
    const bounds = gl.domElement.getBoundingClientRect()
    const handStartPosition = new Vector3(...startPosition)
    const tableStartPosition = new Vector3(startPosition[0], DRAGGED_CARD_Y, startPosition[2])
    const handDragPlane = new Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new Vector3()).normalize(),
      handStartPosition,
    )
    const tableDragPlane = new Plane().setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), tableStartPosition)
    const handStartPointerWorld = pointerWorldOnPlane(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
      handDragPlane,
      bounds,
    )?.clone() ?? handStartPosition.clone()
    const tableStartPointerWorld = pointerWorldOnPlane(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
      tableDragPlane,
      bounds,
    )?.clone() ?? tableStartPosition.clone()

    const nextDragState = {
      cardId: card.id,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      handStartPosition,
      tableStartPosition,
      handStartPointerWorld,
      tableStartPointerWorld,
      handDragPlane,
      tableDragPlane,
      moved: false,
    }
    dragStateRef.current = nextDragState
    updateDragVisualPosition(startPosition)
    updateIsDraggingOverHandArea(true)
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
      onHandCardDragChange(dragState.cardId)
    }

    if (dragState.moved) {
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
    }

    return dragState
  }

  function updateDragStateFromPointer(event: ThreeEvent<PointerEvent>) {
    return updateDragStateFromCoordinates(event.nativeEvent.clientX, event.nativeEvent.clientY)
  }

  function handleCardPointerMove(event: ThreeEvent<PointerEvent>) {
    updateDragStateFromPointer(event)
  }

  function handleCardOver(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOver()
    setHoveredCardIndex(index)

    const dragState = updateDragStateFromPointer(event)
    const targetCard = cards[index]

    if (dragState?.moved && targetCard && dragState.cardId !== targetCard.id) {
      const lastReorderX = dragState.lastReorderX ?? dragState.startX

      if (Math.abs(event.nativeEvent.clientX - lastReorderX) < DRAG_REORDER_DISTANCE) {
        return
      }

      dragState.lastReorderX = event.nativeEvent.clientX
      onHandCardReorder(dragState.cardId, targetCard.id)
    }
  }

  function handleCardOut(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOut()
    setHoveredCardIndex((currentIndex) => (currentIndex === index ? null : currentIndex))
  }

  function handleCardPointerUp(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    finishDrag()
  }

  return (
    <group>
      {cards.map((card, index) => {
        const x = cardFanOffset(index, cards.length, LOCAL_HAND_CARD_SPACING, LOCAL_HAND_MAX_WIDTH)
        const resolvedSpacing =
          cards.length <= 1 ? CARD_WIDTH : Math.min(LOCAL_HAND_CARD_SPACING, LOCAL_HAND_MAX_WIDTH / Math.max(cards.length - 1, 1))
        const visibleOverlap = Math.max(0, CARD_WIDTH - resolvedSpacing)
        const isLastCard = index === cards.length - 1
        const interactionWidth = isLastCard ? CARD_WIDTH : resolvedSpacing
        const interactionOffsetX = isLastCard ? 0 : -visibleOverlap / 2
        const isPuttingDown = puttingDownCardIds.has(card.id)
        const isDragging = draggingCardId === card.id
        const isHidden = hiddenCardIds.has(card.id)
        const closeUpZOffset = isCloseUp ? LOCAL_HAND_CLOSEUP_Z_OFFSET : 0
        const targetRotation: [number, number, number] = handHoverCameraFocusEnabled
          ? [isHandPresentationActive ? -0.42 : -1.08, 0, 0]
          : [-Math.PI / 2, 0, 0]
        const isDraggingFlatOnTable = isDragging && !isDraggingOverHandArea
        const resolvedRotation: [number, number, number] = isDraggingFlatOnTable ? [-Math.PI / 2, 0, 0] : targetRotation
        const targetPosition: [number, number, number] = isGatheringForSort
          ? [0, 2.22 + index * 0.012, localHandBaseZ + closeUpZOffset - index * 0.008]
          : [x, 2.05, localHandBaseZ + closeUpZOffset]
        const resolvedPosition: [number, number, number] = isDragging ? dragVisualPositionRef.current : targetPosition
        const animateFrom: [number, number, number] | undefined = enteringCardIds.has(card.id)
          ? [deckPosition.x, tableCardBaseY + 0.34, deckPosition.z]
          : undefined

        return (
          <group key={card.id}>
            <CardMesh
              card={card}
              hidden={isHidden}
              position={resolvedPosition}
              positionRef={isDragging ? dragVisualPositionRef : undefined}
              rotation={resolvedRotation}
              animateFrom={isDragging ? undefined : animateFrom}
              animateRotationFrom={!isDragging && animateFrom ? [-Math.PI / 2, 0, 0.04] : undefined}
              renderOrder={isDragging ? 140 + index : index}
              layerOnTop
              snapToPosition={isDragging}
              disableLift={isDraggingFlatOnTable}
              selected={selectedCardIds.has(card.id)}
              outlineColor={selectedCardOutlineColor}
              hovered={hoveredCardIndex === index || isDragging}
              opacity={isPuttingDown ? 0 : 1}
              scale={isPuttingDown ? 0.62 : 1}
            />
            {!isPuttingDown && !isHidden ? (
              <mesh
                geometry={handInteractionGeometry}
                material={handInteractionMaterial}
                position={[targetPosition[0] + interactionOffsetX, targetPosition[1], targetPosition[2]]}
                rotation={targetRotation}
                scale={[interactionWidth, 1, 1]}
                raycast={
                  passthroughInteractionForOwnJokerSwap &&
                    (draggingCardId ? card.id !== draggingCardId : !selectedCardIds.has(card.id))
                    ? () => null
                    : undefined
                }
                onClick={(event) => handleCardClick(event, card)}
                onPointerDown={(event) => handleCardPointerDown(event, card, targetPosition)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerOver={(event) => handleCardOver(event, index)}
                onPointerOut={(event) => handleCardOut(event, index)}
              />
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
