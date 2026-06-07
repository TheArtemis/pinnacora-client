import type { Card as CardType } from '../../game/cardTypes'
import type { ServerGameState } from '../../game/serverTypes'

export type HandSortMode = 'suit' | 'value'

export type GameTableSceneProps = {
  state: ServerGameState | null
  hand: CardType[]
  puttingDownCards: CardType[]
  isHandGatheringForSort: boolean
  selectedCardIds: Set<string>
  selectedCardOutlineColor?: string
  opponentHoveredHandIndexes: Set<number>
  discardPileHighlightStartIndex: number | null
  tableHint: string
  handSortMode: HandSortMode
  canDraw: boolean
  canDiscard: boolean
  canPickUpDiscardPile: boolean
  canPutDownMeld: boolean
  canPutDownSelectedMeld: boolean
  onDrawCard: () => void
  onHandCardClick: (card: CardType) => void
  onHandCardHover: (cardIndexes: number[]) => void
  onHandSortModeChange: (sortMode: HandSortMode) => void
  onDiscardPileCardClick: (index: number) => void
  onDiscardPileCardHover: (index: number | null) => void
  onDiscardSelectedCard: () => void
  onPutDownMeld: () => void
}

export type SceneContentProps = GameTableSceneProps & {
  isLocalHandFocused: boolean
  isMiddleTableFocused: boolean
  onLocalHandFocusChange: (isFocused: boolean) => void
}
