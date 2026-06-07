import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DoubleSide, Plane, Raycaster, Vector2, Vector3 } from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, localHandBaseZ, tableCardBaseY } from './constants'
import { cardFanOffset } from './layout'
import type { GameTableSceneProps } from './types'

const LOCAL_HAND_CARD_SPACING = 1.08
const LOCAL_HAND_MAX_WIDTH = 11.6
const DRAG_CLICK_DISTANCE = 6
const DRAG_REORDER_DISTANCE = 10

type HandDragState = {
  cardId: string
  startX: number
  startY: number
  startPosition: Vector3
  startPointerWorld: Vector3
  dragPlane: Plane
  moved: boolean
  lastReorderX?: number
}

type LocalHandProps = Pick<
  GameTableSceneProps,
  'selectedCardIds' | 'onHandCardClick' | 'onHandCardReorder' | 'onHandCardHover'
> & {
  cards: CardType[]
  puttingDownCardIds: Set<string>
  isGatheringForSort: boolean
  selectedCardOutlineColor?: string
  onHandAreaFocusChange: (isFocused: boolean) => void
  onHandCardDragChange: (cardId: string | null) => void
}

export default function LocalHand({
  cards,
  selectedCardIds,
  puttingDownCardIds,
  isGatheringForSort,
  selectedCardOutlineColor,
  onHandAreaFocusChange,
  onHandCardClick,
  onHandCardReorder,
  onHandCardDragChange,
  onHandCardHover,
}: LocalHandProps) {
  const { camera, gl } = useThree()
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<[number, number, number]>([0, 0, 0])
  const [enteringCardIds, setEnteringCardIds] = useState<Set<string>>(() => new Set())
  const [isHandAreaHovered, setIsHandAreaHovered] = useState(false)
  const handAreaLeaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const enteringCardsTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const seenCardIdsRef = useRef<Set<string> | null>(null)
  const dragStateRef = useRef<HandDragState | null>(null)
  const dragRaycasterRef = useRef(new Raycaster())
  const dragPointerRef = useRef(new Vector2())
  const dragIntersectionRef = useRef(new Vector3())
  const suppressNextClickRef = useRef(false)
  const cardMembershipKey = [...cards.map((card) => card.id)].sort().join('|')

  useEffect(() => {
    onHandCardHover(hoveredCardIndex === null ? [] : [hoveredCardIndex])
  }, [hoveredCardIndex, onHandCardHover])

  useEffect(() => {
    onHandAreaFocusChange(isHandAreaHovered)
  }, [isHandAreaHovered, onHandAreaFocusChange])

  useLayoutEffect(() => {
    const nextCardIds = new Set(cardMembershipKey ? cardMembershipKey.split('|') : [])
    const previousCardIds = seenCardIdsRef.current
    seenCardIdsRef.current = nextCardIds

    if (!previousCardIds) {
      return
    }

    const nextEnteringCardIds = new Set([...nextCardIds].filter((cardId) => !previousCardIds.has(cardId)))

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
  }, [cardMembershipKey])

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
    function handleWindowPointerMove(event: PointerEvent) {
      updateDragStateFromCoordinates(event.clientX, event.clientY)
    }

    function handleWindowPointerUp() {
      if (dragStateRef.current?.moved) {
        suppressNextClickRef.current = true
      }

      dragStateRef.current = null
      setDraggingCardId(null)
      setDragOffset([0, 0, 0])
      onHandCardDragChange(null)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [onHandCardDragChange])

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

  function pointerWorldOnPlane(clientX: number, clientY: number, dragPlane: Plane) {
    const bounds = gl.domElement.getBoundingClientRect()

    dragPointerRef.current.set(
      ((clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
      -(((clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1),
    )
    dragRaycasterRef.current.setFromCamera(dragPointerRef.current, camera)

    return dragRaycasterRef.current.ray.intersectPlane(dragPlane, dragIntersectionRef.current)
  }

  function handleCardPointerDown(event: ThreeEvent<PointerEvent>, card: CardType, startPosition: [number, number, number]) {
    event.stopPropagation()
    handleHandAreaOver()
    const startPositionVector = new Vector3(...startPosition)
    const dragPlaneNormal = camera.getWorldDirection(new Vector3()).normalize()
    const dragPlane = new Plane().setFromNormalAndCoplanarPoint(dragPlaneNormal, startPositionVector)
    const startPointerWorld = pointerWorldOnPlane(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY,
      dragPlane,
    )?.clone() ?? startPositionVector.clone()

    dragStateRef.current = {
      cardId: card.id,
      startX: event.nativeEvent.clientX,
      startY: event.nativeEvent.clientY,
      startPosition: startPositionVector,
      startPointerWorld,
      dragPlane,
      moved: false,
    }
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
      const pointerWorld = pointerWorldOnPlane(clientX, clientY, dragState.dragPlane)

      if (pointerWorld) {
        setDragOffset([
          pointerWorld.x - dragState.startPointerWorld.x,
          pointerWorld.y - dragState.startPointerWorld.y,
          pointerWorld.z - dragState.startPointerWorld.z,
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

    if (dragStateRef.current?.moved) {
      suppressNextClickRef.current = true
    }

    dragStateRef.current = null
    setDraggingCardId(null)
    setDragOffset([0, 0, 0])
    onHandCardDragChange(null)
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
        const targetRotation: [number, number, number] = isGatheringForSort
          ? [isHandAreaHovered ? -0.42 : -1.08, 0, 0]
          : [isHandAreaHovered ? -0.42 : -1.08, 0, 0]
        const targetPosition: [number, number, number] = isGatheringForSort
          ? [0, 2.22 + index * 0.012, localHandBaseZ - index * 0.008]
          : [x, 2.05, localHandBaseZ]
        const dragState = dragStateRef.current
        const resolvedPosition: [number, number, number] = isDragging && dragState?.cardId === card.id
          ? [
            dragState.startPosition.x + dragOffset[0],
            dragState.startPosition.y + dragOffset[1],
            dragState.startPosition.z + dragOffset[2],
          ]
          : targetPosition
        const animateFrom: [number, number, number] | undefined = enteringCardIds.has(card.id)
          ? [deckPosition.x, tableCardBaseY + 0.34, deckPosition.z]
          : undefined

        return (
          <group key={card.id}>
            <CardMesh
              card={card}
              position={resolvedPosition}
              rotation={targetRotation}
              animateFrom={isDragging ? undefined : animateFrom}
              animateRotationFrom={!isDragging && animateFrom ? [-Math.PI / 2, 0, 0.04] : undefined}
              renderOrder={isDragging ? 140 + index : index}
              layerOnTop
              snapToPosition={isDragging}
              selected={selectedCardIds.has(card.id)}
              outlineColor={selectedCardOutlineColor}
              hovered={hoveredCardIndex === index || isDragging}
              opacity={isPuttingDown ? 0 : 1}
              scale={isPuttingDown ? 0.62 : 1}
            />
            {!isPuttingDown ? (
              <mesh
                position={[targetPosition[0] + interactionOffsetX, targetPosition[1], targetPosition[2]]}
                rotation={targetRotation}
                onClick={(event) => handleCardClick(event, card)}
                onPointerDown={(event) => handleCardPointerDown(event, card, targetPosition)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={handleCardPointerUp}
                onPointerOver={(event) => handleCardOver(event, index)}
                onPointerOut={(event) => handleCardOut(event, index)}
              >
                <planeGeometry args={[interactionWidth, CARD_HEIGHT]} />
                <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}
