import type { Card as CardType } from '../../game/cardTypes'
import type { ServerGameState } from '../../game/serverTypes'

export type HandSortMode = 'suit' | 'value'

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
  swappableMeldJokerIds: Set<string>
  tableHint: string
  handSortMode: HandSortMode
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
  onDiscardHandCard: (cardId: string) => void
  onDiscardSelectedCard: () => void
  onMeldJokerClick: (meldId: string, jokerCardId: string) => void
  onPutDownMeld: () => void
}

export type SceneContentProps = GameTableSceneProps & {
  isLocalHandFocused: boolean
  isMiddleTableFocused: boolean
  onLocalHandFocusChange: (isFocused: boolean) => void
}
