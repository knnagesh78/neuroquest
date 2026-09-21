import { describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { INITIAL_ANCHORS } from "@/lib/data";
import type { NewAnchorInput, NewRoomInput } from "@/lib/types";
import {
  createPalaceStore,
  PALACE_STORAGE_KEY,
  PALACE_STORAGE_VERSION,
  type PersistedPalaceState,
  validatePersistedState,
} from "@/store/usePalaceStore";

function setup(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue) values.set(PALACE_STORAGE_KEY, initialValue);
  const storage = createJSONStorage<PersistedPalaceState>(() => ({
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  }));
  return { store: createPalaceStore({ storage }), values, storage };
}

const input: NewAnchorInput = {
  roomId: "computer-science",
  title: "  Hash tables  ",
  category: "FOUNDATIONS",
  content: "## Fast lookup\n\nKeys map to buckets.",
  color: "#38bdf8",
  position: [2, 0, 4],
  shape: "cube",
};

describe("palace learning state", () => {
  it("starts with six computer science anchors and three mastered", () => {
    const { store } = setup();
    const anchors = store
      .getState()
      .anchors.filter((anchor) => anchor.roomId === "computer-science");
    expect(anchors).toHaveLength(6);
    expect(
      anchors.filter((anchor) => anchor.status === "mastered"),
    ).toHaveLength(3);
  });

  it("records review difficulty, timestamps, and mastery changes", () => {
    const { store } = setup();
    const id = "cs-system-design";
    store.getState().rateAnchor(id, "easy");
    expect(
      store.getState().anchors.find((anchor) => anchor.id === id),
    ).toMatchObject({ status: "mastered", reviewCount: 1 });
    expect(store.getState().sessionRatings[id]).toBe("easy");
    store.getState().rateAnchor(id, "hard");
    store.getState().rateAnchor(id, "failed");
    const reviewed = store
      .getState()
      .anchors.find((anchor) => anchor.id === id)!;
    expect(reviewed.status).toBe("learning");
    expect(reviewed.reviewCount).toBe(3);
    expect(Number.isNaN(Date.parse(reviewed.lastReviewedAt!))).toBe(false);
    expect(store.getState().sessionRatings[id]).toBe("failed");
  });

  it("clears transient state when changing rooms and prevents cross-room selection", () => {
    const { store } = setup();
    store.getState().selectAnchor("cs-data-structures");
    expect(store.getState().cameraTarget).toEqual([-4, 0, -3]);
    store.getState().rateAnchor("cs-data-structures", "easy");
    store.getState().setAddOpen(true);
    store.getState().setRoom("human-anatomy");
    expect(store.getState()).toMatchObject({
      activeRoomId: "human-anatomy",
      selectedAnchorId: null,
      cameraTarget: null,
      isAddOpen: false,
      sessionRatings: {},
      cameraResetKey: 1,
    });
    store.getState().selectAnchor("cs-data-structures");
    expect(store.getState().selectedAnchorId).toBeNull();
    store.getState().setRoom("missing-room");
    expect(store.getState().activeRoomId).toBe("human-anatomy");
  });

  it("adds, edits, and deletes an anchor without leaving stale camera or rating state", () => {
    const { store } = setup();
    const id = store.getState().addAnchor(input);
    expect(
      store.getState().anchors.find((anchor) => anchor.id === id),
    ).toMatchObject({ title: "Hash tables", status: "new", reviewCount: 0 });
    store.getState().selectAnchor(id);
    store
      .getState()
      .updateAnchor(id, { title: "Hash maps", position: [3, 1, 4] });
    expect(store.getState().cameraTarget).toEqual([3, 1, 4]);
    store.getState().rateAnchor(id, "easy");
    store.getState().deleteAnchor(id);
    expect(store.getState().anchors.some((anchor) => anchor.id === id)).toBe(
      false,
    );
    expect(store.getState().selectedAnchorId).toBeNull();
    expect(store.getState().cameraTarget).toBeNull();
    expect(store.getState().sessionRatings[id]).toBeUndefined();
  });

  it("rejects invalid coordinates and keeps existing data intact", () => {
    const { store } = setup();
    expect(() =>
      store.getState().addAnchor({ ...input, position: [Infinity, 0, 1] }),
    ).toThrow();
    expect(() =>
      store
        .getState()
        .updateAnchor("cs-data-structures", { color: "javascript:alert(1)" }),
    ).toThrow();
    expect(store.getState().anchors).toHaveLength(INITIAL_ANCHORS.length);
    expect(store.getState().anchors[0].color).toBe("#a78bfa");
  });

  it("keeps new, edited, and restored anchors within the architectural slab", () => {
    const { store } = setup();
    for (const position of [
      [6.1, 0, 0],
      [0, -0.1, 0],
      [0, 3.1, 0],
      [0, 0, -6.1],
    ] as [number, number, number][]) {
      expect(() =>
        store.getState().addAnchor({ ...input, position }),
      ).toThrow();
      expect(() =>
        store.getState().updateAnchor("cs-data-structures", { position }),
      ).toThrow();
    }
    const id = store.getState().addAnchor({ ...input, position: [-6, 3, 6] });
    expect(
      store.getState().anchors.find((anchor) => anchor.id === id)?.position,
    ).toEqual([-6, 3, 6]);
    const cleaned = validatePersistedState({
      anchors: [
        INITIAL_ANCHORS[0],
        { ...INITIAL_ANCHORS[1], position: [20, 0, 0] },
      ],
    });
    expect(cleaned.anchors.map((anchor) => anchor.id)).toEqual([
      INITIAL_ANCHORS[0].id,
    ]);
  });

  it("records each anchor only once per recall session", () => {
    const { store } = setup();
    const id = "cs-system-design";
    store.getState().setMode("recall");
    store.getState().rateAnchor(id, "hard");
    store.getState().rateAnchor(id, "easy");
    expect(
      store.getState().anchors.find((anchor) => anchor.id === id),
    ).toMatchObject({ status: "learning", reviewCount: 1 });
    expect(store.getState().sessionRatings[id]).toBe("hard");
    store.getState().setMode("explore");
    store.getState().setMode("recall");
    store.getState().rateAnchor(id, "easy");
    expect(
      store.getState().anchors.find((anchor) => anchor.id === id),
    ).toMatchObject({ status: "mastered", reviewCount: 2 });
  });

  it("starts a fresh recall session and supports camera reset", () => {
    const { store } = setup();
    store.getState().selectAnchor("cs-data-structures");
    store.getState().setMode("recall");
    expect(store.getState()).toMatchObject({
      mode: "recall",
      selectedAnchorId: null,
      cameraTarget: null,
      sessionRatings: {},
    });
    store.getState().selectAnchor("cs-data-structures");
    const beforeReset = store.getState().cameraResetKey;
    store.getState().resetCamera();
    expect(store.getState().cameraResetKey).toBe(beforeReset + 1);
    expect(store.getState().selectedAnchorId).toBeNull();
  });
});

describe("local persistence", () => {
  it("restores learning data without persisting open drawers, focus, or sessions", () => {
    const { store, storage, values } = setup();
    const id = store.getState().addAnchor(input);
    store.getState().setMode("recall");
    store.getState().selectAnchor(id);
    store.getState().rateAnchor(id, "easy");
    store.getState().setAddOpen(true);
    store.getState().toggleSound();
    store.getState().toggleEffects();
    const persisted = JSON.parse(values.get(PALACE_STORAGE_KEY)!);
    expect(persisted.version).toBe(PALACE_STORAGE_VERSION);
    expect(persisted.state.selectedAnchorId).toBeUndefined();
    expect(persisted.state.sessionRatings).toBeUndefined();
    const restored = createPalaceStore({ storage }).getState();
    expect(restored.anchors.find((anchor) => anchor.id === id)?.status).toBe(
      "mastered",
    );
    expect(restored).toMatchObject({
      mode: "recall",
      selectedAnchorId: null,
      cameraTarget: null,
      isAddOpen: false,
      sessionRatings: {},
      soundEnabled: true,
      effectsEnabled: false,
    });
  });

  it("does not let corrupt persisted data replace actions or transient fields", () => {
    const { store } = setup(
      JSON.stringify({
        version: PALACE_STORAGE_VERSION,
        state: {
          anchors: [{ id: "broken", position: "not a coordinate" }],
          activeRoomId: "unknown",
          mode: "invalid",
          soundEnabled: "yes",
          effectsEnabled: 0,
          setRoom: "overwritten",
          selectedAnchorId: "injected",
          cameraTarget: [999, 999, 999],
        },
      }),
    );
    expect(store.getState().anchors).toHaveLength(INITIAL_ANCHORS.length);
    expect(store.getState().activeRoomId).toBe("computer-science");
    expect(store.getState().mode).toBe("explore");
    expect(typeof store.getState().setRoom).toBe("function");
    expect(store.getState().selectedAnchorId).toBeNull();
    expect(store.getState().cameraTarget).toBeNull();
  });

  it("recovers from invalid JSON and migrates an older valid state", () => {
    expect(setup("{bad-json").store.getState().anchors).toHaveLength(
      INITIAL_ANCHORS.length,
    );
    const { store } = setup(
      JSON.stringify({
        version: 0,
        state: {
          anchors: [],
          activeRoomId: "world-history",
          mode: "recall",
          soundEnabled: true,
          effectsEnabled: false,
        },
      }),
    );
    expect(store.getState()).toMatchObject({
      anchors: [],
      activeRoomId: "world-history",
      mode: "recall",
      soundEnabled: true,
      effectsEnabled: false,
    });
  });

  it("deduplicates saved anchors, drops malformed entries, and preserves intentional empty rooms", () => {
    const anchor = INITIAL_ANCHORS[0];
    const cleaned = validatePersistedState({
      anchors: [
        anchor,
        anchor,
        { ...anchor, id: "invalid", position: [0, "oops", 0] },
      ],
    });
    expect(cleaned.anchors).toHaveLength(1);
    expect(validatePersistedState({ anchors: [] }).anchors).toEqual([]);
  });

  it("rejects persisted anchor IDs that collide with object prototype keys", () => {
    const anchor = INITIAL_ANCHORS[0];
    const cleaned = validatePersistedState({
      anchors: [
        anchor,
        { ...anchor, id: "__proto__" },
        { ...anchor, id: "constructor" },
        { ...anchor, id: "toString" },
      ],
    });
    expect(cleaned.anchors.map((item) => item.id)).toEqual([anchor.id]);
  });
});

describe("custom memory palaces", () => {
  const subject: NewRoomInput = {
    name: "  Organic   Chemistry  ",
    subtitle: "Reactions and molecular structures",
    color: "#78bba3",
    icon: "flask",
  };

  it("creates an empty palace, opens it in explore mode, and resets prior recall focus", () => {
    const { store } = setup();
    store.getState().setMode("recall");
    store.getState().selectAnchor("cs-data-structures");
    store.getState().rateAnchor("cs-data-structures", "easy");
    const id = store.getState().addRoom(subject);
    expect(store.getState().rooms).toHaveLength(4);
    expect(store.getState().rooms.find((room) => room.id === id)).toMatchObject(
      { name: "Organic Chemistry", icon: "flask", color: subject.color },
    );
    expect(store.getState()).toMatchObject({
      activeRoomId: id,
      mode: "explore",
      selectedAnchorId: null,
      cameraTarget: null,
      sessionRatings: {},
    });
    expect(
      store.getState().anchors.filter((anchor) => anchor.roomId === id),
    ).toEqual([]);
    expect(store.getState().anchors).toHaveLength(INITIAL_ANCHORS.length);
  });

  it("rejects blank, duplicate, oversized, and invalid palace settings without modifying rooms", () => {
    const { store } = setup();
    for (const name of ["  ", " computer   SCIENCE ", "a".repeat(49)]) {
      expect(() => store.getState().addRoom({ ...subject, name })).toThrow();
    }
    expect(() =>
      store.getState().addRoom({ ...subject, color: "invalid" }),
    ).toThrow();
    expect(() =>
      store
        .getState()
        .addRoom({ ...subject, icon: "unknown" as NewRoomInput["icon"] }),
    ).toThrow();
    expect(store.getState().rooms).toHaveLength(3);
  });

  it("persists custom palaces, their anchors, and ratings across reloads and room switches", () => {
    const { store, storage } = setup();
    const roomId = store.getState().addRoom(subject);
    const anchorId = store.getState().addAnchor({ ...input, roomId });
    store.getState().setMode("recall");
    store.getState().rateAnchor(anchorId, "easy");
    const restored = createPalaceStore({ storage });
    expect(restored.getState().activeRoomId).toBe(roomId);
    expect(
      restored.getState().rooms.find((room) => room.id === roomId)?.name,
    ).toBe("Organic Chemistry");
    expect(
      restored.getState().anchors.find((anchor) => anchor.id === anchorId),
    ).toMatchObject({ roomId, reviewCount: 1, status: "mastered" });
    restored.getState().setRoom("computer-science");
    restored.getState().selectAnchor(anchorId);
    expect(restored.getState().selectedAnchorId).toBeNull();
    restored.getState().setRoom(roomId);
    restored.getState().selectAnchor(anchorId);
    expect(restored.getState().selectedAnchorId).toBe(anchorId);
    restored.getState().updateAnchor(anchorId, { title: "Covalent bonds" });
    expect(
      restored.getState().anchors.find((anchor) => anchor.id === anchorId)
        ?.title,
    ).toBe("Covalent bonds");
  });

  it("migrates version 1 without losing existing notes or review progress", () => {
    const existing = {
      ...INITIAL_ANCHORS[0],
      content: "My edited notes",
      reviewCount: 7,
      status: "learning",
    };
    const { store, values } = setup(
      JSON.stringify({
        version: 1,
        state: {
          anchors: [existing],
          activeRoomId: "computer-science",
          mode: "recall",
          soundEnabled: true,
          effectsEnabled: false,
        },
      }),
    );
    expect(store.getState().anchors).toEqual([existing]);
    expect(store.getState().rooms).toHaveLength(3);
    expect(store.getState()).toMatchObject({
      mode: "recall",
      soundEnabled: true,
      effectsEnabled: false,
    });
    expect(JSON.parse(values.get(PALACE_STORAGE_KEY)!).version).toBe(2);
  });

  it("restores only valid distinct rooms and removes orphaned anchors", () => {
    const room = { ...subject, id: "room-chemistry", name: "Chemistry" };
    const validAnchor = {
      ...INITIAL_ANCHORS[0],
      id: "chemistry-anchor",
      roomId: room.id,
    };
    const restored = validatePersistedState({
      rooms: [
        room,
        room,
        { ...room, id: "room-copy" },
        { ...room, id: "constructor", name: "Bad room" },
      ],
      anchors: [
        validAnchor,
        { ...validAnchor, id: "orphan", roomId: "missing-room" },
      ],
      activeRoomId: room.id,
    });
    expect(restored.rooms).toHaveLength(4);
    expect(restored.anchors).toEqual([validAnchor]);
    expect(restored.activeRoomId).toBe(room.id);
  });

  it("preserves a new palace before its first anchor is added", () => {
    const { store, storage } = setup();
    const id = store.getState().addRoom(subject);
    const restored = createPalaceStore({ storage }).getState();
    expect(restored.activeRoomId).toBe(id);
    expect(restored.rooms.some((room) => room.id === id)).toBe(true);
    expect(restored.anchors.filter((anchor) => anchor.roomId === id)).toEqual(
      [],
    );
  });
});
