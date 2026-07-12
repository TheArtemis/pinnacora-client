import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { localHandBaseZ, TABLE_CAMERA_FOCUS, TABLE_PRESS_ZOOM } from './constants'

type TableFocusPoint = {
  x: number
  z: number
}

type CameraRigProps = {
  focusLocalHand: boolean
  focusMiddleTable: boolean
  tableFocusPoint?: TableFocusPoint | null
}

export default function CameraRig({ focusLocalHand, focusMiddleTable, tableFocusPoint }: CameraRigProps) {
  const { camera, size } = useThree()
  const cameraRef = useRef(camera)
  const lookAtTargetRef = useRef(new Vector3(0, 0, 0))

  useEffect(() => {
    cameraRef.current = camera
    const aspectRatio = size.width / Math.max(size.height, 1)
    const isTallView = aspectRatio < 0.9

    camera.position.set(0, isTallView ? 24 : 21.5, isTallView ? 11 : 10)
    camera.lookAt(0, 0, 0)
  }, [camera, size.height, size.width])

  useFrame((_, delta) => {
    const aspectRatio = size.width / Math.max(size.height, 1)
    const isTallView = aspectRatio < 0.9
    const isTablePressZoom = focusMiddleTable && tableFocusPoint != null
    const targetCameraX = isTablePressZoom ? tableFocusPoint.x : 0
    const targetCameraY = focusLocalHand
      ? 7.4
      : focusMiddleTable
        ? isTablePressZoom
          ? (isTallView ? TABLE_PRESS_ZOOM.camera.tall.y : TABLE_PRESS_ZOOM.camera.wide.y)
          : (isTallView ? TABLE_CAMERA_FOCUS.camera.tall.y : TABLE_CAMERA_FOCUS.camera.wide.y)
        : isTallView
          ? 24
          : 21.5
    const targetCameraZ = focusLocalHand
      ? 14.2
      : focusMiddleTable
        ? isTablePressZoom
          ? tableFocusPoint.z + (isTallView ? TABLE_PRESS_ZOOM.camera.tall.zOffset : TABLE_PRESS_ZOOM.camera.wide.zOffset)
          : (isTallView ? TABLE_CAMERA_FOCUS.camera.tall.z : TABLE_CAMERA_FOCUS.camera.wide.z)
        : isTallView
          ? 11
          : 10
    const targetLookX = focusLocalHand
      ? 0
      : focusMiddleTable
        ? (tableFocusPoint?.x ?? TABLE_CAMERA_FOCUS.lookAt.x)
        : 0
    const targetLookY = focusLocalHand
      ? 1.35
      : focusMiddleTable
        ? (isTablePressZoom ? TABLE_PRESS_ZOOM.lookAt.y : TABLE_CAMERA_FOCUS.lookAt.y)
        : 0
    const targetLookZ = focusLocalHand
      ? localHandBaseZ - 0.5
      : focusMiddleTable
        ? (tableFocusPoint?.z ?? TABLE_CAMERA_FOCUS.lookAt.z)
        : 0
    const activeCamera = cameraRef.current

    activeCamera.position.x = MathUtils.damp(activeCamera.position.x, targetCameraX, 5.8, delta)
    activeCamera.position.y = MathUtils.damp(activeCamera.position.y, targetCameraY, 5.8, delta)
    activeCamera.position.z = MathUtils.damp(activeCamera.position.z, targetCameraZ, 5.8, delta)
    lookAtTargetRef.current.x = MathUtils.damp(lookAtTargetRef.current.x, targetLookX, 5.8, delta)
    lookAtTargetRef.current.y = MathUtils.damp(lookAtTargetRef.current.y, targetLookY, 5.8, delta)
    lookAtTargetRef.current.z = MathUtils.damp(lookAtTargetRef.current.z, targetLookZ, 5.8, delta)
    activeCamera.lookAt(lookAtTargetRef.current)
  })

  return null
}
