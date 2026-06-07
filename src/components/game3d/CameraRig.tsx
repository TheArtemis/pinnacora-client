import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { localHandBaseZ } from './constants'

type CameraRigProps = {
  focusLocalHand: boolean
}

export default function CameraRig({ focusLocalHand }: CameraRigProps) {
  const { camera, size } = useThree()
  const cameraRef = useRef(camera)
  const lookAtTargetRef = useRef(new Vector3(0, 0, 0))

  useEffect(() => {
    cameraRef.current = camera
    const aspectRatio = size.width / Math.max(size.height, 1)
    const isTallView = aspectRatio < 0.9

    camera.position.set(0, isTallView ? 22 : 19, isTallView ? 9.5 : 8)
    camera.lookAt(0, 0, 0)
  }, [camera, size.height, size.width])

  useFrame((_, delta) => {
    const aspectRatio = size.width / Math.max(size.height, 1)
    const isTallView = aspectRatio < 0.9
    const targetCameraY = focusLocalHand ? 7.4 : isTallView ? 22 : 19
    const targetCameraZ = focusLocalHand ? 13.4 : isTallView ? 9.5 : 8
    const targetLookY = focusLocalHand ? 1.35 : 0
    const targetLookZ = focusLocalHand ? localHandBaseZ - 0.5 : 0
    const activeCamera = cameraRef.current

    activeCamera.position.y = MathUtils.damp(activeCamera.position.y, targetCameraY, 5.8, delta)
    activeCamera.position.z = MathUtils.damp(activeCamera.position.z, targetCameraZ, 5.8, delta)
    lookAtTargetRef.current.y = MathUtils.damp(lookAtTargetRef.current.y, targetLookY, 5.8, delta)
    lookAtTargetRef.current.z = MathUtils.damp(lookAtTargetRef.current.z, targetLookZ, 5.8, delta)
    activeCamera.lookAt(lookAtTargetRef.current)
  })

  return null
}
