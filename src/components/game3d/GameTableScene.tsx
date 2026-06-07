import { Canvas } from '@react-three/fiber'
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { localPlayerId } from './layout'
import SceneContent from './SceneContent'
import type { GameTableSceneProps } from './types'

const cameraSettings = { position: [0, 19, 8] as [number, number, number], fov: 49 }
const glSettings = { antialias: true, powerPreference: 'high-performance' as const }

export default function GameTableScene(props: GameTableSceneProps) {
  const viewerPlayerId = localPlayerId(props.state)
  const opponent = props.state?.players.find((player) => player.id !== viewerPlayerId)
  const [isLowerCanvasFocused, setIsLowerCanvasFocused] = useState(false)
  const [isHandAreaFocused, setIsHandAreaFocused] = useState(false)
  const isLowerCanvasFocusedRef = useRef(false)
  const isHandAreaFocusedRef = useRef(false)
  const isLocalHandFocused = isLowerCanvasFocused || isHandAreaFocused
  const isMiddleTableFocused = false
  const isSceneCloseUp = isLocalHandFocused || isMiddleTableFocused

  const updateLowerCanvasFocus = useCallback((isFocused: boolean) => {
    if (isLowerCanvasFocusedRef.current === isFocused) {
      return
    }

    isLowerCanvasFocusedRef.current = isFocused
    setIsLowerCanvasFocused(isFocused)
  }, [])

  const handleLocalHandFocusChange = useCallback((isFocused: boolean) => {
    if (isHandAreaFocusedRef.current === isFocused) {
      return
    }

    isHandAreaFocusedRef.current = isFocused
    setIsHandAreaFocused(isFocused)
  }, [])

  const handleScenePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY - bounds.top
    const isInLowerCanvas = pointerY > bounds.height * 0.62

    updateLowerCanvasFocus(isInLowerCanvas)
  }, [updateLowerCanvasFocus])

  const handleScenePointerLeave = useCallback(() => {
    updateLowerCanvasFocus(false)
    handleLocalHandFocusChange(false)
  }, [handleLocalHandFocusChange, updateLowerCanvasFocus])

  return (
    <div
      className="game-scene"
      onPointerMove={handleScenePointerMove}
      onPointerLeave={handleScenePointerLeave}
    >
      <Canvas camera={cameraSettings} dpr={[1, 1.5]} gl={glSettings}>
        <SceneContent
          {...props}
          isLocalHandFocused={isLocalHandFocused}
          isMiddleTableFocused={isMiddleTableFocused}
          onLocalHandFocusChange={handleLocalHandFocusChange}
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
      {isSceneCloseUp ? (
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
      ) : null}
    </div>
  )
}
