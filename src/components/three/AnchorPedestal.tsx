"use client";

import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  MathUtils,
  type Group,
  type MeshBasicMaterial,
  type ShaderMaterial,
} from "three";

interface Props {
  color: string;
  highlighted: boolean;
  reducedMotion: boolean;
  phase: number;
}

const haloVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const haloFragment = `
  varying vec2 vUv;
  uniform vec3 color;
  uniform float opacity;
  void main() {
    float radius = length(vUv - 0.5) * 2.0;
    float falloff = pow(1.0 - smoothstep(0.18, 1.0, radius), 2.0);
    gl_FragColor = vec4(color, falloff * opacity);
    #include <colorspace_fragment>
  }
`;

function AnchorPedestal({ color, highlighted, reducedMotion, phase }: Props) {
  const arcs = useRef<Group>(null);
  const rim = useRef<MeshBasicMaterial>(null);
  const halo = useRef<ShaderMaterial>(null);
  const glowLevel = useRef(1.25);
  const baseColor = useMemo(() => new Color(color), [color]);
  const haloUniforms = useMemo(
    () => ({ color: { value: new Color(color) }, opacity: { value: 0.16 } }),
    [color],
  );

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05);
    glowLevel.current = MathUtils.damp(
      glowLevel.current,
      highlighted ? 2 : 1.25,
      6,
      step,
    );
    if (rim.current)
      rim.current.color.copy(baseColor).multiplyScalar(glowLevel.current);
    if (halo.current)
      halo.current.uniforms.opacity.value = MathUtils.damp(
        halo.current.uniforms.opacity.value,
        highlighted ? 0.3 : 0.16,
        6,
        step,
      );
    if (arcs.current && !reducedMotion)
      arcs.current.rotation.y = clock.elapsedTime * -0.1 + phase;
  });

  return (
    <group>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 3.6]} />
        <shaderMaterial
          ref={halo}
          vertexShader={haloVertex}
          fragmentShader={haloFragment}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.09, 0]}>
        <cylinderGeometry args={[1.06, 1.17, 0.18, 64]} />
        <meshPhysicalMaterial
          color="#382923"
          roughness={0.32}
          metalness={0.6}
          clearcoat={0.6}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.21, 0]}>
        <cylinderGeometry args={[1.06, 1.06, 0.06, 64]} />
        <meshStandardMaterial
          color="#171313"
          metalness={0.65}
          roughness={0.27}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.275, 0]}>
        <cylinderGeometry args={[0.92, 0.98, 0.07, 64]} />
        <meshPhysicalMaterial
          color="#302522"
          metalness={0.5}
          roughness={0.3}
          clearcoat={0.8}
        />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.065, 0.013, 8, 80]} />
        <meshBasicMaterial ref={rim} color={baseColor} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.313, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.57, 0.581, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={highlighted ? 0.65 : 0.38}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.314, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <group ref={arcs} rotation={[0, phase, 0]}>
        {[0, Math.PI].map((angle) => (
          <mesh
            key={angle}
            position={[0, 0.02, 0]}
            rotation={[-Math.PI / 2, 0, angle]}
          >
            <torusGeometry args={[1.29, 0.008, 6, 32, Math.PI * 0.6]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={highlighted ? 0.7 : 0.34}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export default memo(AnchorPedestal);
