"use client";

import { memo } from "react";
import { Environment, Lightformer } from "@react-three/drei";

function StudioLighting({ isRecall }: { isRecall: boolean }) {
  return (
    // Capture local softboxes once. No remote HDR assets or per-frame cube renders.
    <Environment
      frames={1}
      resolution={128}
      environmentIntensity={isRecall ? 0.16 : 0.65}
    >
      <Lightformer
        form="rect"
        intensity={3}
        color="#fff5e8"
        position={[0, 8, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[7, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={4}
        color="#ffffff"
        position={[-6, 4, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[2, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2}
        color="#e5edff"
        position={[6, 3, -2]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[3, 5, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2}
        color="#ffe3c5"
        position={[0, 3, -8]}
        scale={[8, 1, 1]}
      />
    </Environment>
  );
}

export default memo(StudioLighting);
