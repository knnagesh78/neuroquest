"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";

const copper = "#df854e";
const mint = "#74dbc4";
const lilac = "#b49bff";

function StaticPalace() {
  return (
    <div className="auth-static-palace" aria-hidden="true">
      <span className="auth-static-platform" />
      <span className="auth-static-artifact static-copper" />
      <span className="auth-static-artifact static-lilac" />
      <span className="auth-static-artifact static-mint" />
    </div>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <StaticPalace /> : this.props.children;
  }
}

function Anchor({
  position,
  color,
  shape,
  delay,
}: {
  position: [number, number, number];
  color: string;
  shape: "crystal" | "orb" | "cube";
  delay: number;
}) {
  const artifact = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!artifact.current) return;
    const time = clock.elapsedTime + delay;
    artifact.current.position.y = Math.sin(time * 1.15) * 0.09;
    artifact.current.rotation.y = time * 0.3;
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.48, 0.56, 0.22, 48]} />
        <meshStandardMaterial
          color="#4c352d"
          metalness={0.38}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.025, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.29, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      <group ref={artifact} position={[0, 0.92, 0]}>
        <mesh>
          {shape === "crystal" ? (
            <octahedronGeometry args={[0.52, 0]} />
          ) : shape === "orb" ? (
            <icosahedronGeometry args={[0.46, 1]} />
          ) : (
            <boxGeometry args={[0.68, 0.68, 0.68]} />
          )}
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.32}
            metalness={0.22}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            flatShading={shape !== "orb"}
          />
        </mesh>
        {shape === "orb" && (
          <mesh rotation={[Math.PI / 2.5, 0.2, 0]}>
            <torusGeometry args={[0.62, 0.025, 8, 64]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        )}
        {shape === "cube" && (
          <mesh rotation={[0.4, 0.4, 0]} scale={1.22}>
            <boxGeometry args={[0.68, 0.68, 0.68]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.5}
            />
          </mesh>
        )}
      </group>
      <pointLight
        position={[0, 1, 0]}
        color={color}
        intensity={1.4}
        distance={3}
      />
    </group>
  );
}

function Palace() {
  const stage = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (stage.current)
      stage.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.075;
  });

  return (
    <group ref={stage} rotation={[0, -0.18, 0]}>
      <ambientLight intensity={1.7} />
      <directionalLight position={[-3, 8, 5]} intensity={3.1} color="#ffe2ba" />
      <directionalLight position={[4, 3, -4]} intensity={1.5} color="#a6c7ee" />
      <mesh position={[0, -0.27, 0]} receiveShadow>
        <boxGeometry args={[5.9, 0.36, 4.55]} />
        <meshStandardMaterial
          color="#433129"
          metalness={0.15}
          roughness={0.82}
        />
      </mesh>
      <mesh position={[0, -0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.68, 4.32]} />
        <meshStandardMaterial
          color="#49362f"
          roughness={0.86}
          side={DoubleSide}
        />
      </mesh>
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]}>
          <boxGeometry args={[0.1, 0.18, 4.55]} />
          <meshStandardMaterial
            color="#8c6652"
            metalness={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}
      {[-2.25, 2.25].map((z) => (
        <mesh key={z} position={[0, 0.01, z]}>
          <boxGeometry args={[5.9, 0.18, 0.1]} />
          <meshStandardMaterial
            color="#8c6652"
            metalness={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}
      <gridHelper
        args={[5.5, 11, "#946a53", "#6b4c3e"]}
        position={[0, -0.055, 0]}
      />
      <Anchor
        position={[-1.65, 0, 0.4]}
        color={copper}
        shape="crystal"
        delay={0}
      />
      <Anchor position={[0, 0, -0.75]} color={lilac} shape="cube" delay={1.7} />
      <Anchor position={[1.66, 0, 0.55]} color={mint} shape="orb" delay={3.4} />
      <mesh position={[0, 0.98, -2.15]}>
        <torusGeometry args={[0.9, 0.065, 12, 80]} />
        <meshStandardMaterial
          color="#d7a476"
          emissive="#b96c45"
          emissiveIntensity={0.38}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.98, -2.13]}>
        <torusGeometry args={[0.72, 0.011, 8, 80]} />
        <meshBasicMaterial color="#ffe2b4" toneMapped={false} />
      </mesh>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 0.54, -1.7]}>
          <boxGeometry args={[0.28, 1.1, 0.3]} />
          <meshStandardMaterial
            color="#8b6653"
            metalness={0.25}
            roughness={0.65}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function AuthPalaceScene() {
  const container = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting && !document.hidden && !motion.matches);
      },
      { threshold: 0.05 },
    );
    const update = () => {
      setActive(
        !document.hidden &&
          !motion.matches &&
          !!container.current &&
          container.current.getBoundingClientRect().bottom > 0,
      );
    };
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className="auth-palace-canvas" ref={container}>
      <SceneBoundary>
        <Canvas
          dpr={[1, 1.5]}
          frameloop={active ? "always" : "demand"}
          camera={{ position: [7.2, 6.2, 9.5], fov: 34, near: 0.1, far: 50 }}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          aria-hidden="true"
        >
          <Palace />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
