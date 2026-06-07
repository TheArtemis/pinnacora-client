import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MathUtils, type Group } from 'three'
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
  const tableCardsRef = useRef<Group>(null)
  const puttingDownCardIds = useMemo(
    () => new Set(props.puttingDownCards.map((card) => card.id)),
    [props.puttingDownCards],
  )

  useFrame((_, delta) => {
    if (!tableCardsRef.current) {
      return
    }

    const targetY = props.isMiddleTableFocused ? 1.08 : 0
    const targetZ = props.isMiddleTableFocused ? 1.18 : 0

    tableCardsRef.current.position.y = MathUtils.damp(tableCardsRef.current.position.y, targetY, 7.2, delta)
    tableCardsRef.current.position.z = MathUtils.damp(tableCardsRef.current.position.z, targetZ, 7.2, delta)
  })

  return (
    <>
      <CameraRig focusLocalHand={props.isLocalHandFocused} focusMiddleTable={props.isMiddleTableFocused} />
      <color attach="background" args={['#10281f']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[1.8, 5.2, 4.4]} intensity={1.8} />
      <TableTop />
      <group ref={tableCardsRef}>
        <DeckPile
          deckCount={props.state?.deckCount ?? 0}
          canDraw={props.canDraw}
          onDrawCard={props.onDrawCard}
        />
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
      </group>
      <OpponentHand state={props.state} hoveredCardIndexes={props.opponentHoveredHandIndexes} />
      <LocalHand
        cards={props.hand}
        selectedCardIds={props.selectedCardIds}
        selectedCardOutlineColor={props.selectedCardOutlineColor}
        puttingDownCardIds={puttingDownCardIds}
        isGatheringForSort={props.isHandGatheringForSort}
        onHandAreaFocusChange={props.onLocalHandFocusChange}
        onHandCardClick={props.onHandCardClick}
        onHandCardReorder={props.onHandCardReorder}
        onHandCardHover={props.onHandCardHover}
      />
      <PuttingDownCards cards={props.puttingDownCards} />
    </>
  )
}
