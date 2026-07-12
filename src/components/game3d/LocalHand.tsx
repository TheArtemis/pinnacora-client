import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DoubleSide, MeshBasicMaterial, PlaneGeometry } from 'three'
import { type ThreeEvent } from '@react-three/fiber'
import type { Card as CardType } from '../../game/cardTypes'
import CardMesh, { CARD_HEIGHT, CARD_WIDTH } from './CardMesh'
import { deckPosition, localHandBaseZ, tableCardBaseY } from './constants'
import { cardFanOffset } from './layout'
import DevOutline from './DevOutline'
import type { GameTableSceneProps } from './types'
import { useHandCardDrag } from './useHandCardDrag'

const LOCAL_HAND_CARD_SPACING = 1.08
const LOCAL_HAND_MAX_WIDTH = 11.6
const LOCAL_HAND_CLOSEUP_Z_OFFSET = 0.58
const handInteractionGeometry = new PlaneGeometry(1, CARD_HEIGHT)
const handInteractionMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, side: DoubleSide, depthWrite: false })

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
  activeHandCardIds: Set<string>
  onHandAreaFocusChange: (isFocused: boolean) => void
  onHandCardDragChange: (cardId: string | null) => void
  onHandCardDragEnd: (cardId: string) => void
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
  activeHandCardIds,
  onHandAreaFocusChange,
  onHandCardClick,
  onHandCardReorder,
  onHandCardDragChange,
  onHandCardDragEnd,
  onHandCardHover,
}: LocalHandProps) {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null)
  const [enteringCardIds, setEnteringCardIds] = useState<Set<string>>(() => new Set())
  const [isHandAreaHovered, setIsHandAreaHovered] = useState(false)
  const handAreaLeaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const enteringCardsTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const seenCardIdsRef = useRef<Set<string> | null>(null)
  const seenHiddenCardIdsRef = useRef<Set<string>>(new Set())
  const cardMembershipKey = [...cards.map((card) => card.id)].sort().join('|')
  const hiddenCardMembershipKey = [...hiddenCardIds].sort().join('|')

  const {
    draggingCardId,
    dragVisualPositionRef,
    isDraggingOverHandArea,
    startDrag,
    handlePointerMove,
    handlePointerOverReorder,
  } = useHandCardDrag({
    cards,
    hiddenCardIds,
    puttingDownCardIds,
    enabled: true,
    onDragChange: onHandCardDragChange,
    onDragEnd: onHandCardDragEnd,
    onCardClick: onHandCardClick,
    onReorder: onHandCardReorder,
  })

  const isDraggingOverActiveHandArea = Boolean(draggingCardId) && isDraggingOverHandArea
  const isHandPresentationActive =
    handHoverCameraFocusEnabled && (isHandAreaHovered || isDraggingOverActiveHandArea)

  function isCardPointerEnabled(cardId: string) {
    if (activeHandCardIds.size === 0) {
      return true
    }

    return activeHandCardIds.has(cardId)
  }

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

  function handleCardPointerDown(event: ThreeEvent<PointerEvent>, card: CardType, startPosition: [number, number, number]) {
    event.stopPropagation()
    handleHandAreaOver()
    startDrag(card, startPosition, event.nativeEvent.clientX, event.nativeEvent.clientY)
  }

  function handleCardPointerMove(event: ThreeEvent<PointerEvent>) {
    handlePointerMove(event.nativeEvent.clientX, event.nativeEvent.clientY)
  }

  function handleCardOver(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOver()
    setHoveredCardIndex(index)
    handlePointerOverReorder(event.nativeEvent.clientX, event.nativeEvent.clientY, cards[index])
  }

  function handleCardOut(event: ThreeEvent<PointerEvent>, index: number) {
    event.stopPropagation()
    handleHandAreaOut()
    setHoveredCardIndex((currentIndex) => (currentIndex === index ? null : currentIndex))
  }

  return (
    <group>
      <DevOutline
        width={LOCAL_HAND_MAX_WIDTH}
        height={CARD_HEIGHT}
        position={[0, 2.05, localHandBaseZ + (isCloseUp ? LOCAL_HAND_CLOSEUP_Z_OFFSET : 0)]}
        rotation={handHoverCameraFocusEnabled ? [-0.72, 0, 0] : [-Math.PI / 2, 0, 0]}
        color="#06b6d4"
      />
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
        const pointerEnabled = isCardPointerEnabled(card.id)

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
                raycast={pointerEnabled ? undefined : () => null}
                onPointerDown={(event) => handleCardPointerDown(event, card, targetPosition)}
                onPointerMove={handleCardPointerMove}
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
