import { TABLE } from './constants'

export default function TableTop() {
  const outerHalfWidth = TABLE.outerWidth / 2
  const playingHalfWidth = TABLE.playingWidth / 2
  const playingHalfDepth = TABLE.playingDepth / 2
  const railZ = playingHalfDepth + TABLE.playingInset

  return (
    <group>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[TABLE.outerWidth, 0.36, TABLE.outerDepth]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.72} metalness={0.01} />
      </mesh>

      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[TABLE.playingWidth, 0.08, TABLE.playingDepth]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} metalness={0.01} />
      </mesh>

      <mesh position={[0, 0.14, -railZ]}>
        <boxGeometry args={[TABLE.outerWidth, TABLE.railHeight, TABLE.railThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.14, railZ]}>
        <boxGeometry args={[TABLE.outerWidth, TABLE.railHeight, TABLE.railThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[-outerHalfWidth + TABLE.railThickness / 2, 0.14, 0]}>
        <boxGeometry args={[TABLE.railThickness, TABLE.railHeight, TABLE.outerDepth - 0.48]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[outerHalfWidth - TABLE.railThickness / 2, 0.14, 0]}>
        <boxGeometry args={[TABLE.railThickness, TABLE.railHeight, TABLE.outerDepth - 0.48]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.32, -(playingHalfDepth - 0.08)]}>
        <boxGeometry args={[TABLE.playingWidth + 0.1, 0.035, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0.32, playingHalfDepth - 0.08]}>
        <boxGeometry args={[TABLE.playingWidth + 0.1, 0.035, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[-(playingHalfWidth - 0.3), 0.32, 0]}>
        <boxGeometry args={[0.08, 0.035, TABLE.playingDepth + 0.3]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[playingHalfWidth - 0.3, 0.32, 0]}>
        <boxGeometry args={[0.08, 0.035, TABLE.playingDepth + 0.3]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
    </group>
  )
}
