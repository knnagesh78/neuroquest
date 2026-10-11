import { describe, expect, it } from "vitest";
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { assetUrl, parseVisionConcept } from "@/lib/ai-anchor";
import { modelTransform } from "@/lib/model-normalization";
import { INITIAL_ANCHORS, ROOMS } from "@/lib/data";
import {
  createPalaceStore,
  validatePersistedState,
  workspaceData,
} from "@/store/usePalaceStore";
import { documentChanges, encodeWorkspace } from "@/lib/workspace-cloud";

const jobId = "b38a4860-fd01-4385-a579-ad255491693d";
const modelUrl = assetUrl("alice", jobId, "model.glb");
const thumbnailUrl = assetUrl("alice", jobId, "thumbnail.webp");
const concept = {
  conceptTitle: " Heart ",
  category: " Anatomy ",
  studyNotes: "# Heart\n\nPumps blood.",
  recallPrompt: "Which chambers pump blood?",
};

describe("AI study drafts and workspace compatibility", () => {
  it("whitelists and trims structured notes without treating image text as instructions", () => {
    expect(
      parseVisionConcept({ ...concept, apiKey: "never persist", admin: true }),
    ).toEqual({ ...concept, conceptTitle: "Heart", category: "Anatomy" });
  });
  it.each([
    null,
    [],
    { ...concept, category: "" },
    { ...concept, studyNotes: 42 },
    { ...concept, recallPrompt: "x".repeat(501) },
  ])("rejects incomplete or oversized drafts", (value) => {
    expect(() => parseVisionConcept(value)).toThrow();
  });
  it("migrates legacy anchors to presets without losing edited notes or progress", () => {
    const anchor = Object.fromEntries(
      Object.entries(INITIAL_ANCHORS[0]).filter(
        ([key]) => key !== "artifactType",
      ),
    );
    const restored = validatePersistedState({
      anchors: [{ ...anchor, content: "My notes", reviewCount: 8 }],
    });
    expect(restored.anchors[0]).toMatchObject({
      artifactType: "preset",
      content: "My notes",
      reviewCount: 8,
    });
  });
  it("adds, edits and serializes all private model fields through existing actions", () => {
    const store = createPalaceStore();
    const id = store.getState().addAnchor({
      ...INITIAL_ANCHORS[0],
      artifactType: "ai-3d",
      modelUrl,
      thumbnailUrl,
      isGenerating: false,
      recallPrompt: concept.recallPrompt,
    });
    const before = encodeWorkspace(workspaceData(store.getState()));
    store.getState().updateAnchor(id, {
      content: "Reviewed by student",
      recallPrompt: "What is its function?",
    });
    const after = encodeWorkspace(workspaceData(store.getState()));
    expect(after.get(`anchor_${id}`)).toMatchObject({
      artifactType: "ai-3d",
      modelUrl,
      thumbnailUrl,
      isGenerating: false,
      content: "Reviewed by student",
      recallPrompt: "What is its function?",
    });
    expect(documentChanges(before, after).size).toBe(1);
    expect(
      validatePersistedState(workspaceData(store.getState())).anchors.find(
        (anchor) => anchor.id === id,
      )?.modelUrl,
    ).toBe(modelUrl);
  });
  it.each([
    { artifactType: "ai-3d", modelUrl: "https://untrusted.example/model.glb" },
    { artifactType: "ai-3d" },
    { artifactType: "preset", isGenerating: "yes" },
    { artifactType: "ai-3d", modelUrl, recallPrompt: "x".repeat(501) },
  ])(
    "rejects invalid artifact metadata rather than loading arbitrary URLs",
    (updates) => {
      expect(
        validatePersistedState({
          rooms: ROOMS,
          anchors: [{ ...INITIAL_ANCHORS[0], ...updates }],
        }).anchors,
      ).toEqual([]);
    },
  );
  it("permits a generating hologram without a completed URL", () => {
    expect(
      validatePersistedState({
        anchors: [
          { ...INITIAL_ANCHORS[0], artifactType: "ai-3d", isGenerating: true },
        ],
      }).anchors[0],
    ).toMatchObject({ isGenerating: true, artifactType: "ai-3d" });
  });
});

describe("unknown model size and centering", () => {
  it("fits translated, scaled geometry into 1.5 units without mutating source transforms", () => {
    const source = new Group();
    const geometry = new BoxGeometry(4, 2, 1);
    const material = new MeshStandardMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.position.set(7, -3, 10);
    source.add(mesh);
    source.position.set(2, 4, -8);
    source.scale.setScalar(3);
    const original = source.position.clone();
    const transform = modelTransform(source);
    const shifted = new Group();
    shifted.position.fromArray(transform.offset);
    shifted.add(source);
    const normalized = new Group();
    normalized.scale.setScalar(transform.scale);
    normalized.add(shifted);
    normalized.updateMatrixWorld(true);
    const box = new Box3().setFromObject(normalized);
    const size = box.getSize(new Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1.5);
    expect(box.getCenter(new Vector3()).length()).toBeCloseTo(0);
    expect(source.position).toEqual(original);
    geometry.dispose();
    material.dispose();
  });
  it("fails empty geometry so the renderer can show its recoverable fallback", () => {
    expect(() => modelTransform(new Group())).toThrow("no usable geometry");
  });
});
