"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, RoundedBox } from "@react-three/drei";
import { Color, Vector2, type Group } from "three";
import type { AnchorShape, Vec3 } from "@/lib/types";

interface Props {
  shape: AnchorShape;
  color: string;
  highlighted: boolean;
  reducedMotion: boolean;
}

// A six-sided cut creates broad reflective facets instead of a flat diamond.
const crystalProfile = [
  new Vector2(0, -1),
  new Vector2(0.38, -0.56),
  new Vector2(0.5, 0.28),
  new Vector2(0.34, 0.68),
  new Vector2(0, 1),
];

const cubeFaces: Array<{ position: Vec3; rotation: Vec3 }> = [
  { position: [0, 0, 0.536], rotation: [0, 0, 0] },
  { position: [0, 0, -0.536], rotation: [0, Math.PI, 0] },
  { position: [0.536, 0, 0], rotation: [0, Math.PI / 2, 0] },
  { position: [-0.536, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  { position: [0, 0.536, 0], rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, -0.536, 0], rotation: [Math.PI / 2, 0, 0] },
];

function AnchorArtifact({ shape, color, highlighted, reducedMotion }: Props) {
  const orbit = useRef<Group>(null);
  const hues = useMemo(() => {
    const base = new Color(color);
    return {
      surface: base.clone().lerp(new Color("#ffffff"), 0.06),
      dark: base.clone().multiplyScalar(0.28),
      edge: base.clone().lerp(new Color("#ffffff"), 0.45),
      glow: base.clone().multiplyScalar(1.65),
    };
  }, [color]);

  useFrame((_, delta) => {
    if (!orbit.current || reducedMotion) return;
    // Orbital details move independently of the sculpture's slow rotation.
    orbit.current.rotation.z += Math.min(delta, 0.05) * 0.22;
  });

  const surface = (
    <meshPhysicalMaterial
      color={hues.surface}
      emissive={color}
      emissiveIntensity={highlighted ? 0.34 : 0.12}
      metalness={0.36}
      roughness={0.19}
      clearcoat={1}
      clearcoatRoughness={0.12}
      envMapIntensity={1.2}
    />
  );
  const glow = <meshBasicMaterial color={hues.glow} toneMapped={false} />;

  switch (shape) {
    case "crystal":
      return (
        <group rotation={[0.08, Math.PI / 6, -0.12]}>
          <mesh castShadow>
            <latheGeometry args={[crystalProfile, 6]} />
            <meshPhysicalMaterial
              color={hues.surface}
              emissive={color}
              emissiveIntensity={highlighted ? 0.38 : 0.16}
              roughness={0.17}
              metalness={0.32}
              clearcoat={1}
              clearcoatRoughness={0.08}
              flatShading
            />
            <Edges color={hues.edge} transparent opacity={0.4} threshold={25} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              castShadow
              position={[side * 0.51, -0.43, side * 0.1]}
              rotation={[0, 0.3, side * -0.28]}
              scale={side === 1 ? 0.45 : 0.34}
            >
              <latheGeometry args={[crystalProfile, 6]} />
              {surface}
            </mesh>
          ))}
          <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.505, 0.012, 6, 6]} />
            {glow}
          </mesh>
        </group>
      );
    case "torus":
      return (
        <group rotation={[0.25, 0.25, -0.3]}>
          <mesh castShadow>
            <torusGeometry args={[0.67, 0.13, 20, 80]} />
            {surface}
          </mesh>
          <mesh position={[0, 0, 0.105]}>
            <torusGeometry args={[0.67, 0.013, 8, 80]} />
            {glow}
          </mesh>
          <group ref={orbit}>
            <mesh castShadow rotation={[Math.PI / 2.5, 0.3, 0]}>
              <torusGeometry args={[0.55, 0.055, 12, 64]} />
              <meshPhysicalMaterial
                color={hues.dark}
                roughness={0.2}
                metalness={0.8}
                clearcoat={1}
              />
            </mesh>
            <mesh position={[0.67, 0, 0.12]}>
              <sphereGeometry args={[0.065, 16, 12]} />
              {glow}
            </mesh>
          </group>
          <mesh>
            <sphereGeometry args={[0.23, 24, 16]} />
            <meshPhysicalMaterial
              color="#fff3dd"
              emissive={color}
              emissiveIntensity={0.7}
              roughness={0.15}
              metalness={0.2}
              clearcoat={1}
            />
          </mesh>
        </group>
      );
    case "cube":
      return (
        <group rotation={[0.3, Math.PI / 4, 0.2]}>
          <RoundedBox
            args={[1.06, 1.06, 1.06]}
            radius={0.09}
            smoothness={3}
            castShadow
          >
            {surface}
          </RoundedBox>
          {cubeFaces.map((face, index) => (
            <group
              key={index}
              position={face.position}
              rotation={face.rotation}
            >
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <ringGeometry args={[0.31, 0.325, 4]} />
                {glow}
              </mesh>
              <RoundedBox
                args={[0.1, 0.1, 0.016]}
                radius={0.016}
                smoothness={2}
              >
                <meshPhysicalMaterial
                  color={hues.edge}
                  emissive={color}
                  emissiveIntensity={0.35}
                  metalness={0.6}
                  roughness={0.2}
                />
              </RoundedBox>
            </group>
          ))}
        </group>
      );
    case "sphere":
      return (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.59, 40, 24]} />
            {surface}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.595, 0.009, 6, 64]} />
            {glow}
          </mesh>
          <group rotation={[0.9, 0.15, 0.3]}>
            <group ref={orbit}>
              <mesh>
                <torusGeometry args={[0.87, 0.022, 10, 80]} />
                {glow}
              </mesh>
              <mesh position={[0.87, 0, 0]}>
                <sphereGeometry args={[0.09, 16, 12]} />
                {surface}
              </mesh>
              <mesh position={[-0.87, 0, 0]}>
                <sphereGeometry args={[0.045, 12, 8]} />
                {glow}
              </mesh>
            </group>
          </group>
          <mesh rotation={[-0.6, 0.4, -0.2]}>
            <torusGeometry args={[0.78, 0.015, 8, 72]} />
            <meshPhysicalMaterial
              color={hues.edge}
              metalness={0.75}
              roughness={0.22}
            />
          </mesh>
        </group>
      );
    case "pyramid":
      return (
        <group rotation={[0, Math.PI / 4, 0]}>
          <mesh castShadow position={[0, 0.2, 0]}>
            <coneGeometry args={[0.8, 1.4, 4]} />
            {surface}
            <Edges
              color={hues.edge}
              transparent
              opacity={0.35}
              threshold={20}
            />
          </mesh>
          <mesh position={[0, -0.515, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.67, 0.79, 4]} />
            {glow}
          </mesh>
          <mesh castShadow position={[0, -0.72, 0]}>
            <cylinderGeometry args={[0.78, 0.91, 0.3, 4]} />
            <meshPhysicalMaterial
              color={hues.dark}
              emissive={color}
              emissiveIntensity={0.1}
              metalness={0.5}
              roughness={0.24}
              clearcoat={1}
            />
          </mesh>
        </group>
      );
    case "knot":
      return (
        <group rotation={[0.35, 0.1, 0]}>
          <mesh castShadow>
            <torusKnotGeometry args={[0.45, 0.145, 128, 20, 2, 3]} />
            {surface}
          </mesh>
          <group rotation={[1.1, 0.3, 0]}>
            <group ref={orbit}>
              <mesh>
                <torusGeometry args={[0.83, 0.012, 8, 72]} />
                {glow}
              </mesh>
              <mesh position={[0.83, 0, 0]}>
                <sphereGeometry args={[0.055, 12, 8]} />
                {glow}
              </mesh>
            </group>
          </group>
        </group>
      );
  }
}

export default memo(AnchorArtifact);
