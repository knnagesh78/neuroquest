import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  loadWorkspace,
  saveWorkspace,
  WorkspaceConflict,
} from "@/lib/workspace-cloud";
import { validatePersistedState } from "@/store/usePalaceStore";

let env: RulesTestEnvironment;
let alice: Firestore;
let bob: Firestore;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-neuroquest",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  alice = env.authenticatedContext("alice").firestore() as unknown as Firestore;
  bob = env.authenticatedContext("bob").firestore() as unknown as Firestore;
});
beforeEach(async () => {
  await env.clearFirestore();
});
afterAll(async () => {
  await env?.cleanup();
});

describe("Firestore ownership and cloud persistence", () => {
  it("starts each new owner's private workspace empty and restores it", async () => {
    const initial = await loadWorkspace(alice, "alice");
    expect(initial.exists).toBe(false);
    expect(initial.data.rooms).toEqual([]);
    expect(initial.data.anchors).toEqual([]);
    const revision = await saveWorkspace(alice, "alice", null, initial.data, 0);
    expect(revision).toBe(1);
    const loaded = await loadWorkspace(alice, "alice");
    expect(loaded.data.anchors).toEqual([]);
    expect(loaded.data.rooms).toEqual([]);
    expect(loaded.revision).toBe(1);
  });
  it("rejects unauthenticated reads and writes", async () => {
    const guest = env
      .unauthenticatedContext()
      .firestore() as unknown as Firestore;
    await assertFails(
      getDocs(collection(guest, "users", "alice", "workspace")),
    );
    await assertFails(
      setDoc(doc(guest, "users", "alice", "workspace", "meta"), {
        schema: 1,
        revision: 1,
      }),
    );
  });
  it("rejects another user's direct reads, collection reads and writes", async () => {
    await saveWorkspace(alice, "alice", null, validatePersistedState({}), 0);
    await assertFails(
      getDoc(doc(bob, "users", "alice", "workspace", "preferences")),
    );
    await assertFails(getDocs(collection(bob, "users", "alice", "workspace")));
    await assertFails(
      saveWorkspace(bob, "alice", null, validatePersistedState({}), 1),
    );
  });
  it("keeps two users' edits separate", async () => {
    const original = validatePersistedState({});
    await saveWorkspace(alice, "alice", null, original, 0);
    await saveWorkspace(bob, "bob", null, original, 0);
    const edited = {
      ...original,
      anchors: original.anchors.map((a, i) =>
        i === 0 ? { ...a, title: "Only Alice knows this" } : a,
      ),
    };
    await saveWorkspace(alice, "alice", original, edited, 1);
    expect(
      (await loadWorkspace(bob, "bob")).data.anchors.some(
        (a) => a.title === "Only Alice knows this",
      ),
    ).toBe(false);
    expect(
      (await loadWorkspace(alice, "alice")).data.anchors.some(
        (a) => a.title === "Only Alice knows this",
      ),
    ).toBe(true);
  });
  it("rejects a stale device without overwriting the newer save", async () => {
    const original = validatePersistedState({});
    await saveWorkspace(alice, "alice", null, original, 0);
    const newer = { ...original, soundEnabled: true };
    await saveWorkspace(alice, "alice", original, newer, 1);
    await expect(
      saveWorkspace(
        alice,
        "alice",
        original,
        { ...original, effectsEnabled: false },
        1,
      ),
    ).rejects.toBeInstanceOf(WorkspaceConflict);
    expect((await loadWorkspace(alice, "alice")).data.soundEnabled).toBe(true);
  });
  it("allows validated custom palaces, recall progress, and anchor deletion", async () => {
    const original = validatePersistedState({});
    await saveWorkspace(alice, "alice", null, original, 0);
    const edited = {
      ...original,
      rooms: [
        ...original.rooms,
        {
          id: "room-maths",
          name: "Maths",
          subtitle: "Algebra",
          color: "#7955d9",
          icon: "book" as const,
        },
      ],
      anchors: [
        {
          ...original.anchors[0],
          roomId: "room-maths",
          status: "mastered" as const,
          reviewCount: 2,
          lastReviewedAt: new Date().toISOString(),
        },
      ],
      activeRoomId: "room-maths",
    };
    await saveWorkspace(alice, "alice", original, edited, 1);
    const loaded = await loadWorkspace(alice, "alice");
    expect(loaded.data.anchors).toEqual(edited.anchors);
    expect(loaded.data.activeRoomId).toBe("room-maths");
  });
  it("rejects unversioned writes that would bypass conflict protection", async () => {
    const original = validatePersistedState({});
    await saveWorkspace(alice, "alice", null, original, 0);
    await assertFails(
      setDoc(doc(alice, "users", "alice", "workspace", "preferences"), {
        activeRoomId: "computer-science",
        mode: "recall",
        soundEnabled: false,
        effectsEnabled: true,
      }),
    );
  });
  it("rejects oversized notes and unexpected fields atomically", async () => {
    const original = validatePersistedState({});
    await saveWorkspace(alice, "alice", null, original, 0);
    const invalid = {
      ...original,
      anchors: original.anchors.map((a, i) =>
        i ? a : { ...a, content: "x".repeat(30001) },
      ),
    };
    await assertFails(saveWorkspace(alice, "alice", original, invalid, 1));
    const malicious = {
      ...original,
      anchors: original.anchors.map((a, i) => (i ? a : { ...a, admin: true })),
    };
    await assertFails(saveWorkspace(alice, "alice", original, malicious, 1));
    expect((await loadWorkspace(alice, "alice")).revision).toBe(1);
  });
  it("preserves intentionally empty anchor lists", async () => {
    const original = { ...validatePersistedState({}), anchors: [] };
    await saveWorkspace(alice, "alice", null, original, 0);
    expect((await loadWorkspace(alice, "alice")).data.anchors).toEqual([]);
  });
});
