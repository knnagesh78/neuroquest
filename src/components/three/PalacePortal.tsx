"use client";

import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";

function PalacePortal({
  reducedMotion,
  isRecall,
}: {
  reducedMotion: boolean;
  isRecall: boolean;
}) {
  const innerRing = useRef<Group>(null);

  useFrame((_, delta) => {
    if (innerRing.current && !reducedMotion)
      innerRing.current.rotation.z -= Math.min(delta, 0.05) * 0.045;
  });

  return (
    <group position={[0, 0, -6.2]}>
      <RoundedBox
        args={[4.6, 0.18, 1.3]}
        radius={0.06}
        smoothness={2}
        position={[0, 0.09, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#46332b"
          metalness={0.45}
          roughness={0.35}
          clearcoat={0.4}
        />
      </RoundedBox>
      <RoundedBox
        args={[3.9, 0.14, 0.95]}
        radius={0.04}
        smoothness={2}
        position={[0, 0.24, 0]}
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#6b4b39"
          metalness={0.55}
          roughness={0.3}
          clearcoat={0.6}
        />
      </RoundedBox>
      <mesh position={[0, 2.33, 0]} castShadow>
        <torusGeometry args={[2.02, 0.09, 20, 96]} />
        <meshPhysicalMaterial
          color="#795a43"
          metalness={0.75}
          roughness={0.22}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[0, 2.33, -0.035]}>
        <torusGeometry args={[2.13, 0.025, 10, 96]} />
        <meshStandardMaterial
          color="#46332b"
          metalness={0.7}
          roughness={0.26}
        />
      </mesh>
      <mesh position={[0, 2.33, 0.08]}>
        <torusGeometry args={[1.98, 0.013, 8, 96]} />
        <meshBasicMaterial
          color={isRecall ? "#ba6336" : "#ff9d58"}
          toneMapped={false}
        />
      </mesh>
      <group ref={innerRing} position={[0, 2.33, 0.1]}>
        {[0, 1, 2].map((index) => (
          <mesh key={index} rotation={[0, 0, index * ((Math.PI * 2) / 3)]}>
            <torusGeometry args={[1.71, 0.009, 6, 40, Math.PI * 0.48]} />
            <meshBasicMaterial
              color="#ecd9c1"
              transparent
              opacity={isRecall ? 0.2 : 0.55}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        return (
          <RoundedBox
            key={index}
            args={[0.12, 0.23, 0.14]}
            radius={0.025}
            smoothness={2}
            position={[
              Math.sin(angle) * 2.02,
              2.33 + Math.cos(angle) * 2.02,
              0.06,
            ]}
            rotation={[0, 0, -angle]}
          >
            <meshPhysicalMaterial
              color="#d3ac7e"
              metalness={0.7}
              roughness={0.26}
              clearcoat={0.6}
            />
          </RoundedBox>
        );
      })}
      <mesh position={[0, 2.33, -0.03]}>
        <circleGeometry args={[1.9, 64]} />
        <meshBasicMaterial
          color="#e0a274"
          transparent
          opacity={isRecall ? 0.016 : 0.035}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        position={[0, 2.2, 1]}
        color="#ff9d58"
        intensity={isRecall ? 0.7 : 2.2}
        distance={8}
        decay={2}
      />
    </group>
  );
}

export default memo(PalacePortal);
