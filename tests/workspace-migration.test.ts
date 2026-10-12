import { describe, expect, it } from "vitest";
import { INITIAL_ANCHORS, ROOMS } from "@/lib/data";
import {
  validatePersistedState,
  workspaceChanged,
} from "@/store/usePalaceStore";

describe("retired scan data", () => {
  it("preserves study material and progress as a preset without model links", () => {
    const old = {
      ...INITIAL_ANCHORS[0],
      artifactType: "ai-3d",
      modelUrl: "/retired.glb",
      thumbnailUrl: "/retired.webp",
      isGenerating: false,
      recallPrompt: "What should you remember?",
      reviewCount: 8,
      status: "mastered",
    };
    const migrated = validatePersistedState({ rooms: ROOMS, anchors: [old] })
      .anchors[0];
    expect(migrated).toMatchObject({
      id: old.id,
      title: old.title,
      content: old.content,
      position: old.position,
      reviewCount: 8,
      status: "mastered",
      artifactType: "preset",
      recallPrompt: old.recallPrompt,
    });
    expect(migrated).not.toHaveProperty("modelUrl");
    expect(migrated).not.toHaveProperty("thumbnailUrl");
    expect(migrated).not.toHaveProperty("isGenerating");
  });
  it("retains unfinished scan notes and intentionally empty accounts", () => {
    expect(
      validatePersistedState({
        rooms: ROOMS,
        anchors: [
          { ...INITIAL_ANCHORS[0], artifactType: "ai-3d", isGenerating: true },
        ],
      }).anchors,
    ).toHaveLength(1);
    expect(validatePersistedState({ rooms: [], anchors: [] })).toMatchObject({
      rooms: [],
      anchors: [],
    });
  });
});

describe("cloud save selection", () => {
  it("ignores camera and panel changes but detects actual study edits", () => {
    const data = validatePersistedState({});
    const panel = {
      ...data,
      selectedAnchorId: "anything",
      isAddOpen: true,
      cameraTarget: [1, 2, 3],
    };
    expect(workspaceChanged(panel, data)).toBe(false);
    expect(
      workspaceChanged(
        {
          ...data,
          anchors: data.anchors.map((a, i) =>
            i ? a : { ...a, title: "Edited" },
          ),
        },
        data,
      ),
    ).toBe(true);
    expect(workspaceChanged({ ...data, mode: "recall" }, data)).toBe(true);
  });
});
