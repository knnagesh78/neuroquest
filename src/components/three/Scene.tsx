"use client";

import {
  Component,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Color,
  PCFShadowMap,
  type Group,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import { usePalaceStore } from "@/store/usePalaceStore";
import CameraController from "./CameraController";
import MemoryAnchor from "./MemoryAnchor";
import PostProcessing from "./PostProcessing";

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener("webglcontextlost", handleLost);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onLost]);
  return null;
}

function Pillar({
  position,
  height,
  width = 0.7,
}: {
  position: [number, number, number];
  height: number;
  width?: number;
}) {
  return (
    <group position={position}>
      <RoundedBox
        args={[width + 0.24, 0.18, width + 0.24]}
        radius={0.03}
        position={[0, 0.09, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          color="#393649"
          roughness={0.6}
          metalness={0.24}
        />
      </RoundedBox>
      <RoundedBox
        args={[width, height, width]}
        radius={0.035}
        position={[0, height / 2 + 0.14, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          color="#383445"
          roughness={0.55}
          metalness={0.3}
        />
      </RoundedBox>
      <mesh position={[width / 2 + 0.004, height / 2 + 0.17, 0]}>
        <boxGeometry args={[0.016, height * 0.82, 0.045]} />
        <meshStandardMaterial
          color="#b99afd"
          emissive="#9c77e9"
          emissiveIntensity={0.9}
        />
      </mesh>
      <mesh position={[0, height + 0.155, 0]}>
        <boxGeometry args={[width + 0.03, 0.024, width + 0.03]} />
        <meshStandardMaterial color="#827395" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Architecture() {
  return (
    <group>
      {/* Declarative R3F resources are automatically disposed with the scene. */}
      <RoundedBox
        args={[15, 0.5, 14]}
        radius={0.12}
        smoothness={2}
        position={[0, -0.3, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          color="#232232"
          roughness={0.57}
          metalness={0.32}
        />
      </RoundedBox>
      <mesh
        receiveShadow
        position={[0, -0.035, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[14.72, 13.72]} />
        <meshStandardMaterial
          color="#292638"
          roughness={0.65}
          metalness={0.22}
        />
      </mesh>
      <gridHelper
        args={[13.6, 20, "#514760", "#393447"]}
        position={[0, -0.025, 0]}
      />
      <mesh position={[0, -0.27, 6.997]}>
        <boxGeometry args={[14.6, 0.024, 0.016]} />
        <meshStandardMaterial
          color="#8d73bd"
          emissive="#8966d6"
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[7.497, -0.27, 0]}>
        <boxGeometry args={[0.016, 0.024, 13.6]} />
        <meshStandardMaterial
          color="#8d73bd"
          emissive="#8966d6"
          emissiveIntensity={0.7}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 6.9, 0.015, 0]}>
            <boxGeometry args={[0.028, 0.012, 12.8]} />
            <meshStandardMaterial
              color="#6c5b88"
              emissive="#645075"
              emissiveIntensity={0.35}
            />
          </mesh>
          {[-5.6, -4.5, -3.4].map((z, index) => (
            <Pillar
              key={z}
              position={[side * 6.45, 0, z]}
              height={2.25 - index * 0.53}
              width={0.64}
            />
          ))}
          <Pillar
            position={[side * 5.05, 0, -6.08]}
            height={3.0}
            width={0.82}
          />
          <mesh
            position={[side * 5.03, 3.35, -6.08]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <octahedronGeometry args={[0.16]} />
            <meshStandardMaterial
              color="#c9bdff"
              emissive="#b69cef"
              emissiveIntensity={1.8}
            />
          </mesh>
          <mesh position={[side * 6.5, 0.19, 4.8]}>
            <boxGeometry args={[0.22, 0.4, 1.65]} />
            <meshStandardMaterial
              color="#41394e"
              roughness={0.45}
              metalness={0.5}
            />
          </mesh>
        </group>
      ))}
      <group position={[0, 0, -6.2]}>
        <mesh position={[0, 0.09, 0]} receiveShadow>
          <boxGeometry args={[4.5, 0.18, 1.2]} />
          <meshStandardMaterial
            color="#42364e"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.24, 0]} receiveShadow>
          <boxGeometry args={[3.9, 0.14, 0.85]} />
          <meshStandardMaterial
            color="#544362"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 2.33, 0]}>
          <torusGeometry args={[2.02, 0.095, 10, 80]} />
          <meshStandardMaterial
            color="#6e517c"
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 2.33, 0.09]}>
          <torusGeometry args={[1.95, 0.02, 8, 80]} />
          <meshStandardMaterial
            color="#ba86fa"
            emissive="#ba86fa"
            emissiveIntensity={2.5}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 2.33, 0.12]}>
          <torusGeometry args={[1.68, 0.012, 6, 80, Math.PI * 1.5]} />
          <meshStandardMaterial
            color="#9671c5"
            emissive="#a777f2"
            emissiveIntensity={0.85}
          />
        </mesh>
        <mesh position={[0, 2.33, 0.1]}>
          <circleGeometry args={[1.91, 64]} />
          <meshBasicMaterial
            color="#8f4bc6"
            transparent
            opacity={0.045}
            depthWrite={false}
          />
        </mesh>
        <pointLight
          position={[0, 2.2, 1.0]}
          color="#b479f4"
          intensity={6}
          distance={8}
          decay={2}
        />
      </group>
      {[-4.8, -2.4, 0, 2.4, 4.8].map((x) => (
        <mesh
          key={x}
          position={[x, 0.003, 6.6]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.38, 0.035]} />
          <meshBasicMaterial color="#9583ad" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

const roomMotes: Array<{
  position: [number, number, number];
  color: string;
  size: number;
}> = [
  { position: [-5.8, 3.45, -2.9], color: "#b69af2", size: 0.09 },
  { position: [5.85, 2.9, 1.6], color: "#86cbd2", size: 0.075 },
  { position: [-4.8, 4.1, -5.55], color: "#d1b6fb", size: 0.065 },
  { position: [4.8, 4.35, -5.6], color: "#9fa5f6", size: 0.085 },
  { position: [-5.65, 1.15, 4.65], color: "#8ac8b4", size: 0.07 },
  { position: [5.55, 1.5, 4.8], color: "#c4a4ec", size: 0.09 },
  { position: [-4.5, 3.2, 2.2], color: "#e3b4ce", size: 0.06 },
  { position: [4.65, 2.1, -3.8], color: "#a6b8eb", size: 0.07 },
];

function RoomMotion({
  reducedMotion,
  isRecall,
  compact,
}: {
  reducedMotion: boolean;
  isRecall: boolean;
  compact: boolean;
}) {
  const moteGroup = useRef<Group>(null);
  const accentLight = useRef<PointLight>(null);
  const floorRing = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    if (moteGroup.current) {
      moteGroup.current.rotation.y = time * 0.032;
      moteGroup.current.position.y = Math.sin(time * 0.24) * 0.07;
    }
    if (accentLight.current) {
      accentLight.current.position.set(
        Math.sin(time * 0.16) * 4.2,
        3.4 + Math.sin(time * 0.29) * 0.45,
        Math.cos(time * 0.13) * 3.5,
      );
      accentLight.current.intensity = isRecall
        ? 1.7 + Math.sin(time * 0.3) * 0.18
        : 3.5 + Math.sin(time * 0.3) * 0.55;
    }
    if (floorRing.current)
      floorRing.current.opacity =
        (isRecall ? 0.11 : 0.2) + Math.sin(time * 0.42) * 0.035;
  });

  return (
    <>
      <group ref={moteGroup}>
        {roomMotes
          .slice(0, compact ? 5 : roomMotes.length)
          .map((mote, index) => (
            <mesh
              key={index}
              position={mote.position}
              rotation={[0.2, index * 0.7, 0.35]}
              scale={mote.size}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial
                color={mote.color}
                transparent
                opacity={isRecall ? 0.5 : 0.74}
                toneMapped={false}
              />
            </mesh>
          ))}
      </group>
      <mesh position={[0, -0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.82, 0.012, 6, 144]} />
        <meshBasicMaterial
          ref={floorRing}
          color={isRecall ? "#716394" : "#a98bdb"}
          transparent
          opacity={isRecall ? 0.11 : 0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={accentLight}
        position={[-4.2, 3.4, 3.5]}
        color={isRecall ? "#8171bc" : "#a984e4"}
        intensity={isRecall ? 1.7 : 3.5}
        distance={17}
        decay={2}
      />
    </>
  );
}

function World({
  reducedMotion,
  onContextLost,
}: {
  reducedMotion: boolean;
  onContextLost: () => void;
}) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const frameScale = Math.max(
    1,
    1.1 / Math.max(width / Math.max(height, 1), 0.3),
  );
  const anchors = usePalaceStore((state) => state.anchors);
  const roomId = usePalaceStore((state) => state.activeRoomId);
  const mode = usePalaceStore((state) => state.mode);
  const roomAnchors = useMemo(
    () => anchors.filter((anchor) => anchor.roomId === roomId),
    [anchors, roomId],
  );
  const isRecall = mode === "recall";

  return (
    <>
      <color attach="background" args={[isRecall ? "#0b0c13" : "#12121e"]} />
      <fog
        attach="fog"
        args={[
          isRecall ? "#0b0c13" : "#12121e",
          29 * frameScale,
          58 * frameScale,
        ]}
      />
      <ambientLight intensity={isRecall ? 0.14 : 0.52} color="#ab99c9" />
      <hemisphereLight args={["#c7b5e7", "#251c3a", isRecall ? 0.28 : 1.25]} />
      <directionalLight
        position={[-5, 12, 8]}
        color="#d7c8f4"
        intensity={isRecall ? 0.35 : 2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-bias={-0.0005}
        shadow-normalBias={0.035}
      />
      <directionalLight
        position={[7, 5, -6]}
        color="#8173dc"
        intensity={isRecall ? 0.3 : 1.3}
      />
      <pointLight
        position={[-5, 5, 1]}
        color="#a472e1"
        intensity={isRecall ? 3 : 12}
        distance={19}
        decay={2}
      />
      <Architecture />
      <RoomMotion
        reducedMotion={reducedMotion}
        isRecall={isRecall}
        compact={width < 700}
      />
      {roomAnchors.map((anchor, index) => (
        <MemoryAnchor
          key={anchor.id}
          anchor={anchor}
          index={index}
          reducedMotion={reducedMotion}
        />
      ))}
      <CameraController reducedMotion={reducedMotion} />
      <ContextMonitor onLost={onContextLost} />
      <PostProcessing />
    </>
  );
}

function AccessibleFallback({ onRetry }: { onRetry: () => void }) {
  const anchors = usePalaceStore((state) => state.anchors);
  const roomId = usePalaceStore((state) => state.activeRoomId);
  const mode = usePalaceStore((state) => state.mode);
  const selectAnchor = usePalaceStore((state) => state.selectAnchor);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        background: "radial-gradient(ellipse at center, #282036, #10121b 75%)",
        color: "#e8e4f4",
        overflow: "auto",
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: ".18em",
          color: "#b8a0df",
          textTransform: "uppercase",
        }}
      >
        Your memory palace
      </span>
      <h2 style={{ fontSize: 23, margin: "12px 0 8px", fontWeight: 500 }}>
        Every concept is still here.
      </h2>
      <p
        style={{
          maxWidth: 390,
          textAlign: "center",
          color: "#9a95ad",
          fontSize: 13,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        The 3D view isn’t available on this device. You can keep exploring and
        practicing with your anchors below.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          width: "min(100%, 450px)",
        }}
      >
        {anchors
          .filter((anchor) => anchor.roomId === roomId)
          .map((anchor, index) => (
            <button
              key={anchor.id}
              type="button"
              onClick={() => selectAnchor(anchor.id)}
              style={{
                textAlign: "left",
                border: "1px solid #ffffff14",
                borderRadius: 10,
                padding: 18,
                color: "#e6e1f0",
                background: "#ffffff04",
                cursor: "pointer",
                font: "inherit",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 14,
                  height: 14,
                  marginBottom: 14,
                  borderRadius: 3,
                  background: anchor.color,
                  boxShadow: `0 0 25px ${anchor.color}66`,
                  transform: "rotate(30deg)",
                }}
              />
              {mode === "recall" ? `Mystery anchor ${index + 1}` : anchor.title}
            </button>
          ))}
      </div>
      <button
        onClick={onRetry}
        type="button"
        style={{
          marginTop: 22,
          padding: "9px 14px",
          borderRadius: 7,
          color: "#c7b4ee",
          border: "1px solid #b59bdd35",
          background: "#ad8ce310",
          font: "inherit",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Retry 3D view
      </button>
    </div>
  );
}

function Scene() {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const [contextLost, setContextLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pixelRatio = isTouchDevice ? 1.25 : 1.5;
  const retry = () => {
    setContextLost(false);
    setAttempt((value) => value + 1);
  };
  const fallback = <AccessibleFallback onRetry={retry} />;

  return (
    <div
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-label="Interactive three-dimensional memory palace"
    >
      {contextLost ? (
        fallback
      ) : (
        <SceneBoundary key={attempt} fallback={fallback}>
          <Canvas
            shadows={{ type: PCFShadowMap }}
            dpr={[1, pixelRatio]}
            camera={{ position: [13, 12, 17], fov: 42, near: 0.1, far: 220 }}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: ACESFilmicToneMapping,
              toneMappingExposure: 1.15,
            }}
            fallback={fallback}
            onCreated={({ gl }) => {
              gl.setClearColor(new Color("#12121e"));
              gl.domElement.style.cursor = "grab";
            }}
            style={{ touchAction: "none" }}
            aria-label="Orbit the memory palace by dragging. Use the scroll wheel or pinch to zoom. Select a labeled memory anchor to study."
          >
            <Suspense fallback={null}>
              <World
                reducedMotion={reducedMotion}
                onContextLost={() => setContextLost(true)}
              />
            </Suspense>
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}

export default memo(Scene);
