export default function TableTop() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[20.4, 0.18, 15.6]} />
        <meshStandardMaterial color="#4d2e21" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[19.4, 14.5]} />
        <meshStandardMaterial color="#17634d" roughness={0.9} />
      </mesh>
    </group>
  )
}
