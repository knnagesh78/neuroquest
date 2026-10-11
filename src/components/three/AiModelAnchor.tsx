"use client";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { onIdTokenChanged } from "firebase/auth";
import { getToken } from "firebase/app-check";
import {
  Color,
  Camera,
  Light,
  Mesh,
  MeshStandardMaterial,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getFirebase } from "@/lib/firebase";
import { ASSET_URL_PATTERN } from "@/lib/ai-anchor";
import { modelTransform } from "@/lib/model-normalization";
import { syncModelCacheUser } from "@/lib/model-cache-session";
import LoadingHologram from "./LoadingHologram";

const leases = new Map<
  string,
  { count: number; timer?: ReturnType<typeof setTimeout> }
>();
function retainModel(url: string, source: Object3D) {
  const lease = leases.get(url) || { count: 0 };
  clearTimeout(lease.timer);
  lease.count++;
  leases.set(url, lease);
  return () => {
    lease.count--;
    lease.timer = setTimeout(() => {
      if (lease.count) return;
      const materials = new Set<Material>(),
        textures = new Set<Texture>();
      source.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      });
      for (const material of materials) {
        for (const value of Object.values(material))
          if (value && typeof value === "object" && "isTexture" in value)
            textures.add(value as Texture);
        material.dispose();
      }
      for (const texture of textures) {
        texture.dispose();
        const images = Array.isArray(texture.source.data)
          ? texture.source.data
          : [texture.source.data];
        for (const bitmap of images)
          if (bitmap && typeof bitmap.close === "function") bitmap.close();
      }
      useGLTF.clear(url);
      leases.delete(url);
    }, 0);
  };
}

class ModelBoundary extends Component<
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

function LoadedModel({
  url,
  token,
  appCheck,
  color,
  highlighted,
  recall,
}: {
  url: string;
  token: string;
  appCheck: string;
  color: string;
  highlighted: boolean;
  recall: boolean;
}) {
  const { scene } = useGLTF(url, true, true, (loader) =>
    loader.setRequestHeader({
      Authorization: `Bearer ${token}`,
      ...(appCheck ? { "X-Firebase-AppCheck": appCheck } : {}),
    }),
  );
  const owned = useMemo(() => {
    const object = clone(scene);
    // Imported lights/cameras must not change the palace's lighting or framing.
    const sceneExtras: Object3D[] = [];
    object.traverse((node) => {
      if (node instanceof Light || node instanceof Camera)
        sceneExtras.push(node);
    });
    for (const node of sceneExtras) node.removeFromParent();
    const materials: Material[] = [];
    object.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const originals = Array.isArray(node.material)
        ? node.material
        : [node.material];
      const clones = originals.map((original) => {
        const material = recall
          ? new MeshStandardMaterial({
              color: "#241b24",
              emissive: color,
              emissiveIntensity: 0.06,
              metalness: 0.6,
              roughness: 0.5,
            })
          : original.clone();
        materials.push(material);
        return material;
      });
      node.material = Array.isArray(node.material) ? clones : clones[0];
    });
    return { object, materials, transform: modelTransform(object) };
  }, [scene, recall, color]);
  useEffect(() => retainModel(url, scene), [url, scene]);
  const animatedMaterials = useRef<Material[]>([]);
  useEffect(() => {
    animatedMaterials.current = owned.materials;
    return () => {
      animatedMaterials.current = [];
      for (const material of owned.materials) material.dispose();
    };
  }, [owned]);
  const glow = useMemo(() => new Color(color), [color]);
  useFrame((_, delta) => {
    for (const material of animatedMaterials.current) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      material.emissive.lerp(glow, Math.min(delta * 5, 1));
      const target = recall ? 0.06 : highlighted ? 0.28 : 0.025;
      // R3F updates owned GPU resources per frame; this cloned material is not React state.
      // eslint-disable-next-line react-hooks/immutability
      material.emissiveIntensity +=
        (target - material.emissiveIntensity) * Math.min(delta * 5, 1);
    }
  });
  return (
    <group scale={owned.transform.scale} dispose={null}>
      <group position={owned.transform.offset}>
        <primitive object={owned.object} dispose={null} />
      </group>
    </group>
  );
}

export default function AiModelAnchor({
  modelUrl,
  color,
  highlighted = false,
  recall = false,
  reducedMotion = false,
}: {
  modelUrl: string;
  color: string;
  highlighted?: boolean;
  recall?: boolean;
  reducedMotion?: boolean;
}) {
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [appCheck, setAppCheck] = useState("");
  useEffect(
    () => () => {
      // Also release a pending/failed loader entry that never mounted a model instance.
      if (!leases.has(modelUrl) && ASSET_URL_PATTERN.test(modelUrl))
        useGLTF.clear(modelUrl);
    },
    [modelUrl],
  );
  useEffect(() => {
    let disposed = false;
    const unsubscribe = onIdTokenChanged(getFirebase().auth, (user) => {
      if (!user || !modelUrl.startsWith(`/api/anchors/assets/${user.uid}/`)) {
        setToken("");
        return;
      }
      void Promise.all([
        user.getIdToken(attempt > 0),
        getFirebase().appCheck
          ? getToken(getFirebase().appCheck!)
              .then((value) => value.token)
              .catch(() => "")
          : Promise.resolve(""),
        syncModelCacheUser(user.uid),
      ])
        .then(([value, check]) => {
          if (!disposed && getFirebase().auth.currentUser?.uid === user.uid) {
            setAppCheck(check);
            setToken(value);
          }
        })
        .catch(() => {});
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [modelUrl, attempt]);
  const hologram = (
    <LoadingHologram color={color} reducedMotion={reducedMotion} />
  );
  if (!token || !ASSET_URL_PATTERN.test(modelUrl)) return hologram;
  return (
    <ModelBoundary
      key={`${modelUrl}-${attempt}`}
      fallback={
        <group>
          {hologram}
          <Html center position={[0, -0.95, 0]}>
            <button
              className="ai-model-retry"
              onClick={(event) => {
                event.stopPropagation();
                useGLTF.clear(modelUrl);
                setAttempt((value) => value + 1);
              }}
            >
              Model unavailable · retry
            </button>
          </Html>
        </group>
      }
    >
      <Suspense fallback={hologram}>
        <LoadedModel
          url={modelUrl}
          token={token}
          appCheck={appCheck}
          color={color}
          highlighted={highlighted}
          recall={recall}
        />
      </Suspense>
    </ModelBoundary>
  );
}
