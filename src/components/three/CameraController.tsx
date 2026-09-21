"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MathUtils, Vector3 } from "three";
import { gsap } from "gsap";
import { usePalaceStore } from "@/store/usePalaceStore";

/** Camera motion stays outside React state, so orbiting never redraws the HUD. */
export default function CameraController({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const aspect = width / Math.max(height, 1);
  const frameScale = Math.max(1, 1.1 / Math.max(aspect, 0.3));
  const target = usePalaceStore((state) => state.cameraTarget);
  const resetKey = usePalaceStore((state) => state.cameraResetKey);
  const destination = useRef(new Vector3(13, 12, 17));
  const lookAt = useRef(new Vector3(0, 0, 0));
  const tween = useRef<gsap.core.Tween | null>(null);
  const hasFramed = useRef(false);

  useEffect(() => {
    if (target) {
      lookAt.current.set(target[0], target[1] + 0.9, target[2]);
      destination.current
        .copy(lookAt.current)
        .add(
          new Vector3(6.8, 5.3, 8.8).multiplyScalar(
            Math.max(1, 0.7 / Math.max(aspect, 0.3)),
          ),
        );
    } else {
      lookAt.current.set(0, 0, 0);
      destination.current.set(13, 12, 17).multiplyScalar(frameScale);
    }
    tween.current?.kill();
    if ((reducedMotion || !hasFramed.current) && controls.current) {
      camera.position.copy(destination.current);
      controls.current.target.copy(lookAt.current);
      controls.current.update();
      hasFramed.current = true;
      return;
    }
    const startPosition = camera.position.clone();
    const startTarget = controls.current?.target.clone() ?? new Vector3();
    const progress = { value: 0 };
    tween.current = gsap.to(progress, {
      value: 1,
      duration: 1.35,
      ease: "power3.out",
      onUpdate: () => {
        if (!controls.current) return;
        camera.position.lerpVectors(
          startPosition,
          destination.current,
          progress.value,
        );
        controls.current.target.lerpVectors(
          startTarget,
          lookAt.current,
          progress.value,
        );
        controls.current.update();
      },
    });
    return () => {
      tween.current?.kill();
    };
  }, [target, resetKey, camera, reducedMotion, aspect, frameScale]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.065}
      minDistance={7}
      maxDistance={37 * frameScale}
      minPolarAngle={MathUtils.degToRad(24)}
      maxPolarAngle={MathUtils.degToRad(78)}
      rotateSpeed={0.48}
      zoomSpeed={0.72}
      enablePan={false}
      onStart={() => {
        tween.current?.kill();
      }}
    />
  );
}
