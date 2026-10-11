"use client";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import AiModelAnchor from "./AiModelAnchor";

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="ai-preview-loading ai-preview-fallback">
        3D preview is unavailable on this device. You can still review the notes
        and add your model.
      </div>
    ) : (
      this.props.children
    );
  }
}
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const reducedMotionSnapshot = () => window.matchMedia(motionQuery).matches;

export default function AiModelPreview({
  modelUrl,
  color,
}: {
  modelUrl: string;
  color: string;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    reducedMotionSnapshot,
    () => true,
  );
  return (
    <div
      className="ai-model-preview"
      aria-label="Interactive preview of your generated 3D model"
    >
      <PreviewBoundary>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [2.7, 1.7, 3.3], fov: 35 }}
          gl={{ antialias: true, alpha: false }}
          fallback={
            <div className="ai-preview-fallback">
              This device cannot show a 3D preview. Your notes and model remain
              available.
            </div>
          }
        >
          <color attach="background" args={["#2d1d17"]} />
          <ambientLight intensity={1.4} />
          <directionalLight position={[4, 6, 4]} intensity={2.5} />
          <directionalLight
            position={[-4, 2, -3]}
            intensity={1}
            color="#ffe3c0"
          />
          <AiModelAnchor
            modelUrl={modelUrl}
            color={color}
            reducedMotion={reducedMotion}
          />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            enablePan={false}
            minDistance={2.8}
            maxDistance={7}
            minPolarAngle={Math.PI * 0.1}
            maxPolarAngle={Math.PI * 0.82}
          />
        </Canvas>
      </PreviewBoundary>
      <span>Drag to explore your model</span>
    </div>
  );
}
