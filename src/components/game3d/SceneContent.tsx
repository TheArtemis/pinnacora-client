import { useMemo } from 'react'
import CameraRig from './CameraRig'
import { DeckDrawArrow, DeckPile } from './DeckPile'
import DiscardPile from './DiscardPile'
import LocalHand from './LocalHand'
import MeldCards from './MeldCards'
import OpponentHand from './OpponentHand'
import PuttingDownCards from './PuttingDownCards'
import TableTop from './TableTop'
import type { SceneContentProps } from './types'

export default function SceneContent(props: SceneContentProps) {
  const discardPile = props.state?.discardPile ?? []
  const puttingDownCardIds = useMemo(
    () => new Set(props.puttingDownCards.map((card) => card.id)),
    [props.puttingDownCards],
  )

  return (
    <>
      <CameraRig focusLocalHand={props.isLocalHandFocused} />
      <color attach="background" args={['#10281f']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.8, 5.2, 4.4]} intensity={1.8} />
      <TableTop />
      <DeckPile deckCount={props.state?.deckCount ?? 0} canDraw={props.canDraw} onDrawCard={props.onDrawCard} />
      <DeckDrawArrow visible={props.canDraw} />
      <DiscardPile
        cards={discardPile}
        canDiscard={props.canDiscard}
        canPickUpDiscardPile={props.canPickUpDiscardPile}
        discardPileHighlightStartIndex={props.discardPileHighlightStartIndex}
        onDiscardPileCardClick={props.onDiscardPileCardClick}
        onDiscardPileCardHover={props.onDiscardPileCardHover}
        onDiscardSelectedCard={props.onDiscardSelectedCard}
      />
      <MeldCards state={props.state} />
      <OpponentHand state={props.state} hoveredCardIndexes={props.opponentHoveredHandIndexes} />
      <LocalHand
        cards={props.hand}
        selectedCardIds={props.selectedCardIds}
        puttingDownCardIds={puttingDownCardIds}
        isGatheringForSort={props.isHandGatheringForSort}
        onHandAreaFocusChange={props.onLocalHandFocusChange}
        onHandCardClick={props.onHandCardClick}
        onHandCardHover={props.onHandCardHover}
      />
      <PuttingDownCards cards={props.puttingDownCards} />
    </>
  )
}
