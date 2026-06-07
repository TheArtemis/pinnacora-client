export default function TableTop() {
  return (
    <group>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[23.4, 0.36, 17.2]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.72} metalness={0.01} />
      </mesh>

      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[20.8, 0.08, 14.6]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} metalness={0.01} />
      </mesh>

      <mesh position={[0, 0.14, -8.1]}>
        <boxGeometry args={[23.4, 0.32, 0.52]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.14, 8.1]}>
        <boxGeometry args={[23.4, 0.32, 0.52]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[-11.45, 0.14, 0]}>
        <boxGeometry args={[0.52, 0.32, 16.72]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[11.45, 0.14, 0]}>
        <boxGeometry args={[0.52, 0.32, 16.72]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.58} metalness={0.02} />
      </mesh>

      <mesh position={[0, 0.32, -7.42]}>
        <boxGeometry args={[20.9, 0.035, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0.32, 7.42]}>
        <boxGeometry args={[20.9, 0.035, 0.08]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[-10.5, 0.32, 0]}>
        <boxGeometry args={[0.08, 0.035, 14.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
      <mesh position={[10.5, 0.32, 0]}>
        <boxGeometry args={[0.08, 0.035, 14.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.48} metalness={0.06} />
      </mesh>
    </group>
  )
}
