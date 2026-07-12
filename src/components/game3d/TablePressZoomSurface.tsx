import { useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useThree } from '@react-three/fiber'
import { TABLE, TABLE_PRESS_ZOOM, tableCardBaseY } from './constants'

type TablePressZoomSurfaceProps = {
  enabled: boolean
  onPressZoomChange: (point: { x: number; z: number } | null) => void
}

function clampToPlayingArea(x: number, z: number) {
  const halfWidth = TABLE.playingWidth / 2 - 0.4
  const halfDepth = TABLE.playingDepth / 2 - 0.4

  return {
    x: Math.max(-halfWidth, Math.min(halfWidth, x)),
    z: Math.max(-halfDepth, Math.min(halfDepth, z)),
  }
}

export default function TablePressZoomSurface({ enabled, onPressZoomChange }: TablePressZoomSurfaceProps) {
  const { gl } = useThree()
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const startClientRef = useRef<{ x: number; y: number } | null>(null)
  const isZoomActiveRef = useRef(false)
  const onPressZoomChangeRef = useRef(onPressZoomChange)

  useEffect(() => {
    onPressZoomChangeRef.current = onPressZoomChange
  })

  function clearHoldTimer() {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  function endPressZoom() {
    clearHoldTimer()
    activePointerIdRef.current = null
    startClientRef.current = null

    if (isZoomActiveRef.current) {
      isZoomActiveRef.current = false
      onPressZoomChangeRef.current(null)
    }
  }

  function activatePressZoom(x: number, z: number) {
    isZoomActiveRef.current = true
    onPressZoomChangeRef.current(clampToPlayingArea(x, z))
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!enabled || event.button !== 0) {
      return
    }

    event.stopPropagation()
    clearHoldTimer()
    endPressZoom()

    const point = event.point
    activePointerIdRef.current = event.pointerId
    startClientRef.current = { x: event.clientX, y: event.clientY }

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null

      if (activePointerIdRef.current === event.pointerId) {
        activatePressZoom(point.x, point.z)
      }
    }, TABLE_PRESS_ZOOM.holdDurationMs)

    try {
      gl.domElement.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture can fail if the pointer is no longer active.
    }
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (activePointerIdRef.current !== event.pointerId || !startClientRef.current) {
      return
    }

    if (isZoomActiveRef.current) {
      activatePressZoom(event.point.x, event.point.z)
      return
    }

    const deltaX = event.clientX - startClientRef.current.x
    const deltaY = event.clientY - startClientRef.current.y

    if (Math.hypot(deltaX, deltaY) >= TABLE_PRESS_ZOOM.moveThreshold) {
      endPressZoom()
    }
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (activePointerIdRef.current !== event.pointerId) {
      return
    }

    endPressZoom()

    try {
      gl.domElement.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released.
    }
  }

  useEffect(() => {
    if (enabled) {
      return
    }

    endPressZoom()
  }, [enabled])

  useEffect(() => {
    function handleWindowPointerEnd(event: PointerEvent) {
      if (activePointerIdRef.current !== event.pointerId) {
        return
      }

      endPressZoom()
    }

    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)
    window.addEventListener('blur', endPressZoom)

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
      window.removeEventListener('blur', endPressZoom)
      endPressZoom()
    }
  }, [])

  if (!enabled) {
    return null
  }

  return (
    <mesh
      position={[0, tableCardBaseY + 0.002, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <planeGeometry args={[TABLE.playingWidth, TABLE.playingDepth]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
