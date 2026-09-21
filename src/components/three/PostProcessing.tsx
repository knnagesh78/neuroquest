"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { Vector2 } from "three";
import { usePalaceStore } from "@/store/usePalaceStore";

export default function PostProcessing() {
  const enabled = usePalaceStore((state) => state.effectsEnabled);
  const renderer = useThree((state) => state.gl);
  const chromaticOffset = useMemo(() => new Vector2(0.0002, 0.0002), []);
  // A lost context returns null attributes. Do not construct GPU effects while
  // the canvas is being replaced; the scene's context monitor handles recovery.
  const context = renderer.getContext();
  if (!enabled || context.isContextLost() || !context.getContextAttributes())
    return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.6}
        luminanceSmoothing={0.45}
        intensity={1.2}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.18} darkness={0.48} />
      <ChromaticAberration
        offset={chromaticOffset}
        radialModulation
        modulationOffset={0.7}
      />
    </EffectComposer>
  );
}
