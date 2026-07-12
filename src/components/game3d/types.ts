import type { Card as CardType } from '../../game/cardTypes'
import type { HandSortMode } from '../../game/handOrder'
import type { ServerGameState } from '../../game/serverTypes'

export type GameTableSceneProps = {
  state: ServerGameState | null
  hand: CardType[]
  puttingDownCards: CardType[]
  hiddenHandCardIds: Set<string>
  isHandGatheringForSort: boolean
  selectedCardIds: Set<string>
  selectedCardOutlineColor?: string
  opponentHoveredHandIndexes: Set<number>
  discardPileHighlightStartIndex: number | null
  discardPileMeldTargetIds: Set<string>
  discardPileJokerTargetIds: Set<string>
  swappableMeldJokerIds: Set<string>
  ownMeldAttachTargetIds: Set<string>
  tableHint: string
  handSortMode: HandSortMode
  handHoverCameraFocusEnabled: boolean
  canDraw: boolean
  canDiscard: boolean
  canPickUpDiscardPile: boolean
  canPutDownMeld: boolean
  canPutDownSelectedMeld: boolean
  onDrawCard: () => void
  onHandCardClick: (card: CardType) => void
  onHandCardReorder: (draggedCardId: string, targetCardId: string) => void
  onHandCardHover: (cardIndexes: number[]) => void
  onHandSortModeChange: (sortMode: HandSortMode) => void
  onDiscardPileCardClick: (index: number) => void
  onDiscardPileCardHover: (index: number | null) => void
  onDiscardPileMeldTargetClick: (meldId: string) => void
  onDiscardPileJokerTargetClick: (meldId: string, jokerCardId: string) => void
  onDiscardHandCard: (cardId: string) => void
  onDiscardSelectedCard: () => void
  onMeldJokerClick: (meldId: string, jokerCardId: string) => void
  onMeldJokerDrop: (meldId: string, jokerCardId: string, replacementCardId: string) => void
  onAttachToMeld: (meldId: string) => void
  onAttachToMeldDrop: (meldId: string, cardId: string) => void
  onPutDownMeld: () => void
}

export type TablePressZoomPoint = {
  x: number
  z: number
}

export type SceneContentProps = GameTableSceneProps & {
  isLocalHandFocused: boolean
  isMiddleTableFocused: boolean
  tablePressZoomPoint: TablePressZoomPoint | null
  onTablePressZoomChange: (point: TablePressZoomPoint | null) => void
  onLocalHandFocusChange: (isFocused: boolean) => void
}
