"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

export default function LoadingHologram({
  color,
  reducedMotion = false,
}: {
  color: string;
  reducedMotion?: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current && !reducedMotion)
      group.current.rotation.y += Math.min(delta, 0.05) * 0.35;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.65, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.016, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
