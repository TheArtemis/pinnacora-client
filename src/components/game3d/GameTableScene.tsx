import { Canvas } from '@react-three/fiber'
import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import { localPlayerId } from './layout'
import SceneContent from './SceneContent'
import type { GameTableSceneProps } from './types'

export default function GameTableScene(props: GameTableSceneProps) {
  const viewerPlayerId = localPlayerId(props.state)
  const opponent = props.state?.players.find((player) => player.id !== viewerPlayerId)
  const [isLowerCanvasFocused, setIsLowerCanvasFocused] = useState(false)
  const [isHandAreaFocused, setIsHandAreaFocused] = useState(false)
  const isLocalHandFocused = isLowerCanvasFocused || isHandAreaFocused

  function handleScenePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY - bounds.top

    setIsLowerCanvasFocused(pointerY > bounds.height * 0.62)
  }

  return (
    <div
      className="game-scene"
      onPointerMove={handleScenePointerMove}
      onPointerLeave={() => {
        setIsLowerCanvasFocused(false)
        setIsHandAreaFocused(false)
      }}
    >
      <Canvas camera={{ position: [0, 19, 8], fov: 49 }}>
        <SceneContent
          {...props}
          isLocalHandFocused={isLocalHandFocused}
          onLocalHandFocusChange={setIsHandAreaFocused}
        />
      </Canvas>
      <div className="game-scene__table-hint" aria-live="polite">
        <span>{props.tableHint}</span>
        {props.canPutDownMeld ? (
          <button type="button" onClick={props.onPutDownMeld} disabled={!props.canPutDownSelectedMeld}>
            Put down combination
          </button>
        ) : null}
      </div>
      <div className="game-scene__hud" aria-live="polite">
        <div>
          <span>Deck</span>
          <strong>{props.state?.deckCount ?? 0}</strong>
        </div>
        <div>
          <span>Discard</span>
          <strong>{props.state?.discardPile.length ?? 0}</strong>
        </div>
        <div>
          <span>{opponent?.name ?? 'Opponent'}</span>
          <strong>{opponent?.handCount ?? 0} backs</strong>
        </div>
      </div>
      <div className="game-scene__sort-actions" aria-label="Hand sorting">
        <button
          type="button"
          className={props.handSortMode === 'suit' ? 'secondary-button secondary-button--active' : 'secondary-button'}
          onClick={() => props.onHandSortModeChange('suit')}
          aria-pressed={props.handSortMode === 'suit'}
        >
          Order by suit
        </button>
        <button
          type="button"
          className={props.handSortMode === 'value' ? 'secondary-button secondary-button--active' : 'secondary-button'}
          onClick={() => props.onHandSortModeChange('value')}
          aria-pressed={props.handSortMode === 'value'}
        >
          Order by value
        </button>
      </div>
    </div>
  )
}
