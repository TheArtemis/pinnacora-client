import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { localPlayerId } from './layout'
import SceneContent from './SceneContent'
import type { GameTableSceneProps } from './types'

const cameraSettings = { position: [0, 21.5, 10] as [number, number, number], fov: 51 }
const glSettings = { antialias: true, powerPreference: 'high-performance' as const }

export default function GameTableScene(props: GameTableSceneProps) {
  const viewerPlayerId = localPlayerId(props.state)
  const opponent = props.state?.players.find((player) => player.id !== viewerPlayerId)
  const [isLowerCanvasFocused, setIsLowerCanvasFocused] = useState(false)
  const [isHandAreaFocused, setIsHandAreaFocused] = useState(false)
  const [isTableZoomEnabled, setIsTableZoomEnabled] = useState(false)
  const [tablePressZoomPoint, setTablePressZoomPoint] = useState<{ x: number; z: number } | null>(null)
  const isLowerCanvasFocusedRef = useRef(false)
  const isHandAreaFocusedRef = useRef(false)
  const isLocalHandFocused =
    props.handHoverCameraFocusEnabled && (isLowerCanvasFocused || isHandAreaFocused)
  const isMiddleTableFocused = (isTableZoomEnabled || tablePressZoomPoint !== null) && !isLocalHandFocused
  const isSceneCloseUp = isLocalHandFocused || isMiddleTableFocused

  useEffect(() => {
    if (props.handHoverCameraFocusEnabled) {
      return
    }

    isLowerCanvasFocusedRef.current = false
    isHandAreaFocusedRef.current = false
    setIsLowerCanvasFocused(false)
    setIsHandAreaFocused(false)
  }, [props.handHoverCameraFocusEnabled])

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
    if (!props.handHoverCameraFocusEnabled) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerY = event.clientY - bounds.top
    const isInLowerCanvas = pointerY > bounds.height * 0.62

    updateLowerCanvasFocus(isInLowerCanvas)
  }, [props.handHoverCameraFocusEnabled, updateLowerCanvasFocus])

  const handleScenePointerLeave = useCallback(() => {
    updateLowerCanvasFocus(false)
    handleLocalHandFocusChange(false)
  }, [handleLocalHandFocusChange, updateLowerCanvasFocus])

  const handleToggleTableZoom = useCallback(() => {
    setIsTableZoomEnabled((isEnabled) => !isEnabled)
  }, [])

  const showSortActions = !props.handHoverCameraFocusEnabled || isSceneCloseUp
  const sortActionsClassName = props.handHoverCameraFocusEnabled
    ? 'game-scene__sort-actions'
    : 'game-scene__sort-actions game-scene__sort-actions--bottom-right'

  return (
    <div
      className="game-scene"
      onPointerMove={handleScenePointerMove}
      onPointerLeave={handleScenePointerLeave}
    >
      <Canvas camera={cameraSettings} dpr={[1, 2]} gl={glSettings}>
        <SceneContent
          {...props}
          isLocalHandFocused={isLocalHandFocused}
          isMiddleTableFocused={isMiddleTableFocused}
          tablePressZoomPoint={tablePressZoomPoint}
          onTablePressZoomChange={setTablePressZoomPoint}
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
      <button
        type="button"
        className={isTableZoomEnabled ? 'game-scene__table-zoom secondary-button secondary-button--active' : 'game-scene__table-zoom secondary-button'}
        onClick={handleToggleTableZoom}
        aria-pressed={isTableZoomEnabled}
        aria-label={isTableZoomEnabled ? 'Return to full table view' : 'Zoom in on discard pile and table'}
      >
        {isTableZoomEnabled ? <ZoomOut size={16} aria-hidden="true" /> : <ZoomIn size={16} aria-hidden="true" />}
        <span>{isTableZoomEnabled ? 'Full view' : 'Zoom table'}</span>
      </button>
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
      {showSortActions ? (
        <div className={sortActionsClassName} aria-label="Hand sorting">
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
