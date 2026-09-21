"use client";

import { memo, useRef, useState } from "react";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Edges, Html, useCursor } from "@react-three/drei";
import { Group, MathUtils, MeshStandardMaterial } from "three";
import { usePalaceStore } from "@/store/usePalaceStore";
import type { MemoryAnchor as MemoryAnchorData } from "@/lib/types";

interface Props {
  anchor: MemoryAnchorData;
  index: number;
  reducedMotion?: boolean;
}

function Artifact({
  shape,
  color,
  hovered,
}: Pick<MemoryAnchorData, "shape" | "color"> & { hovered: boolean }) {
  const material = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={hovered ? 1.4 : 0.5}
      roughness={0.22}
      metalness={0.45}
    />
  );
  switch (shape) {
    case "crystal":
      return (
        <group rotation={[0.12, 0, -0.1]}>
          <mesh castShadow scale={[0.64, 1.22, 0.64]}>
            <octahedronGeometry args={[0.95, 0]} />
            {material}
            <Edges color={color} threshold={20} />
          </mesh>
          <mesh
            castShadow
            position={[0.55, -0.45, 0.08]}
            rotation={[0, 0, -0.32]}
            scale={[0.31, 0.62, 0.31]}
          >
            <octahedronGeometry args={[0.9, 0]} />
            {material}
          </mesh>
          <mesh
            castShadow
            position={[-0.44, -0.45, 0.04]}
            rotation={[0, 0, 0.3]}
            scale={[0.29, 0.54, 0.29]}
          >
            <octahedronGeometry args={[0.9, 0]} />
            {material}
          </mesh>
        </group>
      );
    case "torus":
      return (
        <group rotation={[0.25, 0.3, -0.28]}>
          <mesh castShadow>
            <torusGeometry args={[0.68, 0.13, 12, 54]} />
            {material}
          </mesh>
          <mesh castShadow rotation={[Math.PI / 2, 0.4, 0]}>
            <torusGeometry args={[0.68, 0.08, 10, 54]} />
            {material}
          </mesh>
          <mesh>
            <icosahedronGeometry args={[0.22, 1]} />
            <meshStandardMaterial
              color="#eeffff"
              emissive={color}
              emissiveIntensity={2.2}
            />
          </mesh>
          <mesh position={[0.67, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={color}
              emissiveIntensity={2.5}
            />
          </mesh>
        </group>
      );
    case "cube":
      return (
        <group rotation={[0.3, 0.45, 0.24]}>
          <mesh castShadow>
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            {material}
            <Edges color="#dbe7ff" threshold={15} />
          </mesh>
          <mesh scale={1.35}>
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            <meshBasicMaterial color={color} transparent opacity={0.045} />
            <Edges color={color} threshold={15} />
          </mesh>
        </group>
      );
    case "sphere":
      return (
        <group>
          <mesh castShadow>
            <icosahedronGeometry args={[0.67, 1]} />
            {material}
            <Edges color={color} threshold={15} />
          </mesh>
          <mesh rotation={[Math.PI / 2.8, 0.25, 0.3]}>
            <torusGeometry args={[0.93, 0.035, 8, 64]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      );
    case "pyramid":
      return (
        <group rotation={[0, Math.PI / 4, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.86, 1.38, 4]} />
            {material}
            <Edges color="#ffe4ba" threshold={15} />
          </mesh>
          <mesh position={[0, -0.84, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.75, 0.75, 0.035, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.3}
            />
          </mesh>
        </group>
      );
    case "knot":
      return (
        <mesh castShadow rotation={[0.4, 0.2, 0]}>
          <torusKnotGeometry args={[0.48, 0.14, 88, 12, 2, 3]} />
          {material}
        </mesh>
      );
  }
}

function MemoryAnchor({ anchor, index, reducedMotion = false }: Props) {
  const float = useRef<Group>(null);
  const pedestalMaterial = useRef<MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const canvas = useThree((state) => state.gl.domElement);
  const isSelected = usePalaceStore(
    (state) => state.selectedAnchorId === anchor.id,
  );
  const isRecall = usePalaceStore((state) => state.mode === "recall");
  const selectAnchor = usePalaceStore((state) => state.selectAnchor);
  const color = anchor.color;
  const highlighted = hovered || isSelected;

  useCursor(hovered, "pointer", "grab", canvas);

  useFrame(({ clock }, delta) => {
    if (float.current) {
      const time = clock.elapsedTime;
      float.current.position.y = reducedMotion
        ? 1.68
        : 1.68 + Math.sin(time * 1.15 + index * 0.8) * 0.105;
      if (!reducedMotion)
        float.current.rotation.y += Math.min(delta, 0.05) * 0.2;
      const scale = MathUtils.damp(
        float.current.scale.x,
        highlighted ? 1.09 : 1,
        6,
        delta,
      );
      float.current.scale.setScalar(scale);
    }
    if (pedestalMaterial.current) {
      pedestalMaterial.current.emissiveIntensity = MathUtils.damp(
        pedestalMaterial.current.emissiveIntensity,
        highlighted ? 0.45 : 0.06,
        5,
        delta,
      );
    }
  });

  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    selectAnchor(anchor.id);
  }

  return (
    <group
      position={anchor.position}
      onClick={select}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh receiveShadow castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.12, 1.23, 0.24, 48]} />
        <meshStandardMaterial
          ref={pedestalMaterial}
          color="#232333"
          roughness={0.46}
          metalness={0.62}
          emissive={color}
          emissiveIntensity={0.06}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.255, 0]}>
        <cylinderGeometry args={[0.92, 1.0, 0.07, 48]} />
        <meshStandardMaterial
          color="#10111e"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.96, 0.018, 8, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={highlighted ? 3.5 : 1.8}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.308, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.51, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={highlighted ? 0.42 : 0.18}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.62, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={highlighted ? 0.065 : 0.025}
          depthWrite={false}
        />
      </mesh>
      <group ref={float} position={[0, 1.68, 0]}>
        <Artifact shape={anchor.shape} color={color} hovered={highlighted} />
      </group>
      <pointLight
        position={[0, 1.5, 0]}
        color={color}
        intensity={highlighted ? 3.5 : 1.5}
        distance={4}
        decay={2}
      />
      <Html
        position={[0, 3.03, 0]}
        center
        zIndexRange={[10, 0]}
        style={{
          pointerEvents: "none",
          transition: "opacity .2s",
          opacity: isRecall ? 0.8 : 1,
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            selectAnchor(anchor.id);
          }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={
            isRecall
              ? `Recall memory anchor ${index + 1}`
              : `Open ${anchor.title}`
          }
          style={{
            pointerEvents: "auto",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            whiteSpace: "nowrap",
            border: `1px solid ${highlighted ? color + "88" : "#74758a35"}`,
            borderRadius: 6,
            padding: "6px 9px",
            background: highlighted ? "#181a2bef" : "#10121dde",
            color: highlighted ? "#f4f1ff" : "#c9c7da",
            boxShadow: highlighted
              ? `0 0 22px ${color}22`
              : "0 5px 15px #00000025",
            fontSize: 10,
            fontFamily: "inherit",
            fontWeight: 500,
            letterSpacing: ".015em",
            transition: "border-color .2s, background .2s",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 7px ${color}`,
            }}
          />
          {isRecall ? "???" : anchor.title}
          {anchor.status === "mastered" && !isRecall && (
            <span
              aria-label="Mastered"
              style={{ color: "#7edac0", fontSize: 9 }}
            >
              ✓
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

export default memo(MemoryAnchor);
