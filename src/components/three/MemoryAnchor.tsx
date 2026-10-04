"use client";

import { memo, useRef, useState } from "react";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, useCursor } from "@react-three/drei";
import { Group, MathUtils } from "three";
import AnchorArtifact from "./AnchorArtifact";
import AnchorPedestal from "./AnchorPedestal";
import { usePalaceStore } from "@/store/usePalaceStore";
import type { MemoryAnchor as MemoryAnchorData } from "@/lib/types";
import { getAnchorDisplayColor } from "@/lib/anchor-color";

interface Props {
  anchor: MemoryAnchorData;
  index: number;
  displayColor?: string;
  reducedMotion?: boolean;
}

function MemoryAnchor({
  anchor,
  index,
  displayColor,
  reducedMotion = false,
}: Props) {
  const float = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const canvas = useThree((state) => state.gl.domElement);
  const compact = useThree((state) => state.size.width < 500);
  const isSelected = usePalaceStore(
    (state) => state.selectedAnchorId === anchor.id,
  );
  const isRecall = usePalaceStore((state) => state.mode === "recall");
  const selectAnchor = usePalaceStore((state) => state.selectAnchor);
  const color = displayColor ?? getAnchorDisplayColor(anchor.color);
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
      <AnchorPedestal
        color={color}
        highlighted={highlighted}
        reducedMotion={reducedMotion}
        phase={index * 0.8}
      />
      <group ref={float} position={[0, 1.68, 0]}>
        <AnchorArtifact
          shape={anchor.shape}
          color={color}
          highlighted={highlighted}
          reducedMotion={reducedMotion}
        />
      </group>
      <pointLight
        position={[0, 1.5, 0]}
        color={color}
        intensity={highlighted ? 1.3 : 0.5}
        distance={5}
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
            gap: compact ? 5 : 7,
            whiteSpace: "nowrap",
            border: `1px solid ${highlighted ? color + "88" : "#94705b35"}`,
            borderRadius: 8,
            padding: compact ? "5px 7px" : "7px 10px",
            background: highlighted ? "#38231bef" : "#241610de",
            color: highlighted ? "#fff7eb" : "#ecd9c1",
            boxShadow: highlighted
              ? `0 0 22px ${color}22`
              : "0 5px 15px #00000025",
            fontSize: compact ? 10 : 11,
            fontFamily: "inherit",
            fontWeight: 500,
            letterSpacing: ".015em",
            transition: "border-color .2s, background .2s, box-shadow .2s",
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
          <span
            style={{
              maxWidth: compact ? 110 : 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isRecall
              ? "???"
              : !compact || highlighted
                ? anchor.title
                : String(index + 1).padStart(2, "0")}
          </span>
          {anchor.status === "mastered" &&
            !isRecall &&
            (!compact || highlighted) && (
              <span
                aria-label="Mastered"
                style={{ color: "#bca08a", fontSize: 9 }}
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
